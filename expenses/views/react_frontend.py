from django.shortcuts import render


def react_frontend(request):
    """Serve the React frontend application"""
    return render(request, 'react_frontend.html')
