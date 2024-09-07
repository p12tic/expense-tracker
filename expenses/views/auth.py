from django.contrib import auth
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.contrib.auth.views import LoginView

def logged_in(request):
    return render(request, 'logged_in.html')

def login(request):
    return LoginView.as_view(template_name='expenses/login.html')(request)

def logout(request):
    auth.logout(request)
    return HttpResponseRedirect('/')

def user_edit(request):
    return render(request, 'expenses/user_edit.html')

class AppLoginRequiredMixin(LoginRequiredMixin):
    login_url = '/user/login'
    redirect_field_name = 'redirect_to'

class VerifyOwnerMixinBase:
    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)

class VerifyOwnerMixin(VerifyOwnerMixinBase):
    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user:
            raise PermissionDenied()
        return obj

class VerifyAccountUserMixin(VerifyOwnerMixinBase):
    def get_object(self):
        obj = super().get_object()
        if obj.account.user != self.request.user:
            raise PermissionDenied()
        return obj
