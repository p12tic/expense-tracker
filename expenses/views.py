from django.shortcuts import render, render_to_response
import django.contrib.auth
from django.contrib.auth.decorators import login_required

# Create your views here.

def logged_in(request):
    return render_to_response('logged_in.html')

def login(request):
    ret = django.contrib.auth.views.login(request, template_name='login.html')
    print(ret)
    return ret

def logout(request):
    return django.contrib.auth.logout(request)

@login_required
def home(request):
    return render(request, 'home.html')

def test1(request):
    return render(request, 'test1.html')

def test2(request):
    return render(request, 'test2.html')

@login_required
def test3(request):
    return render(request, 'test3.html')
