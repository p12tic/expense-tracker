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
