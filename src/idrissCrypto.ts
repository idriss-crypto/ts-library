import { BaseIdrissCrypto } from "./baseIdrissCrypto";
import type { ConnectionOptions } from "./types/connectionOptions";
import { createHash } from "crypto";
import { provider } from "web3-core";
import type { Web3Provider } from "./web3Provider";
import { Web3ProviderAdapter } from "./web3Provider";
import Web3 from "web3";
import { ethers } from "ethers";

type IdrissCryptoConnectionOptions = Omit<ConnectionOptions, "web3Provider"> &
  (
    | {
      providerType?: "web3";
      web3Provider?: provider;
    }
    | {
      providerType: "ethersv5";
      web3Provider?: ConstructorParameters<
        typeof ethers.providers.Web3Provider
      >[0];
    }
  );

/**
 * This class is used for NodeJS
 */
export class IdrissCrypto extends BaseIdrissCrypto {
  constructor(
    url: string = "https://polygon-rpc.com/",
    connectionOptions: IdrissCryptoConnectionOptions = {},
  ) {
    let web3Provider: Web3Provider;

    if (connectionOptions.providerType === "ethersv5") {
      const ethersProvider = connectionOptions.web3Provider
        ? new ethers.providers.Web3Provider(connectionOptions.web3Provider)
        : new ethers.providers.JsonRpcProvider(url);
      web3Provider = Web3ProviderAdapter.fromEthersV5(ethersProvider);
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
