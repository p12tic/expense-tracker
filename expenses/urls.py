'''expense_tracker URL Configuration'''

from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from django.urls import re_path
from rest_framework.authtoken import views

from .views import api_views
from .views import react_frontend

urlpatterns = [
    re_path(r'^$', react_frontend.react_frontend, name='react_frontend'),
    re_path(r'^transactions.*$', react_frontend.react_frontend),
    re_path(r'^accounts.*$', react_frontend.react_frontend),
    re_path(r'^presets.*$', react_frontend.react_frontend),
    re_path(r'^tags.*$', react_frontend.react_frontend),
    re_path(r'^user.*$', react_frontend.react_frontend),
    re_path(r'^sync.*$', react_frontend.react_frontend),
    # api views
    path('api/accounts', api_views.AccountView.as_view()),
    path('api/tags', api_views.TagView.as_view()),
    path('api/transactions', api_views.TransactionView.as_view()),
    path('api/presets', api_views.PresetView.as_view()),
    path('api/transaction_tags', api_views.TransactionTagsView.as_view()),
    path('api/subtransactions', api_views.SubtransactionView.as_view()),
    path('api/account_sync_event', api_views.AccountSyncEventView.as_view()),
    path('api/account_balance_cache', api_views.AccountBalanceCacheView.as_view()),
    path('api/preset_subtransactions', api_views.PresetSubtransactionView.as_view()),
    path('api/preset_transaction_tags', api_views.PresetTransactionTagView.as_view()),
    path('api/api-token-auth/', views.obtain_auth_token),
    path('api/token', api_views.TokenView.as_view()),
    path('api/transaction_image', api_views.TransactionImageView.as_view()),
    path('api/transaction_batch', api_views.TransactionCreateBatchView.as_view()),
    path(
        'api/transaction_batch_transactions/<pk>',
        api_views.TransactionCreateBatchRemainingTransactionsView.as_view(),
    ),
    path('api/transaction_batch/<int:batch_id>/count', api_views.transaction_batch_item_count),
    path(
        'api/transaction_batch/<int:batch_id>/<int:current_id>/next', api_views.next_batch_item_id
    ),
    path('api/transactions_and_relevent_data', api_views.TransactionsAndRelatedDataView.as_view()),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
