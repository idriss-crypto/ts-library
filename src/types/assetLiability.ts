import type { BigNumberish } from '@ethersproject/bignumber';

import type { AssetType } from './assetType';

export type AssetLiability = {
  amount: BigNumberish;
  type: AssetType;
  assetContractAddress?: string | null;
  assetId?: string | null;
};
