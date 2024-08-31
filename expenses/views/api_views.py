from .. import models, serializers
from rest_framework import generics

class AccountView(generics.ListAPIView):
    queryset = models.Account.objects.all()
    serializer_class = serializers.AccountSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset

class TagView(generics.ListAPIView):
    queryset = models.Tag.objects.all()
    serializer_class = serializers.TagSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset

class TransactionView(generics.ListAPIView):
    queryset = models.Transaction.objects.all()
    serializer_class = serializers.TransactionSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset

class PresetView(generics.ListAPIView):
    queryset = models.Preset.objects.all()
    serializer_class = serializers.PresetSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset
