from datetime import datetime
from datetime import timedelta

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APITestCase

from expenses.models import Account
from expenses.models import AccountSyncEvent
from expenses.models import Subtransaction
from expenses.models import Tag
from expenses.models import Transaction
from expenses.models import TransactionTag


class TestTransactionsAndRelatedDataView(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(username='test1', password='test')
        self.user2 = User.objects.create_user(username='test2', password='test')

        self.client.force_authenticate(user=self.user1)

        self.account1 = Account.objects.create(
            user=self.user1, name='Test 1', desc='Test Description 1'
        )
        self.account2 = Account.objects.create(
            user=self.user1, name='Test 2', desc='Test Description 2'
        )

        self.account_user2 = Account.objects.create(
            user=self.user2, name='User2 Account', desc='User2 Description'
        )

        self.tag1 = Tag.objects.create(name="Tag1", user=self.user1)
        self.tag2 = Tag.objects.create(name="Tag2", user=self.user1)
        self.transaction1 = Transaction.objects.create(
            user=self.user1,
            desc="Trans1",
            date_time=datetime(2000, 1, 1, 0, 0, 0) - timedelta(days=1),
        )
        self.transaction2 = Transaction.objects.create(
            user=self.user1,
            desc="Trans2",
            date_time=datetime(2000, 1, 1, 0, 0, 0),
        )
        self.transaction3 = Transaction.objects.create(
            user=self.user2,
            desc="Trans3",
            date_time=datetime(2000, 1, 1, 0, 0, 0),
        )
        self.subtransaction1 = Subtransaction.objects.create(
            transaction=self.transaction1,
            account=self.account1,
            amount=100,
        )
        self.subtransaction2 = Subtransaction.objects.create(
            transaction=self.transaction2,
            account=self.account2,
            amount=200,
        )
        self.subtransaction3 = Subtransaction.objects.create(
            transaction=self.transaction1,
            account=self.account1,
            amount=900,
        )
        self.transactionTag1 = TransactionTag.objects.create(
            transaction=self.transaction1,
            tag=self.tag1,
        )
        self.transactionTag2 = TransactionTag.objects.create(
            transaction=self.transaction2,
            tag=self.tag2,
        )
        self.sync_event = AccountSyncEvent.objects.create(
            subtransaction=self.subtransaction3,
            account=self.account1,
            balance=1000,
        )

        self.url = '/api/transactions_and_relevent_data'

    def test_only_authenticated_user_data_returned(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'transactions': [
                    {
                        'id': 2,
                        'date_time': '2000-01-01T02:00:00',
                        'desc': 'Trans2',
                        'timezone_offset': -120,
                        'user': 1,
                    },
                    {
                        'id': 1,
                        'date_time': '1999-12-31T02:00:00',
                        'desc': 'Trans1',
                        'timezone_offset': -120,
                        'user': 1,
                    },
                ],
                'transactionTags': [
                    {'id': 1, 'transaction': 1, 'tag': 1},
                    {'id': 2, 'transaction': 2, 'tag': 2},
                ],
                'tags': [
                    {'id': 1, 'name': 'Tag1', 'desc': '', 'user': 1},
                    {'id': 2, 'name': 'Tag2', 'desc': '', 'user': 1},
                ],
                'subtransactions': [
                    {'id': 2, 'amount': 200, 'transaction': 2, 'account': 2},
                    {'id': 3, 'amount': 900, 'transaction': 1, 'account': 1},
                    {'id': 1, 'amount': 100, 'transaction': 1, 'account': 1},
                ],
                'accounts': [
                    {'id': 1, 'name': 'Test 1', 'desc': 'Test Description 1', 'user': 1},
                    {'id': 2, 'name': 'Test 2', 'desc': 'Test Description 2', 'user': 1},
                ],
                'syncEvent': [{'id': 1, 'balance': 1000, 'account': 1, 'subtransaction': 3}],
            },
        )

    def test_filter_by_tag(self):
        response = self.client.get(self.url, {"tagid": self.tag1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'transactions': [
                    {
                        'id': 1,
                        'date_time': '1999-12-31T02:00:00',
                        'desc': 'Trans1',
                        'timezone_offset': -120,
                        'user': 1,
                    }
                ],
                'transactionTags': [{'id': 1, 'transaction': 1, 'tag': 1}],
                'tags': [{'id': 1, 'name': 'Tag1', 'desc': '', 'user': 1}],
                'subtransactions': [
                    {'id': 3, 'amount': 900, 'transaction': 1, 'account': 1},
                    {'id': 1, 'amount': 100, 'transaction': 1, 'account': 1},
                ],
                'accounts': [{'id': 1, 'name': 'Test 1', 'desc': 'Test Description 1', 'user': 1}],
                'syncEvent': [{'id': 1, 'balance': 1000, 'account': 1, 'subtransaction': 3}],
            },
        )

    def test_filter_by_account(self):
        response = self.client.get(self.url, {"accountid": self.account2.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'transactions': [
                    {
                        'id': 2,
                        'date_time': '2000-01-01T02:00:00',
                        'desc': 'Trans2',
                        'timezone_offset': -120,
                        'user': 1,
                    }
                ],
                'transactionTags': [{'id': 2, 'transaction': 2, 'tag': 2}],
                'tags': [{'id': 2, 'name': 'Tag2', 'desc': '', 'user': 1}],
                'subtransactions': [{'id': 2, 'amount': 200, 'transaction': 2, 'account': 2}],
                'accounts': [{'id': 2, 'name': 'Test 2', 'desc': 'Test Description 2', 'user': 1}],
                'syncEvent': [],
            },
        )

    def test_limit_offset_pagination(self):
        response = self.client.get(self.url, {"limit": 1, "offset": 0})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'transactions': [
                    {
                        'id': 2,
                        'date_time': '2000-01-01T02:00:00',
                        'desc': 'Trans2',
                        'timezone_offset': -120,
                        'user': 1,
                    }
                ],
                'transactionTags': [{'id': 2, 'transaction': 2, 'tag': 2}],
                'tags': [{'id': 2, 'name': 'Tag2', 'desc': '', 'user': 1}],
                'subtransactions': [{'id': 2, 'amount': 200, 'transaction': 2, 'account': 2}],
                'accounts': [{'id': 2, 'name': 'Test 2', 'desc': 'Test Description 2', 'user': 1}],
                'syncEvent': [],
            },
        )
