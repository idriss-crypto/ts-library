import type { AssetLiability } from "./assetLiability";

export type VotingParams = {
  encodedVote: string;
  roundContractAddress: string;
  asset: AssetLiability;
};
