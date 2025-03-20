import {Dayjs} from "dayjs";

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

export function getSubtransactionBalances(subtransactionBalancesProps: Subtransaction[]) {
    let sum = 0;
    let subs = subtransactionBalancesProps;
    subs.reverse();
    const sums = subs.map((sub) => {
        sum = sum + sub.amount;
        return sum;
    });
    return sums;
}