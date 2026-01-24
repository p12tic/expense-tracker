from __future__ import annotations

import datetime
import random
import string
from datetime import UTC
from typing import Sequence
from typing import cast

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from expenses.models import Account
from expenses.models import Subtransaction
from expenses.models import Tag
from expenses.models import Transaction
from expenses.models import TransactionTag


# ------------------------------------------------------------------------------
# Utils
def random_string(rng_obj: random.Random, length) -> str:
    return "".join(rng_obj.choice(string.ascii_letters) for _ in range(length))


def random_amount(rng_obj: random.Random) -> int:
    return rng_obj.randint(-10000, 10000)


class Command(BaseCommand):
    help = "Generates synthetic data for testing with the expense-tracker"

    def add_arguments(self, parser) -> None:
        parser.add_argument("-u", "--username", type=str, help="Username to use")
        parser.add_argument("-p", "--password", type=str, help="Password for the user")
        parser.add_argument("-s", "--seed", type=int, help="Seed for random generation")
        parser.add_argument(
            "-d", "--data-points", type=int, default=1000, help="Number of data points"
        )
        parser.add_argument("-a", "--accounts", type=int, default=10, help="Number of accounts")
        parser.add_argument("-t", "--tags", type=int, default=5, help="Number of tags")
        parser.add_argument("-l", "--log", action="store_true")

    def handle(self, *args, **options) -> None:
        seed = options["seed"] or random.randint(0, 2**32 - 1)
        self.rng_obj = random.Random(seed)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed={seed} | DataPoints={options['data_points']} | "
                f"Accounts={options['accounts']} | Tags={options['tags']}"
            )
        )

        self.verbose: bool = options["log"]

        user = self.get_user(
            username=options["username"],
            password=options["password"],
        )

        self.generate_data(
            user=user,
            amount_of_data_points=options["data_points"],
            account_list=self.generate_accounts(
                amount_of_accounts=options["accounts"],
                user=user,
            ),
            tag_list=self.generate_tags(amount_of_tags=options["tags"], user=user),
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Synthetic data for user ({user.username}, {self.raw_password}) was created successfully"
            )
        )

    def get_user(self, username: str | None, password: str | None) -> User:
        if username is None:
            username = f"user_{random_string(self.rng_obj, 5)}"
        if password is None:
            password = random_string(self.rng_obj, 5)

        self.raw_password = password  # we need to store the raw_password as different variable because Django only stores a hash of the password

        user = cast(User | None, authenticate(username=username, password=password))
        if user is None:
            user = User.objects.create_user(username=username, password=password)

            if self.verbose:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"New user has been created:\nUsername: {username}\nPassword: {self.raw_password}\n"
                    )
                )

        return user

    def generate_accounts(self, amount_of_accounts: int, user: User) -> Sequence[Account]:
        account_list = []
        for i in range(amount_of_accounts):
            current_account: Account = Account.objects.create(
                user=user,
                name=f"Account_{random_string(self.rng_obj, 8)}",
                desc="Test description of this account",
            )

            account_list.append(current_account)

            if self.verbose:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"New account has been created with name: {current_account.name}"
                    )
                )

        return account_list

    def generate_tags(self, amount_of_tags: int, user: User) -> Sequence[Tag]:
        tag_list = []
        for i in range(amount_of_tags):
            current_tag: Tag = Tag.objects.create(
                user=user,
                name=f"Tag_{random_string(self.rng_obj, 8)}",
                desc="Test description of this tag",
            )

            tag_list.append(current_tag)

            if self.verbose:
                self.stdout.write(
                    self.style.SUCCESS(f"New tag has been created with name: {current_tag.name}")
                )

        return tag_list

    def generate_data(
        self,
        user: User,
        amount_of_data_points: int,
        account_list: Sequence[Account],
        tag_list: Sequence[Tag],
    ) -> None:
        if self.verbose:
            self.stdout.write(f"Generating data for user: {user.username}")

        for i in range(amount_of_data_points):
            account = self.rng_obj.choice(account_list)
            tag = self.rng_obj.choice(tag_list)
            amount = random_amount(self.rng_obj)
            cur_transaction = Transaction.objects.create(
                user=user,
                desc=f"Transaction {random_string(self.rng_obj, 5)}",
                date_time=datetime.datetime(
                    self.rng_obj.randint(2000, 2026),
                    self.rng_obj.randint(1, 12),
                    self.rng_obj.randint(1, 28),
                    self.rng_obj.randint(0, 12),
                    0,
                    0,
                    tzinfo=UTC,
                ),
            )
            Subtransaction.objects.create(
                account=account,
                transaction=cur_transaction,
                amount=amount,
            )

            TransactionTag.objects.create(
                transaction=cur_transaction,
                tag=tag,
            )

            if self.verbose:
                self.stdout.write(
                    f"Generated {i}/{amount_of_data_points} | Amount({amount}) has been added to account: {account.name}"
                )
            elif not self.verbose and i % 100 == 0:
                self.stdout.write(f"Generated {i}/{amount_of_data_points}")
