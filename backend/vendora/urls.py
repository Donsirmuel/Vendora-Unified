"""
URL configuration for vendora project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap
from django.http import JsonResponse
from api.health import health_view
from api.metrics import metrics_view
from django.views.static import serve as static_serve
from django.http import HttpResponse
from functools import partial
from api.sse import sse_stream

# Some hosting environments (DigitalOcean App Platform) may mount the service at
# both /api/v1/... and /v1/... depending on the routing configuration. We
# register both prefixes so requests succeed regardless of the upstream path
# trimming.
API_PREFIXES = ["api/v1", "v1"]

urlpatterns = [
    path("admin/", admin.site.urls),

    # Health endpoints
    path("health/", health_view, name="health"),
    path("healthz/", lambda request: JsonResponse({"status": "ok"})),  # legacy simple
    path("metrics/", metrics_view, name="metrics"),

    # Marketing / legal static templates (can be overridden by frontend build if desired)
    path("", TemplateView.as_view(template_name="index.html"), name="landing-home"),
    path("terms/", TemplateView.as_view(template_name="legal/terms.html"), name="terms"),
    path("privacy/", TemplateView.as_view(template_name="legal/privacy.html"), name="privacy"),

    # SEO
    path("sitemap.xml", sitemap, {"sitemaps": {"static": StaticViewSitemap}}, name="sitemap"),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain"), name="robots"),
]

# API routing for each supported prefix
for _prefix in API_PREFIXES:
    urlpatterns += [
        path(f"{_prefix}/accounts/", include(("accounts.urls", "accounts"), namespace=f"{_prefix.replace('/', '_')}_accounts")),
        path(f"{_prefix}/orders/", include(("orders.urls", "orders"), namespace=f"{_prefix.replace('/', '_')}_orders")),
        path(f"{_prefix}/transactions/", include(("transactions.urls", "transactions"), namespace=f"{_prefix.replace('/', '_')}_transactions")),
        path(f"{_prefix}/queries/", include(("queries.urls", "queries"), namespace=f"{_prefix.replace('/', '_')}_queries")),
        path(f"{_prefix}/rates/", include(("rates.urls", "rates"), namespace=f"{_prefix.replace('/', '_')}_rates")),
        path(f"{_prefix}/notifications/", include(("notifications.urls", "notifications"), namespace=f"{_prefix.replace('/', '_')}_notifications")),
        path(f"{_prefix}/stream/", sse_stream, name=f"{_prefix.replace('/', '_')}_sse_stream"),
        path(f"{_prefix}/telegram/", include("api.urls")),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    # PWA essentials - serve with conservative cache headers so browsers revalidate quickly
    re_path(r'^manifest\.webmanifest$', lambda r: _static_with_headers(r, path='manifest.webmanifest', document_root=str(settings.FRONTEND_DIST), cache='short')),
    re_path(r'^sw\.js$', lambda r: _static_with_headers(r, path='sw.js', document_root=str(settings.FRONTEND_DIST), cache='short')),
    re_path(r'^icons/(?P<path>.*)$', lambda r, path: _static_with_headers(r, path=path, document_root=str(settings.FRONTEND_DIST / 'icons'), cache='assets')),
    # Vite build assets (JS/CSS) - these are hashed filenames so safe to cache long-term
    re_path(r'^assets/(?P<path>.*)$', lambda r, path: _static_with_headers(r, path=path, document_root=str(settings.FRONTEND_DIST / 'assets'), cache='assets')),
    # SPA fallback: serve index.html (no-store/no-cache) for any other non-handled route so clients revalidate HTML
    # Exclude admin (with or without trailing slash), api/, and media/ so Django can handle admin redirects
    re_path(r'^(?!(?:admin(?:/|$)|api/|media/)).*$', lambda r: _static_with_headers(r, path='index.html', document_root=str(settings.FRONTEND_DIST), cache='short')),
]


# Helper to wrap Django's static serve and ensure appropriate Cache-Control headers
def _static_with_headers(request, path, document_root, cache='short'):
    """Serve a static file but override Cache-Control depending on the type.

    cache: 'short' -> no-cache (index.html, sw.js, manifest)
           'assets' -> long-lived immutable caching for hashed assets
    """
    resp = static_serve(request, path=path, document_root=document_root)
    if not isinstance(resp, HttpResponse):
        return resp
    # Short/volatile resources should be revalidated by browsers immediately
    if cache == 'short':
        resp["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp["Pragma"] = "no-cache"
        resp["Expires"] = "0"
    elif cache == 'assets':
        # Safe long caching for fingerprinted assets
        resp["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp
