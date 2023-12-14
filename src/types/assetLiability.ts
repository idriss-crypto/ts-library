import type { AssetType } from "./assetType";
import type { BigNumberish } from "@ethersproject/bignumber";

export type AssetLiability = {
  amount: BigNumberish;
  type: AssetType;
  assetContractAddress?: string | null;
  assetId?: string | null;
};
