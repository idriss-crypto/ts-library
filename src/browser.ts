import { BaseIdrissCrypto } from "./baseIdrissCrypto";
import { provider } from "web3-core";
import Web3 from "web3";
import { ethers } from "ethers";

export class IdrissCrypto extends BaseIdrissCrypto {
  constructor(
    url: string = "https://polygon-rpc.com/",
    connectionOptions: Omit<ConnectionOptions, "web3Provider"> & {
      web3Provider?: provider | ethers.providers.Web3Provider | Web3;
    } = {},
  ) {
    let web3Provider: Web3Provider;

    if (
      connectionOptions.web3Provider instanceof ethers.providers.Web3Provider
    ) {
      web3Provider = Web3ProviderAdapter.fromEthersV5(
        connectionOptions.web3Provider,
      );
    } else if (connectionOptions.web3Provider instanceof Web3) {
      web3Provider = Web3ProviderAdapter.fromWeb3(
        connectionOptions.web3Provider,
      );
    } else {
      web3Provider = Web3ProviderAdapter.fromWeb3(
        new Web3(
          connectionOptions.web3Provider ??
          new Web3.providers.HttpProvider(url),
        ),
      );
    }

    super(url, { ...connectionOptions, web3Provider });
  }

  protected async digestMessage(message: string) {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // convert bytes to hex string
    return hashHex;
  }

  protected async getConnectedAccount(): Promise<string> {
    const ethereum = this.getInjectedEthereum();

    if (typeof ethereum === "undefined") {
      throw new Error("No wallet detected.");
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    return accounts[0];
  }

  private getInjectedEthereum(): any {
    // casting to any to skip error saying that ethereum does not exist in type window
    return window && (window as any).ethereum;
  }
}

import {
  Authorization,
  CreateOTPResponse,
  WrongOTPException,
} from "./auth/authorization";
import {
  AuthorizationTestnet,
  CreateOTPResponseTestnet,
  WrongOTPExceptionTestnet,
} from "./auth/authorizationTestnet";
import { ConnectionOptions } from "./types/connectionOptions";
import { Web3Provider, Web3ProviderAdapter } from "./web3Provider";
export {
  Authorization,
  CreateOTPResponse,
  WrongOTPException,
  AuthorizationTestnet,
  CreateOTPResponseTestnet,
  WrongOTPExceptionTestnet,
};
