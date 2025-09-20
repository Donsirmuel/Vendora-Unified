import urllib.parse
import logging
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

class JwtAuthMiddleware:
    """ASGI middleware for authenticating WebSocket connections using a JWT.

    The client should send the token in the WebSocket subprotocol as `jwt.<token>`.
    This avoids placing JWTs in the URL. For backwards compatibility the middleware
    will also accept `access_token` in the query string if present.
    """

    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return JwtAuthMiddlewareInstance(scope, self.inner)


class JwtAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        token = None

        # 1) Look for a subprotocol like 'jwt.<token>'
        subprotocols = self.scope.get('subprotocols') or []
        for sp in subprotocols:
            if isinstance(sp, str) and sp.startswith('jwt.'):
                token = sp.split('jwt.', 1)[1]
                break

        # 2) Fallback: query string 'access_token'
        if not token:
            qs = self.scope.get('query_string', b'').decode('utf-8')
            if qs:
                params = urllib.parse.parse_qs(qs)
                vals = params.get('access_token') or params.get('token')
                if vals:
                    token = vals[0]

        user = AnonymousUser()
        if token:
            try:
                # Use SimpleJWT TokenBackend to validate token
                from rest_framework_simplejwt.backends import TokenBackend
                from django.contrib.auth import get_user_model

                tb = TokenBackend(algorithm=settings.SIMPLE_JWT.get('ALGORITHM', 'HS256'), signing_key=settings.SIMPLE_JWT.get('SIGNING_KEY', settings.SECRET_KEY))
                validated = tb.decode(token, verify=True)
                user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')
                uid = validated.get(user_id_claim)
                if uid is not None:
                    User = get_user_model()
                    try:
                        user = await database_sync_to_async(User.objects.get)(**{settings.SIMPLE_JWT.get('USER_ID_FIELD', 'id'): uid})
                    except Exception:
                        user = AnonymousUser()
            except Exception as exc:  # pragma: no cover - defensive
                logger.debug('WebSocket JWT validation failed: %s', exc)
                user = AnonymousUser()

        # attach user to scope for downstream consumers
        self.scope['user'] = user

        inner = self.inner(self.scope)
        return await inner(receive, send)
