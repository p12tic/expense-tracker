from django.views.generic.list import ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from expenses.views.auth import AppLoginRequiredMixin, VerifyAccountUserMixin
from django.core.exceptions import PermissionDenied
from expenses.models import *
from expenses.db_utils import *

class AccountSyncCreateView(AppLoginRequiredMixin, VerifyAccountUserMixin, CreateView):
    model = AccountSyncEvent
    fields = ['balance']
    template_name = 'expenses/default_create.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        account = Account.objects.get(self.kwargs['account_pk'])
        context['account_name'] = account.name
        return context

    def form_valid(self, form):
        date_time = form.cleaned_data['date_time']

        if 'pk' in self.kwargs:
            existing = True
            transaction = Transaction.objects.get(id=self.kwargs['pk'])
            if transaction.user != self.request.user:
                raise PermissionDenied()
        else:
            existing = False
            transaction = Transaction(user=self.request.user)
            transaction.date_time = new_date_time

        transaction.desc = form.cleaned_data['desc']
        # transaction will be saved in transaction_update_date_or_amount

        account_amounts = {}
        for form in accounts_form.forms:
            account_id = form.cleaned_data['account_id']
            account_amounts[account_id] = form.cleaned_data['amount']

        transaction_update_date_or_amount(transaction, new_date_time,
                                          account_amounts)

        checked_tags = {}
        for form in tags_form.forms:
            tag_id = form.cleaned_data['tag_id']
            checked_tags[tag_id] = form.cleaned_data['checked']
        update_transaction_tags(self.request.user, transaction, checked_tags)

        return HttpResponseRedirect(self.get_success_url())

    def get_success_url(self):
        return '/accounts/' + str(self.get_object().account.id)

class AccountSyncUpdateView(AppLoginRequiredMixin, VerifyAccountUserMixin, UpdateView):
    model = AccountSyncEvent
    fields = ['name', 'desc']
    template_name = 'expenses/default_update.html'

    def get_success_url(self):
        return '/accounts/' + str(self.get_object().account.id)

class AccountDeleteView(AppLoginRequiredMixin, VerifyAccountUserMixin, DeleteView):
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
        context['object_list'] =  \
                get_account_balances_for_subtransactions_range(account, context['object_list'])
        return context

    def get_queryset(self):
        account = Account.objects.get(id=self.kwargs['pk'])
        if account.user != self.request.user:
            raise PermissionDenied()
        return Subtransaction.objects.filter(account=account).order_by('transaction__date_time')

class ChainedAccountListView(AppLoginRequiredMixin, ListView):
    model = ChainedAccount
