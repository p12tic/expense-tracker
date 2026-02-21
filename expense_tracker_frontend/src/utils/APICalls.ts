import dayjs from "dayjs";

import {AuthData} from "./AuthData";
import type {
  Account,
  AccountElement,
  Preset,
  PresetSub,
  PresetTransactionTag,
  Subtransaction,
  SyncEvent,
  Tag,
  TagElement,
  TransactionReleventDataApi,
  TransactionTag,
} from "./Interfaces";
import {AuthAxios} from "./Network";

export const fetchAccounts = async (authToken: string) => {
  return await AuthAxios.get("accounts", authToken).then(async (res) => {
    res.data.map(async (acc: AccountElement) => {
      acc.amount = 0;
      acc.isUsed = false;
      acc.fraction = 0;
    });
    return res.data;
  });
};

export const fetchTags = async (authToken: string) => {
  return await AuthAxios.get("tags", authToken).then((res) => {
    res.data.map((tag: TagElement) => (tag.isChecked = false));
    return res.data;
  });
};

export const fetchPresets = async (authToken: string) => {
  const presets: Preset[] = await AuthAxios.get("presets", authToken).then(
    (res) => res.data,
  );
  const tags: TagElement[] = await fetchTags(authToken);
  const accounts: AccountElement[] = await fetchAccounts(authToken);
  presets.map(async (preset) => {
    const presetSubs: PresetSub[] = await AuthAxios.get(
      `preset_subtransactions?preset=${preset.id}`,
      authToken,
    ).then((res) => res.data);
    preset.accounts = accounts.map((acc) => {
      const presetSub = presetSubs.find(
        (presetSub) => presetSub.account === acc.id,
      );
      if (presetSub !== undefined) {
        return {...acc, fraction: presetSub.fraction, isUsed: true};
      } else {
        return {...acc};
      }
    });
    const presetTags: PresetTransactionTag[] = await AuthAxios.get(
      `preset_transaction_tags?preset=${preset.id}`,
      authToken,
    ).then((res) => res.data);
    preset.tags = tags.map((tag) => {
      if (presetTags.some((presetTag) => presetTag.tag === tag.id)) {
        return {...tag, isChecked: true};
      } else {
        return {...tag};
      }
    });
    preset.amount = "0";
  });
  return presets;
};

export async function getStructuredTransactionData(
  auth: AuthData,
  limit: number,
  offset: number,
  tagid?: number,
  accountid?: number,
) {
  const params: Record<string, number> = {
    limit,
    offset,
  };
  if (tagid !== undefined) params.tagid = tagid;
  if (accountid !== undefined) params.accountid = accountid;

  const data: TransactionReleventDataApi = (
    await AuthAxios.get("transactions_and_relevent_data", auth.getToken(), {
      params,
    })
  ).data;

  const accountMap = new Map<number, Account>();
  const subByTransaction = new Map<number, Subtransaction[]>();
  const tagByTransaction = new Map<number, TransactionTag[]>();
  const tagMap = new Map<number, Tag>();
  const syncByTransaction = new Map<number, SyncEvent>();

  data.tags.forEach((tag) => tagMap.set(tag.id, tag));
  data.accounts.forEach((acc) => accountMap.set(acc.id, acc));

  data.subtransactions.forEach((sub) => {
    if (!subByTransaction.has(Number(sub.transaction))) {
      subByTransaction.set(Number(sub.transaction), []);
    }
    sub.accountElement = accountMap.get(Number(sub.account))!;
    subByTransaction.get(Number(sub.transaction))!.push(sub);
  });

  data.transactionTags.forEach((tt) => {
    if (!tagByTransaction.has(tt.transaction)) {
      tagByTransaction.set(tt.transaction, []);
    }
    tt.tagElement = tagMap.get(tt.tag)!;
    tagByTransaction.get(tt.transaction)!.push(tt);
  });

  data.syncEvent.forEach((sync) => {
    sync.accountElement = accountMap.get(Number(sync.account))!;
    syncByTransaction.set(Number(sync.subtransaction), sync);
  });

  return data.transactions.map((curTransaction) => {
    const subtransactions = subByTransaction.get(curTransaction.id) || [];
    return {
      ...curTransaction,
      date_time: dayjs(curTransaction.date_time),
      subtransaction: subtransactions,
      transactionTag: tagByTransaction.get(curTransaction.id) || [],
      syncEvent:
        subtransactions.length > 0
          ? (syncByTransaction.get(subtransactions[0].id) ?? undefined)
          : undefined,
    };
  });
}
