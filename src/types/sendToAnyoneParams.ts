import type { NonOptional } from '../utils-types';
import type { ResolveOptions } from '../wallet/types';

import type { AssetLiability } from './assetLiability';

export type SendToAnyoneParams = {
  beneficiary: string;
  hash?: string;
  walletType?: NonOptional<ResolveOptions>;
  asset: AssetLiability;
  message?: string;
};
