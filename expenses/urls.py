'''expense_tracker URL Configuration
'''

from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView
from expenses.views import auth, account, json, preset, tag, transaction

urlpatterns = [
    url(r'^$', RedirectView.as_view(url='/transactions')),
    url(r'^transactions$', transaction.TransactionListView.as_view()),
    url(r'^transactions/add$', transaction.TransactionCreateView.as_view()),
    url(r'^transactions/(?P<pk>\d+)$',
        transaction.TransactionSubtransactionsListView.as_view()),
    url(r'^transactions/(?P<pk>\d+)/edit$',
        transaction.TransactionUpdateView.as_view()),
    url(r'^transactions/(?P<pk>\d+)/delete$',
        transaction.TransactionDeleteView.as_view()),

    url(r'^accounts$', account.AccountListView.as_view()),
    url(r'^accounts/(?P<pk>\d+)$',
        account.AccountSubtransactionsListView.as_view()),
    url(r'^accounts/(?P<pk>\d+)/edit$', account.AccountUpdateView.as_view()),
    url(r'^accounts/(?P<pk>\d+)/delete$', account.AccountDeleteView.as_view()),
    url(r'^accounts/add$', account.AccountCreateView.as_view()),
    url(r'^presets$', preset.PresetListView.as_view()),

    url(r'^presets/(?P<pk>\d+)$', preset.PresetDetailView.as_view()),
    url(r'^presets/(?P<pk>\d+)/edit$', preset.PresetUpdateView.as_view()),
    url(r'^presets/(?P<pk>\d+)/delete$', preset.PresetDeleteView.as_view()),
    url(r'^presets/add$', preset.PresetCreateView.as_view()),

    url(r'^tags$', tag.TagListView.as_view()),
    url(r'^tags/(?P<pk>\d+)$', tag.TagTransactionListView.as_view()),
    url(r'^tags/(?P<pk>\d+)/edit$', tag.TagUpdateView.as_view()),
    url(r'^tags/(?P<pk>\d+)/delete$', tag.TagDeleteView.as_view()),
    url(r'^tags/add$', tag.TagCreateView.as_view()),

    url(r'^admin/', admin.site.urls),
    url(r'^user/login$', auth.login),
    url(r'^user/logout$', auth.logout),
    url(r'^user/profile$', auth.logged_in),
    url(r'^user/edit$', auth.user_edit),
]
