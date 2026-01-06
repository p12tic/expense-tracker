from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Preset
from expenses.models import TransactionCreateBatch
from expenses.models import TransactionCreateBatchRemainingTransactions


class TestTransactionCreateBatchRemainingTransactionsView(TestCase):
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

        self.preset1_user1 = Preset.objects.create(
            user=self.user1,
            name='User1 Preset 1',
            desc='Test preset 1',
            transaction_desc='Test transaction',
        )

        self.preset1_user2 = Preset.objects.create(
            user=self.user2,
            name='User2 Preset 1',
            desc='Test preset 1',
            transaction_desc='Test transaction',
        )

        # Create batches for user1
        self.batch1_user1 = TransactionCreateBatch.objects.create(
            user=self.user1, account=self.account1_user1, name='User1 Batch 1'
        )

        self.batch2_user1 = TransactionCreateBatch.objects.create(
            user=self.user1, preset=self.preset1_user1, name='User1 Batch 2'
        )

        # Create batch for user2
        self.batch1_user2 = TransactionCreateBatch.objects.create(
            user=self.user2, account=self.account1_user2, name='User2 Batch 1'
        )

        # Create remaining transactions for user1's batches
        self.remaining1_batch1_user1 = TransactionCreateBatchRemainingTransactions.objects.create(
            batch=self.batch1_user1, image='test_image1.jpg', data_done=False
        )

        self.remaining2_batch1_user1 = TransactionCreateBatchRemainingTransactions.objects.create(
            batch=self.batch1_user1, image='test_image2.jpg', data_done=True
        )

        self.remaining1_batch2_user1 = TransactionCreateBatchRemainingTransactions.objects.create(
            batch=self.batch2_user1, image='test_image3.jpg', data_done=False
        )

        # Create remaining transaction for user2's batch
        self.remaining1_batch1_user2 = TransactionCreateBatchRemainingTransactions.objects.create(
            batch=self.batch1_user2, image='user2_image.jpg', data_done=False
        )

        self.url = '/api/transaction_batch_transactions'

    def test_get_remaining_transaction_unauthenticated(self):
        """Test that unauthenticated users cannot access remaining transactions"""
        response = self.client.get(f'{self.url}/{self.remaining1_batch1_user1.id}')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_remaining_transaction_authenticated(self):
        """Test that authenticated users can get their own remaining transactions"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.get(f'{self.url}/{self.remaining1_batch1_user1.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'batch': 1,
                'data_done': False,
                'data_json': None,
                'id': 1,
                'image': 'http://testserver/media/test_image1.jpg',
            },
        )

    def test_get_remaining_transaction_other_user(self):
        """Test that users cannot access other users' remaining transactions"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'{self.url}/{self.remaining1_batch1_user2.id}')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_nonexistent_remaining_transaction(self):
        """Test getting non-existent remaining transaction returns 404"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'{self.url}/99999')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_remaining_transaction_authenticated(self):
        """Test that authenticated users can update their own remaining transactions"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            f'{self.url}/{self.remaining1_batch1_user1.id}',
            {'data_done': True, 'data_json': {'test': 'data'}},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'batch': 1,
                'data_done': True,
                'data_json': {'test': 'data'},
                'id': 1,
                'image': 'http://testserver/media/test_image1.jpg',
            },
        )

    def test_update_remaining_transaction_other_user(self):
        """Test that users cannot update other users' remaining transactions"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.patch(
            f'{self.url}/{self.remaining1_batch1_user2.id}',
            {'data_done': True, 'data_json': {'test': 'data'}},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_remaining_transaction_with_multiple_remaining(self):
        """Test deleting a remaining transaction when multiple remain (only deletes the single transaction)"""
        self.client.force_authenticate(user=self.user1)

        # Verify we have 2 remaining transactions for batch1_user1
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                batch=self.batch1_user1
            ).count(),
            2,
        )

        response = self.client.delete(f'{self.url}/{self.remaining1_batch1_user1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the specific remaining transaction was deleted
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                id=self.remaining1_batch1_user1.id
            ).count(),
            0,
        )

        # Verify the batch still exists and has 1 remaining transaction
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                batch=self.batch1_user1
            ).count(),
            1,
        )
        self.assertTrue(TransactionCreateBatch.objects.filter(id=self.batch1_user1.id).exists())

    def test_delete_last_remaining_transaction(self):
        """Test deleting the last remaining transaction (deletes both transaction and batch)"""
        self.client.force_authenticate(user=self.user2)

        # Verify we have only 1 remaining transaction for batch1_user2
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                batch=self.batch1_user2
            ).count(),
            1,
        )

        response = self.client.delete(f'{self.url}/{self.remaining1_batch1_user2.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify both the remaining transaction and the batch were deleted
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                id=self.remaining1_batch1_user2.id
            ).count(),
            0,
        )
        self.assertEqual(TransactionCreateBatch.objects.filter(id=self.batch1_user2.id).count(), 0)

    def test_delete_remaining_transaction_other_user(self):
        """Test that users cannot delete other users' remaining transactions"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.delete(f'{self.url}/{self.remaining1_batch1_user2.id}')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify the transaction was not deleted
        self.assertTrue(
            TransactionCreateBatchRemainingTransactions.objects.filter(
                id=self.remaining1_batch1_user2.id
            ).exists()
        )

    def test_remaining_transaction_with_preset_batch(self):
        """Test remaining transactions work correctly with preset-based batches"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'{self.url}/{self.remaining1_batch2_user1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'batch': self.batch2_user1.id,
                'data_done': False,
                'data_json': None,
                'id': self.remaining1_batch2_user1.id,
                'image': 'http://testserver/media/test_image3.jpg',
            },
        )

    def test_remaining_transaction_with_account_batch(self):
        """Test remaining transactions work correctly with account-based batches"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'{self.url}/{self.remaining1_batch1_user1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'batch': self.batch1_user1.id,
                'data_done': False,
                'data_json': None,
                'id': self.remaining1_batch1_user1.id,
                'image': 'http://testserver/media/test_image1.jpg',
            },
        )

    def test_remaining_transaction_cascade_deletion(self):
        """Test that remaining transactions are deleted when batch is deleted"""
        # This test verifies the model behavior, not the view directly
        batch_id = self.batch1_user1.id

        # Verify remaining transactions exist before deletion
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(batch_id=batch_id).count(), 2
        )

        # Delete the batch
        self.batch1_user1.delete()

        # Verify remaining transactions are deleted (cascade behavior)
        self.assertEqual(
            TransactionCreateBatchRemainingTransactions.objects.filter(batch_id=batch_id).count(), 0
        )
