
from django.contrib.auth.models import User
from django.test import TestCase
from django.conf import settings
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime, date

def update_transaction_subtransactions_same_time(user, transaction,
                                                 account_amounts):
    update_transaction_subtransactions(user, transaction, transaction.date_time,
                                       transaction.date_time, account_amounts)

class TestGetAccountBalance(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account = Account.objects.create(user=self.user,
                                              name='acc', desc='desc')

    def test_empty_account_balance_zero(self):
        self.assertEqual(0, get_account_balance(self.account, datetime.min))
        self.assertEqual(0, get_account_balance(self.account, datetime.max))

    def test_single_transaction(self):
        tr = Transaction.objects.create(desc='test', user=self.user,
                                        date_time=datetime(2000, 1, 2))

        update_transaction_subtransactions_same_time(
                self.user, tr, { self.account.id : 100 })

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 0, 0, 0, microsecond=0)),
            ( 100, datetime(2000, 1, 2, 0, 0, 0, microsecond=1)),
            ( 100, datetime(2000, 1, 3)),
        ]
        for balance, date_time in balance_on_date_time:
            self.assertEqual(balance,
                             get_account_balance(self.account, date_time),
                             msg='On {0}'.format(date_time))

        caches = AccountBalanceCache.objects.all()
        self.assertEqual(1, len(caches))
        self.assertEqual(100, caches[0].balance)
        self.assertEqual(date(2000, 1, 3), caches[0].date)

