import random

from django.core.management.base import BaseCommand, CommandError

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
