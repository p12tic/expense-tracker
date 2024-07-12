from .. import models, serializers
from rest_framework import generics

class AccountView(generics.ListAPIView):
    queryset = models.Account.objects.all()
    serializer_class = serializers.AccountSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset