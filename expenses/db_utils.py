import datetime
from django.utils.timezone import make_aware
from .models import *
import re

# NOTE: the subtransaction filtering MUST be done using half-open intervals to
# ensure that when several transactions are made on the same date/time the
# caches are computed correctly. In general we are only interested in consistent
# ordering of account sync and account balance cache events wrt. themselves and
# wrt. the rest of subtransactions.


# Returns the account balance just before or on the given time.
def get_account_balance(account, date_time):
    # find the last account balances cache before date_time
    account_cache = (
        AccountBalanceCache.objects.filter(account=account, date__lte=date_time.date())
        .order_by('date')
        .last()
    )

    if account_cache is None:
        # no account caches before date_time: sum all subtransactions before
        # given date
        sum = 0
        subtransactions = Subtransaction.objects.filter(
            account=account, transaction__date_time__lte=date_time
        )
    else:
        # sum all subtransactions between the last cache and before the
        # given date/time
        sum = account_cache.balance
        subtransactions = Subtransaction.objects.filter(
            account=account,
            transaction__date_time__date__gte=account_cache.date,
            transaction__date_time__lte=date_time,
        )

    for sub in subtransactions:
        sum += sub.amount

    return sum


# The subtransactions_queryset must satisfy the following constraints:
# - the queryset must be ordered in ascending order wrt. the transaction dates
# - the queryset must include all subtransactions in the account in some
#   date/time range.
def get_account_balances_for_subtransactions_range(account, subtransactions_queryset):
    queryset = subtransactions_queryset.prefetch_related('sync_event')
    subtransactions = list(queryset)
    if len(subtransactions) == 0:
        return []
    balance = get_account_balance(account, subtransactions[0].transaction.date_time)
    ret = []
    # get_account_balance already takes into account the first subtransaction
    ret.append((subtransactions[0], balance))

    for sub in subtransactions[1:]:
        balance += sub.amount
        ret.append((sub, balance))
    return ret


def get_account_balances_for_accounts(accounts_queryset):
    accounts = list(accounts_queryset)
    if len(accounts) == 0:
        return []
    ret = []
    for account in accounts:
        balance = get_account_balance(account, datetime.datetime.max)
        ret.append((account, balance))
    return ret


def get_transactions_actions_and_tags(transactions_qs):
    qs = (
        transactions_qs.prefetch_related('subtransactions')
        .prefetch_related('subtransactions__account')
        .prefetch_related('subtransactions__sync_event')
        .prefetch_related('transaction_tags')
        .prefetch_related('transaction_tags__tag')
    )

    if len(qs) == 0:
        return []
    ret = []

    accounts_descs = {b.id: b.name for b in Account.objects.all()}

    for transaction in qs:
        subtransactions_data = []
        sync_event = None

        for sub in transaction.subtransactions.all():
            # don't use first() because prefetching breaks in that case
            sync_event_sub = list(sub.sync_event.all())
            if len(sync_event_sub) > 0:
                sync_event = sync_event_sub[0]

            subtransactions_data.append((
                sub.account.id,
                accounts_descs[sub.account.id],
                '{0:+d}'.format(sub.amount),
            ))

        tag_names = []
        for tr_tag in transaction.transaction_tags.all():
            tag_names.append(tr_tag.tag.name)

        ret.append((transaction, subtransactions_data, tag_names, sync_event))
    return ret


def get_preset_accounts_and_tags(presets_queryset):
    queryset = presets_queryset.prefetch_related('preset_subtransactions').prefetch_related(
        'preset_tags'
    )
    presets = list(queryset)
    if len(presets) == 0:
        return []
    ret = []

    accounts_descs = {b.id: b.name for b in Account.objects.all()}

    for preset in presets:
        preset_sub = preset.preset_subtransactions.all()
        preset_sub_data = []
        for sub in preset_sub:
            preset_sub_data.append((sub.account.id, accounts_descs[sub.account.id], sub.fraction))

        preset_tag_data = []
        for tr_tag in PresetTransactionTag.objects.filter(preset=preset):
            preset_tag_data.append((tr_tag.tag.id, tr_tag.tag.name))

        ret.append((preset, preset_sub_data, preset_tag_data))
    return ret


