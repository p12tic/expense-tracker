import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Subtransaction
from expenses.models import Transaction


class TestSubtransactionView(TestCase):
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

        self.account1_user2 = Account.objects.create(
            user=self.user2, name='User2 Account 1', desc='Test account 1'
        )

        self.transaction1_user1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 1',
            date_time=datetime.datetime(2023, 1, 1, 12, 0, 0),
            timezone_offset=-120,
        )

        self.transaction2_user1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 2',
            date_time=datetime.datetime(2023, 1, 2, 12, 0, 0),
            timezone_offset=-120,
        )

        self.transaction3_user1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 3',
            date_time=datetime.datetime(2023, 1, 3, 12, 0, 0),
            timezone_offset=-120,
        )

        self.transaction_user2 = Transaction.objects.create(
            user=self.user2,
            desc='User2 transaction',
            date_time=datetime.datetime(2023, 1, 4, 12, 0, 0),
            timezone_offset=-120,
        )

        self.subtransaction1 = Subtransaction.objects.create(
            transaction=self.transaction1_user1,
            account=self.account1_user1,
            amount=10000,
        )

        self.subtransaction2 = Subtransaction.objects.create(
            transaction=self.transaction1_user1,
            account=self.account2_user1,
            amount=-5000,
        )

        self.subtransaction3 = Subtransaction.objects.create(
            transaction=self.transaction2_user1,
            account=self.account1_user1,
            amount=7500,
        )

        self.subtransaction4 = Subtransaction.objects.create(
            transaction=self.transaction3_user1,
            account=self.account2_user1,
            amount=2500,
        )

        self.subtransaction_user2 = Subtransaction.objects.create(
            transaction=self.transaction_user2,
            account=self.account1_user2,
            amount=3000,
        )

        self.url = '/api/subtransactions'

    def test_get_all_subtransactions(self):
        """Test getting all subtransactions without filters"""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {'account': 3, 'amount': 3000, 'id': 5, 'transaction': 4},
                {'account': 2, 'amount': 2500, 'id': 4, 'transaction': 3},
                {'account': 1, 'amount': 7500, 'id': 3, 'transaction': 2},
                {'account': 2, 'amount': -5000, 'id': 2, 'transaction': 1},
                {'account': 1, 'amount': 10000, 'id': 1, 'transaction': 1},
            ],
        )

    def test_get_subtransactions_ordered_by_date_descending(self):
        """Test that subtransactions are ordered by transaction date (descending) and then by id (descending)"""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            [sub['id'] for sub in response.data],
            [
                self.subtransaction_user2.id,  # Most recent transaction (Jan 4)
                self.subtransaction4.id,  # Next most recent (Jan 3)
                self.subtransaction3.id,  # Next (Jan 2)
                self.subtransaction2.id,  # Same transaction (Jan 1), higher id
                self.subtransaction1.id,  # Same transaction (Jan 1), lower id
            ],
        )

    def test_filter_by_transaction_id(self):
        """Test filtering subtransactions by transaction ID"""
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {'account': 2, 'amount': -5000, 'id': 2, 'transaction': 1},
                {'account': 1, 'amount': 10000, 'id': 1, 'transaction': 1},
            ],
        )

    def test_filter_by_nonexistent_transaction_id(self):
        """Test filtering by non-existent transaction ID returns empty list"""
        response = self.client.get(self.url, {'transaction': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_account_id(self):
        """Test filtering subtransactions by account ID"""
        response = self.client.get(self.url, {'account': self.account1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # 2 subtransactions for this account

        # Verify all subtransactions belong to the correct account
        account_ids = [sub['account'] for sub in response.data]
        self.assertTrue(all(aid == self.account1_user1.id for aid in account_ids))

    def test_filter_by_nonexistent_account_id(self):
        """Test filtering by non-existent account ID returns empty list"""
        response = self.client.get(self.url, {'account': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_date_lte(self):
        """Test filtering subtransactions by date less than or equal"""
        response = self.client.get(self.url, {'date_lte': '2023-01-02T12:00:00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            [
                Subtransaction.objects.get(id=sub['id']).transaction.date_time
                for sub in response.data
            ],
            [
                datetime.datetime(2023, 1, 2, 12, 0, tzinfo=datetime.timezone.utc),
                datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.timezone.utc),
                datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.timezone.utc),
            ],
        )

    def test_filter_by_date_gte(self):
        """Test filtering subtransactions by date greater than or equal"""
        response = self.client.get(self.url, {'date_gte': '2023-01-02T12:00:00'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            [
                Subtransaction.objects.get(id=sub['id']).transaction.date_time
                for sub in response.data
            ],
            [
                datetime.datetime(2023, 1, 4, 12, 0, tzinfo=datetime.timezone.utc),
                datetime.datetime(2023, 1, 3, 12, 0, tzinfo=datetime.timezone.utc),
                datetime.datetime(2023, 1, 2, 12, 0, tzinfo=datetime.timezone.utc),
            ],
        )

    def test_filter_by_date_range(self):
        """Test filtering subtransactions by date range (both gte and lte)"""
        response = self.client.get(
            self.url, {'date_gte': '2023-01-02T12:00:00', 'date_lte': '2023-01-03T12:00:00'}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [
                Subtransaction.objects.get(id=sub['id']).transaction.date_time
                for sub in response.data
            ],
            [
                datetime.datetime(2023, 1, 3, 12, 0, tzinfo=datetime.timezone.utc),
                datetime.datetime(2023, 1, 2, 12, 0, tzinfo=datetime.timezone.utc),
            ],
        )

    def test_filter_by_transaction_and_account(self):
        """Test filtering by multiple parameters (transaction and account)"""
        response = self.client.get(
            self.url, {'transaction': self.transaction1_user1.id, 'account': self.account1_user1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(response.data),
            [
                {
                    'account': self.account1_user1.id,
                    'amount': 10000,
                    'id': 1,
                    'transaction': self.transaction1_user1.id,
                }
            ],
        )

    def test_empty_subtransaction_list(self):
        """Test getting subtransactions when none exist"""
        Subtransaction.objects.all().delete()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_invalid_date_format(self):
        """Test filtering with invalid date format"""
        response = self.client.get(self.url, {'date_lte': 'invalid-date'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_transaction_id_format(self):
        """Test filtering with invalid transaction ID format"""
        response = self.client.get(self.url, {'transaction': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_account_id_format(self):
        """Test filtering with invalid account ID format"""
        response = self.client.get(self.url, {'account': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_many_subtransactions(self):
        for i in range(50):
            transaction = Transaction.objects.create(
                user=self.user1,
                desc=f'Bulk transaction {i}',
                date_time=datetime.datetime(2023, 1, 5, 12, 0, 0) + datetime.timedelta(days=i),
                timezone_offset=-120,
            )
            Subtransaction.objects.create(
                transaction=transaction,
                account=self.account1_user1 if i % 2 == 0 else self.account2_user1,
                amount=(i + 1) * 100,
            )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should have original 5 + 50 new = 55 subtransactions
        self.assertEqual(len(response.data), 55)
