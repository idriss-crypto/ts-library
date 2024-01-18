import type { WALLET_TAGS } from './constants';

type WalletTag = (typeof WALLET_TAGS)[number];
type WalletTagName = WalletTag['tagName'];
type WalletTagNetwork = WalletTag['network'];
type WalletTagCoin = WalletTag['coin'];

export type ResolveOptions = {
  coin?: WalletTagCoin | null;
  network?: WalletTagNetwork | null;
  walletTag?: WalletTagName | null;
};
