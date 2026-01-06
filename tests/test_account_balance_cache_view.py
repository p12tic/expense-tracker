from datetime import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import AccountBalanceCache


class TestAccountBalanceCacheView(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='testuser1', password='testpass123')
        self.user2 = User.objects.create_user(username='testuser2', password='testpass123')

        self.account1 = Account.objects.create(
            user=self.user1, name='Test Account 1', desc='Test Description 1'
        )
        self.account2 = Account.objects.create(
            user=self.user1, name='Test Account 2', desc='Test Description 2'
        )
        self.account_user2 = Account.objects.create(
            user=self.user2, name='User2 Account', desc='User2 Description'
        )

        self.cache1 = AccountBalanceCache.objects.create(
            account=self.account1,
            balance=1000,
            date=timezone.make_aware(datetime(2023, 1, 1, 0, 0, 0)),
            timezone_offset=-120,
        )
        self.cache2 = AccountBalanceCache.objects.create(
            account=self.account1,
            balance=1500,
            date=timezone.make_aware(datetime(2023, 1, 15, 0, 0, 0)),
            timezone_offset=-120,
        )
        self.cache3 = AccountBalanceCache.objects.create(
            account=self.account2,
            balance=2000,
            date=timezone.make_aware(datetime(2023, 1, 10, 0, 0, 0)),
            timezone_offset=-120,
        )
        self.cache_user2 = AccountBalanceCache.objects.create(
            account=self.account_user2,
            balance=3000,
            date=timezone.make_aware(datetime(2023, 1, 5, 0, 0, 0)),
            timezone_offset=-120,
        )

        self.url = '/api/account_balance_cache'

    def test_get_balance_cache_unauthenticated(self):
        """Test that unauthenticated users cannot access balance cache"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_all_balance_cache_authenticated(self):
        """Test that authenticated users can get only their own balance cache entries"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            sorted([cache['account'] for cache in response.data]),
            sorted([self.account1.id, self.account1.id, self.account2.id]),
        )

    def test_get_balance_cache_filter_by_account(self):
        """Test filtering balance cache by account ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': self.account1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [cache['account'] for cache in response.data], [self.account1.id, self.account1.id]
        )

    def test_get_balance_cache_filter_by_nonexistent_account(self):
        """Test filtering by non-existent account ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_balance_cache_filter_by_date_lte(self):
        """Test filtering balance cache by date_lte parameter"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'date_lte': '2023-01-10T00:00:00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return cache entries from Jan 1 and Jan 10
        # User1 has cache entries: account1 (Jan 1, Jan 15) and account2 (Jan 10)
        # With date_lte='2023-01-10T00:00:00', should get Jan 1 and Jan 10 entries
        self.assertEqual(
            response.data,
            [
                {
                    'account': 1,
                    'balance': 1000,
                    'date': '2023-01-01T00:00:00Z',
                    'id': 1,
                    'timezone_offset': -120,
                },
                {
                    'account': 2,
                    'balance': 2000,
                    'date': '2023-01-10T00:00:00Z',
                    'id': 3,
                    'timezone_offset': -120,
                },
            ],
        )

    def test_get_balance_cache_filter_by_date_gte(self):
        """Test filtering balance cache by date_gte parameter"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'date_gte': '2023-01-10T00:00:00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return cache entries from Jan 10 and Jan 15
        self.assertEqual(
            list(response.data),
            [
                {
                    'account': 1,
                    'balance': 1500,
                    'date': '2023-01-15T00:00:00Z',
                    'id': 2,
                    'timezone_offset': -120,
                },
                {
                    'account': 2,
                    'balance': 2000,
                    'date': '2023-01-10T00:00:00Z',
                    'id': 3,
                    'timezone_offset': -120,
                },
            ],
        )

    def test_get_balance_cache_invalid_date_format(self):
        """Test that invalid date format raises ValidationError"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'date_lte': 'invalid-date'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_balance_cache_invalid_account_id(self):
        """Test that invalid account ID raises ValidationError"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_balance_cache_with_negative_balance(self):
        """Test that negative balances are handled correctly"""
        AccountBalanceCache.objects.create(
            account=self.account1,
            balance=-500,
            date=timezone.make_aware(datetime(2023, 2, 1, 0, 0, 0)),
            timezone_offset=-120,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': self.account1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            list(response.data),
            [
                {
                    'account': 1,
                    'balance': 1000,
                    'date': '2023-01-01T00:00:00Z',
                    'id': 1,
                    'timezone_offset': -120,
                },
                {
                    'account': 1,
                    'balance': 1500,
                    'date': '2023-01-15T00:00:00Z',
                    'id': 2,
                    'timezone_offset': -120,
                },
                {
                    'account': 1,
                    'balance': -500,
                    'date': '2023-02-01T00:00:00Z',
                    'id': 5,
                    'timezone_offset': -120,
                },
            ],
        )

    def test_balance_cache_timezone_handling(self):
        """Test that different timezone offsets are handled correctly"""
        # Create cache entries with different timezone offsets
        AccountBalanceCache.objects.create(
            account=self.account1,
            balance=2500,
            date=timezone.make_aware(datetime(2023, 3, 1, 0, 0, 0)),
            timezone_offset=0,  # UTC
        )
        AccountBalanceCache.objects.create(
            account=self.account1,
            balance=3000,
            date=timezone.make_aware(datetime(2023, 3, 15, 0, 0, 0)),
            timezone_offset=300,  # EST (UTC-5)
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': self.account1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {
                    'account': 1,
                    'balance': 1000,
                    'date': '2023-01-01T00:00:00Z',
                    'id': 1,
                    'timezone_offset': -120,
                },
                {
                    'account': 1,
                    'balance': 1500,
                    'date': '2023-01-15T00:00:00Z',
                    'id': 2,
                    'timezone_offset': -120,
                },
                {
                    'account': 1,
                    'balance': 2500,
                    'date': '2023-03-01T00:00:00Z',
                    'id': 5,
                    'timezone_offset': 0,
                },
                {
                    'account': 1,
                    'balance': 3000,
                    'date': '2023-03-15T00:00:00Z',
                    'id': 6,
                    'timezone_offset': 300,
                },
            ],
        )
