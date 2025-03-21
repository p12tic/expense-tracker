from django.views.generic.list import ListView
from django.views.generic.edit import FormView, UpdateView, DeleteView
from django.core.exceptions import PermissionDenied
from django import forms
from django.http import HttpResponseRedirect
from .auth import AppLoginRequiredMixin, VerifyOwnerMixin
from .formsets import *
from ..models import *
from ..db_utils import *


class PresetListView(AppLoginRequiredMixin, ListView):
    model = Preset
    template_name = 'expenses/presets.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['object_list'] = get_preset_accounts_and_tags(context['object_list'])
        return context


class PresetForm(forms.ModelForm):
    class Meta:
        model = Preset
        fields = ['name', 'desc', 'transaction_desc']

    # the following are handled in the views
    # accounts = FloatAccountFormSet()
    # tags = TagFormSet()


class PresetBaseFormView(AppLoginRequiredMixin, FormView):
    form_class = PresetForm

    def get_initial_data(self, user, preset=None):
        preset_subs = {}
        preset_tags = {}
        if preset is not None:
            for s in PresetSubtransaction.objects.filter(preset=preset):
                preset_subs[s.account.id] = s.fraction
            for s in PresetTransactionTag.objects.filter(preset=preset):
                preset_tags[s.tag.id] = True

        account_list = Account.objects.filter(user=self.request.user).order_by('name')
        initial = []
        for a in account_list:
            amount = 0
            if a.id in preset_subs:
                amount = preset_subs[a.id]
            data = {'account_id': a.id, 'name': a.name, 'amount': amount}
            initial.append(data)
        accounts_form = FloatAccountFormSet(initial=initial, prefix="accounts")

        tag_list = Tag.objects.filter(user=self.request.user).order_by('name')
        initial = []
        for t in tag_list:
            checked = False
            if t.id in preset_tags:
                checked = True
            data = {'tag_id': t.id, 'name': t.name, 'checked': checked}
            initial.append(data)
        tags_form = TagFormSet(initial=initial, prefix="tags")

        return accounts_form, tags_form

    def get(self, request, *args, **kwargs):
        preset = None
        if 'pk' in kwargs:
            preset = Preset.objects.get(id=self.kwargs['pk'])
            if preset.user != self.request.user:
                raise PermissionDenied()

        if preset:
            form = PresetForm(instance=preset)
        else:
            form = self.get_form(self.get_form_class())

        accounts_form, tags_form = self.get_initial_data(self.request.user, preset)

        data = self.get_context_data(form=form, accounts_form=accounts_form, tags_form=tags_form)
        return self.render_to_response(data)

    def post(self, request, *args, **kwargs):
        form = self.get_form(self.get_form_class())

        accounts_form = FloatAccountFormSet(self.request.POST, prefix="accounts", user=request.user)
        tags_form = TagFormSet(self.request.POST, prefix="tags", user=request.user)

        if form.is_valid() and accounts_form.is_valid() and tags_form.is_valid():
            return self.form_valid(form, accounts_form, tags_form)
        else:
            print(form.errors)
            return self.form_invalid(form, accounts_form, tags_form)

    def form_valid(self, form, accounts_form, tags_form):
        if 'pk' in self.kwargs:
            existing = True
            preset = Preset.objects.get(id=self.kwargs['pk'])
            if preset.user != self.request.user:
                raise PermissionDenied()
        else:
            existing = False
            preset = Preset(user=self.request.user)

        preset.name = form.cleaned_data['name']
        preset.desc = form.cleaned_data['desc']
        preset.transaction_desc = form.cleaned_data['transaction_desc']
        preset.save()

        user_accounts = Account.objects.filter(user=self.request.user)
        if existing:
            subs = PresetSubtransaction.objects.filter(preset=preset)
        else:
            subs = PresetSubtransaction.objects.none()

        for form in accounts_form.forms:
            account = user_accounts.get(pk=form.cleaned_data['account_id'])
            fraction = form.cleaned_data['amount']
            if fraction is not None and fraction != 0:
                PresetSubtransaction.objects.update_or_create(
                    preset=preset, account=account, defaults={'fraction': fraction}
                )
            else:
                for sub in subs.filter(account=account):
                    sub.delete()

        user_tags = Tag.objects.filter(user=self.request.user)
        if existing:
            tags = PresetTransactionTag.objects.filter(preset=preset)
        else:
            tags = PresetTransactionTag.objects.none()

        for form in tags_form.forms:
            checked = form.cleaned_data['checked']
            tag = user_tags.get(pk=form.cleaned_data['tag_id'])

            if not checked:
                if tag is not None:
                    tags.filter(tag=tag).delete()
                continue

            if tag is None:
                continue
            if tag is None or len(tags.filter(tag=tag)) > 0:
                continue

            new_ts_tag = PresetTransactionTag(preset=preset, tag=tag)
            new_ts_tag.save()

        return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form, accounts_form, tags_form):
        data = self.get_context_data(form=form, accounts_form=accounts_form, tags_form=tags_form)
        return self.render_to_response(data)


class PresetCreateView(PresetBaseFormView):
    template_name = 'expenses/preset_create.html'
    success_url = '/presets'


class PresetUpdateView(PresetBaseFormView):
    template_name = 'expenses/preset_update.html'

    def get_success_url(self):
        return '/presets/' + str(self.kwargs['pk'])


class PresetDeleteView(AppLoginRequiredMixin, VerifyOwnerMixin, DeleteView):
    model = Preset
    template_name = 'expenses/default_delete.html'
    success_url = '/presets'


class PresetDetailView(AppLoginRequiredMixin, ListView):
    model = Preset
    template_name = 'expenses/preset.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['preset'] = Preset.objects.get(id=self.kwargs['pk'])
        context['tag_list'] = PresetTransactionTag.objects.filter(preset=self.kwargs['pk'])
        return context

    def get_queryset(self):
        preset = Preset.objects.get(id=self.kwargs['pk'])
        if preset.user != self.request.user:
            raise PermissionDenied()
        return PresetSubtransaction.objects.filter(preset=preset)
