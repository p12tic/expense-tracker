from django.db import models
from django.conf import settings

# ------------------------------------------------------------------------------
# Transactions and accounts

class Transaction(models.Model):
    ''' A transaction refers to a single event that changes one or more
        accounts. The exact change in each account is identified by the
        "Subtransaction" object. Transactions are ordered by date and time.
    '''
    desc = models.CharField(max_length=256,
            verbose_name="description")

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE,
            related_name='transactions')

    date_time = models.DateTimeField()

class Account(models.Model):
    ''' Account identifies the current amount of assets (positive) or
        liabilities (negative) of a certain user. A user may have multiple
        accounts related to different actors.
    '''
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE,
            related_name='accounts')

    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256,
            verbose_name="description",
            blank=True)

class Subtransaction(models.Model):
    ''' Subtransaction is a change in an account due to a single transaction
    '''
    transaction = models.ForeignKey(Transaction,
            on_delete=models.CASCADE,
            related_name='subtransactions')

    account = models.ForeignKey(Account,
            on_delete=models.CASCADE,
            related_name='subtransactions')
    amount = models.IntegerField(default=0)

# ------------------------------------------------------------------------------
# Transaction tags

class Tag(models.Model):
    ''' A tag is a named attribute of a transaction. Any number of tags may be
        attached to any number of transactions.
    '''
    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256,
            verbose_name="description",
            blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE,
            related_name='tags')

class TransactionTag(models.Model):
    ''' This table identifies attachment of tags to transactions
    '''
    transaction = models.ForeignKey(Transaction,
            on_delete=models.CASCADE,
            related_name='transaction_tags')
    tag = models.ForeignKey(Tag,
            on_delete=models.CASCADE,
            related_name='transaction_tags')

# ------------------------------------------------------------------------------
# Friends and chained accounts

class ChainedAccount(models.Model):
    ''' Chained accounts identify a pair of accounts, master and slave. New
        subtransactions in master account are shown as pending subtransactions
        for the user of the slave account. User may approve or decline a pending
        subtransaction. Approved subtransactions create an entry in specific
        account and a dummy transaction.
    '''
    master_account = models.ForeignKey(Account,
            related_name='master_account',
            on_delete=models.CASCADE)

    slave_account = models.ForeignKey(Account,
            related_name='slave_account',
            on_delete=models.CASCADE)

    relation = models.IntegerField(default=0)

class ChainedAccountRequestPendingNew(models.Model):
    ''' Identifies a request to create a ChainedAccount relation
    '''
    master = models.ForeignKey(settings.AUTH_USER_MODEL,
            related_name='master',
            on_delete=models.CASCADE)

    slave = models.ForeignKey(settings.AUTH_USER_MODEL,
            related_name='slave',
            on_delete=models.CASCADE)

    desc = models.CharField(max_length=256,
            verbose_name="description",
            blank=True)

    relation = models.IntegerField(default=0)

class ChainedSubtransaction(models.Model):
    ''' Two subtransactions from the same user may be "chained": i.e. updates to
        master subtransaction reflect to the chained subtransaction. Before the
        change is reflected the slave user must approve it.

        Requests of new chains are stored in ChainedSubtransactionPendingNew
        table. Only if approved, slave subtransaction is created and stored in
        ChainedSubtransaction table. If declined, the subtransaction is stored
        in ChainedSubtransactionIgnored table.

        Any changes to master transaction must be approved by the slave user.
        This is tracked in ChainedSubtransactionPendingChange table.
    '''
    master_subtransaction = models.ForeignKey(Subtransaction,
            related_name='master_subtransaction',
            on_delete=models.CASCADE)

    slave_subtransaction = models.ForeignKey(Subtransaction,
            related_name='slave_subransaction',
            on_delete=models.CASCADE)

    relation = models.IntegerField(default=0)

class ChainedSubtransactionPendingChange(models.Model):
    ''' Tracks master subtransaction chains in approved subtransaction chains.
    '''
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE)

    chained = models.ForeignKey(ChainedSubtransaction,
            on_delete=models.CASCADE)

class ChainedSubtransactionPendingNew(models.Model):
    ''' Tracks new subtransaction chain requests. If an entry is removed from
        this table, an entry must be created in ChainedSubtransaction or
        ChainedSubtransactionIgnored table.
    '''
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE)

    master_subtransaction = models.ForeignKey(Subtransaction,
            on_delete=models.CASCADE)

    chained_account = models.ForeignKey(ChainedAccount,
            on_delete=models.CASCADE)

class ChainedSubtransactionIgnored(models.Model):
    ''' Tracks ignored subtransaction chain requests
    '''
    slave_user = models.ForeignKey(settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE)

    master_subtransaction = models.ForeignKey(Subtransaction,
            on_delete=models.CASCADE)

    chained_account = models.ForeignKey(ChainedAccount,
            on_delete=models.CASCADE)

# ------------------------------------------------------------------------------
# Presets

class Preset(models.Model):
    ''' Tracks new transaction presets: what subtransactions to create for
        the new transaction (i.e. what accounts to affect) and what tags to
        assign to it.
    '''
    name = models.CharField(max_length=256)
    desc = models.CharField(max_length=256, blank=True)
    transaction_desc = models.CharField(max_length=256, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

class PresetTransactionTag(models.Model):
    ''' Identifies what transaction tags to assign to a new transaction
    '''
    preset = models.ForeignKey(Preset,
            on_delete=models.CASCADE,
            related_name='preset_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

class PresetSubtransaction(models.Model):
    ''' Identifies what subtransactions to create for a new transaction
    '''
    preset = models.ForeignKey(Preset,
            on_delete=models.CASCADE,
            related_name='preset_subtransactions')
    account = models.ForeignKey(Account, on_delete=models.CASCADE)
    fraction = models.FloatField(default=1)

# ------------------------------------------------------------------------------
# Account sync

class AccountBalanceCache(models.Model):
    ''' Caches the amount of funds in an account at the beginning of specific
        day. The time point of the cached balance is after all transactions of
        the previous day and before all transactions of the current day.
    '''
    account = models.ForeignKey(Account,
            on_delete=models.CASCADE,
            related_name='balance_caches')

    balance = models.IntegerField()
    date = models.DateTimeField()

class AccountSyncEvent(models.Model):
    ''' Identifies an account-sync event, where the user synchronizes the data in
        the database with actual balance of funds. An account sync event creates
        a subtransaction to adjust the balance in the account to match the
        actual amount of funds present.

        The time point of the synchronization is just after all transactions
        that occur before or on the specified time point and before all
        transactions that occur after the specified time point.
    '''
    account = models.ForeignKey(Account,
            on_delete=models.CASCADE,
            related_name='sync_events')

    balance = models.IntegerField()

    subtransaction = models.ForeignKey(Subtransaction,
            on_delete=models.CASCADE,
            related_name='sync_event')
