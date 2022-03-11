import {BaseIdrissCrypto} from "./baseIdrissCrypto";

const Web3 = require("web3");
var crypto = require('crypto');

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/") {
        super(new Web3(new Web3.providers.HttpProvider(polygonEndpoint)));
    }

    protected async digestMessage(message: string):Promise<string> {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

}
