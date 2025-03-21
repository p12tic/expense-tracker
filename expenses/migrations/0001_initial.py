# Generated by Django 2.0.3 on 2018-03-14 22:37

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('name', models.CharField(max_length=256)),
                ('desc', models.CharField(blank=True, max_length=256, verbose_name='description')),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='AccountBalanceCache',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('balance', models.IntegerField()),
                ('date', models.DateField()),
                (
                    'account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Account'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='AccountSyncEvent',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('balance', models.IntegerField()),
                (
                    'account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Account'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='ChainedAccount',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('relation', models.IntegerField(default=0)),
                (
                    'master_account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='master_account',
                        to='expenses.Account',
                    ),
                ),
                (
                    'slave_account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='slave_account',
                        to='expenses.Account',
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='ChainedAccountRequestPendingNew',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('desc', models.CharField(blank=True, max_length=256, verbose_name='description')),
                ('relation', models.IntegerField(default=0)),
                (
                    'master',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='master',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'slave',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='slave',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='ChainedSubtransaction',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('relation', models.IntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name='ChainedSubtransactionIgnored',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'chained_account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.ChainedAccount'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='ChainedSubtransactionPendingChange',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'chained',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to='expenses.ChainedSubtransaction',
                    ),
                ),
                (
                    'slave_user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='ChainedSubtransactionPendingNew',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'chained_account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.ChainedAccount'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='Preset',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('name', models.CharField(max_length=256)),
                ('desc', models.CharField(blank=True, max_length=256)),
                ('transaction_desc', models.CharField(blank=True, max_length=256)),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='PresetSubtransaction',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('fraction', models.FloatField(default=1)),
                (
                    'account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Account'
                    ),
                ),
                (
                    'preset',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Preset'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='PresetTransactionTag',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'preset',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Preset'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='Subtransaction',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('amount', models.IntegerField(default=0)),
                (
                    'account',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Account'
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('name', models.CharField(max_length=256)),
                ('desc', models.CharField(blank=True, max_length=256, verbose_name='description')),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('desc', models.CharField(max_length=256, verbose_name='description')),
                ('date_time', models.DateTimeField()),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name='TransactionTag',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'tag',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Tag'
                    ),
                ),
                (
                    'transaction',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to='expenses.Transaction'
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name='subtransaction',
            name='transaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to='expenses.Transaction'
            ),
        ),
        migrations.AddField(
            model_name='presettransactiontag',
            name='tag',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='expenses.Tag'),
        ),
        migrations.AddField(
            model_name='chainedsubtransactionpendingnew',
            name='master_subtransaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to='expenses.Subtransaction'
            ),
        ),
        migrations.AddField(
            model_name='chainedsubtransactionpendingnew',
            name='slave_user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='chainedsubtransactionignored',
            name='master_subtransaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to='expenses.Subtransaction'
            ),
        ),
        migrations.AddField(
            model_name='chainedsubtransactionignored',
            name='slave_user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='chainedsubtransaction',
            name='master_subtransaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='master_subtransaction',
                to='expenses.Subtransaction',
            ),
        ),
        migrations.AddField(
            model_name='chainedsubtransaction',
            name='slave_subtransaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='slave_subransaction',
                to='expenses.Subtransaction',
            ),
        ),
        migrations.AddField(
            model_name='accountsyncevent',
            name='subtransaction',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE, to='expenses.Subtransaction'
            ),
        ),
    ]
