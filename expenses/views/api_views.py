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
        id = self.request.query_params.get('id')
        if id is not None:
            queryset = queryset.filter(id=id)
        return queryset

class TransactionView(generics.ListAPIView):
    queryset = models.Transaction.objects.all().order_by('-date_time')
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

class TransactionTagsView(generics.ListAPIView):
    queryset = models.TransactionTag.objects.all()
    serializer_class = serializers.TransactionTagsSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        transaction = self.request.query_params.get('transaction')
        if transaction is not None:
            queryset = queryset.filter(transaction=transaction)
        return queryset

class SubtransactionView(generics.ListAPIView):
    queryset = models.Subtransaction.objects.all()
    serializer_class = serializers.SubtransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        transaction = self.request.query_params.get('transaction')
        if transaction is not None:
            queryset = queryset.filter(transaction=transaction)
        return queryset

class AccountSyncEventView(generics.ListAPIView):
    queryset = models.AccountSyncEvent.objects.all()
    serializer_class = serializers.AccountSyncEventSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        subtransaction = self.request.query_params.get('subtransaction')
        if subtransaction is not None:
            queryset = queryset.filter(subtransaction=subtransaction)
        return queryset

class AccountBalanceCacheView(generics.ListAPIView):
    queryset = models.AccountBalanceCache.objects.all()
    serializer_class = serializers.AccountBalanceCacheSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset
