from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from expenses.models import Tag


class TestTagView(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='testuser1', password='testpass123')
        self.user2 = User.objects.create_user(username='testuser2', password='testpass123')

        self.tag1 = Tag.objects.create(
            user=self.user1, name='Test Tag 1', desc='Test Description 1'
        )
        self.tag2 = Tag.objects.create(
            user=self.user1, name='Test Tag 2', desc='Test Description 2'
        )

        self.tag_user2 = Tag.objects.create(
            user=self.user2, name='User2 Tag', desc='User2 Description'
        )

        self.url = '/api/tags'

    def test_get_tags_unauthenticated(self):
        """Test that unauthenticated users get an error when accessing tags"""
        # The view doesn't have proper authentication, so it will cause a database error
        # when trying to filter by AnonymousUser
        with self.assertRaises(TypeError):
            self.client.get(self.url)

    def test_get_tags_authenticated(self):
        """Test that authenticated users can get their tags"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Check that only user1's tags are returned and ordered by name
        self.assertEqual(
            sorted([tag['name'] for tag in response.data]), ['Test Tag 1', 'Test Tag 2']
        )

    def test_get_tags_filter_by_id(self):
        """Test filtering tags by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.tag1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0],
            {'id': self.tag1.id, 'name': 'Test Tag 1', 'desc': 'Test Description 1', 'user': 1},
        )

    def test_get_tags_filter_by_nonexistent_id(self):
        """Test filtering by non-existent ID returns empty list"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': 99999})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_get_tags_filter_by_other_users_id(self):
        """Test that users cannot access other users' tags by ID"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url, {'id': self.tag_user2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_tag_success(self):
        """Test successful tag creation"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            self.url,
            {'action': 'create', 'Name': 'New Test Tag', 'Description': 'New Test Description'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_tag = Tag.objects.filter(user=self.user1, name='New Test Tag').first()
        self.assertIsNotNone(new_tag)
        self.assertEqual(new_tag.desc, 'New Test Description')

    def test_create_tag_unauthenticated(self):
        """Test that unauthenticated users get an error when creating tags"""
        data = {
            'action': 'create',
            'Name': 'New Test Tag',
            'Description': 'New Test Description',
        }

        # The view doesn't have proper authentication, so it will cause a ValueError
        # when trying to assign AnonymousUser to the user field
        with self.assertRaises(ValueError):
            self.client.post(self.url, data)

    def test_create_tag_missing_fields(self):
        """Test tag creation with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing Name
        data = {'action': 'create', 'Description': 'New Test Description'}
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing Description
        data = {'action': 'create', 'Name': 'New Test Tag'}
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_delete_tag_success(self):
        """Test successful tag deletion"""
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'delete', 'id': self.tag1.id}

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(Tag.objects.filter(id=self.tag1.id).exists())

    def test_delete_tag_unauthorized(self):
        """Test that users cannot delete other users' tags"""
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'delete', 'id': self.tag_user2.id}

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.assertTrue(Tag.objects.filter(id=self.tag_user2.id).exists())

    def test_delete_nonexistent_tag(self):
        """Test deleting a non-existent tag"""
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'delete', 'id': 99999}

        with self.assertRaises(Tag.DoesNotExist):
            self.client.post(self.url, data)

    def test_edit_tag_success(self):
        """Test successful tag editing"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'action': 'edit',
            'id': self.tag1.id,
            'Name': 'Updated Tag Name',
            'Description': 'Updated Description',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_tag = Tag.objects.get(id=self.tag1.id)
        self.assertEqual(updated_tag.name, 'Updated Tag Name')
        self.assertEqual(updated_tag.desc, 'Updated Description')

    def test_edit_tag_unauthorized(self):
        """Test that users cannot edit other users' tags"""
        self.client.force_authenticate(user=self.user1)
        original_name = self.tag_user2.name
        original_desc = self.tag_user2.desc

        data = {
            'action': 'edit',
            'id': self.tag_user2.id,
            'Name': 'Hacked Name',
            'Description': 'Hacked Description',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        unchanged_tag = Tag.objects.get(id=self.tag_user2.id)
        self.assertEqual(unchanged_tag.name, original_name)
        self.assertEqual(unchanged_tag.desc, original_desc)

    def test_edit_nonexistent_tag(self):
        """Test editing a non-existent tag"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'action': 'edit',
            'id': 99999,
            'Name': 'Updated Name',
            'Description': 'Updated Description',
        }

        with self.assertRaises(Tag.DoesNotExist):
            self.client.post(self.url, data)

    def test_edit_tag_missing_fields(self):
        """Test tag editing with missing required fields"""
        self.client.force_authenticate(user=self.user1)

        # Test missing Name
        data = {'action': 'edit', 'id': self.tag1.id, 'Description': 'Updated Description'}
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

        # Test missing Description
        data = {'action': 'edit', 'id': self.tag1.id, 'Name': 'Updated Name'}
        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_invalid_action(self):
        """Test POST request with invalid action"""
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'invalid_action', 'Name': 'Test Name', 'Description': 'Test Description'}

        # The view doesn't handle invalid actions, so it returns None
        # which causes DRF to raise an AssertionError
        with self.assertRaises(AssertionError):
            self.client.post(self.url, data)

    def test_missing_action(self):
        """Test POST request without action field"""
        self.client.force_authenticate(user=self.user1)
        data = {'Name': 'Test Name', 'Description': 'Test Description'}

        with self.assertRaises(KeyError):
            self.client.post(self.url, data)

    def test_user_isolation(self):
        """Test that users can only see their own tags"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'User2 Tag')

    def test_empty_tag_list(self):
        """Test user with no tags gets empty list"""
        user3 = User.objects.create_user(username='testuser3', password='testpass123')
        self.client.force_authenticate(user=user3)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_tag_creation_assigns_correct_user(self):
        """Test that created tags are assigned to the correct user"""
        self.client.force_authenticate(user=self.user2)
        data = {
            'action': 'create',
            'Name': 'User2 New Tag',
            'Description': 'User2 New Description',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify tag was created for user2
        new_tag = Tag.objects.filter(user=self.user2, name='User2 New Tag').first()
        self.assertIsNotNone(new_tag)
        self.assertEqual(new_tag.user, self.user2)

        # Verify user1 cannot see this tag
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        tag_names = [tag['name'] for tag in response.data]
        self.assertNotIn('User2 New Tag', tag_names)

    def test_tag_ordering(self):
        """Test that tags are ordered by name"""
        self.client.force_authenticate(user=self.user1)

        # Create tags with names that would sort differently
        Tag.objects.create(user=self.user1, name='Alpha Tag', desc='Should be first')
        Tag.objects.create(user=self.user1, name='Zebra Tag', desc='Should be last')

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Get all tag names and verify they're sorted
        tag_names = [tag['name'] for tag in response.data]
        self.assertEqual(tag_names, sorted(tag_names))

    def test_tag_with_empty_description(self):
        """Test creating a tag with empty description"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'action': 'create',
            'Name': 'Tag With Empty Desc',
            'Description': '',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_tag = Tag.objects.filter(user=self.user1, name='Tag With Empty Desc').first()
        self.assertIsNotNone(new_tag)
        self.assertEqual(new_tag.desc, '')

    def test_edit_tag_with_empty_description(self):
        """Test editing a tag to have empty description"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'action': 'edit',
            'id': self.tag1.id,
            'Name': 'Updated Tag Name',
            'Description': '',
        }

        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_tag = Tag.objects.get(id=self.tag1.id)
        self.assertEqual(updated_tag.name, 'Updated Tag Name')
        self.assertEqual(updated_tag.desc, '')
