# Mock Python Code - Django & SQLAlchemy Anti-patterns

from models import User, Order
from django.db.models.functions import Cast, ExtractYear, TruncDate
from django.db.models import CharField

def report():
    users = User.objects.all()

    # Anti-pattern 1: N+1 clássico em loop (Error)
    for user in users:
        last_order = Order.objects.filter(user_id=user.id).first()
        user.last_order = last_order

def report_cast():
    # Anti-pattern 2: Cast explícito na coluna da query (Warning)
    users_with_cast = User.objects.annotate(str_id=Cast('id', output_field=CharField())).filter(str_id="123")

    # Anti-pattern 3: Extração de data que impede uso de índice (Warning)
    orders_2023 = Order.objects.annotate(year=ExtractYear('created_at')).filter(year=2023)

    # Anti-pattern 4: TruncDate que também ignora índice (Warning)
    daily_orders = Order.objects.annotate(date=TruncDate('created_at')).filter(date='2023-10-25')

    # Anti-pattern 5: Raw query contendo CAST manual (Warning)
    raw_users = User.objects.raw("SELECT * FROM users WHERE CAST(id AS VARCHAR) = '1'")

    # Anti-pattern 6: N+1 clássico com exclude() em loop (Error)
    for user in users:
        cancelled = Order.objects.exclude(status='completed')
