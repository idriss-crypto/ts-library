import {BaseIdrissCrypto} from "./baseIdrissCrypto";
import { ConnectionOptions } from "./types/connectionOptions";
let crypto = require('crypto');

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/", connectionOptions: ConnectionOptions = {}) {
        const Web3Promise = import("web3");
        super(BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint, connectionOptions.web3Provider),
            BaseIdrissCrypto.generateWeb3(Web3Promise, polygonEndpoint), connectionOptions);
        }

    protected async digestMessage(message: string):Promise<string> {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    protected async getConnectedAccount(): Promise<string> {
        return this.web3Promise
            .then(web3 => {return web3.eth.getAccounts()})
            .then(acc => {return acc[0]})
    }
}
