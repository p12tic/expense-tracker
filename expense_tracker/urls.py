'''expense_tracker URL Configuration
'''

from django.conf.urls import url, include

urlpatterns = [
    url(r'', include('expenses.urls')),
]
