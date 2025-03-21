from django.views.generic.list import ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.core.exceptions import PermissionDenied
from .auth import AppLoginRequiredMixin, VerifyOwnerMixin
from ..models import *
from ..db_utils import *


class ChainedAccountListView(AppLoginRequiredMixin, ListView):
    model = Account
    template_name = 'expenses/chained_accounts.html'

    def get_queryset(self):
        qs = ChainedAccount.objects.filter(master_account__user=self.request.user)
        qs = qs | ChainedAccount.objects.filter(slave_account__user=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['object_list'] = get_account_balances_for_accounts(context['object_list'])
        return context


class AccountCreateView(AppLoginRequiredMixin, VerifyOwnerMixin, CreateView):
    model = Account
    fields = ['name', 'desc']
    template_name = 'expenses/default_create.html'
    success_url = '/accounts'


class AccountUpdateView(AppLoginRequiredMixin, VerifyOwnerMixin, UpdateView):
    model = Account
    fields = ['name', 'desc']
    template_name = 'expenses/default_update.html'

    def get_success_url(self):
        return '/accounts/' + str(self.kwargs['pk'])


class AccountDeleteView(AppLoginRequiredMixin, VerifyOwnerMixin, DeleteView):
    model = Account
    template_name = 'expenses/default_delete.html'
    success_url = '/accounts'


class AccountSubtransactionsListView(AppLoginRequiredMixin, ListView):
    model = Subtransaction
    template_name = 'expenses/account.html'

    def get_context_data(self, **kwargs):
        account = Account.objects.get(id=self.kwargs['pk'])
        context = super().get_context_data(**kwargs)
        context['account'] = account
        context['object_list'] = get_account_balances_for_subtransactions_range(
            account, context['object_list']
        )
        return context

    def get_queryset(self):
        account = Account.objects.get(id=self.kwargs['pk'])
        if account.user != self.request.user:
            raise PermissionDenied()
        return Subtransaction.objects.filter(account=account).order_by('transaction__date_time')


class ChainedAccountListView(AppLoginRequiredMixin, ListView):
    model = ChainedAccount
