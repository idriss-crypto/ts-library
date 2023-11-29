import { TransactionReceipt } from "web3-core";
import { EstimateGasOptions } from "../contract/types";
/**
 * Those are optional configuration items for transaction that can override defaults
 */
export type TransactionOptions = {
   gas?: number,
   gasPrice?: number,
   from?: string,
   nonce?: number,
   value?: number | string
}

export type PreparedTransaction = {
   send: (transactionOptions: TransactionOptions) => Promise<TransactionReceipt>;
   encodeABI: () => string;
   estimateGas: (options: EstimateGasOptions) => Promise<number>;
}
