from django import forms
from ..models import *

# accounts formset

class TransactionAccountForm(forms.Form):
    account_id = forms.IntegerField(widget=forms.HiddenInput())
    name = forms.CharField(widget=forms.HiddenInput()) # dummy field
    amount = forms.IntegerField(required=False)

class TransactionFloatAccountForm(forms.Form):
    account_id = forms.IntegerField(widget=forms.HiddenInput())
    name = forms.CharField(widget=forms.HiddenInput()) # dummy field
    amount = forms.FloatField(required=False)

class BaseAccountFormSet(forms.BaseFormSet):
    def __init__(self, *args, **kwargs):
        if 'user' in kwargs:
            self.user = kwargs.pop('user')
        super().__init__(*args, **kwargs)

    def clean(self):
        if any(self.errors):
            return
        account_list = Account.objects.filter(user=self.user).values_list('id', flat=True)

        for form in self.forms:
            account_id = form.cleaned_data['account_id']
            if account_id not in account_list:
                raise forms.ValidationError(
                        "The current user does not have access to the account")

AccountFormSet = forms.formset_factory(TransactionAccountForm,
                                       formset=BaseAccountFormSet,
                                       extra=0)

FloatAccountFormSet = forms.formset_factory(TransactionFloatAccountForm,
                                            formset=BaseAccountFormSet,
                                            extra=0)

# tags formset

class TransactionTagForm(forms.Form):
    tag_id = forms.IntegerField(widget=forms.HiddenInput())
    name = forms.CharField(widget=forms.HiddenInput()) # dummy field
    checked = forms.BooleanField(required=False)

class BaseTagFormSet(forms.BaseFormSet):
    def __init__(self, *args, **kwargs):
        if 'user' in kwargs:
            self.user = kwargs.pop('user')
        super().__init__(*args, **kwargs)

    def clean(self):
        if any(self.errors):
            return
        tag_list = Tag.objects.filter(user=self.user).values_list('id', flat=True)
        for form in self.forms:
            tag_id = form.cleaned_data['tag_id']
            if tag_id not in tag_list:
                raise forms.ValidationError(
                        "The current user does not have access to the tag")

TagFormSet = forms.formset_factory(TransactionTagForm,
                                   formset=BaseTagFormSet,
                                   extra=0)
