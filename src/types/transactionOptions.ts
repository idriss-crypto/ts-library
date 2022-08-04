/**
 * Those are optional configuration items for transaction that can override defaults
 */
export type TransactionOptions = {
   gasPrice?: number,
   from?: string,
   nonce?: number,
}