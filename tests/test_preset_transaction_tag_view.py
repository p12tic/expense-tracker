from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Preset
from expenses.models import PresetTransactionTag
from expenses.models import Tag


class TestPresetTransactionTagView(TestCase):
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
        self.tag3_user1 = Tag.objects.create(user=self.user1, name='User1 Tag 3', desc='Test tag 3')

        self.tag1_user2 = Tag.objects.create(user=self.user2, name='User2 Tag 1', desc='Test tag 1')

        self.preset1_user1 = Preset.objects.create(
            user=self.user1,
            name='User1 Preset 1',
            desc='Test preset 1',
            transaction_desc='Test transaction',
        )
        self.preset2_user1 = Preset.objects.create(
            user=self.user1,
            name='User1 Preset 2',
            desc='Test preset 2',
            transaction_desc='Test transaction',
        )

        self.preset1_user2 = Preset.objects.create(
            user=self.user2,
            name='User2 Preset 1',
            desc='Test preset 1',
            transaction_desc='Test transaction',
        )

        self.preset_transaction_tag1 = PresetTransactionTag.objects.create(
            preset=self.preset1_user1, tag=self.tag1_user1
        )

        self.preset_transaction_tag2 = PresetTransactionTag.objects.create(
            preset=self.preset1_user1, tag=self.tag2_user1
        )

        self.preset_transaction_tag3 = PresetTransactionTag.objects.create(
            preset=self.preset2_user1, tag=self.tag1_user1
        )

        self.preset_transaction_tag4 = PresetTransactionTag.objects.create(
            preset=self.preset2_user1, tag=self.tag3_user1
        )

        self.preset_transaction_tag_user2 = PresetTransactionTag.objects.create(
            preset=self.preset1_user2, tag=self.tag1_user2
        )

        self.url = '/api/preset_transaction_tags'

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access the API"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_access_other_users_preset_transaction_tags(self):
        """Test that users cannot access other users' preset transaction tags"""
        self.client.force_authenticate(user=self.user1)

        # Try to filter by user2's preset (should return empty results)
        response = self.client.get(self.url, {'preset': self.preset1_user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_user_cannot_access_other_users_data_via_tag_filtering(self):
        """Test that users cannot access other users' data through tag filtering"""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Try to filter by user2's tag (should return empty results)
        response = self.client.get(self.url, {'tag': self.tag1_user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_all_preset_transaction_tags(self):
        """Test getting all preset transaction tags without filters (user1 only)"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            [
                {'id': 1, 'preset': 1, 'tag': 1},
                {'id': 2, 'preset': 1, 'tag': 2},
                {'id': 3, 'preset': 2, 'tag': 1},
                {'id': 4, 'preset': 2, 'tag': 3},
            ],
        )

    def test_filter_by_preset_id(self):
        """Test filtering preset transaction tags by preset ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': self.preset1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, [{'id': 1, 'preset': 1, 'tag': 1}, {'id': 2, 'preset': 1, 'tag': 2}]
        )

    def test_filter_by_tag_id(self):
        """Test filtering preset transaction tags by tag ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': self.tag1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data, [{'id': 1, 'preset': 1, 'tag': 1}, {'id': 3, 'preset': 2, 'tag': 1}]
        )

    def test_filter_by_preset_and_tag(self):
        """Test filtering by multiple parameters (preset and tag)"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {'preset': self.preset1_user1.id, 'tag': self.tag1_user1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [{'id': 1, 'preset': 1, 'tag': 1}])

    def test_filter_by_preset_and_tag_no_match(self):
        """Test filtering by preset and tag with no matching results"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {'preset': self.preset2_user1.id, 'tag': self.tag2_user1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_nonexistent_preset_id(self):
        """Test filtering by non-existent preset ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_nonexistent_tag_id(self):
        """Test filtering by non-existent tag ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_invalid_preset_id_format(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_tag_id_format(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
