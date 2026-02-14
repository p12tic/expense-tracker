from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Account


class TestAccountView(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='testuser1', password='testpass123')
        self.user2 = User.objects.create_user(username='testuser2', password='testpass123')

        self.account1 = Account.objects.create(
            user=self.user1, name='Test 1', desc='Test Description 1'
        )
        self.account2 = Account.objects.create(
            user=self.user1, name='Test 2', desc='Test Description 2'
        )

        self.account_user2 = Account.objects.create(
            user=self.user2, name='User2 Account', desc='User2 Description'
        )

        self.url = '/api/accounts'

    def test_get_accounts_unauthenticated(self):
        """Test that unauthenticated users get an error when accessing accounts"""
        # The view doesn't have proper authentication, so it will cause a database error
        # when trying to filter by AnonymousUser
        with self.assertRaises(TypeError):
            self.client.get(self.url)

    def test_get_accounts_authenticated(self):
        """Test that authenticated users can get their accounts"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Check that only user1's accounts are returned
        self.assertEqual(
            sorted([account['name'] for account in response.data]), ['Test 1', 'Test 2']
        )

    def test_get_accounts_filter_by_id(self):
        """Test filtering accounts by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.account1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data,
            [{'id': self.account1.id, 'name': 'Test 1', 'desc': 'Test Description 1', 'user': 1}],
        )

    def test_get_accounts_filter_by_nonexistent_id(self):
        """Test filtering by non-existent ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_accounts_filter_by_other_users_id(self):
        """Test that users cannot access other users' accounts by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.account_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_account_success(self):
        """Test successful account creation"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {'action': 'create', 'Name': 'New Test Account', 'Description': 'New Test Description'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_account = Account.objects.filter(user=self.user1, name='New Test Account').first()
        self.assertIsNotNone(new_account)
        self.assertEqual(new_account.desc, 'New Test Description')

    def test_create_account_unauthenticated(self):
        """Test that unauthenticated users get an error when creating accounts"""
        # The view doesn't have proper authentication, so it will cause a ValueError
        # when trying to assign AnonymousUser to the user field
        with self.assertRaises(ValueError):
            self.client.post(
                self.url,
                {
                    'action': 'create',
                    'Name': 'New Test Account',
                    'Description': 'New Test Description',
                },
            )

    def test_create_account_missing_fields(self):
        """Test account creation with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing Name
        with self.assertRaises(KeyError):
            self.client.post(self.url, {'action': 'create', 'Description': 'New Test Description'})

        # Test missing Description
        with self.assertRaises(KeyError):
            self.client.post(self.url, {'action': 'create', 'Name': 'New Test Account'})

    def test_delete_account_success(self):
        """Test successful account deletion"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {'action': 'delete', 'id': self.account1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(Account.objects.filter(id=self.account1.id).exists())

    def test_delete_account_unauthorized(self):
        """Test that users cannot delete other users' accounts"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url, {'action': 'delete', 'id': self.account_user2.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.assertTrue(Account.objects.filter(id=self.account_user2.id).exists())

    def test_delete_nonexistent_account(self):
        """Test deleting a non-existent account"""
        self.client.force_authenticate(user=self.user1)
        with self.assertRaises(Account.DoesNotExist):
            self.client.post(self.url, {'action': 'delete', 'id': 99999})

    def test_edit_account_success(self):
        """Test successful account editing"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.account1.id,
                'Name': 'Updated Account Name',
                'Description': 'Updated Description',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_account = Account.objects.get(id=self.account1.id)
        self.assertEqual(updated_account.name, 'Updated Account Name')
        self.assertEqual(updated_account.desc, 'Updated Description')

    def test_edit_account_unauthorized(self):
        """Test that users cannot edit other users' accounts"""
        self.client.force_authenticate(user=self.user1)
        original_name = self.account_user2.name
        original_desc = self.account_user2.desc

        response = self.client.post(
            self.url,
            {
                'action': 'edit',
                'id': self.account_user2.id,
                'Name': 'Hacked Name',
                'Description': 'Hacked Description',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        unchanged_account = Account.objects.get(id=self.account_user2.id)
        self.assertEqual(unchanged_account.name, original_name)
        self.assertEqual(unchanged_account.desc, original_desc)

    def test_edit_nonexistent_account(self):
        """Test editing a non-existent account"""
        self.client.force_authenticate(user=self.user1)
        with self.assertRaises(Account.DoesNotExist):
            self.client.post(
                self.url,
                {
                    'action': 'edit',
                    'id': 99999,
                    'Name': 'Updated Name',
                    'Description': 'Updated Description',
                },
            )

    def test_edit_account_missing_fields(self):
        """Test account editing with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing Name
        with self.assertRaises(KeyError):
            self.client.post(
                self.url,
                {'action': 'edit', 'id': self.account1.id, 'Description': 'Updated Description'},
            )

        # Test missing Description
        with self.assertRaises(KeyError):
            self.client.post(
                self.url, {'action': 'edit', 'id': self.account1.id, 'Name': 'Updated Name'}
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
                    'Name': 'Test Name',
                    'Description': 'Test Description',
                },
            )

    def test_missing_action(self):
        """Test POST request without action field"""
        self.client.force_authenticate(user=self.user1)
        with self.assertRaises(KeyError):
            self.client.post(self.url, {'Name': 'Test Name', 'Description': 'Test Description'})

    def test_user_isolation(self):
        """Test that users can only see their own accounts"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'User2 Account')

    def test_empty_account_list(self):
        """Test user with no accounts gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_account_creation_assigns_correct_user(self):
        """Test that created accounts are assigned to the correct user"""
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'Name': 'User2 New Account',
                'Description': 'User2 New Description',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify account was created for user2
        new_account = Account.objects.filter(user=self.user2, name='User2 New Account').first()
        self.assertIsNotNone(new_account)
        self.assertEqual(new_account.user, self.user2)

        # Verify user1 cannot see this account
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        account_names = [account['name'] for account in response.data]
        self.assertNotIn('User2 New Account', account_names)

    def test_account_limit_offset(self):
        """Test that checks if limit and offset are correct"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'Name': 'Test 3',
                'Description': 'New Description',
            },
        )
        response = self.client.post(
            self.url,
            {
                'action': 'create',
                'Name': 'Test 4',
                'Description': 'New Description',
            },
        )

        response = self.client.get(self.url, {'limit': 2, 'offset': 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(
            response.data,
            [
                {'id': 2, 'name': 'Test 2', 'desc': 'Test Description 2', 'user': 1},
                {'id': 4, 'name': 'Test 3', 'desc': 'New Description', 'user': 1},
            ],
        )