# Given list of sync events returns first that is not ignore_event, or None
# if there's no such events
def get_first_sync_event_with_ignore(events, ignore_event):
    if len(events) == 0:
        return None
    if ignore_event is not None and ignore_event.id == events[0].id:
        if len(events) == 1:
            return None
        return events[1]
    return events[0]


''' Updates the data in AccountBalanceCache to take into account the change of
    the funds amount in a subtransaction. Positive change means addition of
    funds, negative change means removal.

    One sync event may be ignored if the sync event transaction is itself
    updated.
'''


def update_account_balance_cache_changed_sub(account, date_time, change, ignore_sync_event=None):
    if change == 0:
        return

    # Account sync events force the balance on particular date and time. Thus
    # we only need to update caches until the first balance sync event and then
    # update the sync event itself.
    sync_events = AccountSyncEvent.objects.filter(
        account=account, subtransaction__transaction__date_time__gte=date_time
    )
    sync_events = sync_events.order_by('subtransaction__transaction__date_time')[0:1]

    sync_event = get_first_sync_event_with_ignore(sync_events, ignore_sync_event)
    if sync_event is not None:
        # update the sync event subtransaction to take into account the
        # changed subtransaction
        sync_subtransaction = sync_event.subtransaction
        sync_subtransaction.amount -= change
        sync_subtransaction.save()

        # update all account balance caches up to and including the date of
        # sync_event
        account_caches = AccountBalanceCache.objects.filter(
            account=account,
            date__gt=date_time.date(),
            date__lte=sync_subtransaction.transaction.date_time.date(),
        )
        for cache in account_caches:
            cache.balance += change
            cache.save()
    else:
        # no sync event, so update all subsequent caches
        # update all account balance caches up to the date of sync_event,
        # but not including it
        account_caches = AccountBalanceCache.objects.filter(
            account=account, date__gt=date_time.date()
        )
        for cache in account_caches:
            cache.balance += change
            cache.save()


def add_cache_if_needed(account, date_time):
    next_date = date_time.date() + datetime.timedelta(days=1)
    caches = AccountBalanceCache.objects.filter(account=account, date=next_date)
    if len(caches) > 1:
        raise Exception(
            "The number of caches for account {0} is more than 1 on date {1}".format(
                account.id, next_date
            )
        )
    if len(caches) == 0:
        balance_date_time = datetime.datetime.combine(date_time.date(), datetime.time.max)
        balance = get_account_balance(account, balance_date_time)
        new_cache = AccountBalanceCache(account=account, balance=balance, date=next_date)
        new_cache.save()


def transaction_update_subtransactions(
    transaction, old_date_time, new_date_time, account_amounts, ignore_sync_event=None
):
    '''Updates the database to reflect the account balance differences caused
    by transaction. Subtransactions are created and deleted as needed.
    Subtransactions are created even if the amount for the account is zero.
    If this is not wanted, simply omit the account id from account_amounts.
    '''
    user = transaction.user
    user_accounts = Account.objects.filter(user=user)
    subs = Subtransaction.objects.filter(transaction=transaction)

    for account in user_accounts:
        amount = account_amounts.get(account.id, None)

        if amount is not None:
            existing_sub = subs.filter(account=account).first()
            if existing_sub and new_date_time != old_date_time:
                # we're updating time on an existing subtransaction.
                # delete and recreate the subtransaction
                existing_amount = existing_sub.amount
                existing_sub.amount = 0
                existing_sub.save()
                update_account_balance_cache_changed_sub(
                    account, old_date_time, -existing_amount, ignore_sync_event=ignore_sync_event
                )
                existing_sub.amount = amount
                existing_sub.save()
                update_account_balance_cache_changed_sub(
                    account, new_date_time, amount, ignore_sync_event=ignore_sync_event
                )
                add_cache_if_needed(account, new_date_time)
                continue

            if existing_sub:
                # we're updating amount on an existing subtransaction
                existing_amount = existing_sub.amount
                existing_sub.amount = amount
                existing_sub.save()
                update_account_balance_cache_changed_sub(
                    account,
                    new_date_time,
                    amount - existing_amount,
                    ignore_sync_event=ignore_sync_event,
                )
                continue

            # new subtransaction
            new_sub = Subtransaction(transaction=transaction, account=account, amount=amount)
            new_sub.save()
            update_account_balance_cache_changed_sub(
                account, new_date_time, amount, ignore_sync_event=ignore_sync_event
            )
            add_cache_if_needed(account, new_date_time)
        else:
            total_amount = 0
            for sub in subs.filter(account=account):
                total_amount += sub.amount
                sub.delete()
            update_account_balance_cache_changed_sub(
                account, old_date_time, -total_amount, ignore_sync_event=ignore_sync_event
            )


