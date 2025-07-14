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
