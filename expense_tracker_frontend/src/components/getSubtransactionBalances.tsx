import {AxiosResponse} from "axios";
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
  syncEvent?: SyncEvent;
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
  subtransactions: Subtransaction[],
  fullBalance: number,
) {
  let sum = fullBalance;
  subtransactions.forEach((subtransaction) => {
    sum -= subtransaction.amount;
  });
  return sum;
}

function getBalancesSumAndLastCacheDate(balanceRes: AxiosResponse) {
  if (balanceRes.data.length > 0) {
    return [
      balanceRes.data[balanceRes.data.length - 1].balance,
      dayjs(balanceRes.data[balanceRes.data.length - 1].date),
    ];
  } else {
    return [0, dayjs(0)];
  }
}

export async function getAccountBalance(accountid: number, auth: AuthToken) {
  const balanceRes = await AuthAxios.get(
    `account_balance_cache?account=${accountid}`,
    auth.getToken(),
  );

  const [cacheValue, lastCacheDate] =
    getBalancesSumAndLastCacheDate(balanceRes);

  const subRes = await AuthAxios.get(
    `subtransactions?account=${accountid}&date_gte=${formatDate(lastCacheDate)}`,
    auth.getToken(),
  );

  return subRes.data.reduce(
    (total: number, sub: Subtransaction) => total + sub.amount,
    cacheValue,
  );
}
