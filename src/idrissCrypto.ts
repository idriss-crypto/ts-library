import { BaseIdrissCrypto } from "./baseIdrissCrypto";
import { ConnectionOptions } from "./types/connectionOptions";
import crypto from "crypto";

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
