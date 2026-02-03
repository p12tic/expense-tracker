import dayjs, {Dayjs} from "dayjs";

import {AuthAxios} from "../utils/Network";
import {formatDate} from "./Tools";

interface Subtransaction {
  id: number;
  amount: number;
  transaction: string;
  account: string;
  transactionElement: Transaction;
}
interface Transaction {
  id: number;
  desc: string;
  date_time: Dayjs;
  user: string;
  syncEvent: SyncEvent;
}
interface SyncEvent {
  id: number;
  balance: number;
  account: string;
  subtransaction: string;
}

interface AuthToken {
  getToken: () => string;
}

export function getSubtransactionBalances(
  subtransactionBalancesProps: Subtransaction[],
) {
  let sum = 0;
  const subs = subtransactionBalancesProps;
  subs.reverse();
  const sums = subs.map((sub) => {
    sum = sum + sub.amount;
    return sum;
  });
  return sums;
}

export async function getAccountBalance(accountid: number, auth: AuthToken) {
  const balanceRes = await AuthAxios.get(
    `account_balance_cache?account=${accountid}`,
    auth.getToken(),
  );

  let sum: number;
  let lastCacheDate: Dayjs;

  if (balanceRes.data.length > 0) {
    sum = balanceRes.data[balanceRes.data.length - 1].balance;
    lastCacheDate = dayjs(balanceRes.data[balanceRes.data.length - 1].date);
  } else {
    sum = 0;
    lastCacheDate = dayjs(0);
  }

  const subRes = await AuthAxios.get(
    `subtransactions?account=${accountid}&date_gte=${formatDate(lastCacheDate)}`,
    auth.getToken(),
  );
  const subs: Subtransaction[] = subRes.data;

  await Promise.all(
    subs.map(async (sub) => {
      sum = sum + sub.amount;
    }),
  );

  return sum;
}
