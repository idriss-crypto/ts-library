import { BaseIdrissCrypto } from './baseIdrissCrypto'

import { Authorization, CreateOTPResponse, WrongOTPException } from './authorization'
import { AuthorizationTestnet, CreateOTPResponseTestnet, WrongOTPExceptionTestnet } from './authorizationTestnet'
import { type ConnectionOptions } from './types/connectionOptions'

export class IdrissCrypto extends BaseIdrissCrypto {
  constructor (polygonEndpoint: string = 'https://polygon-rpc.com/', connectionOptions: ConnectionOptions = {}) {
    // @ts-expect-error
    const Web3Promise = import('web3/dist/web3.min.js')
    super(BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint, connectionOptions.web3Provider),
      BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint), connectionOptions)
  }

  protected async digestMessage (message: string) {
    const msgUint8 = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8) // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
    return hashHex
  }

  protected async getConnectedAccount (): Promise<string> {
    const ethereum = this.getInjectedEthereum()

    if (typeof ethereum === 'undefined') {
      throw new Error('No wallet detected.')
    }

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    return accounts[0]
  }

  private getInjectedEthereum (): any {
    // casting to any to skip error saying that ethereum does not exist in type window
    return window && (window as any).ethereum
  }
}
export { Authorization, CreateOTPResponse, WrongOTPException, AuthorizationTestnet, CreateOTPResponseTestnet, WrongOTPExceptionTestnet }
