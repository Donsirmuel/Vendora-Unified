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
from django.views.static import serve as static_serve
from api.sse import sse_stream

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/accounts/", include(("accounts.urls", "accounts"), namespace="accounts")),
    path("api/v1/orders/", include(("orders.urls", "orders"), namespace="orders")),
    path("api/v1/transactions/", include(("transactions.urls", "transactions"), namespace="transactions")),
    path("api/v1/queries/", include(("queries.urls", "queries"), namespace="queries")),
    path("api/v1/rates/", include(("rates.urls", "rates"), namespace="rates")),
    path("api/v1/notifications/", include(("notifications.urls", "notifications"), namespace="notifications")),
    # SSE stream for real-time vendor updates
    path("api/v1/stream/", sse_stream, name="sse_stream"),
    
    # Telegram Bot Webhooks
    path("api/v1/telegram/", include("api.urls")),

    # Health endpoints
    path("health/", health_view, name="health"),
    path("healthz/", lambda request: JsonResponse({"status": "ok"})),  # legacy simple

    # Marketing / legal static templates (can be overridden by frontend build if desired)
    path("", TemplateView.as_view(template_name="index.html"), name="landing-home"),
    path("terms/", TemplateView.as_view(template_name="legal/terms.html"), name="terms"),
    path("privacy/", TemplateView.as_view(template_name="legal/privacy.html"), name="privacy"),

    # SEO
    path("sitemap.xml", sitemap, {"sitemaps": {"static": StaticViewSitemap}}, name="sitemap"),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain"), name="robots"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    # PWA essentials
    re_path(r'^manifest\.webmanifest$', lambda r: static_serve(r, path='manifest.webmanifest', document_root=str(settings.FRONTEND_DIST))),
    re_path(r'^sw\.js$', lambda r: static_serve(r, path='sw.js', document_root=str(settings.FRONTEND_DIST))),
    re_path(r'^icons/(?P<path>.*)$', lambda r, path: static_serve(r, document_root=str(settings.FRONTEND_DIST / 'icons'), path=path)),
    # Vite build assets (JS/CSS)
    re_path(r'^assets/(?P<path>.*)$', lambda r, path: static_serve(r, document_root=str(settings.FRONTEND_DIST / 'assets'), path=path)),
    # SPA fallback: serve index.html for any other non-handled route (excluding api/admin/media)
    re_path(r'^(?!admin/|api/|media/).*$', TemplateView.as_view(template_name='index.html')),
]
