import { ResolveOptions } from "../types";
import { WALLET_TAGS } from "./constants";

export const getWalletTag = (walletType: Required<ResolveOptions>) => {
  return WALLET_TAGS[walletType.network!][walletType.coin!][
    walletType.walletTag!.trim()
  ];
};
