import { BaseIdrissCrypto } from './baseIdrissCrypto'
import { type ConnectionOptions } from './types/connectionOptions'
import * as crypto from 'crypto'

/**
 * This class is used for NodeJS
 */
export class IdrissCrypto extends BaseIdrissCrypto {
  constructor (polygonEndpoint: string = 'https://polygon-rpc.com/', connectionOptions: ConnectionOptions = {}) {
    const Web3Promise = import('web3')
    super(BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint, connectionOptions.web3Provider),
      BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint), connectionOptions)
  }

  protected async digestMessage (message: string): Promise<string> {
    return await crypto.createHash('sha256').update(message).digest('hex')
  }

  protected async getConnectedAccount (): Promise<string> {
    return await this.web3Promise
      .then(async web3 => { return await web3.eth.getAccounts() })
      .then(acc => { return acc[0] })
  }
}
