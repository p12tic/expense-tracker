import random
import string
import datetime

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone

from expenses.models import Tag
from expenses.models import Account
from expenses.models import Transaction
from expenses.models import Subtransaction
from expenses.models import AccountSyncEvent


class Command(BaseCommand):
    help = "Generates synthetic data for testing with the expense-tracker"

    def add_arguments(self, parser):
        parser.add_argument('-u', '--username', type=str, help="Username to use")
        parser.add_argument('-p', '--password', type=str, help="Password for the user")
        parser.add_argument('-s', '--seed', type=int, help="Seed for random generation")
        parser.add_argument('-d', '--dataPoints', type=int, default=1000, help="Number of data points")
        parser.add_argument('-a', '--accounts', type=int, default=10, help="Number of accounts")
        parser.add_argument('-t', '--tags', type=int, default=5, help="Number of tags")
        parser.add_argument('-l', '--log', action='store_true')

    def handle(self, *args, **options):
        seed = options['seed'] or random.randint(0, 2**32 - 1)
        random.seed(seed)

        self.verbose: bool = options['log']

        user = self.get_user(
            username=options['username'],
            password=options['password'],
        )

        self.generate_data(
            user=user,
            amount_of_data_points = options['dataPoints'],
            account_list = self.generate_accounts(
                amount_of_accounts=options['accounts'],
                user=user,
            ),
            tag_list = self.generate_tags(
                amount_of_tags=options['tags'],
                user=user
            )
        )

    # ------------------------------------------------------------------------------
    # Utils

    def random_string(self, length) -> str:
        return ''.join(random.choice(string.ascii_letters) for _ in range(length))

    def random_amount(self) -> int:
        return random.randint(-10000, 10000)

    # ------------------------------------------------------------------------------
    # Generators

    def get_user(self, username: str | None, password: str | None) -> User:        
        if not username:
            username = f"user_{self.random_string(5)}"
        if not password:
            password = self.random_string(5)

        self.raw_password = password # we need to store the raw_password as different variable because Django only stores a hash of the password

        user = authenticate(username=username, password=password)
        if user is None:
            user = User.objects.create_user(username=username, password=password)

            if self.verbose:
                self.stdout.write(self.style.SUCCESS(f"New user has been created:\nUsername: {username}\nPassword: {self.raw_password }\n"))

        return user

    def generate_accounts(self, amount_of_accounts: int, user: User) -> list[Account]:
        account_list = []
        for i in range(amount_of_accounts):
            current_account: User = Account.objects.create(
                user=user,
                name=f'Account_{self.random_string(8)}',
                desc=f"Test description of this account"
            )

            account_list.append(current_account)

            if self.verbose:
                self.stdout.write(self.style.SUCCESS(f"New account has been created with name: {current_account.name}"))
        
        return account_list

    def generate_tags(self, amount_of_tags: int, user: User) -> list[tag]:
        tag_list = []
        for i in range(amount_of_tags):
            current_tag: User = Tag.objects.create(
                user=user,
                name=f"Tag_{self.random_string(8)}",
                desc="Test description of this tag"
            )

            tag_list.append(current_tag)

            if self.verbose:
                self.stdout.write(self.style.SUCCESS(f"New tag has been created with name: {current_tag.name}"))
        
        return tag_list

    def generate_data(self, user: User, amount_of_data_points: int, account_list: list[Account], tag_list: list[Tag]) -> None:
        if self.verbose:
            self.stdout.write(f"Generating data for user: {user.username}")

        for i in range(amount_of_data_points):
            account = random.choice(account_list)
            tag = random.choice(tag_list)
            amount = self.random_amount()

            Subtransaction.objects.create(
                account=account,
                transaction=Transaction.objects.create(
                    user=user,
                    desc=f"Transaction {self.random_string(5)}",
                    date_time=datetime.datetime(random.randint(2000,2026), random.randint(1,12), random.randint(1,28), random.randint(0,12), 0, 0, tzinfo=timezone.UTC)
                ),
                amount=amount
            )

            if self.verbose:
                self.stdout.write(f"Generated {i}/{amount_of_data_points} | Amount({amount}) has been added to account: {account.name}")
            elif not self.verbose and i % 100 == 0:
                self.stdout.write(f"Generated {i}/{amount_of_data_points}")
