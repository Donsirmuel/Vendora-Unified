import json
import pytest
from decimal import Decimal
from django.test import override_settings


@override_settings(TELEGRAM_WEBHOOK_SECRET="")
@pytest.mark.django_db
def test_webhook_auto_accept_and_file_upload(client, monkeypatch, db):
    """End-to-end simulation of webhook: confirm callback -> auto-accept -> upload proof file."""
    from accounts.models import Vendor
    from rates.models import Rate
    from api.models import BotUser
    from transactions.models import Transaction

    # Create vendor and enable auto_accept
    vendor = Vendor.objects.create(email='int_auto@example.com', name='IntAuto')
    vendor.set_password('pw')
    vendor.auto_accept = True
    vendor.is_service_active = True
    vendor.save()

    # Create rate
    Rate.objects.create(vendor=vendor, asset='BTC', buy_rate=Decimal('100000.00'), sell_rate=Decimal('99000.00'))

    # Simulate a /start to create BotUser
    # Ensure we mock the Telegram service used by webhook_views so no external HTTP
    # calls are made during the test. Provide both send_message and
    # download_file_by_file_id used by the webhook handler.
    class DummyTGS:
        def __init__(self):
            self.chat_id = None

        def send_message(self, text, chat_id=None, reply_markup=None):
            # pretend send always succeeds
            return {"success": True}

        def download_file_by_file_id(self, file_id):
            return {"success": True, "filename": "proof.jpg", "content": b"fakejpegbytes"}

    # Monkeypatch the implementation used by webhook_views (api.telegram_service)
    monkeypatch.setattr('api.telegram_service.TelegramBotService', lambda *args, **kwargs: DummyTGS())

    from django.urls import reverse
    url = reverse('telegram:webhook')
    update_start = {
        'message': {
            'chat': {'id': 'chat_int_1'},
            'text': f'/start vendor_{vendor.id}'
        }
    }
    resp = client.post(url, json.dumps(update_start), content_type='application/json')
    assert resp.status_code == 200

    # Simulate confirm callback (customer confirmed order)
    # Use callback_query format used by telegram_webhook parsing
    callback_update = {
        'callback_query': {
            'from': {'id': 12345},
            'message': {'chat': {'id': 'chat_int_1'}},
            'data': f'confirm_BTC_buy_0.005_{vendor.id}'
        }
    }
    resp = client.post(url, json.dumps(callback_update), content_type='application/json')
    assert resp.status_code == 200

    # After auto-accept there should be a BotUser with state awaiting_proof
    bu = BotUser.objects.filter(chat_id='chat_int_1').first()
    assert bu is not None
    assert bu.state == 'awaiting_proof'

    # Simulate sending a document message
    doc_update = {
        'message': {
            'chat': {'id': 'chat_int_1'},
            'document': {'file_id': 'file_1234'}
        }
    }
    resp = client.post(url, json.dumps(doc_update), content_type='application/json')
    assert resp.status_code == 200

    # The transaction should now exist and have proof saved
    txn = Transaction.objects.filter(order__vendor=vendor).first()
    assert txn is not None
    # proof file saved (FileField name not empty)
    assert getattr(txn, 'proof', None) and getattr(txn.proof, 'name', '')
