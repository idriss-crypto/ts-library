import { type ResolveOptions } from './resolveOptions'
import { type AssetLiability } from './assetLiability'

export type SendToAnyoneParams = {
  beneficiary: string
  hash?: string
  walletType?: Required<ResolveOptions>
  asset: AssetLiability
  message?: string
}
