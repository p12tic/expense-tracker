import json
from datetime import datetime
from unittest.mock import Mock
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Subtransaction
from expenses.models import Tag
from expenses.models import Transaction
from expenses.models import TransactionImage
from expenses.models import TransactionTag


class TestTransactionView(TestCase):
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

        self.tag1_user1 = Tag.objects.create(user=self.user1, name='User1 Tag 1', desc='Test tag 1')
        self.tag2_user1 = Tag.objects.create(user=self.user1, name='User1 Tag 2', desc='Test tag 2')

        self.tag1_user2 = Tag.objects.create(user=self.user2, name='User2 Tag 1', desc='Test tag 1')

        self.transaction1_user1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 1',
            date_time=datetime(2023, 1, 1, 12, 0, 0),
            timezone_offset=-120,
        )

        self.transaction2_user1 = Transaction.objects.create(
            user=self.user1,
            desc='Test transaction 2',
            date_time=datetime(2023, 1, 2, 12, 0, 0),
            timezone_offset=-120,
        )

        self.transaction_user2 = Transaction.objects.create(
            user=self.user2,
            desc='User2 transaction',
            date_time=datetime(2023, 1, 3, 12, 0, 0),
            timezone_offset=-120,
        )

        self.url = '/api/transactions'

    def test_get_transactions_unauthenticated(self):
        """Test that unauthenticated users get an error when accessing transactions"""
        with self.assertRaises(TypeError):
            self.client.get(self.url)

    def test_get_transactions_authenticated(self):
        """Test that authenticated users can get their transactions"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Note that transactions are ordered by date_time (descending)
        self.assertEqual(
            [t['desc'] for t in response.data], ['Test transaction 2', 'Test transaction 1']
        )

    def test_get_transactions_filter_by_id(self):
        """Test filtering transactions by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {
                    'id': 1,
                    'date_time': '2023-01-01T14:00:00',
                    'desc': 'Test transaction 1',
                    'timezone_offset': -120,
                    'user': 1,
                }
            ],
        )

    def test_get_transactions_filter_by_nonexistent_id(self):
        """Test filtering by non-existent ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_transactions_filter_by_other_users_id(self):
        """Test that users cannot access other users' transactions by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.transaction_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_create_transaction_success(self):
        """Test successful transaction creation with accounts and tags"""
        self.client.force_authenticate(user=self.user1)

        preset_data = {
            'accounts': [
                {'id': self.account1_user1.id, 'isUsed': True, 'amount': 100.50},
                {'id': self.account2_user1.id, 'isUsed': True, 'amount': 50.25},
                {'id': 999, 'isUsed': False, 'amount': 0},  # Non-existent account, not used
            ],
            'tags': [
                {'id': self.tag1_user1.id, 'isChecked': True},
                {'id': self.tag2_user1.id, 'isChecked': False},
                {'id': 999, 'isChecked': False},  # Non-existent tag
            ],
        }

        data = {
            'action': 'create',
            'desc': 'New test transaction',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        transaction = Transaction.objects.filter(
            user=self.user1, desc='New test transaction'
        ).first()
        self.assertIsNotNone(transaction)

        # Verify subtransactions were created
        subtransactions = Subtransaction.objects.filter(transaction=transaction)
        self.assertEqual(len(subtransactions), 2)

        # Check amounts (stored as cents)
        subtrans_dict = {sub.account.id: sub.amount for sub in subtransactions}
        self.assertEqual(subtrans_dict[self.account1_user1.id], 10050)  # 100.50 * 100
        self.assertEqual(subtrans_dict[self.account2_user1.id], 5025)  # 50.25 * 100

        # Verify transaction tags were created
        transaction_tags = TransactionTag.objects.filter(transaction=transaction)
        self.assertEqual(len(transaction_tags), 1)
        self.assertEqual(transaction_tags[0].tag.id, self.tag1_user1.id)

    def test_create_transaction_unauthenticated(self):
        """Test that unauthenticated users get an error when creating transactions"""
        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'create',
            'desc': 'New test transaction',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        with self.assertRaises(ValueError):
            self.client.post(self.url, data)

    def test_create_transaction_missing_fields(self):
        """Test transaction creation with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing desc
        data = {
            'action': 'create',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps({'accounts': [], 'tags': []}),
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing date
        data = {
            'action': 'create',
            'desc': 'New test transaction',
            'timezoneOffset': -120,
            'preset': json.dumps({'accounts': [], 'tags': []}),
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_create_transaction_with_images(self):
        """Test transaction creation with image uploads"""
        self.client.force_authenticate(user=self.user1)

        _ = SimpleUploadedFile("test_image.jpg", b"file_content", content_type="image/jpeg")

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'create',
            'desc': 'Transaction with image',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Note: In a real test, we'd need to properly handle file uploads
        # This is a simplified version

    def test_delete_transaction_success(self):
        """Test successful transaction deletion"""
        self.client.force_authenticate(user=self.user1)

        data = {'action': 'delete', 'id': self.transaction1_user1.id}

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(Transaction.objects.filter(id=self.transaction1_user1.id).exists())

    def test_delete_transaction_unauthorized(self):
        """Test that users cannot delete other users' transactions"""
        self.client.force_authenticate(user=self.user1)

        data = {'action': 'delete', 'id': self.transaction_user2.id}

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Transaction.objects.filter(id=self.transaction_user2.id).exists())

    def test_delete_nonexistent_transaction(self):
        """Test deleting a non-existent transaction"""
        self.client.force_authenticate(user=self.user1)

        data = {'action': 'delete', 'id': 99999}

        with self.assertRaises(Transaction.DoesNotExist):
            self.client.post(self.url, data)

    def test_edit_transaction_success(self):
        """Test successful transaction editing"""
        self.client.force_authenticate(user=self.user1)

        # Create initial subtransactions and tags
        Subtransaction.objects.create(
            transaction=self.transaction1_user1, account=self.account1_user1, amount=10000
        )
        TransactionTag.objects.create(transaction=self.transaction1_user1, tag=self.tag1_user1)

        # New preset data for editing
        preset_data = {
            'accounts': [
                {'id': self.account1_user1.id, 'isUsed': True, 'amount': 150.75},  # Changed amount
                {'id': self.account2_user1.id, 'isUsed': True, 'amount': 75.25},  # New account
            ],
            'tags': [
                {'id': self.tag1_user1.id, 'isChecked': False},  # Remove tag
                {'id': self.tag2_user1.id, 'isChecked': True},  # Add tag
            ],
        }

        data = {
            'action': 'edit',
            'id': self.transaction1_user1.id,
            'desc': 'Updated transaction description',
            'date': '2023-01-01T15:30:00',  # Changed time
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'imageIds': [],  # No existing images
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify transaction was updated
        transaction = Transaction.objects.get(id=self.transaction1_user1.id)
        self.assertEqual(transaction.desc, 'Updated transaction description')

        # Verify subtransactions were updated
        subtransactions = Subtransaction.objects.filter(transaction=transaction)
        self.assertEqual(len(subtransactions), 2)
        subtrans_dict = {sub.account.id: sub.amount for sub in subtransactions}
        self.assertEqual(subtrans_dict[self.account1_user1.id], 15075)  # 150.75 * 100
        self.assertEqual(subtrans_dict[self.account2_user1.id], 7525)  # 75.25 * 100

        # Verify transaction tags were updated
        transaction_tags = TransactionTag.objects.filter(transaction=transaction)
        self.assertEqual(len(transaction_tags), 1)
        self.assertEqual(transaction_tags[0].tag.id, self.tag2_user1.id)

    def test_edit_transaction_unauthorized(self):
        """Test that users cannot edit other users' transactions"""
        self.client.force_authenticate(user=self.user1)

        original_desc = self.transaction_user2.desc

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'edit',
            'id': self.transaction_user2.id,
            'desc': 'Hacked description',
            'date': '2023-01-03T15:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'imageIds': [],
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        unchanged_transaction = Transaction.objects.get(id=self.transaction_user2.id)
        self.assertEqual(unchanged_transaction.desc, original_desc)

    def test_edit_nonexistent_transaction(self):
        """Test editing a non-existent transaction"""
        self.client.force_authenticate(user=self.user1)

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'edit',
            'id': 99999,
            'desc': 'Updated description',
            'date': '2023-01-01T15:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'imageIds': [],
        }

        with self.assertRaises(Transaction.DoesNotExist):
            self.client.post(self.url, data)

    def test_edit_transaction_missing_fields(self):
        """Test transaction editing with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing id
        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'edit',
            'desc': 'Updated description',
            'date': '2023-01-01T15:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'imageIds': [],
        }
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_invalid_action(self):
        """Test POST request with invalid action"""
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'invalid_action'}

        # The view doesn't handle invalid actions, so it returns None
        # which causes DRF to raise an AssertionError
        with self.assertRaises(AssertionError):
            self.client.post(self.url, data)

    def test_missing_action(self):
        """Test POST request without action field"""
        self.client.force_authenticate(user=self.user1)
        data = {'desc': 'Test transaction'}

        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_user_isolation(self):
        """Test that users can only see their own transactions"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['desc'], 'User2 transaction')

    def test_empty_transaction_list(self):
        """Test user with no transactions gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_transaction_creation_assigns_correct_user(self):
        """Test that created transactions are assigned to the correct user"""
        self.client.force_authenticate(user=self.user2)

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'create',
            'desc': 'User2 New Transaction',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify transaction was created for user2
        new_transaction = Transaction.objects.filter(
            user=self.user2, desc='User2 New Transaction'
        ).first()
        self.assertIsNotNone(new_transaction)
        self.assertEqual(new_transaction.user, self.user2)

        # Verify user1 cannot see this transaction
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        transaction_descs = [t['desc'] for t in response.data]
        self.assertNotIn('User2 New Transaction', transaction_descs)

    @patch('requests.get')
    def test_create_transaction_with_url_images(self, mock_get):
        """Test transaction creation with images from URLs"""
        self.client.force_authenticate(user=self.user1)

        # Mock successful image download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_content'
        mock_get.return_value = mock_response

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'create',
            'desc': 'Transaction with URL image',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'images': ['http://example.com/path/transaction_batch/image1.jpg'],
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the mock was called
        mock_get.assert_called_once_with('http://example.com/path/transaction_batch/image1.jpg')

    def test_transaction_ordering(self):
        """Test that transactions are ordered by date_time (descending)"""
        self.client.force_authenticate(user=self.user1)

        # Create transactions with different dates
        Transaction.objects.create(
            user=self.user1,
            desc='Oldest transaction',
            date_time=datetime(2023, 1, 1, 10, 0, 0),
            timezone_offset=-120,
        )

        Transaction.objects.create(
            user=self.user1,
            desc='Newest transaction',
            date_time=datetime(2023, 1, 5, 10, 0, 0),
            timezone_offset=-120,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check ordering - newest first
        transaction_descs = [t['desc'] for t in response.data]
        self.assertEqual(transaction_descs[0], 'Newest transaction')
        self.assertEqual(transaction_descs[1], 'Test transaction 2')
        self.assertEqual(transaction_descs[2], 'Test transaction 1')
        self.assertEqual(transaction_descs[3], 'Oldest transaction')

    def test_edit_transaction_with_existing_images(self):
        """Test editing transaction with existing images"""
        self.client.force_authenticate(user=self.user1)

        # Create existing image
        existing_image = TransactionImage.objects.create(
            transaction=self.transaction1_user1, image='test_image.jpg'
        )

        preset_data = {'accounts': [], 'tags': []}
        data = {
            'action': 'edit',
            'id': self.transaction1_user1.id,
            'desc': 'Updated with images',
            'date': '2023-01-01T15:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
            'imageIds': [existing_image.id],  # Keep existing image
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify image still exists
        self.assertTrue(TransactionImage.objects.filter(id=existing_image.id).exists())

    def test_create_transaction_with_invalid_preset_data(self):
        """Test transaction creation with invalid preset data"""
        self.client.force_authenticate(user=self.user1)

        # Invalid JSON in preset
        data = {
            'action': 'create',
            'desc': 'Invalid preset test',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': 'invalid json',
        }

        with self.assertRaises(json.JSONDecodeError):
            self.client.post(self.url, data)

    def test_create_transaction_with_nonexistent_account(self):
        """Test transaction creation with non-existent account that is marked as used"""
        self.client.force_authenticate(user=self.user1)

        preset_data = {'accounts': [{'id': 99999, 'isUsed': True, 'amount': 100.00}], 'tags': []}

        data = {
            'action': 'create',
            'desc': 'Test with nonexistent account',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        with self.assertRaises(Account.DoesNotExist):
            self.client.post(self.url, data)

    def test_create_transaction_with_nonexistent_tag(self):
        """Test transaction creation with non-existent tag that is marked as checked"""
        self.client.force_authenticate(user=self.user1)

        preset_data = {'accounts': [], 'tags': [{'id': 99999, 'isChecked': True}]}

        data = {
            'action': 'create',
            'desc': 'Test with nonexistent tag',
            'date': '2023-01-15T12:30:00',
            'timezoneOffset': -120,
            'preset': json.dumps(preset_data),
        }

        with self.assertRaises(Tag.DoesNotExist):
            self.client.post(self.url, data)
