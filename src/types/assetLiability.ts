import { AssetType } from "./assetType"

export type AssetLiability = {
   amount: number,
   type: AssetType,
   assetContractAddress?: string | null,
   assetId?: string | null
}