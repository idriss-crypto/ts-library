import {WebApi} from "./webApi";
import {ResolveOptions} from "./resolveOptions";

const Web3 = require("web3");

export class IdrissCrypto {
    private web3;
    private webApi;
    private contract;

    constructor(ethEndpoint: string = "https://bsc-dataseed.binance.org/") {
        this.web3 = new Web3(new Web3.providers.HttpProvider(ethEndpoint));
        this.webApi = new WebApi()
        this.contract = this.generateContract();
    }

    public async resolve(input: string, options:ResolveOptions = {}): Promise<{ [index: string]: string }> {
        const apiResponse = await this.webApi.encrypt(input, options);
        let web3Requests = await Promise.all(Object.entries(apiResponse.result).map(async ([key, value]) => [key, await this.callWeb3(value)]));
        return Object.fromEntries(web3Requests.filter(([key, value]) => value))
    }

    private async callWeb3(encrypted: string) {
        return await this.contract.methods.Idriss(encrypted).call();
    }

    private generateContract() {
        return new this.web3.eth.Contract([{
            "anonymous": false,
            "inputs": [{"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}],
            "name": "Increment",
            "type": "event"
        }, {
            "inputs": [{"internalType": "string", "name": "", "type": "string"}],
            "name": "Idriss",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "string", "name": "hash", "type": "string"}, {
                "internalType": "string",
                "name": "id",
                "type": "string"
            }], "name": "addIdriss", "outputs": [], "stateMutability": "payable", "type": "function"
        }, {
            "inputs": [],
            "name": "countAdding",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "countDeleting",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "creationTime",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "string", "name": "hash", "type": "string"}],
            "name": "deleteIdriss",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "name": "mapKeys",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "minimumAdding",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "noPriceTime",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "owner",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [],
            "name": "price",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }, {
            "inputs": [{"internalType": "uint256", "name": "newPrice", "type": "uint256"}],
            "name": "setPrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "withdrawl",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }], '0xab39e7c21b4a1d0f56a59699f0196d59efd739a5');
    }
}
