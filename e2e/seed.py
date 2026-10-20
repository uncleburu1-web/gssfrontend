from django.contrib.auth.models import User
from core.models import Organization, Shop
from staff.models import Worker
from inventory.models import InventoryItem, StockBatch
from subscriptions.models import get_or_create_subscription
ceo = User.objects.create_user(username='ceo', password='pass12345')
org = Organization.objects.create(name='E2E Store', owner=ceo, business_type='general')
shop = Shop.objects.create(name='E2E Store', organization=org)
Worker.objects.create(user=ceo, full_name='Chief Owner', role='owner', shop=shop)
sade = User.objects.create_user(username='sade', password='pass12345')
Worker.objects.create(user=sade, full_name='Sade Seller', role='seller', shop=shop)
item = InventoryItem.objects.create(shop=shop, name='Palm Oil 1L', sell_price=2500)
StockBatch.objects.create(item=item, shop=shop, batch_number='B1', quantity_received=20, quantity_remaining=20, cost_price=1800, selling_price=2500)
get_or_create_subscription(org)
print('seeded', item.id)

# Stages 7-10: a second branch (moving stock) and a second owner account (owner role, not the
# registered business owner) used by gssdesktop/e2e/till-e2e2.cjs.
Shop.objects.get_or_create(name='E2E Lekki', organization=org)
co = User.objects.create_user(username='coowner', password='pass12345')
Worker.objects.create(user=co, full_name='Co Owner', role='owner', shop=shop)
