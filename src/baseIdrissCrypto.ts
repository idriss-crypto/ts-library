import {WebApi} from "./webApi";
import {ResolveOptions} from "./resolveOptions";
import Web3 from "web3";

export abstract class BaseIdrissCrypto {
    private web3;
    private webApi;
    private contract;

    constructor(web3: Web3) {
        this.web3 = web3
        this.webApi = new WebApi()
        this.contract = this.generateContract();
    }

    public async resolve(input: string, options: ResolveOptions = {}): Promise<{ [index: string]: string }> {
        const regPh = /^(\+\(?\d{1,4}\s?)\)?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
        const regM = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const regT = /^@[^\s]+/;

        let twitterID;
        let identifierT;
        let identifier=input;
        identifier = this.lowerFirst(identifier).replace(" ", "");
        if (identifier.match(regPh)) {
            identifier = this.convertPhone(identifier)
        } else if (!identifier.match(regM) && !identifier.match(regT)) {
            throw new Error("Not a valid input. Input must start with valid phone number, email or @twitter handle.")
        }
        if (identifier.match(regT)) {
            identifierT = identifier;
            identifier = await this.webApi.getTwitterID(identifier);
            if (identifier == "Not found")
                throw new Error("Twitter handle not found.")
        }

        let foundMatchesPromises:{ [key: string]: Promise<string>} = {}
        for (let [network, coins] of Object.entries(BaseIdrissCrypto.getWalletTags())) {
            if (options.network && network != options.network) continue;
            for (let [coin, tags] of Object.entries(coins)) {
                if (options.coin && coin != options.coin) continue;
                for (let [tag, tag_key] of Object.entries(tags)) {
                    if (tag_key) {
                        foundMatchesPromises[tag] = this.digestMessage(identifier + tag_key).then(digested => this.callWeb3(digested));
                    }
                }
            }
        }
        ///awaiting on the end for better performance
        let foundMatches:{ [key: string]: string} = {}
        for (let [tag, promise] of Object.entries(foundMatchesPromises)) {
            try {
                let address = await promise;
                if (address) {
                    foundMatches[tag] = address;
                }
            } catch (e) {
                //ommit
            }
        }

        return foundMatches
    }

    private async callWeb3(encrypted: string) {
        return await this.contract.methods.getIDriss(encrypted).call();
    }


    private generateContract() {
        return new this.web3.eth.Contract(
            [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "adminAddress",
                            "type": "address"
                        }
                    ],
                    "name": "addAdmin",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "hashPub",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "hashID",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "address_",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "ownerAddress",
                            "type": "address"
                        }
                    ],
                    "name": "addIDriss",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "hashPub",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "hashID",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "address_",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "token",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "amount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "address",
                            "name": "ownerAddress",
                            "type": "address"
                        }
                    ],
                    "name": "addIDrissToken",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "hashPub",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "changeOwner",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "adminAddress",
                            "type": "address"
                        }
                    ],
                    "name": "deleteAdmin",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "hashPub",
                            "type": "string"
                        }
                    ],
                    "name": "deleteIDriss",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "newPrice",
                            "type": "uint256"
                        }
                    ],
                    "name": "setPrice",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": false,
                            "internalType": "uint256",
                            "name": "value",
                            "type": "uint256"
                        }
                    ],
                    "name": "Increment",
                    "type": "event"
                },
                {
                    "inputs": [],
                    "name": "withdrawl",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "tokenContract",
                            "type": "address"
                        }
                    ],
                    "name": "withdrawTokens",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "countAdding",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "countDeleting",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "creationTime",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "hashPub",
                            "type": "string"
                        }
                    ],
                    "name": "getIDriss",
                    "outputs": [
                        {
                            "internalType": "string",
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "name": "IDrissOwners",
                    "outputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "name": "mapKeys",
                    "outputs": [
                        {
                            "internalType": "string",
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "owner",
                    "outputs": [
                        {
                            "internalType": "address",
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "name": "payDates",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "price",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            , '0x4a85839aEc7ab18496C35115002EB53BE604b24E');
    }
    private static getWalletTags():{ [key: string]: { [key: string]: { [key: string]: string}}}{
        return {
            evm: {
                ETH: {
                    "Metamask ETH": "",
                    "Binance ETH": "",
                    "Coinbase ETH": "",
                    "Exchange ETH": "",
                    "Private ETH": "",
                    "Essentials ETH": "",
                    "Rainbow ETH": "",
                    "Argent ETH": "",
                    "Tally ETH": "f368de8673a59b860b71f54c7ba8ab17f0b9648ad014797e5f8d8fa9f7f1d11a",
                    "Trust ETH": "",
                    "Public ETH": "",
                },
                BNB: {
                    "Metamask BNB": "",
                    "Essentials BNB": "",
                },
                USDT: {
                    "Metamask USDT": "",
                    "Binance USDT": "",
                    "Coinbase USDT": "",
                    "Exchange USDT": "",
                    "Private USDT": "",
                    "Essentials USDT": "",
                },
                USDC: {
                    "Metamask USDC": "",
                    "Binance USDC": "",
                    "Coinbase USDC": "",
                    "Exchange USDC": "",
                    "Private USDC": "",
                    "Essentials USDC": "",
                },
                ELA: {
                    "Essentials ELA SC": "",
                },
                TLOS: {
                    "Essentials TLOS": "",
                },
                MATIC: {
                    "Essentials MATIC": "",
                },
                LINK: {
                    "Essentials LINK": "",
                },
                HT: {
                    "Essentials HT": "",
                },
                FSN: {
                    "Essentials FSN": "",
                },
                FTM: {
                    "Essentials FTM": "",
                },
                AVAX: {
                    "Essentials AVAX": "",
                },
                BTC: {
                    "Essentials BTC": "",
                },
                ERC20: {
                    ERC20: "",
                },
            },
            btc: {
                BTC: {
                    "Binance BTC": "",
                    "Coinbase BTC": "",
                    "Exchange BTC": "",
                    "Private BTC": "",
                },
                ELA: {
                    "Essentials ELA": "",
                },
            },
            sol: {
                SOL: {
                    "Solana SOL": "",
                    "Coinbase SOL": "",
                    "Trust SOL": "",
                    "Binance SOL": "",
                    "Phantom SOL": "",
                },
            },
        };
    }


    private lowerFirst(input:string):string {
        return input.charAt(0).toLowerCase() + input.slice(1);
    }

    private convertPhone(input:string):string {
        // allow for letters because secret word can follow phone number
        return input.replace(/[^\da-zA-Z]/, "")
    }

    protected abstract digestMessage(message:string) :Promise<string>
}
