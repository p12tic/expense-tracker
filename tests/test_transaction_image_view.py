from datetime import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Tag
from expenses.models import Transaction
from expenses.models import TransactionImage


class TestTransactionImageView(TestCase):
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

        # Create transaction images
        self.image1_user1 = TransactionImage.objects.create(
            transaction=self.transaction1_user1, image='test_image1.jpg'
        )

        self.image2_user1 = TransactionImage.objects.create(
            transaction=self.transaction1_user1, image='test_image2.jpg'
        )

        self.image3_user1 = TransactionImage.objects.create(
            transaction=self.transaction2_user1, image='test_image3.jpg'
        )

        self.image_user2 = TransactionImage.objects.create(
            transaction=self.transaction_user2, image='user2_image.jpg'
        )

        self.url = '/api/transaction_image'

    def test_get_all_transaction_images_unauthenticated(self):
        """Test that unauthenticated users cannot access transaction images (auth required)"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_all_transaction_images_authenticated(self):
        """Test that authenticated users can get their own transaction images"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns only user1's transaction images (3 total)
        self.assertEqual(len(response.data), 3)

    def test_get_transaction_images_filtered_by_transaction(self):
        """Test filtering transaction images by transaction ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return 2 images for transaction1_user1
        self.assertEqual(len(response.data), 2)

        # Verify the correct images are returned
        image_ids = [img['id'] for img in response.data]
        self.assertIn(self.image1_user1.id, image_ids)
        self.assertIn(self.image2_user1.id, image_ids)

    def test_get_transaction_images_filtered_by_nonexistent_transaction(self):
        """Test filtering by non-existent transaction ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_transaction_images_filtered_by_other_users_transaction(self):
        """Test that users cannot access other users' transaction images (user filtering enabled)"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns empty list since user1 doesn't have access to user2's transaction images
        self.assertEqual(response.data, [])

    def test_get_transaction_images_invalid_transaction_id(self):
        """Test filtering with invalid transaction ID parameter"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': 'invalid'})

        # Now uses require_int for parameter validation, should return 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transaction_image_serialization(self):
        """Test that transaction images are properly serialized"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that each image has the expected fields
        for image_data in response.data:
            self.assertIn('id', image_data)
            self.assertIn('image', image_data)
            # Verify the image field contains the expected path
            self.assertTrue(image_data['image'].endswith('.jpg'))

    def test_user_isolation_in_transaction_images(self):
        """Test that users can only see their own transaction images (user isolation enabled)"""
        # User1 can only see their own transaction images
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 3)  # 3 images for user1 only

        # User2 can only see their own transaction images
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)  # 1 image for user2 only

    def test_empty_transaction_image_list(self):
        """Test user with no transaction images gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns empty list since user3 has no transaction images
        self.assertEqual(len(response.data), 0)

    def test_transaction_image_ordering(self):
        """Test that transaction images are returned in a consistent order"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Images should be ordered by ID (ascending) by default
        image_ids = [img['id'] for img in response.data]
        self.assertEqual(sorted(image_ids), image_ids)

    def test_transaction_image_with_multiple_transactions(self):
        """Test getting images across multiple transactions for the current user"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # 3 images for user1 only (user filtering enabled)

        # Verify that we get the expected number of images and they have the right structure
        for image_data in response.data:
            self.assertIn('id', image_data)
            self.assertIn('image', image_data)

    def test_transaction_image_url_format(self):
        """Test that image URLs are properly formatted in the response"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for image_data in response.data:
            # The image field should contain the full URL to the image
            self.assertTrue(isinstance(image_data['image'], str))
            self.assertTrue(len(image_data['image']) > 0)
            # Should be a complete URL (includes domain)
            self.assertTrue(image_data['image'].startswith('http://testserver/media/'))

    def test_transaction_image_with_no_filter(self):
        """Test getting all transaction images for the current user"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns only user1's transaction images (3 total) - user filtering enabled
        self.assertEqual(len(response.data), 3)

        # Verify that we get the expected number of images and they have the right structure
        for image_data in response.data:
            self.assertIn('id', image_data)
            self.assertIn('image', image_data)

    def test_transaction_image_deletion_cascade(self):
        """Test that transaction images are properly handled when transaction is deleted"""
        # This test verifies the model behavior, not the view directly
        transaction_id = self.transaction1_user1.id

        # Verify images exist before deletion
        self.assertEqual(TransactionImage.objects.filter(transaction_id=transaction_id).count(), 2)

        # Delete the transaction
        self.transaction1_user1.delete()

        # Verify images are deleted (cascade behavior)
        self.assertEqual(TransactionImage.objects.filter(transaction_id=transaction_id).count(), 0)

    def test_transaction_image_response_format(self):
        """Test the overall response format for transaction images"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Each item should be a dictionary with expected keys
        for item in response.data:
            self.assertIsInstance(item, dict)
            self.assertIn('id', item)
            self.assertIn('image', item)
            # Note: 'transaction' field is not included in the serializer, only 'id' and 'image'

    def test_transaction_image_with_zero_images(self):
        """Test transaction with no images returns empty list"""
        # Create a transaction with no images
        transaction_no_images = Transaction.objects.create(
            user=self.user1,
            desc='Transaction with no images',
            date_time=datetime(2023, 1, 4, 12, 0, 0),
            timezone_offset=-120,
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': transaction_no_images.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_transaction_image_access_control(self):
        """Test that users cannot access other users' transaction images (access control enabled)"""
        # User1 cannot access User2's transaction images (user filtering enabled)
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'transaction': self.transaction_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])  # Returns empty list due to user filtering

        # User2 cannot access User1's transaction images (user filtering enabled)
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url, {'transaction': self.transaction1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])  # Returns empty list due to user filtering

    def test_transaction_image_id_consistency(self):
        """Test that image IDs are consistent and unique for the current user"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Extract all image IDs
        image_ids = [img['id'] for img in response.data]

        # Verify IDs are unique
        self.assertEqual(len(image_ids), len(set(image_ids)))

        # Verify IDs match the actual database IDs (only user1's 3 images)
        expected_ids = [self.image1_user1.id, self.image2_user1.id, self.image3_user1.id]
        self.assertEqual(sorted(image_ids), sorted(expected_ids))
