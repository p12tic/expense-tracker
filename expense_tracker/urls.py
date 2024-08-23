'''expense_tracker URL Configuration
'''

from django.conf.urls import url, include

urlpatterns = [
    url(r'', include('expenses.urls')),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        re_path(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
