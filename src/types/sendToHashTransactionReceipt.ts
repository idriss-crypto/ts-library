import {TransactionReceipt} from "web3-core";

export type SendToHashTransactionReceipt = {
    transactionReceipt: TransactionReceipt,
    claimPassword?: string
}

export type MultiSendToHashTransactionReceipt = {
    transactionReceipt: TransactionReceipt,
    data: [ {
        beneficiary?: string,
        claimPassword?: string
    }]
}
