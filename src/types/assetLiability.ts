import { type AssetType } from './assetType'
import { type BigNumberish } from 'ethers'

export type AssetLiability = {
  amount: BigNumberish
  type: AssetType
  assetContractAddress?: string | null
  assetId?: string | null
}
