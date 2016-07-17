from django.db import models
from django.conf import settings

# ------------------------------------------------------------------------------
# Transactions and balances

''' A transaction refers to a single event that changes one or more balances.
    The exact change in each balance is identified by the "Subtransaction"
    object. Transactions are ordered by date and time.
'''
class Transaction(models.Model):
    desc = models.CharField(max_length=256)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_time = models.DateTimeField()

''' Balance identifies the current amount of assets (positive) or liabilities
    (negative) of a certain user. An user may have multiple balances related to
    different actors.
'''
class Balance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256)

''' Subtransaction is a change in a balance due to a single transaction
'''
class Subtransaction(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE)
    amount = models.IntegerField(default=0)

# ------------------------------------------------------------------------------
# Transaction tags

''' A tag is a named attribute of a transaction. Any number of tags may be
    attached to any number of transactions.
'''
class Tag(models.Model):
    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256)

''' This table identifies attachment of tags to transactions
'''
class TransactionTag(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

# ------------------------------------------------------------------------------
# Friends and chained balances

''' User may have friends to which transactions from some balances are shared
    automatically. The relation is omnidirectional: balance chain requests from
    a friend are shown to the user but not the other way round. Two entries in
    this table need to be made in order for bidirectional relation.
'''
class FriendRelation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_relation_user',
                             on_delete=models.CASCADE)
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_relation_friend',
                               on_delete=models.CASCADE)

''' Identifies a request to become friends
'''
class FriendRequest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_request_user',
                             on_delete=models.CASCADE)
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_request_friend',
                               on_delete=models.CASCADE)
    date = models.DateField()

''' Chained balances identify a pair of balances, master and slave. New
    subtransactions in master balance are shown as pending subtransactions for
    the user of the slave balance. User may approve or decline a pending
    subtransaction. Approved subtransactions create an entry in specific balance
    and a dummy transaction.
'''
class ChainedBalance(models.Model):
    master_balance = models.ForeignKey(Balance, related_name='master_balance',
                                       on_delete=models.CASCADE)
    slave_balance = models.ForeignKey(Balance, related_name='slave_balance',
                                      on_delete=models.CASCADE)
    relation = models.IntegerField(default=0)

''' Two subtransactions from the same user may be "chained": i.e. updates to
    master subtransaction reflect to the chained subtransaction. Before the
    change is reflected the slave user must approve it.

    Requests of new chains are stored in ChainedSubtransactionPendingNew table.
    Only if approved, slave subtransaction is created and stored in
    ChainedSubtransaction table. If declined, the subtransaction is stored
    in ChainedSubtransactionIgnored table.

    Any changes to master transaction must be approved by the slave user. This
    is tracked in ChainedSubtransactionPendingChange table.
'''
class ChainedSubtransaction(models.Model):
    master_subtransaction = models.ForeignKey(Subtransaction, related_name='master_subtransaction',
                                              on_delete=models.CASCADE)
    slave_subtransaction = models.ForeignKey(Subtransaction, related_name='slave_subransaction',
                                             on_delete=models.CASCADE)
    relation = models.IntegerField(default=0)

''' Tracks master subtransaction chains in approved subtransaction chains.
'''
class ChainedSubtransactionPendingChange(models.Model):
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    chained = models.ForeignKey(ChainedSubtransaction, on_delete=models.CASCADE)

''' Tracks new subtransaction chain requests. If an entry is removed from this
    table, an entry must be created in ChainedSubtransaction or
    ChainedSubtransactionIgnored table.
'''
class ChainedSubtransactionPendingNew(models.Model):
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    master_subtransaction = models.ForeignKey(Subtransaction, on_delete=models.CASCADE)
    chained_balance = models.ForeignKey(ChainedBalance, on_delete=models.CASCADE)

''' Tracks ignored subtransaction chain requests
'''
class ChainedSubtransactionIgnored(models.Model):
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    master_subtransaction = models.ForeignKey(Subtransaction, on_delete=models.CASCADE)
    chained_balance = models.ForeignKey(ChainedBalance, on_delete=models.CASCADE)

# ------------------------------------------------------------------------------
# Presets

''' Tracks new transaction presets: what subtransactions to create for the new
    transaction (i.e. what balances to affect) and what tags to assign to it.

    Priority identifies how the presets are ordered in the UI.
'''
class Preset(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256)
    priority = models.IntegerField(default=0)

''' Identifies what transaction tags to assign to a new transaction
'''
class PresetTransactionTag(models.Model):
    preset = models.ForeignKey(Preset, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

''' Identifies what subtransactions to create for a new transaction
'''
class PresetSubTransaction(models.Model):
    preset = models.ForeignKey(Preset, on_delete=models.CASCADE)
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE)
    fraction = models.FloatField(default=1)

# ------------------------------------------------------------------------------
# Balance sync

''' Caches the amount of funds in a balance at the end of specific day.
'''
class BalanceAmountCache(models.Model):
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE)
    amount = models.IntegerField()
    date = models.DateField()

''' Identifies a balance-sync event, where the user synchronizes the data in
    the database with actual amount of funds. A balance sync event creates a
    subtransaction to adjust the amount of funds in the balance to match the
    actual amount of funds.
'''
class BalanceSyncEvent(models.Model):
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE)
    amount = models.IntegerField()
    subtransaction = models.ForeignKey(Subtransaction, on_delete=models.CASCADE)
