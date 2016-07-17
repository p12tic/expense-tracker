'''expense_tracker URL Configuration
'''

from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView
from expenses import views

urlpatterns = [
    url(r'^$', RedirectView.as_view(url='/home')),
    url(r'^home', views.home),
    url(r'^admin/', admin.site.urls),
    url(r'^accounts/login$', views.login),
    url(r'^accounts/profile$', views.logged_in),
    url(r'^test1/$', views.test1),
]
