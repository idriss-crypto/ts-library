import { AssetType } from "./assetType"
import {BigNumberish} from "ethers";

export type AssetLiability = {
   amount: BigNumberish,
   type: AssetType,
   assetContractAddress?: string | null,
   assetId?: string | null
}