
from django.contrib.auth.models import User
from django.test import TestCase
from django.conf import settings
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime, date

class TestAccountSync(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account = Account.objects.create(user=self.user,
                                              name='acc', desc='desc')

    def assert_balances_on_date(self, balance_on_date_time):
        for balance, date_time in balance_on_date_time:
            self.assertEqual(balance,
                             get_account_balance(self.account, date_time),
                             msg='On {0}'.format(date_time))

    def assert_cache_count(self, count):
        caches = AccountBalanceCache.objects.filter(account=self.account)
        self.assertEqual(count, len(caches))

    def assert_cache_entry(self, cache_entry_id, date, balance):
        caches = AccountBalanceCache.objects.filter(account=self.account)
        self.assertEqual(balance, caches[cache_entry_id].balance)
        self.assertEqual(date, caches[cache_entry_id].date)

    def create_transaction(self, date_time, amount):
        tr = Transaction.objects.create(desc='test', user=self.user,
                                        date_time=date_time)
        transaction_update_date_or_amount(tr, date_time,
                                          { self.account.id : amount })

        return tr

    def change_transaction(self, tr, date_time, amount):
        transaction_update_date_or_amount(tr, date_time,
                                          { self.account.id : amount })

    def test_account_sync_create(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 11, 0, 0)),
            ( 70, datetime(2000, 1, 2, 11, 0, 1)),
            ( 70, datetime(2000, 1, 2, 12, 0, 0)),
            ( 120, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(1)
        self.assert_cache_entry(0, date(2000, 1, 3), 120)

    def test_account_sync_create_at_end(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
            ( 150, datetime(2000, 1, 3, 14, 0, 0)),
            ( 70, datetime(2000, 1, 3, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(2)
        self.assert_cache_entry(0, date(2000, 1, 3), 150)
        self.assert_cache_entry(1, date(2000, 1, 4), 70)

    def test_account_sync_create_same_time_as_transaction(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 70)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0, microsecond=999999)),
            ( 70, datetime(2000, 1, 2, 12, 0, 1)),
            ( 70, datetime(2000, 1, 2, 14, 0, 0)),
            ( 90, datetime(2000, 1, 2, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(1)
        self.assert_cache_entry(0, date(2000, 1, 3), 90)

    def test_account_sync_create_same_time_as_event(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 70)
        with self.assertRaises(Exception):
            sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 110)

    def test_account_sync_delete(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_delete(event)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(1)
        self.assert_cache_entry(0, date(2000, 1, 3), 150)

    def test_account_sync_delete_at_end(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)
        sync_delete(event)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
            ( 150, datetime(2000, 1, 4, 0, 0, 0)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(2)
        self.assert_cache_entry(0, date(2000, 1, 3), 150)
        self.assert_cache_entry(1, date(2000, 1, 4), 150)

    def test_account_sync_change_amount(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_update_date_or_amount(event, datetime(2000, 1, 2, 11, 0, 1), 60)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 11, 0, 0)),
            ( 60, datetime(2000, 1, 2, 11, 0, 1)),
            ( 60, datetime(2000, 1, 2, 12, 0, 0)),
            ( 110, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(1)
        self.assert_cache_entry(0, date(2000, 1, 3), 110)

    def test_account_sync_change_time(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_update_date_or_amount(event, datetime(2000, 1, 2, 13, 0, 1), 70)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
            ( 150, datetime(2000, 1, 2, 13, 0, 0)),
            ( 70, datetime(2000, 1, 2, 13, 0, 1)),
            ( 70, datetime(2000, 1, 2, 14, 0, 0)),
            ( 90, datetime(2000, 1, 2, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(1)
        self.assert_cache_entry(0, date(2000, 1, 3), 90)

    def test_account_create_updates_all_following_caches(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 3, 12, 0, 1), 20)
        self.create_transaction(datetime(2000, 1, 4, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 5, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 6, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 7, 12, 0, 1), 1)

        sync_create(self.account, datetime(2000, 1, 3, 11, 0, 1), 70)
        sync_create(self.account, datetime(2000, 1, 6, 11, 0, 1), 80)

        balance_on_date_time = [
            ( 0, datetime(2000, 1, 1)),
            ( 0, datetime(2000, 1, 2, 10, 0, 0)),
            ( 100, datetime(2000, 1, 2, 10, 0, 1)),
            ( 100, datetime(2000, 1, 2, 12, 0, 0)),
            ( 150, datetime(2000, 1, 2, 12, 0, 1)),
            ( 150, datetime(2000, 1, 3, 11, 0, 0)),
            ( 70, datetime(2000, 1, 3, 11, 0, 1)),
            ( 70, datetime(2000, 1, 3, 12, 0, 0)),
            ( 90, datetime(2000, 1, 3, 12, 0, 1)),
            ( 90, datetime(2000, 1, 4, 12, 0, 0)),
            ( 91, datetime(2000, 1, 4, 12, 0, 1)),
            ( 91, datetime(2000, 1, 5, 12, 0, 0)),
            ( 92, datetime(2000, 1, 5, 12, 0, 1)),
            ( 92, datetime(2000, 1, 6, 11, 0, 0)),
            ( 80, datetime(2000, 1, 6, 11, 0, 1)),
            ( 80, datetime(2000, 1, 6, 12, 0, 0)),
            ( 81, datetime(2000, 1, 6, 12, 0, 1)),
            ( 81, datetime(2000, 1, 7, 12, 0, 0)),
            ( 82, datetime(2000, 1, 7, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        self.assert_cache_count(6)
        self.assert_cache_entry(0, date(2000, 1, 3), 150)
        self.assert_cache_entry(1, date(2000, 1, 4), 90)
        self.assert_cache_entry(2, date(2000, 1, 5), 91)
        self.assert_cache_entry(3, date(2000, 1, 6), 92)
        self.assert_cache_entry(4, date(2000, 1, 7), 81)
        self.assert_cache_entry(5, date(2000, 1, 8), 82)
