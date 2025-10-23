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
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap
from django.http import JsonResponse
from api.health import health_view
from api.metrics import metrics_view
from api.sse import sse_stream
from django.views.generic import TemplateView

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
    path(f"{_prefix}/telegram/", include(("api.urls", "telegram"), namespace=f"{_prefix.replace('/', '_')}_telegram")),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
