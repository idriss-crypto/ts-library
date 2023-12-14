import { BaseIdrissCrypto } from "./baseIdrissCrypto";
import type { ConnectionOptions } from "./types/connectionOptions";
import { createHash } from "crypto";
import { provider } from "web3-core";
import type { Web3Provider } from "./web3Provider";
import { Web3ProviderAdapter } from "./web3Provider";
import Web3 from "web3";
import { ethers } from "ethers";

/**
 * This class is used for NodeJS
 */
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

  protected async digestMessage(message: string): Promise<string> {
    return createHash("sha256").update(message).digest("hex");
  }

  protected async getConnectedAccount(): Promise<string> {
    return this.web3Provider.getConnectedAccount();
  }
}
