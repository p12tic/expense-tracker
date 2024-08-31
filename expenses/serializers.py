from rest_framework import serializers
from . import models

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Account
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Tag
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Transaction
        fields = '__all__'

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
