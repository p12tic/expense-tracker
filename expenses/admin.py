from django.contrib import admin
from . import models

admin.site.register(models.Transaction)
admin.site.register(models.Account)
admin.site.register(models.Subtransaction)
admin.site.register(models.Tag)
admin.site.register(models.TransactionTag)
admin.site.register(models.ChainedAccount)
admin.site.register(models.ChainedAccountRequestPendingNew)
admin.site.register(models.ChainedSubtransaction)
admin.site.register(models.ChainedSubtransactionPendingChange)
admin.site.register(models.ChainedSubtransactionPendingNew)
admin.site.register(models.ChainedSubtransactionIgnored)
admin.site.register(models.Preset)
admin.site.register(models.PresetTransactionTag)
admin.site.register(models.PresetSubtransaction)
admin.site.register(models.AccountBalanceCache)
admin.site.register(models.AccountSyncEvent)
