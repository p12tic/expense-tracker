
from django.core.exceptions import PermissionDenied
from django.views.generic.list import ListView
from django.views.generic.edit import FormView, UpdateView, DeleteView
from django import forms
from django.http import HttpResponseRedirect
from expenses.views.auth import AppLoginRequiredMixin, VerifyOwnerMixin
from expenses.views.formsets import *
from expenses.models import *
from expenses.db_utils import *
import json

class TransactionListView(AppLoginRequiredMixin, ListView):
    model = Transaction
    template_name = 'expenses/transactions.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['object_list'] = \
                get_transactions_actions_and_tags(context['object_list'])
        return context

# the creation form

class TransactionForm(forms.ModelForm):
    class Meta:
        model = Transaction
        fields = ['desc', 'date_time']

    # the following are handled in the TransactionCreateView class
    #accounts = AccountFormSet()
    #tags = TagFormSet()

class TransactionBaseFormView(AppLoginRequiredMixin, FormView):
    form_class = TransactionForm

    def get_initial_data(self, user, tr=None):

        tr_subs = {}
        tr_tags = {}
        if tr is not None:
            for s in Subtransaction.objects.filter(transaction=tr):
                tr_subs[s.account.id] = s.amount
            for s in TransactionTag.objects.filter(transaction=tr):
                tr_tags[s.tag.id] = True

        account_list = Account.objects.filter(user=self.request.user).order_by('name')
        initial = []
        for a in account_list:
            amount = 0
            if a.id in tr_subs:
                amount = tr_subs[a.id]
            data = {
                'account_id' : a.id,
                'name' : a.name,
                'amount' : amount
            }
            initial.append(data)

        accounts_form = AccountFormSet(initial=initial, prefix="accounts")
        print(accounts_form)
        tag_list = Tag.objects.filter(user=self.request.user).order_by('name')
        initial = []
        for t in tag_list:
            checked = False
            if t.id in tr_tags:
                checked = True
            data = {
                'tag_id' : t.id,
                'name' : t.name,
                'checked' : checked
            }
            initial.append(data)
        tags_form = TagFormSet(initial=initial, prefix="tags")

        return accounts_form, tags_form

    def get(self, request, *args, **kwargs):
        tr = None
        if 'pk' in kwargs:
            tr = Transaction.objects.get(id=self.kwargs['pk'])
            if tr.user != self.request.user:
                raise PermissionDenied()

        if tr:
            form = TransactionForm(instance=tr)
        else:
            form = self.get_form(self.get_form_class())

        accounts_form, tags_form = self.get_initial_data(self.request.user, tr)

        data = self.get_context_data(form=form, accounts_form=accounts_form,
                                     tags_form=tags_form)
        return self.render_to_response(data)

    def post(self, request, *args, **kwargs):
        form = self.get_form(self.get_form_class())

        accounts_form = AccountFormSet(self.request.POST, prefix="accounts",
                                       user=request.user)
        tags_form = TagFormSet(self.request.POST, prefix="tags", user=request.user)

        if form.is_valid() and accounts_form.is_valid() and tags_form.is_valid():
            return self.form_valid(form, accounts_form, tags_form)
        else:
            return self.form_invalid(form, accounts_form, tags_form)

    def dump_presets_to_json(self, presets_data):
        r = {}
        for preset, p_subs, p_tags in presets_data:
            subs = []
            for id, desc, fraction in p_subs:
                subs.append({
                    'id' : id,
                    'fraction' : fraction
                })
            tags = []
            for id, name in p_tags:
                tags.append({
                    'id' : id,
                    'name' : name
                })
            r[preset.id] = {
                'subtransactions' : subs,
                'tags' : tags
            }
        return json.dumps(r)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['preset_list'] = \
                Preset.objects.filter(user=self.request.user).order_by('name')
        preset_data = get_preset_accounts_and_tags(context['preset_list'])
        context['preset_data'] = self.dump_presets_to_json(preset_data)
        return context

    def form_valid(self, form, accounts_form, tags_form):
        new_date_time = form.cleaned_data['date_time']

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

        transaction_update_date_or_amount(self.request.user, transaction,
                                          new_date_time, account_amounts)

        checked_tags = {}
        for form in tags_form.forms:
            tag_id = form.cleaned_data['tag_id']
            checked_tags[tag_id] = form.cleaned_data['checked']
        update_transaction_tags(self.request.user, transaction, checked_tags)

        return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form, accounts_form, tags_form):
        data = self.get_context_data(form=form, accounts_form=accounts_form,
                                     tags_form=tags_form)
        return self.render_to_response(data)

class TransactionCreateView(TransactionBaseFormView):
    template_name = 'expenses/transaction_create.html'
    success_url = '/transactions'

class TransactionUpdateView(TransactionBaseFormView):
    template_name = 'expenses/transaction_update.html'

    def get_success_url(self):
        return '/transactions/' + str(self.kwargs['pk'])

class TransactionDeleteView(AppLoginRequiredMixin, VerifyOwnerMixin,
                            DeleteView):
    model = Transaction
    template_name = 'expenses/default_delete.html'
    success_url = '/transactions'

    def form_valid(self, form):
        transaction = self.get_object()
        transaction_delete(self.request.user, transaction)

class TransactionSubtransactionsListView(AppLoginRequiredMixin, ListView):
    model = Subtransaction
    template_name = 'expenses/transaction.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['transaction'] = Transaction.objects.get(id=self.kwargs['pk'])
        context['tag_list'] = \
                TransactionTag.objects.filter(transaction=self.kwargs['pk'])
        return context

    def get_queryset(self):
        transaction = Transaction.objects.get(id=self.kwargs['pk'])
        if transaction.user != self.request.user:
            raise PermissionDenied()
        return Subtransaction.objects.filter(transaction=transaction)
