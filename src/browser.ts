import {BaseIdrissCrypto} from "./baseIdrissCrypto";

export class IdrissCrypto extends BaseIdrissCrypto {
    constructor(polygonEndpoint: string = "https://polygon-rpc.com/", connectionOptions: ConnectionOptions = {}) {
        // @ts-ignore
        const Web3Promise = import("web3/dist/web3.min.js")
        super(Web3Promise
            .then(x=>x.default)
            .then(Web3=>new Web3(
                // first check if there is a provider passed in the request,
                // then check if ethereum is injected to the browser
                // otherwise use read-only HttpProvider
                connectionOptions.web3Provider
                ?? new Web3.providers.HttpProvider(polygonEndpoint)
                ?? this.getInjectedEthereum()
        )), connectionOptions);
    }

    protected async digestMessage(message:string) {
        const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
        return hashHex;
    }

    protected async getConnectedAccount(): Promise<string> {
        const ethereum = this.getInjectedEthereum()

        if (typeof ethereum === 'undefined') {
            throw new Error('No wallet detected.');
        }

        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    }

    private getInjectedEthereum(): any {
        // casting to any to skip error saying that ethereum does not exist in type window
        return window && (window as any).ethereum
    }
}


import {Authorization, CreateOTPResponse, WrongOTPException} from "./authorization"
import {AuthorizationTestnet, CreateOTPResponseTestnet, WrongOTPExceptionTestnet} from "./authorizationTestnet"
import { ConnectionOptions } from "./types/connectionOptions";
export {Authorization, CreateOTPResponse, WrongOTPException, AuthorizationTestnet, CreateOTPResponseTestnet, WrongOTPExceptionTestnet};