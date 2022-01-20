import {WebApi} from "./webApi";
import {ResolveOptions} from "./resolveOptions";
import {BaseIdrissCrypto} from "./BaseIdrissCrypto";

const Web3 = require("web3");

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/") {
        super(new Web3(new Web3.providers.HttpProvider(polygonEndpoint)));
    }
}
