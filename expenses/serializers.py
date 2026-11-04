from django.contrib.auth.models import User
from rest_framework import serializers

from . import models
from .db_utils import format_return_iso


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Account
        fields = '__all__'


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Tag
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    date_time = serializers.SerializerMethodField()

    class Meta:
        model = models.Transaction
        fields = '__all__'

    def get_date_time(self, obj):
        dt = obj.date_time
        tz_offset = obj.timezone_offset
        return f'{format_return_iso(dt, tz_offset)}'


class PresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Preset
        fields = '__all__'


class TransactionTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionTag
        fields = '__all__'


class SubtransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Subtransaction
        fields = '__all__'


class AccountSyncEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AccountSyncEvent
        fields = '__all__'


class AccountBalanceCacheSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AccountBalanceCache
        fields = '__all__'


class PresetTransactionTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PresetTransactionTag
        fields = '__all__'


class PresetSubtransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PresetSubtransaction
        fields = '__all__'


class TokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'


class TransactionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionImage
        fields = ['id', 'image']


class TransactionCreateBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionCreateBatch
        fields = '__all__'


class TransactionCreateBatchRemainingTransactionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionCreateBatchRemainingTransactions
        fields = '__all__'


class ChainedAccountSerializer(serializers.ModelSerializer):
    master_account_name = serializers.CharField(source='master_account.name', read_only=True)
    slave_account_name = serializers.CharField(source='slave_account.name', read_only=True)

    class Meta:
        model = models.ChainedAccount
        fields = '__all__'


class ChainedAccountRequestPendingNewSerializer(serializers.ModelSerializer):
    master_username = serializers.CharField(source='master.username', read_only=True)
    slave_username = serializers.CharField(source='slave.username', read_only=True)

    class Meta:
        model = models.ChainedAccountRequestPendingNew
        fields = '__all__'


class ChainedSubtransactionPendingNewSerializer(serializers.ModelSerializer):
    desc = serializers.CharField(source='master_subtransaction.transaction.desc', read_only=True)
    date_time = serializers.SerializerMethodField()
    timezone_offset = serializers.IntegerField(
        source='master_subtransaction.transaction.timezone_offset', read_only=True
    )
    amount = serializers.SerializerMethodField()
    master_username = serializers.CharField(
        source='master_subtransaction.account.user.username', read_only=True
    )
    slave_account = serializers.IntegerField(
        source='chained_account.slave_account.id', read_only=True
    )
    slave_account_name = serializers.CharField(
        source='chained_account.slave_account.name', read_only=True
    )

    class Meta:
        model = models.ChainedSubtransactionPendingNew
        fields = '__all__'

    def get_amount(self, obj):
        return -obj.master_subtransaction.amount

    def get_date_time(self, obj):
        transaction = obj.master_subtransaction.transaction
        return f'{format_return_iso(transaction.date_time, transaction.timezone_offset)}'


class ChainedSubtransactionSerializer(serializers.ModelSerializer):
    desc = serializers.CharField(source='slave_subtransaction.transaction.desc', read_only=True)
    date_time = serializers.SerializerMethodField()
    timezone_offset = serializers.IntegerField(
        source='slave_subtransaction.transaction.timezone_offset', read_only=True
    )
    amount = serializers.IntegerField(source='slave_subtransaction.amount', read_only=True)
    master_username = serializers.CharField(
        source='master_subtransaction.account.user.username', read_only=True
    )
    slave_account = serializers.IntegerField(
        source='slave_subtransaction.account.id', read_only=True
    )
    slave_account_name = serializers.CharField(
        source='slave_subtransaction.account.name', read_only=True
    )

    class Meta:
        model = models.ChainedSubtransaction
        fields = '__all__'

    def get_date_time(self, obj):
        transaction = obj.slave_subtransaction.transaction
        return f'{format_return_iso(transaction.date_time, transaction.timezone_offset)}'
