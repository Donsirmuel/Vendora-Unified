from django.urls import path
from . import webhook_views
from .sse import sse_stream

app_name = "telegram"

urlpatterns = [
    path("webhook/", webhook_views.telegram_webhook, name="webhook"),
    # Helper endpoints to manage the Telegram webhook from the backend
    path("webhook/set/", webhook_views.set_telegram_webhook, name="set_webhook"),
    path("webhook/info/", webhook_views.telegram_webhook_info, name="webhook_info"),
    # SSE endpoint
    path("stream/", sse_stream, name="sse_stream"),
]
