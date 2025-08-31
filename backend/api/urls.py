from django.urls import path
from . import webhook_views

app_name = "telegram"

urlpatterns = [
    path("webhook/", webhook_views.telegram_webhook, name="webhook"),
]
