import {provider} from 'web3-core'

/**
 * Those are optional configuration items that can be passed to IDrissCrypto
 */
export type ConnectionOptions = {
   //overrides default HttpWeb3Provider, which only supports calling blockchain, and not sending transactions to modify it
   web3Provider?: provider,
   // overriding contract addresses is added as a helper for testing purposes. It should not be changed in other cases
   sendToAnyoneContractAddress?: string,
   tippingContractAddress?: string,
   idrissRegistryContractAddress?: string,
   reverseIDrissMappingContractAddress?: string,
   priceOracleContractAddress?: string,
}