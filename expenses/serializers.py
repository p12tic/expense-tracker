from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.authtoken.models import Token

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
