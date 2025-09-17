from __future__ import annotations
from typing import Optional
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.permissions import SAFE_METHODS

class DynamicUserRateThrottle(SimpleRateThrottle):
    """User throttle that selects a dynamic rate based on trial/plan status.

    Base key = user id; falls back to IP if unauthenticated (rare because we only apply to auth routes).
    The rate string is derived from Django settings:
      THROTTLE_TRIAL_USER, THROTTLE_USER
    """
    scope = 'user'

    def get_cache_key(self, request, view) -> Optional[str]:  # type: ignore[override]
        if request.user and request.user.is_authenticated:
            # Separate bucket for trial users so stricter trial rate does not share counter
            suffix = ':trial' if getattr(request.user, 'is_trial', False) else ''
            ident = f"user:{request.user.pk}{suffix}"
        else:
            # fallback to IP (should not normally happen for this throttle)
            ident = self.get_ident(request)
        # Keep a handle to request for dynamic rate selection
        self.request = request  # type: ignore[attr-defined]
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }

    def get_rate(self):  # type: ignore[override]
                """Return trial or normal user rate based on user's trial flag.

                Priority:
                    1. Explicit trial/user settings (THROTTLE_TRIAL_USER / THROTTLE_USER)
                    2. DRF DEFAULT_THROTTLE_RATES['user'] fallback
                """
                from django.conf import settings
                drf_rates = getattr(settings, 'REST_FRAMEWORK', {}).get('DEFAULT_THROTTLE_RATES', {})
                fallback = drf_rates.get('user')
                trial_rate = getattr(settings, 'THROTTLE_TRIAL_USER', None) or fallback
                user_rate = getattr(settings, 'THROTTLE_USER', None) or fallback
                request = getattr(self, 'request', None)
                user = getattr(request, 'user', None)
                if getattr(user, 'is_authenticated', False) and getattr(user, 'is_trial', False):
                        return trial_rate
                return user_rate

class _FixedScopeThrottle(SimpleRateThrottle):
    """A SimpleRateThrottle variant with an immutable, class-level scope.

    We intentionally do NOT inherit from ScopedRateThrottle because that
    class rewrites `self.scope` from the view's `throttle_scope` attribute
    for EVERY request. When we list multiple scoped throttles in
    DEFAULT_THROTTLE_CLASSES, ScopedRateThrottle caused each throttle
    instance to adopt the *view* scope, leading to multiple independent
    throttle classes incrementing the *same* scope key and exhausting
    quotas prematurely. This custom class preserves its own fixed scope
    so each limiter counts only what it is meant to protect.
    """

    scope: str  # must be overridden by subclasses

    def get_cache_key(self, request, view):  # type: ignore[override]
        if not getattr(self, 'scope', None):
            return None
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}

    def get_rate(self):  # type: ignore[override]
        # Always fetch most recent mapping so per-test overrides (mutating settings.REST_FRAMEWORK) are honored.
        try:
            from django.conf import settings
            rf = getattr(settings, 'REST_FRAMEWORK', {})
            rates = rf.get('DEFAULT_THROTTLE_RATES', {})
            return rates.get(self.scope)
        except Exception:
            return super().get_rate()

    def allow_request(self, request, view):  # type: ignore[override]
        allowed = super().allow_request(request, view)
        # Attach debug marker so tests can inspect which throttle class processed the request
        try:  # best-effort, ignore failures
            from django.conf import settings
            if getattr(settings, 'DEBUG', False):
                # DRF attaches request._request (Django HttpRequest) accessible after view
                request.META[f'HTTP_X_DEBUG_THROTTLE_{self.scope.upper()}'] = 'ALLOWED' if allowed else 'THROTTLED'
        except Exception:
            pass
        return allowed


class OrderWriteScopedThrottle(_FixedScopeThrottle):
    scope = 'order_write'


class RateWriteScopedThrottle(_FixedScopeThrottle):
    scope = 'rate_write'
    def get_cache_key(self, request, view):  # type: ignore[override]
        # Only apply on write methods
        if request.method in SAFE_METHODS:
            return None
        return super().get_cache_key(request, view)


class AuthBurstScopedThrottle(_FixedScopeThrottle):
    scope = 'auth_burst'
    def get_cache_key(self, request, view):  # type: ignore[override]
        # Limit to token obtain endpoint paths to avoid counting other public endpoints
        path = request.path or ''
        if not path.endswith('/token/') and not path.endswith('/token'):
            return None
        return super().get_cache_key(request, view)
