"""
ASGI config for vendora project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from accounts.ws_auth import JwtAuthMiddleware
from django.core.asgi import get_asgi_application
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')

django_asgi_app = get_asgi_application()

# Import websocket url patterns
from accounts import routing as accounts_routing

application = ProtocolTypeRouter({
	"http": django_asgi_app,
	"websocket": JwtAuthMiddleware(
		URLRouter(
			accounts_routing.websocket_urlpatterns
		)
	),
})
