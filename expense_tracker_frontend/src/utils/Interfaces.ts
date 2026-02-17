import {Dayjs} from "dayjs";

export interface Preset {
  id: number;
  name: string;
  desc: string;
  transaction_desc: string;
  user: string;
  amount: string;
  accounts: AccountElement[];
  tags: TagElement[];
}

export interface AccountElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  isUsed: boolean;
  fraction: number;
  amount: number;
}

export interface PresetSub {
  id: number;
  account: number;
  fraction: number;
  preset: number;
}
export interface TagElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  isChecked: boolean;
}
export interface PresetTransactionTag {
  id: number;
  preset: number;
  tag: number;
}
export interface TransactionImage {
  id: string;
  image: File;
}

export interface TransactionReleventDataApi {
  transactions: Transaction[];
  subtransactions: Subtransaction[];
  transactionTags: TransactionTag[];
  tags: Tag[];
  accounts: Account[];
  syncEvent: SyncEvent[];
}

export interface Transaction {
  id: number;
  desc: string;
  date_time: Dayjs;
  user: string;
  transactionTag: TransactionTag[];
  subtransaction: Subtransaction[];
  syncEvent?: SyncEvent;
  timezone_offset: number;
}
export interface TransactionTag {
  id: number;
  transaction: number;
  tag: number;
  tagElement: Tag;
}
export interface Subtransaction {
  id: number;
  amount: number;
  transaction: string;
  account: string;
  accountElement: Account;
}
export interface Account {
  id: number;
  name: string;
  desc: string;
  user: string;
}
export interface SyncEvent {
  id: number;
  balance: number;
  account: string;
  subtransaction: string;
  accountElement: Account;
}
export interface Tag {
  id: number;
  name: string;
  desc: string;
  user: string;
}
