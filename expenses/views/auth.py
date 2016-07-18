from django.contrib import auth
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponseRedirect
from django.shortcuts import render_to_response

def logged_in(request):
    return render_to_response('logged_in.html')

def login(request):
    return auth.views.login(request, template_name='expenses/login.html')

def logout(request):
    auth.logout(request)
    return HttpResponseRedirect('/')

def user_edit(request):
    return render_to_response('expenses/user_edit.html')

class AppLoginRequiredMixin(LoginRequiredMixin):
    login_url = '/user/login'
    redirect_field_name = 'redirect_to'

class VerifyOwnerMixin:
    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)

    def get_object(self):
        obj = super().get_object()
        if obj.user != self.request.user:
            raise PermissionDenied()
        return obj
