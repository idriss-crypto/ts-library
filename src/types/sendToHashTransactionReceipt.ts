import {TransactionReceipt} from "web3-core";

export type SendToHashTransactionReceipt = {
    transactionReceipt: TransactionReceipt,
    claimPassword?: string
}