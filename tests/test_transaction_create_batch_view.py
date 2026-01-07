import json
from unittest.mock import Mock
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from parameterized import parameterized
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Preset
from expenses.models import TransactionCreateBatch


class TestTransactionCreateBatchView(TestCase):
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
            transaction_desc='Test desc',
        )
        self.preset2_user1 = Preset.objects.create(
            user=self.user1,
            name='User1 Preset 2',
            desc='Test preset 2',
            transaction_desc='Test desc 2',
        )

        self.preset1_user2 = Preset.objects.create(
            user=self.user2,
            name='User2 Preset 1',
            desc='Test preset 1',
            transaction_desc='Test desc',
        )

        self.batch1_user1 = TransactionCreateBatch.objects.create(
            user=self.user1, preset=self.preset1_user1, name='User1 Batch 1'
        )
        self.batch2_user1 = TransactionCreateBatch.objects.create(
            user=self.user1, account=self.account1_user1, name='User1 Batch 2'
        )

        self.batch_user2 = TransactionCreateBatch.objects.create(
            user=self.user2, preset=self.preset1_user2, name='User2 Batch 1'
        )

        self.url = '/api/transaction_batch'

    def test_get_batches_unauthenticated(self):
        """Test that unauthenticated users get an error when accessing batches"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_batches_filter_by_other_users_id(self):
        """Test that users cannot access other users' batches by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.batch_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_batches_authenticated(self):
        """Test that authenticated users can get their batches"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {'id': 1, 'name': 'User1 Batch 1', 'user': 1, 'preset': 1, 'account': None},
                {'id': 2, 'name': 'User1 Batch 2', 'user': 1, 'preset': None, 'account': 1},
            ],
        )

    def test_get_batches_filter_by_id(self):
        """Test filtering batches by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.batch1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [{'account': None, 'id': 1, 'name': 'User1 Batch 1', 'preset': 1, 'user': 1}],
        )

    def test_get_batches_filter_by_nonexistent_id(self):
        """Test filtering by non-existent ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_create_batch_with_preset_success(self):
        """Test successful batch creation with preset"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'New Batch with Preset',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify batch was created
        batch = TransactionCreateBatch.objects.filter(
            user=self.user1, name='New Batch with Preset'
        ).first()
        self.assertIsNotNone(batch)
        self.assertEqual(batch.preset, self.preset1_user1)
        self.assertIsNone(batch.account)

    @parameterized.expand([
        (
            'integer_type',
            lambda _: {'selection': json.dumps({'id': 'not_an_integer'})},
            status.HTTP_400_BAD_REQUEST,
        ),
        ('missing_selection', lambda _: {}, status.HTTP_400_BAD_REQUEST),
        ('missing_id', lambda _: {'selection': json.dumps({})}, status.HTTP_400_BAD_REQUEST),
        (
            'nonexistent_preset',
            lambda _: {'selection': json.dumps({'id': 99999})},
            status.HTTP_403_FORBIDDEN,
        ),
        ('invalid_json', lambda _: {'selection': 'invalid'}, status.HTTP_400_BAD_REQUEST),
        (
            'other_user',
            lambda self: {'selection': json.dumps({'id': self.preset1_user2.id})},
            status.HTTP_403_FORBIDDEN,
        ),
    ])
    def test_create_batch_preset_validation(self, name, selection_data_cb, expected_status):
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_preset',
            'name': 'Name',
            **selection_data_cb(self),
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, expected_status)

    @parameterized.expand([
        ('missing_name', None, status.HTTP_400_BAD_REQUEST),
        ('empty_name', '', status.HTTP_400_BAD_REQUEST),
        ('too_long_name', 'x' * 300, status.HTTP_400_BAD_REQUEST),
    ])
    def test_create_batch_preset_name_validation(self, name, value, expected_status):
        """Test batch creation with invalid name values"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user1.id}),
        }
        if value is not None:
            data['name'] = value

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, expected_status)

    def test_create_batch_with_account_success(self):
        """Test successful batch creation with account"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_account',
            'selection': json.dumps({'id': self.account1_user1.id}),
            'name': 'New Batch with Account',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify batch was created
        batch = TransactionCreateBatch.objects.filter(
            user=self.user1, name='New Batch with Account'
        ).first()
        self.assertIsNotNone(batch)
        self.assertEqual(batch.account, self.account1_user1)
        self.assertIsNone(batch.preset)

    @parameterized.expand([
        (
            'integer_type',
            lambda _: {'selection': json.dumps({'id': 'not_an_integer'})},
            status.HTTP_400_BAD_REQUEST,
        ),
        ('missing_selection', lambda _: {}, status.HTTP_400_BAD_REQUEST),
        ('missing_id', lambda _: {'selection': json.dumps({})}, status.HTTP_400_BAD_REQUEST),
        (
            'nonexistent_account',
            lambda _: {'selection': json.dumps({'id': 99999})},
            status.HTTP_403_FORBIDDEN,
        ),
        ('invalid_json', lambda _: {'selection': 'invalid'}, status.HTTP_400_BAD_REQUEST),
        (
            'other_user',
            lambda self: {'selection': json.dumps({'id': self.account1_user2.id})},
            status.HTTP_403_FORBIDDEN,
        ),
    ])
    def test_create_batch_account_validation(self, name, selection_data_cb, expected_status):
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_account',
            'name': 'Name',
            **selection_data_cb(self),
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, expected_status)

    @parameterized.expand([
        ('missing_name', None, status.HTTP_400_BAD_REQUEST),
        ('empty_name', '', status.HTTP_400_BAD_REQUEST),
        ('too_long_name', 'x' * 300, status.HTTP_400_BAD_REQUEST),
    ])
    def test_create_batch_account_name_validation(self, name, value, expected_status):
        """Test batch creation with invalid name values"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'create_by_account',
            'selection': json.dumps({'id': self.account1_user1.id}),
        }
        if value is not None:
            data['name'] = value

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, expected_status)

    def test_create_batch_unauthenticated(self):
        """Test that unauthenticated users get an error when creating batches"""
        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'Unauthorized Batch',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_isolation(self):
        """Test that users can only see their own batches"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(
            response.data,
            [
                {'id': 1, 'name': 'User1 Batch 1', 'user': 1, 'preset': 1, 'account': None},
                {'id': 2, 'name': 'User1 Batch 2', 'user': 1, 'preset': None, 'account': 1},
            ],
        )

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(
            response.data,
            [{'id': 3, 'name': 'User2 Batch 1', 'user': 2, 'preset': 3, 'account': None}],
        )

    def test_empty_batch_list(self):
        """Test user with no batches gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_batch_creation_assigns_correct_user(self):
        """Test that created batches are assigned to the correct user"""
        self.client.force_authenticate(user=self.user2)

        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user2.id}),
            'name': 'User2 New Batch',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify batch was created for user2
        new_batch = TransactionCreateBatch.objects.filter(
            user=self.user2, name='User2 New Batch'
        ).first()
        self.assertIsNotNone(new_batch)
        self.assertEqual(new_batch.user, self.user2)

        # Verify user1 cannot see this batch
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        batch_names = [batch['name'] for batch in response.data]
        self.assertNotIn('User2 New Batch', batch_names)

    @patch('requests.get')
    def test_create_batch_with_multiple_images(self, mock_get):
        """Test batch creation with multiple images"""
        self.client.force_authenticate(user=self.user1)

        # Mock successful image download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_content'
        mock_get.return_value = mock_response

        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'Batch with Multiple Images',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the batch was created
        batch = TransactionCreateBatch.objects.filter(
            user=self.user1, name='Batch with Multiple Images'
        ).first()
        self.assertIsNotNone(batch)

    def test_batch_creation_with_both_preset_and_account_in_selection(self):
        """Test batch creation when selection has both preset and account data"""
        self.client.force_authenticate(user=self.user1)

        # This should prioritize preset (based on the 'transaction_desc' key check)
        data = {
            'action': 'create_by_preset',
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'Batch with Preset Priority',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify batch was created with preset
        batch = TransactionCreateBatch.objects.filter(
            user=self.user1, name='Batch with Preset Priority'
        ).first()
        self.assertIsNotNone(batch)
        self.assertEqual(batch.preset, self.preset1_user1)
        self.assertIsNone(batch.account)

    def test_create_batch_with_invalid_action(self):
        """Test batch creation with invalid action"""
        self.client.force_authenticate(user=self.user1)

        data = {
            'action': 'invalid_action',
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'Batch with Invalid Action',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_batch_with_missing_action(self):
        """Test batch creation with missing action field"""
        self.client.force_authenticate(user=self.user1)

        data = {
            # Missing 'action' field
            'selection': json.dumps({'id': self.preset1_user1.id}),
            'name': 'Batch without Action',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
