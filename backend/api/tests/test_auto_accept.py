import pytest


@pytest.mark.django_db
def test_auto_accept_creates_transaction_and_sets_botuser_state(db):
    from accounts.models import Vendor
    from rates.models import Rate
    from api.models import BotUser
    from transactions.models import Transaction
    from importlib import import_module
    from decimal import Decimal

    bh = import_module('api.bot_handlers')

    # Create vendor and enable auto_accept
    v = Vendor.objects.create(email='tauto@example.com', name='TAuto')
    v.set_password('pwd')
    v.auto_accept = True
    v.is_service_active = True
    v.save()

    # Rate for BTC
    r = Rate.objects.create(vendor=v, asset='BTC', buy_rate=Decimal('500000.00'), sell_rate=Decimal('495000.00'))

    # BotUser
    bu = BotUser.objects.create(chat_id='test_auto_accept_chat', vendor=v)

    # Simulate confirm callback
    cb = f'confirm_BTC_buy_0.01_{v.id}'
    text, markup = bh.handle_order_creation(cb, chat_id='test_auto_accept_chat')

    # There should be at least one transaction linked to the vendor's orders
    txns = Transaction.objects.filter(order__vendor=v)
    assert txns.exists(), 'Transaction should be created on auto-accept'
    # BotUser state should be awaiting_proof
    bu.refresh_from_db()
    assert bu.state == 'awaiting_proof'
    # Response should indicate automatic acceptance
    assert 'accepted automatically' in (text or '').lower()
