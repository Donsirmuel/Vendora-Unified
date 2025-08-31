from django.urls import path
from . import webhook_views

app_name = 'api'

urlpatterns = [
    # Telegram Bot Webhooks
    path('webhook/', webhook_views.telegram_webhook, name='telegram_webhook'),
    path('webhook/set/', webhook_views.set_telegram_webhook, name='set_webhook'),
    path('webhook/info/', webhook_views.telegram_webhook_info, name='webhook_info'),
]
