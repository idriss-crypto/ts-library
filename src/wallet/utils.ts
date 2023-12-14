import type { ResolveOptions } from "./types";
import { WALLET_TAGS } from "./constants";
import type { NonOptional } from "../utils-types";

export const filterWalletTags = ({
  coin,
  network,
  walletTag,
}: ResolveOptions) => {
  return WALLET_TAGS.filter((tag) => {
    if (coin && tag.coin !== coin) {
      return false;
    }

    if (network && tag.network !== network) {
      return false;
    }

    if (walletTag && tag.tagName !== walletTag) {
      return false;
    }

    return true;
  });
};

export const getWalletTagAddress = (options: NonOptional<ResolveOptions>) => {
  const foundWalletTags = filterWalletTags(options);
  if (foundWalletTags.length > 1) {
    throw new Error("Expected single wallet tag, found more.");
  }

  return foundWalletTags[0].tagAddress;
};
