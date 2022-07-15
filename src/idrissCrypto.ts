import {BaseIdrissCrypto} from "./baseIdrissCrypto";
import { ConnectionOptions } from "./types/connectionOptions";


var crypto = require('crypto');

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/", connectionOptions: ConnectionOptions = {}) {
        const Web3Promise = import("web3");
        super(Web3Promise
            .then(x=>x.default)
            .then(Web3=>new Web3(
                connectionOptions.web3Provider ?? new Web3.providers.HttpProvider(polygonEndpoint)
        )));
        }

    protected async digestMessage(message: string):Promise<string> {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    protected async getConnectedAccount(): Promise<string> {
        throw new Error("Method not implemented.");
    }
}
