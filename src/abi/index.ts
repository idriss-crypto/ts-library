import IDrissTippingAbiJson from "./tipping.json";
import GitcoinVotingAbiJson from "./voting.json";
import IDrissRegistryAbiJson from "./idrissRegistry.json";
import IDrissReverseMappingAbiJson from "./idrissReverseMapping.json";
import IDrissSendToAnyoneAbiJson from "./idrissSendToAnyone.json";
import PriceOracleAbiJson from "./priceOracleV3Aggregator.json";
import IERC20AbiJson from "./ierc20.json";
import IERC721AbiJson from "./ierc721.json";
import IERC1155AbiJson from "./ierc1155.json";

export type Abi = {
  name: string;
  type: "function" | "constructor" | "event" | "fallback";
  inputs?: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
  constant?: boolean;
  payable?: boolean;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
};

export const ABIS = {
  IDrissTippingAbi: IDrissTippingAbiJson as Abi[],
  GitcoinVotingAbi: GitcoinVotingAbiJson as Abi[],
  IDrissRegistryAbi: IDrissRegistryAbiJson as Abi[],
  IDrissReverseMappingAbi: IDrissReverseMappingAbiJson as Abi[],
  IDrissSendToAnyoneAbi: IDrissSendToAnyoneAbiJson as Abi[],
  PriceOracleAbi: PriceOracleAbiJson as Abi[],
  IERC20Abi: IERC20AbiJson as Abi[],
  IERC721Abi: IERC721AbiJson as Abi[],
  IERC1155Abi: IERC1155AbiJson as Abi[],
};
