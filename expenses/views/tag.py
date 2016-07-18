
from django.views.generic.list import ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from expenses.views.auth import AppLoginRequiredMixin, VerifyOwnerMixin
from expenses.models import *
from expenses.db_utils import *

class TagListView(AppLoginRequiredMixin, ListView):
    model = Tag
    template_name = 'expenses/tags.html'

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

class TagCreateView(AppLoginRequiredMixin, VerifyOwnerMixin, CreateView):
    model = Tag
    fields = ['name', 'desc']
    template_name = 'expenses/default_create.html'
    success_url = '/tags'

class TagUpdateView(AppLoginRequiredMixin, VerifyOwnerMixin, UpdateView):
    model = Tag
    fields = ['name', 'desc']
    template_name = 'expenses/default_update.html'

    def get_success_url(self):
        return '/tags/' + str(self.kwargs['pk'])

class TagDeleteView(AppLoginRequiredMixin, VerifyOwnerMixin, DeleteView):
    model = Tag
    template_name = 'expenses/default_delete.html'
    success_url = '/tags'

class TagTransactionListView(AppLoginRequiredMixin, ListView):
    model = Transaction
    template_name = 'expenses/tag.html'

    def get_context_data(self, **kwargs):
        context = super(TagTransactionListView, self).get_context_data(**kwargs)
        context['tag'] = Tag.objects.get(id=self.kwargs['pk'])
        context['object_list'] = get_transactions_actions_and_tags(context['object_list'])
        return context

    def get_queryset(self):
        tag = Tag.objects.get(id=self.kwargs['pk'])
        if tag.user != self.request.user:
            raise PermissionDenied()
        return Transaction.objects.filter(transactiontag__tag=tag).order_by('date_time')

