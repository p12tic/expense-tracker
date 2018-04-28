from django import forms
from django.views.generic.detail import DetailView
from django.views.generic.list import ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.http import HttpResponseRedirect
from expenses.views.auth import AppLoginRequiredMixin, VerifyAccountUserMixin
from django.core.exceptions import PermissionDenied
from expenses.models import *
from expenses.db_utils import *
from datetime import datetime

class AccountSyncForm(forms.ModelForm):
    date_time = forms.DateTimeField(required=True)

    class Meta:
        model = AccountSyncEvent
        fields = ['balance', 'date_time']

class AccountSyncDetailView(AppLoginRequiredMixin, VerifyAccountUserMixin,
                            DetailView):
    model = AccountSyncEvent
    form_class = AccountSyncForm
    template_name = 'expenses/account_sync.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        obj = self.get_object()
        context['event'] = obj
        return context

class AccountSyncCreateView(AppLoginRequiredMixin, VerifyAccountUserMixin,
                            CreateView):
    model = AccountSyncEvent
    form_class = AccountSyncForm
    template_name = 'expenses/default_create.html'

    def get_account(self):
        return Account.objects.get(pk=self.kwargs['account_pk'])

    def get_initial(self):
        initial = super().get_initial()

        date_time = datetime.now()
        tr_after = self.request.GET.get('after_tr', None)
        if tr_after is not None:
            tr = Transaction.objects.get(pk=tr_after)
            if tr.user != self.request.user:
                raise PermissionDenied()
            date_time = tr.date_time

        initial['date_time'] = date_time
        initial['balance'] = get_account_balance(self.get_account(), date_time)
        return initial

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        account = Account.objects.get(pk=self.kwargs['account_pk'])
        context['account_name'] = account.name

        return context

    def form_valid(self, form):
        date_time = form.cleaned_data['date_time']
        balance = form.cleaned_data['balance']

        sync_create(self.get_account(), date_time, balance)

        return HttpResponseRedirect(self.get_success_url())

    def get_success_url(self):
        return '/accounts/' + str(self.get_account().id)

class AccountSyncUpdateView(AppLoginRequiredMixin, VerifyAccountUserMixin,
                            UpdateView):
    model = AccountSyncEvent
    form_class = AccountSyncForm
    template_name = 'expenses/default_update.html'

    def get_initial(self):
        initial = super().get_initial()
        initial['date_time'] = \
                self.get_object().subtransaction.transaction.date_time
        initial['balance'] = self.get_object().balance
        return initial

    def form_valid(self, form):
        date_time = form.cleaned_data['date_time']
        balance = form.cleaned_data['balance']

        sync_update_date_or_amount(self.get_object(), date_time, balance)

        return HttpResponseRedirect(self.get_success_url())

    def get_success_url(self):
        return '/accounts/' + str(self.get_object().account.id)

class AccountSyncDeleteView(AppLoginRequiredMixin, VerifyAccountUserMixin,
                            DeleteView):
    model = AccountSyncEvent
    template_name = 'expenses/default_delete.html'

    def get_success_url(self):
        return '/accounts/' + str(self.get_object().account.id)
