import { Web3Provider } from "../web3Provider";

/**
 * Those are optional configuration items that can be passed to IDrissCrypto
 */
export type ConnectionOptions = {
  web3Provider: Web3Provider;
  // overriding contract addresses is added as a helper for testing purposes. It should not be changed in other cases
  sendToAnyoneContractAddress?: string;
  tippingContractAddress?: string;
  votingContractAddress?: string;
  idrissRegistryContractAddress?: string;
  idrissMultipleRegistryContractAddress?: string;
  reverseIDrissMappingContractAddress?: string;
  priceOracleContractAddress?: string;
};
