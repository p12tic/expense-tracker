import base64
import json
import requests

from django.conf import settings

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django.core.management.base import BaseCommand
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util
from expenses.models import TransactionCreateBatchRemainingTransactions
from django.utils import timezone


prompt = (
    "Attached is an image of receipt(possibly in Lithuanian). "
    "Extract total amount and date in iso format. "
    "No extra text, details or code block, just raw json. "
    "Give extracted data in json format {amount: 11.11, date: 2021-04-23T11:16:24}"
)


def batch_transaction_processing():
    remaining_transactions = TransactionCreateBatchRemainingTransactions.objects.filter(
        data_done=False
    )
    for remaining_transaction in remaining_transactions:
        image_response = requests.get(f"{settings.BASE_URL}{remaining_transaction.image.url}")
        if image_response.status_code == 200:
            base64_image = base64.b64encode(image_response.content).decode("utf-8")
            key = settings.OPENAI_API_KEY
            url = f"{settings.OPENAI_URL}/chat/completions"
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
            data = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                            },
                        ],
                    }
                ],
                "max_tokens": 300,
            }
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                response_json = response.json()
                try:
                    receipt_data_json = json.loads(
                        response_json["choices"][0]["message"]["content"]
                    )
                    if receipt_data_json['amount'] is None:
                        receipt_data_json['amount'] = 0
                    if receipt_data_json['date'] is None:
                        now = timezone.now()
                        receipt_data_json['date'] = now.strftime("%Y-%m-%dT%H:%M:%S")
                    remaining_transaction.data_json = receipt_data_json
                    remaining_transaction.data_done = True
                    remaining_transaction.save()
                except ValueError:
                    pass


# The `close_old_connections` decorator ensures that database connections, that have become
# unusable or are obsolete, are closed before and after your job has run. You should use it
# to wrap any jobs that you schedule that access the Django database in any way.
@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    This job deletes APScheduler job execution entries older than `max_age` from the database.
    It helps to prevent the database from filling up with old historical records that are no
    longer useful.

    :param max_age: The maximum length of time to retain historical job execution records.
                    Defaults to 7 days.
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


class Command(BaseCommand):
    help = "Runs APScheduler."

    def handle(self, *args, **options):
        scheduler = BlockingScheduler()
        scheduler.add_jobstore(DjangoJobStore(), "default")

        scheduler.add_job(
            batch_transaction_processing,
            trigger=CronTrigger(second="*/10"),
            id="batch_transaction_processing",
            max_instances=1,
            replace_existing=True,
        )

        scheduler.add_job(
            delete_old_job_executions,
            trigger=CronTrigger(day_of_week="mon", hour="00", minute="00"),
            id="delete_old_job_executions",
            max_instances=1,
            replace_existing=True,
        )

        try:
            scheduler.start()
        except KeyboardInterrupt:
            scheduler.shutdown()
