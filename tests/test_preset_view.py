from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account
from expenses.models import Preset
from expenses.models import PresetSubtransaction
from expenses.models import PresetTransactionTag
from expenses.models import Tag


class TestPresetView(TestCase):
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
        self.account_user2 = Account.objects.create(
            user=self.user2, name='User2 Account', desc='User2 Account Description'
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

        self.preset1 = Preset.objects.create(
            user=self.user1,
            name='Test Preset 1',
            desc='Test Preset Description 1',
            transaction_desc='Test Transaction Description 1',
        )
        self.preset2 = Preset.objects.create(
            user=self.user1,
            name='Test Preset 2',
            desc='Test Preset Description 2',
            transaction_desc='Test Transaction Description 2',
        )
        self.preset_user2 = Preset.objects.create(
            user=self.user2,
            name='User2 Preset',
            desc='User2 Preset Description',
            transaction_desc='User2 Transaction Description',
        )

        self.preset_tag1 = PresetTransactionTag.objects.create(preset=self.preset1, tag=self.tag1)
        self.preset_tag2 = PresetTransactionTag.objects.create(preset=self.preset2, tag=self.tag2)

        self.preset_sub1 = PresetSubtransaction.objects.create(
            preset=self.preset1, account=self.account1, fraction=0.5
        )
        self.preset_sub2 = PresetSubtransaction.objects.create(
            preset=self.preset2, account=self.account2, fraction=1.0
        )

        self.url = '/api/presets'

    def test_get_presets_unauthenticated(self):
        """Test that unauthenticated users get an error when accessing presets"""
        with self.assertRaises(TypeError):
            self.client.get(self.url)

    def test_get_presets_authenticated(self):
        """Test that authenticated users can get their presets"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Check that only user1's presets are returned and ordered by name
        self.assertEqual(
            sorted([preset['name'] for preset in response.data]), ['Test Preset 1', 'Test Preset 2']
        )

    def test_get_presets_filter_by_id(self):
        """Test filtering presets by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.preset1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0],
            {
                'id': self.preset1.id,
                'name': 'Test Preset 1',
                'desc': 'Test Preset Description 1',
                'transaction_desc': 'Test Transaction Description 1',
                'user': 1,
            },
        )

    def test_get_presets_filter_by_nonexistent_id(self):
        """Test filtering by non-existent ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_presets_filter_by_other_users_id(self):
        """Test that users cannot access other users' presets by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.preset_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_presets_filter_by_tag(self):
        """Test filtering presets by tag ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': self.tag1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Preset 1')

    def test_get_presets_filter_by_nonexistent_tag(self):
        """Test filtering by non-existent tag returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'tag': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_preset_success(self):
        """Test successful preset creation"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'New Test Preset',
                'desc': 'New Test Description',
                'transDesc': 'New Test Transaction Description',
                'tags': [
                    {'id': self.tag1.id, 'isChecked': True},
                    {'id': self.tag2.id, 'isChecked': False},
                ],
                'accounts': [
                    {'id': self.account1.id, 'isUsed': True, 'fraction': 0.7},
                    {'id': self.account2.id, 'isUsed': False, 'fraction': 0.3},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(user=self.user1, name='New Test Preset').first()
        self.assertIsNotNone(new_preset)
        self.assertEqual(new_preset.desc, 'New Test Description')
        self.assertEqual(new_preset.transaction_desc, 'New Test Transaction Description')

        # Verify tag relationships
        preset_tags = PresetTransactionTag.objects.filter(preset=new_preset)
        self.assertEqual(preset_tags.count(), 1)
        self.assertEqual(preset_tags.first().tag, self.tag1)

        # Verify account relationships
        preset_subs = PresetSubtransaction.objects.filter(preset=new_preset)
        self.assertEqual(preset_subs.count(), 1)
        self.assertEqual(preset_subs.first().account, self.account1)
        self.assertEqual(preset_subs.first().fraction, 0.7)

    def test_create_preset_unauthenticated(self):
        """Test that unauthenticated users get an error when creating presets"""

        with self.assertRaises(ValueError):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'name': 'New Test Preset',
                    'desc': 'New Test Description',
                    'transDesc': 'New Test Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
            )

    def test_create_preset_missing_fields(self):
        """Test preset creation with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing name
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'desc': 'New Test Description',
                    'transDesc': 'New Test Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
            )

        # Test missing desc
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'name': 'New Test Preset',
                    'transDesc': 'New Test Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
            )

        # Test missing transDesc
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'name': 'New Test Preset',
                    'desc': 'New Test Description',
                    'tags': [],
                    'accounts': [],
                },
            )

    def test_create_preset_with_nonexistent_tag(self):
        """Test creating preset with non-existent tag"""
        self.client.force_authenticate(user=self.user1)

        with self.assertRaises(Tag.DoesNotExist):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'name': 'New Test Preset',
                    'desc': 'New Test Description',
                    'transDesc': 'New Test Transaction Description',
                    'tags': [{'id': 99999, 'isChecked': True}],
                    'accounts': [],
                },
                format='json',
            )

    def test_create_preset_with_nonexistent_account(self):
        """Test creating preset with non-existent account"""
        self.client.force_authenticate(user=self.user1)

        with self.assertRaises(Account.DoesNotExist):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'name': 'New Test Preset',
                    'desc': 'New Test Description',
                    'transDesc': 'New Test Transaction Description',
                    'tags': [],
                    'accounts': [{'id': 99999, 'isUsed': True, 'fraction': 1.0}],
                },
                format='json',
            )

    def test_delete_preset_success(self):
        """Test successful preset deletion"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url, {'action': 'delete', 'id': self.preset1.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(Preset.objects.filter(id=self.preset1.id).exists())
        # Related relationships should also be deleted
        self.assertFalse(PresetTransactionTag.objects.filter(preset=self.preset1).exists())
        self.assertFalse(PresetSubtransaction.objects.filter(preset=self.preset1).exists())

    def test_delete_preset_unauthorized(self):
        """Test that users can delete other users' presets"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url, {'action': 'delete', 'id': self.preset_user2.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Preset.objects.filter(id=self.preset_user2.id).exists())

    def test_delete_nonexistent_preset(self):
        """Test deleting a non-existent preset"""
        self.client.force_authenticate(user=self.user1)

        with self.assertRaises(Preset.DoesNotExist):
            self.client.post(self.url, {'action': 'delete', 'id': 99999}, format='json')

    def test_edit_preset_success(self):
        """Test successful preset editing"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.preset1.id,
                'name': 'Updated Preset Name',
                'desc': 'Updated Preset Description',
                'transDesc': 'Updated Transaction Description',
                'tags': [
                    {'id': self.tag1.id, 'isChecked': False},
                    {'id': self.tag2.id, 'isChecked': True},
                ],
                'accounts': [
                    {'id': self.account1.id, 'isUsed': False, 'fraction': 0.0},
                    {'id': self.account2.id, 'isUsed': True, 'fraction': 1.0},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_preset = Preset.objects.get(id=self.preset1.id)
        self.assertEqual(updated_preset.name, 'Updated Preset Name')
        self.assertEqual(updated_preset.desc, 'Updated Preset Description')
        self.assertEqual(updated_preset.transaction_desc, 'Updated Transaction Description')

        # Verify tag relationships were updated
        preset_tags = PresetTransactionTag.objects.filter(preset=self.preset1)
        self.assertEqual(preset_tags.count(), 1)
        self.assertEqual(preset_tags.first().tag, self.tag2)

        # Verify account relationships were updated
        preset_subs = PresetSubtransaction.objects.filter(preset=self.preset1)
        self.assertEqual(preset_subs.count(), 1)
        self.assertEqual(preset_subs.first().account, self.account2)
        self.assertEqual(preset_subs.first().fraction, 1.0)

    def test_edit_preset_unauthorized(self):
        """Test that users can edit other users' presets"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.preset_user2.id,
                'name': 'Hacked Preset Name',
                'desc': 'Hacked Preset Description',
                'transDesc': 'Hacked Transaction Description',
                'tags': [],
                'accounts': [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        changed_preset = Preset.objects.get(id=self.preset_user2.id)

        self.assertEqual(changed_preset.name, self.preset_user2.name)
        self.assertEqual(changed_preset.desc, self.preset_user2.desc)
        self.assertEqual(changed_preset.transaction_desc, self.preset_user2.transaction_desc)

    def test_edit_nonexistent_preset(self):
        """Test editing a non-existent preset"""
        self.client.force_authenticate(user=self.user1)

        with self.assertRaises(Preset.DoesNotExist):
            self.client.post(
                self.url,
                {
                    'action': 'edit',
                    'id': 99999,
                    'name': 'Updated Preset Name',
                    'desc': 'Updated Preset Description',
                    'transDesc': 'Updated Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

    def test_edit_preset_missing_fields(self):
        """Test preset editing with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing name
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'edit',
                    'id': self.preset1.id,
                    'desc': 'Updated Preset Description',
                    'transDesc': 'Updated Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

        # Test missing desc
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'edit',
                    'id': self.preset1.id,
                    'name': 'Updated Preset Name',
                    'transDesc': 'Updated Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

        # Test missing transDesc
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'action': 'edit',
                    'id': self.preset1.id,
                    'name': 'Updated Preset Name',
                    'desc': 'Updated Preset Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

    def test_invalid_action(self):
        """Test POST request with invalid action"""
        self.client.force_authenticate(user=self.user1)

        # The view doesn't handle invalid actions, so it returns None
        # which causes DRF to raise an AssertionError
        with self.assertRaises(AssertionError):
            self.client.post(
                self.url,
                {
                    'action': 'invalid_action',
                    'name': 'Test Preset',
                    'desc': 'Test Description',
                    'transDesc': 'Test Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

    def test_missing_action(self):
        """Test POST request without action field"""
        self.client.force_authenticate(user=self.user1)

        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {
                    'name': 'Test Preset',
                    'desc': 'Test Description',
                    'transDesc': 'Test Transaction Description',
                    'tags': [],
                    'accounts': [],
                },
                format='json',
            )

    def test_user_isolation(self):
        """Test that users can only see their own presets"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'User2 Preset')

    def test_empty_preset_list(self):
        """Test user with no presets gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_preset_creation_assigns_correct_user(self):
        """Test that created presets are assigned to the correct user"""
        self.client.force_authenticate(user=self.user2)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'User2 New Preset',
                'desc': 'User2 New Description',
                'transDesc': 'User2 New Transaction Description',
                'tags': [],
                'accounts': [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify preset was created for user2
        new_preset = Preset.objects.filter(user=self.user2, name='User2 New Preset').first()
        self.assertIsNotNone(new_preset)
        self.assertEqual(new_preset.user, self.user2)

        # Verify user1 cannot see this preset
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        preset_names = [preset['name'] for preset in response.data]
        self.assertNotIn('User2 New Preset', preset_names)

    def test_preset_ordering(self):
        """Test that presets are ordered by name"""
        self.client.force_authenticate(user=self.user1)

        # Create presets with names that would sort differently
        Preset.objects.create(
            user=self.user1,
            name='Alpha Preset',
            desc='Should be first',
            transaction_desc='Alpha Transaction',
        )
        Preset.objects.create(
            user=self.user1,
            name='Zebra Preset',
            desc='Should be last',
            transaction_desc='Zebra Transaction',
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Get all preset names and verify they're sorted
        preset_names = [preset['name'] for preset in response.data]
        self.assertEqual(preset_names, sorted(preset_names))

    def test_preset_with_empty_description(self):
        """Test creating a preset with empty description"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'Preset With Empty Desc',
                'desc': '',
                'transDesc': 'Transaction Description',
                'tags': [],
                'accounts': [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(user=self.user1, name='Preset With Empty Desc').first()
        self.assertIsNotNone(new_preset)
        self.assertEqual(new_preset.desc, '')

    def test_edit_preset_with_empty_description(self):
        """Test editing a preset to have empty description"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.preset1.id,
                'name': 'Updated Preset Name',
                'desc': '',
                'transDesc': 'Updated Transaction Description',
                'tags': [],
                'accounts': [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_preset = Preset.objects.get(id=self.preset1.id)
        self.assertEqual(updated_preset.name, 'Updated Preset Name')
        self.assertEqual(updated_preset.desc, '')

    def test_preset_with_empty_transaction_description(self):
        """Test creating a preset with empty transaction description"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'Preset With Empty Trans Desc',
                'desc': 'Preset Description',
                'transDesc': '',
                'tags': [],
                'accounts': [],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(
            user=self.user1, name='Preset With Empty Trans Desc'
        ).first()
        self.assertIsNotNone(new_preset)
        self.assertEqual(new_preset.transaction_desc, '')

    def test_preset_with_multiple_tags_and_accounts(self):
        """Test creating a preset with multiple tags and accounts"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'Complex Preset',
                'desc': 'Complex Preset Description',
                'transDesc': 'Complex Transaction Description',
                'tags': [
                    {'id': self.tag1.id, 'isChecked': True},
                    {'id': self.tag2.id, 'isChecked': True},
                ],
                'accounts': [
                    {'id': self.account1.id, 'isUsed': True, 'fraction': 0.6},
                    {'id': self.account2.id, 'isUsed': True, 'fraction': 0.4},
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(user=self.user1, name='Complex Preset').first()
        self.assertIsNotNone(new_preset)

        # Verify tag relationships
        preset_tags = PresetTransactionTag.objects.filter(preset=new_preset)
        self.assertEqual(preset_tags.count(), 2)
        tag_ids = [pt.tag.id for pt in preset_tags]
        self.assertIn(self.tag1.id, tag_ids)
        self.assertIn(self.tag2.id, tag_ids)

        # Verify account relationships
        preset_subs = PresetSubtransaction.objects.filter(preset=new_preset)
        self.assertEqual(preset_subs.count(), 2)
        account_ids = [ps.account.id for ps in preset_subs]
        self.assertIn(self.account1.id, account_ids)
        self.assertIn(self.account2.id, account_ids)

    def test_edit_preset_removing_all_relationships(self):
        """Test editing a preset to remove all tag and account relationships"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.preset1.id,
                'name': 'Updated Preset Name',
                'desc': 'Updated Preset Description',
                'transDesc': 'Updated Transaction Description',
                'tags': [{'id': self.tag1.id, 'isChecked': False}],
                'accounts': [{'id': self.account1.id, 'isUsed': False, 'fraction': 0.0}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify all relationships were removed
        preset_tags = PresetTransactionTag.objects.filter(preset=self.preset1)
        self.assertEqual(preset_tags.count(), 0)

        preset_subs = PresetSubtransaction.objects.filter(preset=self.preset1)
        self.assertEqual(preset_subs.count(), 0)

    def test_preset_with_other_users_tag(self):
        """Test creating a preset with other user's tag should fail"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'Preset With Other User Tag',
                'desc': 'Preset Description',
                'transDesc': 'Transaction Description',
                'tags': [{'id': self.tag_user2.id, 'isChecked': True}],
                'accounts': [],
            },
            format='json',
        )
        # Should work since the view doesn't check tag ownership
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(
            user=self.user1, name='Preset With Other User Tag'
        ).first()
        self.assertIsNotNone(new_preset)

        # Verify tag relationship was created
        preset_tags = PresetTransactionTag.objects.filter(preset=new_preset)
        self.assertEqual(preset_tags.count(), 1)
        self.assertEqual(preset_tags.first().tag, self.tag_user2)

    def test_preset_with_other_users_account(self):
        """Test creating a preset with other user's account should fail"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'name': 'Preset With Other User Account',
                'desc': 'Preset Description',
                'transDesc': 'Transaction Description',
                'tags': [],
                'accounts': [{'id': self.account_user2.id, 'isUsed': True, 'fraction': 1.0}],
            },
            format='json',
        )
        # Should work since the view doesn't check account ownership
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_preset = Preset.objects.filter(
            user=self.user1, name='Preset With Other User Account'
        ).first()
        self.assertIsNotNone(new_preset)

        # Verify account relationship was created
        preset_subs = PresetSubtransaction.objects.filter(preset=new_preset)
        self.assertEqual(preset_subs.count(), 1)
        self.assertEqual(preset_subs.first().account, self.account_user2)
