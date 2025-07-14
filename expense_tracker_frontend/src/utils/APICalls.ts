import {AuthAxios} from "./Network";
import type {
  AccountElement,
  Preset,
  PresetSub,
  PresetTransactionTag,
  TagElement,
} from "./Interfaces";

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