''' Updates transaction date or amount. The transaction will be saved
    regardless of whether any data has changed.
'''


def transaction_update_date_or_amount(
    transaction, new_date_time, account_amounts, ignore_sync_event=None
):
    old_date_time = transaction.date_time
    transaction.date_time = new_date_time
    transaction.save()

    transaction_update_subtransactions(
        transaction,
        old_date_time,
        new_date_time,
        account_amounts,
        ignore_sync_event=ignore_sync_event,
    )


def update_transaction_tags(transaction, checked_tags):
    user_tags = Tag.objects.filter(user=transaction.user)
    tr_tags = TransactionTag.objects.filter(transaction=transaction)

    for tag in user_tags:
        checked = checked_tags.get(tag.id, False)

        if not checked:
            tr_tags.filter(tag=tag).delete()
            continue

        if len(tr_tags.filter(tag=tag)) > 0:
            continue
        new_ts_tag = TransactionTag(transaction=transaction, tag=tag)
        new_ts_tag.save()


def transaction_delete(transaction):
    transaction_update_subtransactions(
        transaction, transaction.date_time, transaction.date_time, {}
    )
    update_transaction_tags(transaction, {})
    transaction.delete()


def has_sync_event_on_time(account, date_time):
    tr = Transaction.objects.filter(date_time=date_time)
    if len(tr) == 0:
        return False
    events = AccountSyncEvent.objects.filter(
        account=account, subtransaction__transaction__date_time=date_time
    )
    return len(events) > 0


def sync_create(account, date_time, balance):
    if has_sync_event_on_time(account, date_time):
        raise Exception('Trying to create sync event on top of existing event')

    balance_curr = get_account_balance(account, date_time)
    balance_diff = balance - balance_curr

    tr = Transaction(user=account.user)
    tr.date_time = date_time
    transaction_update_date_or_amount(tr, date_time, {account.id: balance_diff})

    # TODO: maybe just return subtransactions from
    # transaction_update_date_or_amount
    sub = Subtransaction.objects.filter(transaction=tr)[0]
    event = AccountSyncEvent(account=account, balance=balance, subtransaction=sub)
    event.save()
    return event


def sync_delete(event):
    account = event.account
    transaction = event.subtransaction.transaction
    event.delete()

    transaction_update_date_or_amount(transaction, transaction.date_time, {})


def sync_update_date_or_amount(event, date_time, balance):
    account = event.account
    sub = event.subtransaction
    tr = sub.transaction

    if date_time != tr.date_time and has_sync_event_on_time(account, date_time):
        raise Exception('Trying to create sync event on top of existing event')
    transaction_update_date_or_amount(tr, date_time, {})
    balance_curr = get_account_balance(account, date_time)
    balance_diff = balance - balance_curr
    transaction_update_date_or_amount(tr, date_time, {account.id: balance_diff})

    sub = Subtransaction.objects.filter(transaction=tr)[0]
    event.subtransaction = sub

    event.save()


def get_aware_from_naive_iso(dt_string, timezone_offset):
    tz = datetime.timezone(datetime.timedelta(minutes=-int(timezone_offset)))
    dt = datetime.datetime.fromisoformat(dt_string)
    aware_dt = make_aware(dt, timezone=tz)
    return aware_dt


def format_return_iso(dt, tz_offset):
    tz = datetime.timezone(datetime.timedelta(minutes=-tz_offset))
    dt_tz = dt.astimezone(tz=tz)
    return re.sub(r'(Z|[+-]\d{1,2}:\d{2})$', '', dt_tz.isoformat())
