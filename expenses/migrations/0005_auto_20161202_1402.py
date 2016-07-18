# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2016-12-02 14:02
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0004_preset_transaction_desc'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Balance',
            new_name='Account',
        ),
        migrations.RenameModel(
            old_name='BalanceAmountCache',
            new_name='AccountAmountCache',
        ),
        migrations.RenameModel(
            old_name='BalanceSyncEvent',
            new_name='AccountSyncEvent',
        ),
        migrations.RenameModel(
            old_name='ChainedBalance',
            new_name='ChainedAccount',
        ),
    ]
