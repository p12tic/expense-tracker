# Generated by Django 5.0.6 on 2025-02-26 21:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0007_alter_accountbalancecache_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='accountbalancecache',
            name='timezone_offset',
            field=models.IntegerField(default=-120),
        ),
        migrations.AddField(
            model_name='transaction',
            name='timezone_offset',
            field=models.IntegerField(default=-120),
        ),
    ]
