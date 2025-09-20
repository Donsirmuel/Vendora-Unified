import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class PaymentRequestConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not getattr(user, 'is_authenticated', False):
            await self.close(code=4001)
            return
        # Use user id as group name
        self.group_name = f"payment_requests_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass

    async def payment_request_event(self, event):
        # event['data'] expected to be JSON-serializable
        await self.send_json(event.get('data', {}))
