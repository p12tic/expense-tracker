import base64
import importlib
import json
from django.contrib.auth.models import User
from django.utils.timezone import make_aware
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from datetime import timedelta, timezone, datetime
from .. import models, serializers, db_utils
from rest_framework import generics, authentication, status


class AccountView(generics.ListCreateAPIView):
    queryset = models.Account.objects.all()
    serializer_class = serializers.AccountSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        id = self.request.query_params.get('id')
        if id is not None:
            queryset = queryset.filter(id=id)
        return queryset

    def post(self, request, *args, **kwargs):
        if self.request.data['action'] == "create":
            account = models.Account.objects.create(
                name=self.request.data['Name'],
                desc=self.request.data['Description'],
                user=self.request.user,
            )
            account.save()
            return Response(status=status.HTTP_201_CREATED)
        elif self.request.data['action'] == "delete":
            account = models.Account.objects.get(id=self.request.data['id'])
            if account.user == self.request.user:
                account.delete()
                return Response(status=status.HTTP_200_OK)
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        elif self.request.data['action'] == "edit":
            tag = models.Account.objects.get(id=self.request.data['id'])
            if tag.user == self.request.user:
                tag.name = self.request.data['Name']
                tag.desc = self.request.data['Description']
                tag.save()
                return Response(status=status.HTTP_200_OK)
            return Response(status=status.HTTP_401_UNAUTHORIZED)


class TagView(generics.ListCreateAPIView):
    queryset = models.Tag.objects.all()
    serializer_class = serializers.TagSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        queryset = queryset.order_by('name')
        id = self.request.query_params.get('id')
        if id is not None:
            queryset = queryset.filter(id=id)
        return queryset

    def post(self, request, *args, **kwargs):
        if self.request.data['action'] == "create":
            self.request.data['user'] = self.request.user.id
            tag = models.Tag.objects.create(
                name=self.request.data['Name'],
                desc=self.request.data['Description'],
                user=self.request.user,
            )
            tag.save()
            return Response(status=status.HTTP_201_CREATED)
        elif self.request.data['action'] == "delete":
            tag = models.Tag.objects.get(id=self.request.data['id'])
            if tag.user == self.request.user:
                tag.delete()
                return Response(status=status.HTTP_200_OK)
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        elif self.request.data['action'] == "edit":
            tag = models.Tag.objects.get(id=self.request.data['id'])
            if tag.user == self.request.user:
                tag.name = self.request.data['Name']
                tag.desc = self.request.data['Description']
                tag.save()
                return Response(status=status.HTTP_200_OK)
            return Response(status=status.HTTP_401_UNAUTHORIZED)


