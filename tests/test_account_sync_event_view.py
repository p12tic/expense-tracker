from datetime import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import AccountBalanceCache
from expenses.models import AccountSyncEvent
from expenses.models import Subtransaction
from expenses.models import Transaction


class TestAccountSyncEventView(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='testuser1', password='testpass123')
        self.user2 = User.objects.create_user(username='testuser2', password='testpass123')

        self.account1_user1 = Account.objects.create(
            user=self.user1, name='User1 Account 1', desc='Test account 1'
        )
        self.account2_user1 = Account.objects.create(
            user=self.user1, name='User1 Account 2', desc='Test account 2'
        )

        self.account_user2 = Account.objects.create(
            user=self.user2, name='User2 Account', desc='User2 Description'
        )

        self.url = '/api/account_sync_event'

    def test_get_account_sync_events_unauthenticated(self):
        """Test that unauthenticated users can access account sync events"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_account_sync_events_authenticated(self):
        """Test that authenticated users can get their account sync events"""
        self.client.force_authenticate(user=self.user1)

        # Create some sync events
        transaction1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 1',
            date_time=datetime(2023, 1, 1, 12, 0, 0),
            timezone_offset=-120,
        )
        subtransaction1 = Subtransaction.objects.create(
            transaction=transaction1, account=self.account1_user1, amount=1000
        )
        AccountSyncEvent.objects.create(
            account=self.account1_user1, balance=5000, subtransaction=subtransaction1
        )

        transaction2 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 2',
            date_time=datetime(2023, 1, 2, 12, 0, 0),
            timezone_offset=-120,
        )
        subtransaction2 = Subtransaction.objects.create(
            transaction=transaction2, account=self.account2_user1, amount=2000
        )
        AccountSyncEvent.objects.create(
            account=self.account2_user1, balance=7000, subtransaction=subtransaction2
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_account_sync_events_filter_by_subtransaction(self):
        """Test filtering account sync events by subtransaction ID"""
        self.client.force_authenticate(user=self.user1)

        transaction = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction',
            date_time=datetime(2023, 1, 1, 12, 0, 0),
            timezone_offset=-120,
        )
        subtransaction = Subtransaction.objects.create(
            transaction=transaction, account=self.account1_user1, amount=1000
        )
        sync_event = AccountSyncEvent.objects.create(
            account=self.account1_user1, balance=5000, subtransaction=subtransaction
        )

        response = self.client.get(self.url, {'subtransaction': subtransaction.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], sync_event.id)

    def test_get_account_sync_events_filter_by_nonexistent_subtransaction(self):
        """Test filtering by non-existent subtransaction ID returns empty list"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(self.url, {'subtransaction': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_account_sync_event_success_no_cache(self):
        """Test successful account sync event creation when no cache exists"""
        self.client.force_authenticate(user=self.user1)

        # Create some existing transactions to establish a balance
        transaction = Transaction.objects.create(
            user=self.user1,
            desc='Existing transaction',
            date_time=datetime(2023, 1, 1, 10, 0, 0),
            timezone_offset=-120,
        )
        Subtransaction.objects.create(
            transaction=transaction,
            account=self.account1_user1,
            amount=3000,  # $30.00
        )

        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the sync event was created
        sync_events = AccountSyncEvent.objects.filter(account=self.account1_user1)
        self.assertEqual(len(sync_events), 1)

        sync_event = sync_events[0]
        self.assertEqual(sync_event.balance, 5000)

        # Verify the subtransaction was created with correct amount
        # Expected amount: 5000 - 3000 = 2000 (difference between sync balance and current balance)
        self.assertEqual(sync_event.subtransaction.amount, 2000)
        self.assertEqual(sync_event.subtransaction.account, self.account1_user1)

    def test_create_account_sync_event_success_with_cache(self):
        """Test successful account sync event creation when cache exists"""
        self.client.force_authenticate(user=self.user1)

        # Create a cache entry
        AccountBalanceCache.objects.create(
            account=self.account1_user1,
            balance=2000,  # $20.00
            date=datetime(2022, 12, 31, 23, 59, 59),
            timezone_offset=-120,
        )

        # Create transactions after the cache date
        transaction1 = Transaction.objects.create(
            user=self.user1,
            desc='Transaction after cache',
            date_time=datetime(2023, 1, 1, 10, 0, 0),
            timezone_offset=-120,
        )
        Subtransaction.objects.create(
            transaction=transaction1,
            account=self.account1_user1,
            amount=1500,  # $15.00
        )

        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 6000,  # $60.00 (in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the sync event was created
        sync_events = AccountSyncEvent.objects.filter(account=self.account1_user1)
        self.assertEqual(len(sync_events), 1)

        sync_event = sync_events[0]
        self.assertEqual(sync_event.balance, 6000)

        # Expected amount: 6000 - (2000 + 1500) = 2500
        self.assertEqual(sync_event.subtransaction.amount, 2500)

    def test_create_account_sync_event_no_difference(self):
        """Test account sync event creation when balance difference is zero"""
        self.client.force_authenticate(user=self.user1)

        # Create a transaction that establishes balance
        transaction = Transaction.objects.create(
            user=self.user1,
            desc='Existing transaction',
            date_time=datetime(2023, 1, 1, 10, 0, 0),
            timezone_offset=-120,
        )
        Subtransaction.objects.create(
            transaction=transaction,
            account=self.account1_user1,
            amount=3000,  # $30.00
        )

        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 3000,  # Same as current balance (in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the sync event was created
        sync_events = AccountSyncEvent.objects.filter(account=self.account1_user1)
        self.assertEqual(len(sync_events), 1)

        sync_event = sync_events[0]
        self.assertEqual(sync_event.balance, 3000)

        # Expected amount: 3000 - 3000 = 0
        self.assertEqual(sync_event.subtransaction.amount, 0)

    def test_create_account_sync_event_unauthenticated(self):
        """Test that unauthenticated users get an error when creating sync events"""

        response = self.client.post(
            self.url,
            {
                'id': self.account1_user1.id,
                'date': '2023-01-01T12:00:00',
                'dateYear': '2023-01-01T00:00:00',
                'timezoneOffset': -120,
                'balance': 5000,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_account_sync_event_nonexistent_account(self):
        """Test creating sync event for non-existent account"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'id': 99999,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }

        with self.assertRaises(Account.DoesNotExist):
            self.client.post(self.url, data)

    def test_create_account_sync_event_other_users_account(self):
        """Test that users cannot create sync events for other users' accounts"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'id': self.account_user2.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_account_sync_event_missing_fields(self):
        """Test account sync event creation with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing id
        data = {
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing date
        data = {
            'id': self.account1_user1.id,
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing timezoneOffset
        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'balance': 5000,  # $50.00 (in cents)
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing balance
        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_create_account_sync_event_invalid_date_format(self):
        """Test account sync event creation with invalid date format"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'id': self.account1_user1.id,
            'date': 'invalid-date',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }

        with self.assertRaises(ValueError):
            self.client.post(self.url, data)

    def test_user_isolation_in_sync_events(self):
        """Test that users can only see their own account sync events"""
        # Note: The current view implementation doesn't properly filter by user,
        # so this test documents the current behavior rather than the desired behavior

        # Create sync events for user1
        self.client.force_authenticate(user=self.user1)

        transaction1 = Transaction.objects.create(
            user=self.user1,
            desc='User1 transaction',
            date_time=datetime(2023, 1, 1, 12, 0, 0),
            timezone_offset=-120,
        )
        subtransaction1 = Subtransaction.objects.create(
            transaction=transaction1, account=self.account1_user1, amount=1000
        )
        AccountSyncEvent.objects.create(
            account=self.account1_user1, balance=5000, subtransaction=subtransaction1
        )

        # Create sync events for user2
        self.client.force_authenticate(user=self.user2)

        transaction2 = Transaction.objects.create(
            user=self.user2,
            desc='User2 transaction',
            date_time=datetime(2023, 1, 2, 12, 0, 0),
            timezone_offset=-120,
        )
        subtransaction2 = Subtransaction.objects.create(
            transaction=transaction2, account=self.account_user2, amount=2000
        )
        AccountSyncEvent.objects.create(
            account=self.account_user2, balance=7000, subtransaction=subtransaction2
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(
            response.data, [{'id': 1, 'balance': 5000, 'account': 1, 'subtransaction': 1}]
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(
            response.data, [{'account': 3, 'balance': 7000, 'id': 2, 'subtransaction': 2}]
        )

    def test_empty_sync_event_list(self):
        """Test user with no sync events gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_sync_event_creation_creates_transaction(self):
        """Test that sync event creation also creates a transaction"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 5000,  # $50.00 (in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify a transaction was created
        transactions = Transaction.objects.filter(user=self.user1)
        self.assertEqual(len(transactions), 1)

        transaction = transactions[0]
        self.assertEqual(transaction.desc, '')  # Empty description for sync transactions
        self.assertEqual(transaction.timezone_offset, -120)

    def test_sync_event_with_negative_balance_difference(self):
        """Test sync event creation when balance difference is negative"""
        self.client.force_authenticate(user=self.user1)

        # Create a transaction that establishes balance
        transaction = Transaction.objects.create(
            user=self.user1,
            desc='Existing transaction',
            date_time=datetime(2023, 1, 1, 10, 0, 0),
            timezone_offset=-120,
        )
        Subtransaction.objects.create(
            transaction=transaction,
            account=self.account1_user1,
            amount=5000,  # $50.00
        )

        data = {
            'id': self.account1_user1.id,
            'date': '2023-01-01T12:00:00',
            'dateYear': '2023-01-01T00:00:00',
            'timezoneOffset': -120,
            'balance': 3000,  # $30.00 (less than current balance, in cents)
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the sync event was created with negative amount
        sync_events = AccountSyncEvent.objects.filter(account=self.account1_user1)
        self.assertEqual(len(sync_events), 1)

        sync_event = sync_events[0]
        self.assertEqual(sync_event.balance, 3000)
        self.assertEqual(sync_event.subtransaction.amount, -2000)  # Negative amount
