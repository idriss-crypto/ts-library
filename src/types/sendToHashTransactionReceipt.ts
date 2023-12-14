import type { TransactionReceipt } from "web3-core/types";

export type SendToHashTransactionReceipt = {
    transactionReceipt: TransactionReceipt;
    claimPassword?: string;
};

export type MultiSendToHashTransactionReceipt = {
    transactionReceipt: TransactionReceipt;
    data: {
        beneficiary?: string;
        claimPassword?: string;
    }[];
};
