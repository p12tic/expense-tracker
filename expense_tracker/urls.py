'''expense_tracker URL Configuration
'''

from django.conf import settings
from django.urls import re_path, include

urlpatterns = [
    re_path(r'', include('expenses.urls')),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        re_path(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
