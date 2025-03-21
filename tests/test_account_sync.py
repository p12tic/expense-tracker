from django.contrib.auth.models import User
from django.test import TestCase
from django.conf import settings
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime, date


class TestAccountSync(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account = Account.objects.create(user=self.user, name='acc', desc='desc')

    def assert_balances_on_date(self, balance_on_date_time):
        for balance, date_time in balance_on_date_time:
            self.assertEqual(
                balance,
                get_account_balance(self.account, date_time),
                msg='On {0}'.format(date_time),
            )

    def assert_caches(self, cache_on_date):
        caches = AccountBalanceCache.objects.filter(account=self.account)
        self.assertEqual(len(cache_on_date), len(caches))

        for balance, date in cache_on_date:
            caches = AccountBalanceCache.objects.filter(account=self.account, date=date)
            self.assertEqual(1, len(caches), msg='On {0}'.format(date))
            self.assertEqual(balance, caches[0].balance, msg='On {0}'.format(date))

    def create_transaction(self, date_time, amount):
        tr = Transaction.objects.create(desc='test', user=self.user, date_time=date_time)
        transaction_update_date_or_amount(tr, date_time, {self.account.id: amount})

        return tr

    def change_transaction(self, tr, date_time, amount):
        transaction_update_date_or_amount(tr, date_time, {self.account.id: amount})

    def test_account_sync_create_no_transactions(self):
        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        balance_on_date_time = [
            (0, datetime(2000, 1, 2, 11, 0, 0)),
            (70, datetime(2000, 1, 2, 11, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (70, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def verify_account_sync_create(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 11, 0, 0)),
            (70, datetime(2000, 1, 2, 11, 0, 1)),
            (70, datetime(2000, 1, 2, 12, 0, 0)),
            (120, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (120, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_create(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        self.verify_account_sync_create()

    def test_account_sync_create_before_transactions(self):
        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        self.verify_account_sync_create()

    def verify_account_sync_create_nodiff(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 11, 0, 0)),
            (100, datetime(2000, 1, 2, 11, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_create_nodiff(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 100)

        self.verify_account_sync_create_nodiff()

    def test_account_sync_create_nodiff_before_transactions(self):
        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 100)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        self.verify_account_sync_create_nodiff()

    def verify_account_sync_create_at_end(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
            (150, datetime(2000, 1, 3, 14, 0, 0)),
            (70, datetime(2000, 1, 3, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
            (70, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_create_at_end(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)

        self.verify_account_sync_create_at_end()

    def test_account_sync_create_at_end_before_transactions(self):
        sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (100, datetime(2000, 1, 2, 12, 0, 1)),
            (100, datetime(2000, 1, 3, 14, 0, 0)),
            (70, datetime(2000, 1, 3, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        self.verify_account_sync_create_at_end()

    def verify_account_sync_create_same_time_as_transaction(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (100, datetime(2000, 1, 2, 12, 0, 0, microsecond=999999)),
            (70, datetime(2000, 1, 2, 12, 0, 1)),
            (70, datetime(2000, 1, 2, 14, 0, 0)),
            (90, datetime(2000, 1, 2, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (90, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_create_same_time_as_transaction(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 70)

        self.verify_account_sync_create_same_time_as_transaction()

    def test_account_sync_create_same_time_as_transaction_before_tr(self):
        sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 70)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        self.verify_account_sync_create_same_time_as_transaction()

    def test_account_sync_create_same_time_as_event(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)

        sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 70)
        with self.assertRaises(Exception):
            sync_create(self.account, datetime(2000, 1, 2, 12, 0, 1), 110)

    def verify_account_sync_delete(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_delete(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_delete(event)

        self.verify_account_sync_delete()

    def test_account_sync_delete_before_transactions(self):
        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_delete(event)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        self.verify_account_sync_delete()

    def test_account_sync_delete_before_after_transactions(self):
        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_delete(event)

        self.verify_account_sync_delete()

    def verify_account_sync_delete_at_end(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
            (150, datetime(2000, 1, 4, 0, 0, 0)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
            (150, date(2000, 1, 4)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_delete_at_end(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)
        sync_delete(event)

        self.verify_account_sync_delete_at_end()

    def test_account_sync_delete_at_end_before_transactions(self):
        event = sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)
        sync_delete(event)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        self.verify_account_sync_delete_at_end()

    def test_account_sync_delete_at_end_before_after_transactions(self):
        event = sync_create(self.account, datetime(2000, 1, 3, 14, 0, 1), 70)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        sync_delete(event)

        self.verify_account_sync_delete_at_end()

    def test_account_sync_change_amount(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)

        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_update_date_or_amount(event, datetime(2000, 1, 2, 11, 0, 1), 60)
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 11, 0, 0)),
            (60, datetime(2000, 1, 2, 11, 0, 1)),
            (60, datetime(2000, 1, 2, 12, 0, 0)),
            (110, datetime(2000, 1, 2, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (110, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_change_time(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 2, 14, 0, 1), 20)
        event = sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)
        sync_update_date_or_amount(event, datetime(2000, 1, 2, 13, 0, 1), 70)

        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
            (150, datetime(2000, 1, 2, 13, 0, 0)),
            (70, datetime(2000, 1, 2, 13, 0, 1)),
            (70, datetime(2000, 1, 2, 14, 0, 0)),
            (90, datetime(2000, 1, 2, 14, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (90, date(2000, 1, 3)),
        ]
        self.assert_caches(cache_on_date)

    def verify_account_sync_create_updates_all_following_caches(self):
        balance_on_date_time = [
            (0, datetime(2000, 1, 1)),
            (0, datetime(2000, 1, 2, 10, 0, 0)),
            (100, datetime(2000, 1, 2, 10, 0, 1)),
            (100, datetime(2000, 1, 2, 12, 0, 0)),
            (150, datetime(2000, 1, 2, 12, 0, 1)),
            (150, datetime(2000, 1, 3, 11, 0, 0)),
            (70, datetime(2000, 1, 3, 11, 0, 1)),
            (70, datetime(2000, 1, 3, 12, 0, 0)),
            (90, datetime(2000, 1, 3, 12, 0, 1)),
            (90, datetime(2000, 1, 4, 12, 0, 0)),
            (91, datetime(2000, 1, 4, 12, 0, 1)),
            (91, datetime(2000, 1, 5, 12, 0, 0)),
            (92, datetime(2000, 1, 5, 12, 0, 1)),
            (92, datetime(2000, 1, 6, 11, 0, 0)),
            (80, datetime(2000, 1, 6, 11, 0, 1)),
            (80, datetime(2000, 1, 6, 12, 0, 0)),
            (81, datetime(2000, 1, 6, 12, 0, 1)),
            (81, datetime(2000, 1, 7, 12, 0, 0)),
            (82, datetime(2000, 1, 7, 12, 0, 1)),
        ]
        self.assert_balances_on_date(balance_on_date_time)

        cache_on_date = [
            (150, date(2000, 1, 3)),
            (90, date(2000, 1, 4)),
            (91, date(2000, 1, 5)),
            (92, date(2000, 1, 6)),
            (81, date(2000, 1, 7)),
            (82, date(2000, 1, 8)),
        ]
        self.assert_caches(cache_on_date)

    def test_account_sync_create_updates_all_following_caches(self):
        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 3, 12, 0, 1), 20)
        self.create_transaction(datetime(2000, 1, 4, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 5, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 6, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 7, 12, 0, 1), 1)

        sync_create(self.account, datetime(2000, 1, 3, 11, 0, 1), 70)
        sync_create(self.account, datetime(2000, 1, 6, 11, 0, 1), 80)

        self.verify_account_sync_create_updates_all_following_caches()

    def test_account_sync_create_updates_all_following_caches_before_tr(self):
        sync_create(self.account, datetime(2000, 1, 3, 11, 0, 1), 70)
        sync_create(self.account, datetime(2000, 1, 6, 11, 0, 1), 80)

        self.create_transaction(datetime(2000, 1, 2, 10, 0, 1), 100)
        self.create_transaction(datetime(2000, 1, 2, 12, 0, 1), 50)
        self.create_transaction(datetime(2000, 1, 3, 12, 0, 1), 20)
        self.create_transaction(datetime(2000, 1, 4, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 5, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 6, 12, 0, 1), 1)
        self.create_transaction(datetime(2000, 1, 7, 12, 0, 1), 1)

        self.verify_account_sync_create_updates_all_following_caches()


class TestDbUtils(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='test')
        self.account = Account.objects.create(user=self.user, name='acc', desc='desc')

    def create_transaction(self, date_time, amount):
        tr = Transaction.objects.create(desc='test', user=self.user, date_time=date_time)
        transaction_update_date_or_amount(tr, date_time, {self.account.id: amount})

        return tr

    def test_get_account_balances_for_subtransactions_range_with_sync(self):
        sync_create(self.account, datetime(2000, 1, 2, 11, 0, 1), 70)

        sub_queryset = Subtransaction.objects.filter(account=self.account).order_by(
            'transaction__date_time'
        )
        sub_balances = get_account_balances_for_subtransactions_range(self.account, sub_queryset)
        self.assertEqual(1, len(sub_balances))
        self.assertEqual(70, sub_balances[0][1])

    def test_get_account_balances_for_subtransactions_range_with_no_sync(self):
        self.create_transaction(datetime(2000, 1, 6, 12, 0, 1), 10)
        self.create_transaction(datetime(2000, 1, 7, 12, 0, 1), 10)

        sub_queryset = Subtransaction.objects.filter(account=self.account).order_by(
            'transaction__date_time'
        )
        sub_balances = get_account_balances_for_subtransactions_range(self.account, sub_queryset)
        self.assertEqual(2, len(sub_balances))
        self.assertEqual(10, sub_balances[0][1])
        self.assertEqual(20, sub_balances[1][1])
