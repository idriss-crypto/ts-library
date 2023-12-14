import type { TransactionReceipt } from "web3-core/types";
import type {
  PreparedTransaction,
  TransactionOptions,
} from "../types/transactionOptions";

type ContractMethodProps = {
  name: string;
  args: any[];
};

type ContractFnCommonProps = {
  method: ContractMethodProps;
};

export type EstimateGasOptions = {
  from: string;
  value?: string;
};

type EstimateGasProps = ContractFnCommonProps & {
  estimateGasOptions: EstimateGasOptions;
};

type SendTransactionProps = ContractFnCommonProps & {
  transactionOptions: TransactionOptions;
};

// generic Contract interface which calls the contract via web3 provider api
export type Contract = {
  encodeABI: (props: ContractFnCommonProps) => string;
  callMethod: (props: ContractFnCommonProps) => Promise<any>; // TODO: find a way to type it
  estimateGas: (props: EstimateGasProps) => Promise<any>;
  sendTransaction: (props: SendTransactionProps) => Promise<TransactionReceipt>;
  prepareTransaction: (
    props: ContractFnCommonProps,
  ) => Promise<PreparedTransaction>;
};
