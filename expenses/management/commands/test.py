import os

from django.conf import settings
from django.core.management.commands.test import Command as BaseCommand
from django.utils.functional import empty


class Command(BaseCommand):
    def handle(self, *args, **options):
        os.environ["DJANGO_SETTINGS_MODULE"] = "expense_tracker.test_settings"
        settings._wrapped = empty
        super().handle(*args, **options)
