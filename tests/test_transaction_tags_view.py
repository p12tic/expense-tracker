from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Tag
from expenses.models import Transaction
from expenses.models import TransactionTag


class TestTransactionTagsView(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='testuser1', password='testpass123')
        self.user2 = User.objects.create_user(username='testuser2', password='testpass123')

        self.account1 = Account.objects.create(
            user=self.user1, name='Test Account 1', desc='Test Account Description 1'
        )
        self.account2 = Account.objects.create(
            user=self.user1, name='Test Account 2', desc='Test Account Description 2'
        )

        self.tag1 = Tag.objects.create(
            user=self.user1, name='Test Tag 1', desc='Test Tag Description 1'
        )
        self.tag2 = Tag.objects.create(
            user=self.user1, name='Test Tag 2', desc='Test Tag Description 2'
        )
        self.tag_user2 = Tag.objects.create(
            user=self.user2, name='User2 Tag', desc='User2 Tag Description'
        )

        self.transaction1 = Transaction.objects.create(
            user=self.user1,
            desc='Test Transaction 1',
            date_time='2023-01-01T10:00:00Z',
            timezone_offset=-120,
        )
        self.transaction2 = Transaction.objects.create(
            user=self.user1,
            desc='Test Transaction 2',
            date_time='2023-01-02T10:00:00Z',
            timezone_offset=-120,
        )
        self.transaction_user2 = Transaction.objects.create(
            user=self.user2,
            desc='User2 Transaction',
            date_time='2023-01-03T10:00:00Z',
            timezone_offset=-120,
        )

        self.transaction_tag1 = TransactionTag.objects.create(
            transaction=self.transaction1, tag=self.tag1
        )
        self.transaction_tag2 = TransactionTag.objects.create(
            transaction=self.transaction1, tag=self.tag2
        )
        self.transaction_tag3 = TransactionTag.objects.create(
            transaction=self.transaction2, tag=self.tag1
        )
        self.transaction_tag_user2 = TransactionTag.objects.create(
            transaction=self.transaction_user2, tag=self.tag_user2
        )

        self.url = '/api/transaction_tags'

    def test_get_all_transaction_tags_unauthenticated(self):
        """Test that unauthenticated users cannot access transaction tags"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_all_transaction_tags_authenticated(self):
        """Test that authenticated users can get only their own transaction tags"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return only user1's transaction tags (3 total)
        self.assertEqual(
            response.data,
            [
                {'id': 1, 'tag': 1, 'transaction': 1},
                {'id': 2, 'tag': 2, 'transaction': 1},
                {'id': 3, 'tag': 1, 'transaction': 2},
            ],
        )

    def test_get_transaction_tags_filtered_by_transaction(self):
        """Test filtering transaction tags by transaction ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return 2 transaction tags for transaction1
        self.assertEqual(
            response.data,
            [{'id': 1, 'transaction': 1, 'tag': 1}, {'id': 2, 'transaction': 1, 'tag': 2}],
        )

        # Verify the returned transaction tags are for transaction1
        transaction_ids = [tt['transaction'] for tt in response.data]
        self.assertTrue(all(tid == self.transaction1.id for tid in transaction_ids))

    def test_get_transaction_tags_filtered_by_tag(self):
        """Test filtering transaction tags by tag ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': self.tag1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return 2 transaction tags with tag1
        self.assertEqual(
            response.data,
            [{'id': 1, 'transaction': 1, 'tag': 1}, {'id': 3, 'transaction': 2, 'tag': 1}],
        )

    def test_get_transaction_tags_filtered_by_both_transaction_and_tag(self):
        """Test filtering transaction tags by both transaction and tag ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {'transaction': self.transaction1.id, 'tag': self.tag1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [{'id': 1, 'transaction': 1, 'tag': 1}])

    def test_get_transaction_tags_filtered_by_nonexistent_transaction(self):
        """Test filtering by non-existent transaction ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_transaction_tags_filtered_by_nonexistent_tag(self):
        """Test filtering by non-existent tag ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_transaction_tags_data_structure(self):
        """Test that the returned data has the correct structure"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)

        # Check that each transaction tag has the expected fields
        for transaction_tag in response.data:
            self.assertIn('id', transaction_tag)
            self.assertIn('transaction', transaction_tag)
            self.assertIn('tag', transaction_tag)

    def test_get_transaction_tags_user_isolation(self):
        """Test that users can only see their own transaction tags"""
        # User1 should see only their 3 transaction tags
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 3)

        # User2 should see only their 1 transaction tag
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['transaction'], self.transaction_user2.id)
        self.assertEqual(response.data[0]['tag'], self.tag_user2.id)

    def test_get_transaction_tags_no_filters(self):
        """Test getting all transaction tags without any filters"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return only user1's transaction tags
        self.assertEqual(len(response.data), 3)

    def test_transaction_tag_serialization(self):
        """Test that transaction tags are properly serialized"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Get the first transaction tag and verify its data
        transaction_tag_data = response.data[0]
        expected_transaction_tag = TransactionTag.objects.get(
            transaction=self.transaction1, tag=self.tag1
        )

        self.assertEqual(transaction_tag_data['id'], expected_transaction_tag.id)
        self.assertEqual(
            transaction_tag_data['transaction'], expected_transaction_tag.transaction.id
        )
        self.assertEqual(transaction_tag_data['tag'], expected_transaction_tag.tag.id)

    def test_get_transaction_tags_with_invalid_transaction_id(self):
        """Test filtering with invalid transaction ID (non-integer)"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': 'invalid'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_transaction_tags_with_invalid_tag_id(self):
        """Test filtering with invalid tag ID (non-integer) - should return empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': 'invalid'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_other_users_transaction(self):
        """Test that users cannot filter by other users' transaction IDs"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction_user2.id})

        # Should return empty list since user1 doesn't own this transaction
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_other_users_tag(self):
        """Test that users cannot filter by other users' tag IDs"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': self.tag_user2.id})

        # Should return empty list since user1 doesn't own this tag
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_empty_result_for_user_with_no_transaction_tags(self):
        """Test that user with no transaction tags gets empty list"""
        # Create a new user with no transactions or tags
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_transaction_tags_limit_offset(self):
        """Test that checks if limit and offset are correct"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(self.url, {'limit': 1, 'offset': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [{'id': 2, 'transaction': 1, 'tag': 2}])
