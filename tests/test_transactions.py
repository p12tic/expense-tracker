
from django.contrib.auth.models import User
from django.test import TestCase
from django.conf import settings
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime, date

class TestAccountBalance(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account = Account.objects.create(user=self.user,
                                              name='acc', desc='desc')

    def assert_balances_on_date(self, balance_on_date_time):
        for balance, date_time in balance_on_date_time:
            self.assertEqual(balance,
                             get_account_balance(self.account, date_time),
                             msg='On {0}'.format(date_time))

    def assert_cache_entry(self, cache_entry, date, balance):
        self.assertEqual(balance, cache_entry.balance)
        self.assertEqual(date, cache_entry.date)

    def create_transaction(self, date_time, amount):
        tr = Transaction.objects.create(desc='test', user=self.user,
                                        date_time=date_time)
        update_transaction_subtransactions(self.user, tr, tr.date_time,
                                           tr.date_time,
                                           { self.account.id : amount })
        return tr

    def delete_transaction(self, tr):
        update_transaction_subtransactions(self.user, tr, tr.date_time,
                                           tr.date_time, {})
        tr.delete()

    def test_empty_account_balance_zero(self):
        self.assertEqual(0, get_account_balance(self.account, datetime.min))
        self.assertEqual(0, get_account_balance(self.account, datetime.max))

    def test_single_transaction(self):
        tr = self.create_transaction(datetime(2000, 1, 2), 100)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 0, 0, 0, microsecond=0)),
            ( 100, datetime(2000, 1, 2, 0, 0, 0, microsecond=1)),
            ( 100, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        caches = AccountBalanceCache.objects.all()
        self.assertEqual(1, len(caches))
        self.assertEqual(100, caches[0].balance)
        self.assertEqual(date(2000, 1, 3), caches[0].date)

    def test_multiple_transactions_same_day(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 0), 100)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 12, 0, 0), 50)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 2, 0, 0, 0)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
            ( 150, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        caches = AccountBalanceCache.objects.all()
        self.assertEqual(1, len(caches))
        self.assert_cache_entry(caches[0], date(2000, 1, 3), 150)

    def test_multiple_transactions_different_days(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 0), 200)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 12, 0, 0), 100)
        tr3 = self.create_transaction(datetime(2000, 1, 3, 13, 0, 0), 50)
        tr4 = self.create_transaction(datetime(2000, 1, 3, 14, 0, 0), 20)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 2, 0, 0, 0)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 200, datetime(2000, 1, 2, 10, 0, 1)),
            ( 200, datetime(2000, 1, 2, 12, 0, 0)),
            ( 300, datetime(2000, 1, 2, 12, 0, 1)),
            ( 300, datetime(2000, 1, 3, 13, 0, 0)),
            ( 350, datetime(2000, 1, 3, 13, 0, 1)),
            ( 350, datetime(2000, 1, 3, 14, 0, 0)),
            ( 370, datetime(2000, 1, 3, 14, 0, 1)),
            ( 370, datetime(2000, 1, 4)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        caches = AccountBalanceCache.objects.all()
        self.assertEqual(2, len(caches))
        self.assert_cache_entry(caches[0], date(2000, 1, 3), 300)
        self.assert_cache_entry(caches[1], date(2000, 1, 4), 370)

    def test_transaction_removed(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 0), 100)
        self.delete_transaction(tr)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 2, 0, 0, 0)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 0, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        caches = AccountBalanceCache.objects.all()
        self.assertEqual(1, len(caches))
        self.assert_cache_entry(caches[0], date(2000, 1, 3), 0)