class TransactionView(generics.ListCreateAPIView):
    queryset = models.Transaction.objects.all().order_by('-date_time')
    serializer_class = serializers.TransactionSerializer
    authentication_classes = (
        authentication.TokenAuthentication,
        authentication.SessionAuthentication,
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        id = self.request.query_params.get("id")
        if id is not None:
            queryset = queryset.filter(id=id)
        return queryset

    def post(self, request, *args, **kwargs):
        if self.request.data['action'] == "create":
            aware_dt = db_utils.get_aware_from_naive_iso(
                self.request.data['date'], self.request.data['timezoneOffset']
            )
            transaction = models.Transaction.objects.create(
                desc=self.request.data['desc'],
                date_time=aware_dt,
                user=self.request.user,
                timezone_offset=self.request.data['timezoneOffset'],
            )
            transaction.save()
            preset = json.loads(self.request.data['preset'])
            for acc in preset['accounts']:
                if acc['isUsed']:
                    accountElement = models.Account.objects.get(id=acc['id'])
                    subtransaction = models.Subtransaction.objects.create(
                        transaction=transaction,
                        account=accountElement,
                        amount=(acc['amount'] * 100),
                    )
                    subtransaction.save()
            for tag in preset['tags']:
                if tag['isChecked']:
                    tagElement = models.Tag.objects.get(id=tag['id'])
                    transactionTag = models.TransactionTag.objects.create(
                        transaction=transaction, tag=tagElement
                    )
                    transactionTag.save()
            for img in self.request.FILES.getlist("images"):
                transaction_image = models.TransactionImage.objects.create(
                    transaction=transaction, image=img
                )
                transaction_image.save()
            return Response(status=status.HTTP_201_CREATED)
        if self.request.data['action'] == "delete":
            transaction = models.Transaction.objects.get(id=self.request.data['id'])
            transaction.delete()
            return Response(status=status.HTTP_200_OK)
        if self.request.data['action'] == "edit":
            transaction = models.Transaction.objects.get(id=self.request.data['id'])
            transaction.desc = self.request.data['desc']
            aware_dt = db_utils.get_aware_from_naive_iso(
                self.request.data['date'], self.request.data['timezoneOffset']
            )
            transaction.date_time = aware_dt
            transaction.timezone_offset = self.request.data['timezoneOffset']
            transaction.save()
            preset = json.loads(self.request.data['preset'])
            for tag in preset['tags']:
                tagElement = models.Tag.objects.get(id=tag['id'])
                if tag['isChecked']:
                    if (
                        models.TransactionTag.objects.filter(
                            transaction=transaction, tag=tagElement
                        ).count()
                        == 0
                    ):
                        transactionTag = models.TransactionTag.objects.create(
                            transaction=transaction, tag=tagElement
                        )
                        transactionTag.save()
                else:
                    if (
                        models.TransactionTag.objects.filter(
                            transaction=transaction, tag=tagElement
                        ).count()
                        != 0
                    ):
                        transactionTag = models.TransactionTag.objects.get(
                            transaction=transaction, tag=tagElement
                        )
                        transactionTag.delete()
            for acc in preset['accounts']:
                accountElement = models.Account.objects.get(id=acc['id'])
                if acc['isUsed']:
                    if (
                        models.Subtransaction.objects.filter(
                            transaction=transaction, account=accountElement
                        ).count()
                        == 0
                    ):
                        subtransaction = models.Subtransaction.objects.create(
                            transaction=transaction,
                            account=accountElement,
                            amount=(acc['amount'] * 100),
                        )
                        subtransaction.save()
                    else:
                        if (
                            models.Subtransaction.objects.filter(
                                transaction=transaction,
                                account=accountElement,
                                amount=(acc['amount'] * 100),
                            ).count()
                            == 0
                        ):
                            subtransaction = models.Subtransaction.objects.get(
                                transaction=transaction, account=accountElement
                            )
                            subtransaction.amount = acc['amount'] * 100
                            subtransaction.save()
                else:
                    if (
                        models.Subtransaction.objects.filter(
                            transaction=transaction, account=accountElement
                        ).count()
                        != 0
                    ):
                        subtransaction = models.Subtransaction.objects.get(
                            transaction=transaction, account=accountElement
                        )
                        subtransaction.delete()
            existing_images_ids = set(
                models.TransactionImage.objects.filter(transaction=transaction).values_list(
                    'id', flat=True
                )
            )
            submitted_images_ids = {int(imgId) for imgId in self.request.data.getlist('imageIds')}
            removed_images_ids = existing_images_ids - submitted_images_ids
            new_images = [img for img in self.request.FILES.getlist('images')]
            for remove_id in removed_images_ids:
                image = models.TransactionImage.objects.get(transaction=transaction, id=remove_id)
                image.delete()
            for new_image in new_images:
                transaction_image = models.TransactionImage.objects.create(
                    transaction=transaction, image=new_image
                )
                transaction_image.save()

            return Response(status=status.HTTP_200_OK)


class PresetView(generics.ListCreateAPIView):
    queryset = models.Preset.objects.all()
    serializer_class = serializers.PresetSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(user=self.request.user)
        queryset = queryset.order_by('name')
        id = self.request.query_params.get("id")
        if id is not None:
            queryset = queryset.filter(id=id)
        tag = self.request.query_params.get('tag')
        if tag is not None:
            queryset = queryset.filter(tag=tag)
        return queryset

    def post(self, request, *args, **kwargs):
        if self.request.data['action'] == "create":
            preset = models.Preset.objects.create(
                name=self.request.data['name'],
                desc=self.request.data['desc'],
                transaction_desc=self.request.data['transDesc'],
                user=self.request.user,
            )
            preset.save()
            for tag in self.request.data['tags']:
                if tag['isChecked']:
                    tag_obj = models.Tag.objects.get(id=tag['id'])
                    tag_preset = models.PresetTransactionTag.objects.create(
                        preset=preset, tag=tag_obj
                    )
                    tag_preset.save()
            for acc in self.request.data['accounts']:
                if acc['isUsed']:
                    accObj = models.Account.objects.get(id=acc['id'])
                    preset_sub = models.PresetSubtransaction.objects.create(
                        preset=preset, account=accObj, fraction=acc['fraction']
                    )
                    preset_sub.save()
            return Response(status=status.HTTP_201_CREATED)
        elif self.request.data['action'] == "delete":
            preset = models.Preset.objects.get(id=self.request.data['id'])
            preset.delete()
            return Response(status=status.HTTP_200_OK)
        elif self.request.data['action'] == "edit":
            preset = models.Preset.objects.get(id=self.request.data['id'])
            preset.name = self.request.data['name']
            preset.desc = self.request.data['desc']
            preset.transaction_desc = self.request.data['transDesc']
            preset.save()
            for tag in self.request.data['tags']:
                tag_obj = models.Tag.objects.get(id=tag['id'])
                if tag['isChecked']:
                    if (
                        models.PresetTransactionTag.objects.filter(
                            tag=tag_obj, preset=preset
                        ).count()
                        == 0
                    ):
                        PreTransTag = models.PresetTransactionTag.objects.create(
                            tag=tag_obj, preset=preset
                        )
                        PreTransTag.save()
                else:
                    if (
                        models.PresetTransactionTag.objects.filter(
                            tag=tag_obj, preset=preset
                        ).count()
                        > 0
                    ):
                        PreTransTag = models.PresetTransactionTag.objects.get(
                            tag=tag_obj, preset=preset
                        )
                        PreTransTag.delete()
            for acc in self.request.data['accounts']:
                acc_obj = models.Account.objects.get(id=acc['id'])
                if acc['isUsed']:
                    if (
                        models.PresetSubtransaction.objects.filter(
                            account=acc_obj, preset=preset
                        ).count()
                        == 0
                    ):
                        preSub = models.PresetSubtransaction.objects.create(
                            account=acc_obj, preset=preset, fraction=acc['fraction']
                        )
                        preSub.save()
                    else:
                        preSub = models.PresetSubtransaction.objects.get(
                            account=acc_obj, preset=preset
                        )
                        preSub.fraction = acc['fraction']
                        preSub.save()
                else:
                    if (
                        models.PresetSubtransaction.objects.filter(
                            account=acc_obj, preset=preset
                        ).count()
                        > 0
                    ):
                        preSub = models.PresetSubtransaction.objects.get(
                            account=acc_obj, preset=preset
                        )
                        preSub.delete()
            return Response(status=status.HTTP_200_OK)


class TransactionTagsView(generics.ListAPIView):
    queryset = models.TransactionTag.objects.all()
    serializer_class = serializers.TransactionTagsSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        transaction = self.request.query_params.get('transaction')
        if transaction is not None:
            queryset = queryset.filter(transaction=transaction)
        tag = self.request.query_params.get('tag')
        if tag is not None:
            queryset = queryset.filter(tag=tag)
        return queryset


class SubtransactionView(generics.ListAPIView):
    queryset = models.Subtransaction.objects.all()
    serializer_class = serializers.SubtransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.order_by('-transaction__date_time', '-id')
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


class AccountSyncEventView(generics.ListCreateAPIView):
    queryset = models.AccountSyncEvent.objects.all()
    serializer_class = serializers.AccountSyncEventSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        subtransaction = self.request.query_params.get('subtransaction')
        if subtransaction is not None:
            queryset = queryset.filter(subtransaction=subtransaction)
        return queryset

    def post(self, request, *args, **kwargs):
        account = models.Account.objects.get(id=self.request.data['id'])
        aware_dt = db_utils.get_aware_from_naive_iso(
            self.request.data['date'], self.request.data['timezoneOffset']
        )
        transaction = models.Transaction.objects.create(
            date_time=aware_dt,
            user=self.request.user,
            timezone_offset=self.request.data['timezoneOffset'],
        )
        cache_queryset = models.AccountBalanceCache.objects.filter(
            date__lte=self.request.data['dateYear'], account=account
        )
        if cache_queryset.count() == 0:
            sum = 0
            subs_queryset = models.Subtransaction.objects.filter(
                account=account, transaction__date_time__lte=aware_dt
            )

        else:
            sum = (cache_queryset.last()).balance
            subs_queryset = models.Subtransaction.objects.filter(
                account=account,
                transaction__date_time__gt=(cache_queryset.last()).date,
                transaction__date_time__lte=aware_dt,
            )
        for sub in subs_queryset:
            sum = sum + sub.amount
        sumDif = self.request.data['balance'] - sum
        subtransaction = models.Subtransaction.objects.create(
            transaction=transaction, account=account, amount=sumDif
        )
        acc_sync = models.AccountSyncEvent.objects.create(
            account=account, balance=self.request.data['balance'], subtransaction=subtransaction
        )
        return Response(status=status.HTTP_201_CREATED)


class AccountBalanceCacheView(generics.ListAPIView):
    queryset = models.AccountBalanceCache.objects.all()
    serializer_class = serializers.AccountBalanceCacheSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        account = self.request.query_params.get('account')
        if account is not None:
            queryset = queryset.filter(account=account)
        date_lte = self.request.query_params.get('date_lte')
        if date_lte is not None:
            queryset = queryset.filter(date__lte=date_lte)
        date_gte = self.request.query_params.get('date_gte')
        if date_gte is not None:
            queryset = queryset.filter(date__gte=date_gte)
        return queryset


class PresetSubtransactionView(generics.ListAPIView):
    queryset = models.PresetSubtransaction.objects.all()
    serializer_class = serializers.PresetSubtransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        preset = self.request.query_params.get('preset')
        if preset is not None:
            queryset = queryset.filter(preset=preset)
        account = self.request.query_params.get('account')
        if account is not None:
            queryset = queryset.filter(account=account)
        return queryset


class PresetTransactionTagView(generics.ListAPIView):
    queryset = models.PresetTransactionTag.objects.all()
    serializer_class = serializers.PresetTransactionTagSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        preset = self.request.query_params.get('preset')
        if preset is not None:
            queryset = queryset.filter(preset=preset)
        tag = self.request.query_params.get('tag')
        if tag is not None:
            queryset = queryset.filter(tag=tag)
        return queryset


class TokenView(generics.ListAPIView):
    serializer_class = serializers.TokenSerializer

    def get_queryset(self):
        queryset = User.objects.all().filter(username=self.request.user)
        return queryset


class TransactionImageView(generics.ListAPIView):
    queryset = models.TransactionImage.objects.all()
    serializer_class = serializers.TransactionImageSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        transaction = self.request.query_params.get('transaction')
        if transaction is not None:
            queryset = models.TransactionImage.objects.filter(transaction=transaction)
        return queryset


class TransactionCreateBatchView(generics.ListCreateAPIView):
    queryset = models.TransactionCreateBatch.objects.all()
    serializer_class = serializers.TransactionCreateBatchSerializer

    def post(self, request, *args, **kwargs):
        selection = json.loads(self.request.data['selection'])
        if 'transaction_desc' in selection:
            preset = models.Preset.objects.get(id=selection['id'])
            batch = models.TransactionCreateBatch.objects.create(
                preset=preset, name=self.request.data['name'], user=self.request.user
            )
        else:
            account = models.Account.objects.get(id=selection['id'])
            batch = models.TransactionCreateBatch.objects.create(
                account=account, name=self.request.data['name'], user=self.request.user
            )
        batch.save()
        for img in self.request.FILES.getlist("images"):
            batch_image = models.TransactionCreateBatchRemainingTransactions.objects.create(
                batch=batch, image=img, data_done=False
            )
            batch_image.save()
        return Response(status=status.HTTP_201_CREATED)
