import { Web3Provider } from "../web3Provider";

type CommonConnectionOptions = {
   // overriding contract addresses is added as a helper for testing purposes. It should not be changed in other cases
   sendToAnyoneContractAddress?: string;
   tippingContractAddress?: string;
   votingContractAddress?: string;
   idrissRegistryContractAddress?: string;
   idrissMultipleRegistryContractAddress?: string;
   reverseIDrissMappingContractAddress?: string;
   priceOracleContractAddress?: string;
};

/**
 * Those are optional configuration items that can be passed to IDrissCrypto
 */
export type ConnectionOptions = CommonConnectionOptions & {
   web3Provider: Web3Provider;
};
