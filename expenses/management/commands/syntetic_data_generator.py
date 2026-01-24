import random
import string

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from expenses.models import Account


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