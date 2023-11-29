import { ethers } from "ethers";
import Web3 from "web3";
import { BaseIdrissCrypto } from "./baseIdrissCrypto";
import { ConnectionOptions } from "./types/connectionOptions";
import { Web3ProviderAdapter } from "./web3Provider";
let crypto = require("crypto");

/**
 * This class is used for NodeJS
 */
export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(connectionOptions: ConnectionOptions) {
        super(connectionOptions);
    }

    protected async digestMessage(message: string): Promise<string> {
        return crypto.createHash("sha256").update(message).digest("hex");
    }

    protected async getConnectedAccount(): Promise<string> {
        return this.web3Provider.getConnectedAccount();
    }
}

// const httpProvider = new Web3.providers.HttpProvider(
//     "https://polygon-rpc.com/",
// );
// const provider = new Web3(httpProvider);

const ethersProvider = new ethers.providers.JsonRpcProvider({
    url: "https://polygon-rpc.com/",
});
const provider = Web3ProviderAdapter.fromEthers(ethersProvider);

new IdrissCrypto({ web3Provider: provider });
