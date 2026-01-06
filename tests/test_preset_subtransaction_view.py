from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Preset
from expenses.models import PresetSubtransaction


class TestPresetSubtransactionView(TestCase):
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
        self.account3_user1 = Account.objects.create(
            user=self.user1, name='User1 Account 3', desc='Test account 3'
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

        self.preset_subtransaction1 = PresetSubtransaction.objects.create(
            preset=self.preset1_user1, account=self.account1_user1, fraction=0.5
        )

        self.preset_subtransaction2 = PresetSubtransaction.objects.create(
            preset=self.preset1_user1, account=self.account2_user1, fraction=0.3
        )

        self.preset_subtransaction3 = PresetSubtransaction.objects.create(
            preset=self.preset2_user1, account=self.account1_user1, fraction=1.0
        )

        self.preset_subtransaction4 = PresetSubtransaction.objects.create(
            preset=self.preset2_user1, account=self.account3_user1, fraction=0.8
        )

        self.preset_subtransaction_user2 = PresetSubtransaction.objects.create(
            preset=self.preset1_user2, account=self.account1_user2, fraction=0.7
        )

        self.url = '/api/preset_subtransactions'

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access the API"""
        # Don't authenticate the client
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_access_other_users_preset_subtransactions(self):
        """Test that users can only access their own preset subtransactions"""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Try to filter by user2's preset (should return empty results)
        response = self.client.get(self.url, {'preset': self.preset1_user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])  # Should be empty since user1 doesn't own this preset

    def test_user_cannot_access_other_users_data_via_account_filtering(self):
        """Test that users cannot access other users' data through account filtering"""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Try to filter by user2's account (should return empty results)
        response = self.client.get(self.url, {'account': self.account1_user2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])  # Should be empty since user1 doesn't own this account

    def test_user_can_only_see_their_own_preset_subtransactions(self):
        """Test that users can only see their own preset subtransactions"""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Get all preset subtransactions for user1
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only see 4 subtransactions (all belonging to user1)
        self.assertEqual(len(response.data), 4)

        # Verify all returned subtransactions belong to user1's presets
        preset_ids = [sub['preset'] for sub in response.data]
        user1_preset_ids = {self.preset1_user1.id, self.preset2_user1.id}
        self.assertTrue(all(pid in user1_preset_ids for pid in preset_ids))

    def test_user_can_only_see_their_own_preset_subtransactions_user2(self):
        """Test that user2 can only see their own preset subtransactions"""
        # Authenticate as user2
        self.client.force_authenticate(user=self.user2)

        # Get all preset subtransactions for user2
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only see 1 subtransaction (belonging to user2)
        self.assertEqual(len(response.data), 1)

        # Verify the returned subtransaction belongs to user2's preset
        self.assertEqual(response.data[0]['preset'], self.preset1_user2.id)
        self.assertEqual(response.data[0]['account'], self.account1_user2.id)

    def test_user_cannot_access_preset_subtransactions_via_invalid_preset_id(self):
        """Test that users cannot access other users' data through invalid preset IDs"""
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Try to access a non-existent preset ID
        response = self.client.get(self.url, {'preset': 99999})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])  # Should be empty

    def test_get_all_preset_subtransactions(self):
        """Test getting all preset subtransactions without filters"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)  # Only user1's 4 preset subtransactions

    def test_filter_by_preset_id(self):
        """Test filtering preset subtransactions by preset ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': self.preset1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # 2 subtransactions for this preset

        # Verify all subtransactions belong to the correct preset
        preset_ids = [sub['preset'] for sub in response.data]
        self.assertTrue(all(pid == self.preset1_user1.id for pid in preset_ids))

    def test_filter_by_preset_id_user2(self):
        """Test filtering preset subtransactions by preset ID for user2"""
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url, {'preset': self.preset1_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # 1 subtransaction for this preset

        # Verify the subtransaction belongs to the correct preset
        self.assertEqual(response.data[0]['preset'], self.preset1_user2.id)
        self.assertEqual(response.data[0]['account'], self.account1_user2.id)
        self.assertEqual(response.data[0]['fraction'], 0.7)

    def test_filter_by_nonexistent_preset_id(self):
        """Test filtering by non-existent preset ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_account_id(self):
        """Test filtering preset subtransactions by account ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': self.account1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # 2 subtransactions for this account

        # Verify all subtransactions belong to the correct account
        account_ids = [sub['account'] for sub in response.data]
        self.assertTrue(all(aid == self.account1_user1.id for aid in account_ids))

    def test_filter_by_nonexistent_account_id(self):
        """Test filtering by non-existent account ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_filter_by_preset_and_account(self):
        """Test filtering by multiple parameters (preset and account)"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {'preset': self.preset1_user1.id, 'account': self.account1_user1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only one matches both criteria

        self.assertEqual(response.data[0]['preset'], self.preset1_user1.id)
        self.assertEqual(response.data[0]['account'], self.account1_user1.id)
        self.assertEqual(response.data[0]['fraction'], 0.5)

    def test_filter_by_preset_and_account_no_match(self):
        """Test filtering by preset and account with no matching results"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(
            self.url, {'preset': self.preset2_user1.id, 'account': self.account2_user1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_empty_preset_subtransaction_list(self):
        """Test getting preset subtransactions when none exist"""
        PresetSubtransaction.objects.all().delete()

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_invalid_preset_id_format(self):
        """Test filtering with invalid preset ID format"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_account_id_format(self):
        """Test filtering with invalid account ID format"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'account': 'invalid-id'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_preset_subtransaction_data_structure(self):
        """Test that preset subtransaction data has correct structure"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': self.preset1_user1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Check data structure of first subtransaction
        subtransaction = response.data[0]
        self.assertIn('id', subtransaction)
        self.assertIn('preset', subtransaction)
        self.assertIn('account', subtransaction)
        self.assertIn('fraction', subtransaction)
        self.assertIsInstance(subtransaction['id'], int)
        self.assertIsInstance(subtransaction['preset'], int)
        self.assertIsInstance(subtransaction['account'], int)
        self.assertIsInstance(subtransaction['fraction'], float)

    def test_many_preset_subtransactions(self):
        """Test performance with many preset subtransactions"""
        # Create additional preset subtransactions
        for i in range(50):
            preset = self.preset1_user1 if i % 2 == 0 else self.preset2_user1
            account = self.account1_user1 if i % 3 == 0 else self.account2_user1
            PresetSubtransaction.objects.create(
                preset=preset, account=account, fraction=(i + 1) * 0.1
            )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should have original 4 + 50 new = 54 preset subtransactions for user1
        self.assertEqual(len(response.data), 54)

    def test_filter_with_multiple_preset_subtransactions_per_preset(self):
        """Test filtering when presets have multiple subtransactions"""
        # Create more subtransactions for preset1_user1
        for i in range(10):
            PresetSubtransaction.objects.create(
                preset=self.preset1_user1, account=self.account3_user1, fraction=0.1 * (i + 1)
            )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'preset': self.preset1_user1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should have original 2 + 10 new = 12 subtransactions for this preset
        self.assertEqual(len(response.data), 12)

    def test_cross_user_preset_subtransactions_not_mixed(self):
        """Test that preset subtransactions from different users are not mixed"""
        self.client.force_authenticate(user=self.user1)
        # Get all preset subtransactions for user1
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only see user1's preset subtransactions (4 total)
        self.assertEqual(len(response.data), 4)

        # Verify all returned subtransactions belong to user1's presets
        preset_ids = [sub['preset'] for sub in response.data]
        user1_preset_ids = {self.preset1_user1.id, self.preset2_user1.id}
        self.assertTrue(all(pid in user1_preset_ids for pid in preset_ids))
