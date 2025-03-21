from django.contrib.auth.models import User
from django.test import TestCase
from django.conf import settings
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime, date


class TestTransactions(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account1 = Account.objects.create(user=self.user, name='acc1', desc='desc')
        self.account2 = Account.objects.create(user=self.user, name='acc2', desc='desc')

    def assert_balances_on_date(self, balance_on_date_time):
        for balance, date_time in balance_on_date_time:
            self.assertEqual(
                balance,
                get_account_balance(self.account1, date_time),
                msg='On {0}'.format(date_time),
            )
            self.assertEqual(
                balance * 2,
                get_account_balance(self.account2, date_time),
                msg='On {0}'.format(date_time),
            )

    def assert_caches(self, cache_on_date):
        caches = AccountBalanceCache.objects.filter(account=self.account1)
        self.assertEqual(len(cache_on_date), len(caches))

        caches = AccountBalanceCache.objects.filter(account=self.account2)
        self.assertEqual(len(cache_on_date), len(caches))

        for balance, date in cache_on_date:
            caches = AccountBalanceCache.objects.filter(account=self.account1, date=date)
            self.assertEqual(1, len(caches), msg='On {0}'.format(date))
            self.assertEqual(balance, caches[0].balance, msg='On {0}'.format(date))

            caches = AccountBalanceCache.objects.filter(account=self.account2, date=date)
            self.assertEqual(1, len(caches), msg='On {0}'.format(date))
            self.assertEqual(balance * 2, caches[0].balance, msg='On {0}'.format(date))

    def get_account_amounts(self, amount):
        if amount is None:
            return {}
        return {self.account1.id: amount, self.account2.id: amount * 2}

    def create_transaction(self, date_time, amount):
        tr = Transaction.objects.create(desc='test', user=self.user, date_time=date_time)
        transaction_update_date_or_amount(tr, date_time, self.get_account_amounts(amount))

        return tr

    def change_transaction(self, tr, date_time, amount):
        transaction_update_date_or_amount(tr, date_time, self.get_account_amounts(amount))

    def test_empty_account_balance_zero(self):
        self.assertEqual(0, get_account_balance(self.account1, datetime.min))
        self.assertEqual(0, get_account_balance(self.account1, datetime.max))

    def test_single_transaction(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 0, 0, 1), 100)

        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 0, 0, 0, microsecond=999999)),
            (100, datetime(2000, 1, 2, 0, 0, 1, microsecond=0)),
            (100, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (100, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_single_transaction_zero(self):
        tr = self.create_transaction(datetime(2000, 1, 2), 0)

        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2)),
            (0, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (0, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_single_transaction_empty(self):
        tr = self.create_transaction(datetime(2000, 1, 2), None)

        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2)),
            (0, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_caches([])

    def test_multiple_transactions_same_day(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
            (150, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_multiple_transactions_different_days(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 200)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 100)
        tr3 = self.create_transaction(datetime(2000, 1, 3, 13, 0, 1), 50)
        tr4 = self.create_transaction(datetime(2000, 1, 3, 14, 0, 1), 20)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (200, datetime(2000, 1, 2, 10, 0, 1)),
            (200, datetime(2000, 1, 2, 12, 0, 0)),
            (300, datetime(2000, 1, 2, 12, 0, 1)),
            (300, datetime(2000, 1, 3, 13, 0, 0)),
            (350, datetime(2000, 1, 3, 13, 0, 1)),
            (350, datetime(2000, 1, 3, 14, 0, 0)),
            (370, datetime(2000, 1, 3, 14, 0, 1)),
            (370, datetime(2000, 1, 4)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (300, date(2000, 1, 3)),
            (370, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_remove(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 0), 100)
        transaction_delete(tr)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (0, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_multiple_added_removed(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        transaction_delete(tr2)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (100, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_multiple_added_removed_same_time(self):
        tr1 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        tr2 = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 50)
        transaction_delete(tr2)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (100, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_time(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.change_transaction(tr, datetime(2000, 1, 2, 12, 0, 1), 100)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 2, 12, 0, 0)),
            (100, datetime(2000, 1, 2, 12, 0, 1)),
            (100, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (100, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_time_different_day(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.change_transaction(tr, datetime(2000, 1, 3, 12, 0, 1), 100)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 3, 12, 0, 0)),
            (100, datetime(2000, 1, 3, 12, 0, 1)),
            (100, datetime(2000, 1, 4)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (0, date(2000, 1, 3)),
            (100, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.change_transaction(tr, datetime(2000, 1, 2, 10, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (50, datetime(2000, 1, 2, 10, 0, 1)),
            (50, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (50, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount_time(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.change_transaction(tr, datetime(2000, 1, 2, 12, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 2, 12, 0, 0)),
            (50, datetime(2000, 1, 2, 12, 0, 1)),
            (50, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (50, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount_time_different_day(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.change_transaction(tr, datetime(2000, 1, 3, 12, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 3, 12, 0, 0)),
            (50, datetime(2000, 1, 3, 12, 0, 1)),
            (50, datetime(2000, 1, 4)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (0, date(2000, 1, 3)),
            (50, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount_create(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 0)
        self.change_transaction(tr, datetime(2000, 1, 2, 10, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (50, datetime(2000, 1, 2, 10, 0, 1)),
            (50, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (50, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount_time_create(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 0)
        self.change_transaction(tr, datetime(2000, 1, 2, 12, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 2, 12, 0, 0)),
            (50, datetime(2000, 1, 2, 12, 0, 1)),
            (50, datetime(2000, 1, 3)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (50, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_transaction_change_amount_time_different_day_create(self):
        tr = self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 0)
        self.change_transaction(tr, datetime(2000, 1, 3, 12, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 3, 12, 0, 0)),
            (50, datetime(2000, 1, 3, 12, 0, 1)),
            (50, datetime(2000, 1, 4)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (0, date(2000, 1, 3)),
            (50, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_correct_cache_when_transaction_at_day_begin(self):
        self.create_transaction(datetime(2000, 1, 3, 0, 0, 0), 20)
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 50)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (50, datetime(2000, 1, 2, 10, 0, 1)),
            (50, datetime(2000, 1, 2, 23, 59, 59, microsecond=999999)),
            (70, datetime(2000, 1, 3, 0, 0, 0)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (50, date(2000, 1, 3)),
            (70, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_correct_cache_when_transaction_at_day_end(self):
        self.create_transaction(datetime(2000, 1, 3, 10, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 23, 59, 59, microsecond=999999), 20)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 0, 0, 0)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (0, datetime(2000, 1, 2, 23, 59, 59, microsecond=999998)),
            (20, datetime(2000, 1, 2, 23, 59, 59, microsecond=999999)),
            (20, datetime(2000, 1, 3, 0, 0, 0)),
            (20, datetime(2000, 1, 3, 10, 0, 0)),
            (70, datetime(2000, 1, 3, 10, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (20, date(2000, 1, 3)),
            (70, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)
