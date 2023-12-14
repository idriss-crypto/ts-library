import type { AssetLiability } from "./assetLiability";
import type { NonOptional } from "../utils-types";
import type { ResolveOptions } from "../wallet/types";

export type SendToAnyoneParams = {
   beneficiary: string;
   hash?: string;
   walletType?: NonOptional<ResolveOptions>;
   asset: AssetLiability;
   message?: string;
};
