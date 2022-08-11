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
