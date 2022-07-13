import {BaseIdrissCrypto} from "./baseIdrissCrypto";


var crypto = require('crypto');

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/") {
        const Web3Promise = import("web3");
        super(Web3Promise.then(x=>x.default).then(Web3=>new Web3(new Web3.providers.HttpProvider(polygonEndpoint))));
    }

    protected async digestMessage(message: string):Promise<string> {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

}
