from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from .. import models, serializers
from rest_framework import generics, authentication, status


class AccountView(generics.ListCreateAPIView):
    queryset = models.Account.objects.all()
    serializer_class = serializers.AccountSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        return queryset

    def post(self, request, *args, **kwargs):
        self.request.data['user'] = self.request.user.id
        account = models.Account.objects.create(name=self.request.data['Name'], desc=self.request.data['Description'], user=self.request.user)
        account.save()
        return Response(status=status.HTTP_201_CREATED)

class TagView(generics.ListCreateAPIView):
    queryset = models.Tag.objects.all()
    serializer_class = serializers.TagSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        id = self.request.query_params.get('id')
        if id is not None:
            queryset = queryset.filter(id=id)
        return queryset

    def post(self, request, *args, **kwargs):
        self.request.data['user'] = self.request.user.id
        tag = models.Tag.objects.create(name=self.request.data['Name'], desc=self.request.data['Description'], user=self.request.user)
        tag.save()
        return Response(status=status.HTTP_201_CREATED)

class TransactionView(generics.ListAPIView):
    queryset = models.Transaction.objects.all()
    serializer_class = serializers.TransactionSerializer
    authentication_classes = (authentication.TokenAuthentication, authentication.SessionAuthentication)
    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        queryset = queryset.order_by('-date_time')
        return queryset

class PresetView(generics.ListAPIView):
    queryset = models.Preset.objects.all()
    serializer_class = serializers.PresetSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        id = self.request.query_params.get("id")
        if id is not None:
            queryset = queryset.filter(id=id)
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
        account = self.request.query_params.get('account')
        if account is not None:
            queryset = queryset.filter(account=account)
        date_lte = self.request.query_params.get('date_lte')
        if date_lte is not None:
            queryset = queryset.filter(transaction__date_time__lte=date_lte)
        date_gte = self.request.query_params.get('date_gte')
        if date_gte is not None:
            queryset = queryset.filter(transaction__date_time__gte=date_gte)
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
        account = self.request.query_params.get('account')
        queryset = queryset.filter(account=account)
        return queryset

class PresetSubtransactionView(generics.ListAPIView):
    queryset = models.PresetSubtransaction.objects.all()
    serializer_class = serializers.PresetSubtransactionSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        preset = self.request.query_params.get('preset')
        if preset is not None:
            queryset = queryset.filter(preset=preset)
        return queryset

class PresetTransactionTagView(generics.ListAPIView):
    queryset = models.PresetTransactionTag.objects.all()
    serializer_class = serializers.PresetTransactionTagSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        preset = self.request.query_params.get('preset')
        if preset is not None:
            queryset = queryset.filter(preset=preset)
        return queryset

class TokenView(generics.ListAPIView):
    serializer_class = serializers.TokenSerializer
    def get_queryset(self):
        queryset = User.objects.all().filter(username=self.request.user)
        return queryset
