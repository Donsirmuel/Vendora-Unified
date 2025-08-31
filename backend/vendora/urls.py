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

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/accounts/", include(("accounts.urls", "accounts"), namespace="accounts")),
    path("api/v1/orders/", include(("orders.urls", "orders"), namespace="orders")),
    path("api/v1/transactions/", include(("transactions.urls", "transactions"), namespace="transactions")),
    path("api/v1/queries/", include(("queries.urls", "queries"), namespace="queries")),
    path("api/v1/rates/", include(("rates.urls", "rates"), namespace="rates")),
    path("api/v1/notifications/", include(("notifications.urls", "notifications"), namespace="notifications")),
    
    # Telegram Bot Webhooks
    path("api/v1/telegram/", include("api.urls")),
]
