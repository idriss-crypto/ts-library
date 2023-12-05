import { AssetLiability } from "./assetLiability";
import { NonOptional } from "../utils-types";
import { ResolveOptions } from "../wallet";

export type SendToAnyoneParams = {
   beneficiary: string;
   hash?: string;
   walletType?: NonOptional<ResolveOptions>;
   asset: AssetLiability;
   message?: string;
};
