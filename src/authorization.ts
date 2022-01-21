import fetch from "node-fetch";

export class Authorization {
    static async CreateOTP(tag: string, identifier: string, address: string, secretWord: string | null = null): Promise<CreateOTPResponse> {
        const url = "https://www.idriss-crypto.com/v1/createOTP";
        const searchParams = [];
        searchParams.push(["tag", tag]);
        searchParams.push(["identifier", identifier]);
        searchParams.push(["address", address]);
        if (secretWord != null)
            searchParams.push(["secretWord", secretWord]);
        const response = await fetch(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'))
        if (response.status != 200) {
            const responseText = await response.text();
            let message;
            try {
                message = JSON.parse(responseText).message;
            } catch (ex) {
                message = responseText;
            }
            throw new Error("Idriss api responded with code " + response.status + " " + response.statusText + "\r\n" + message);
        }
        const decodedResponse = await (response.json());
        return new CreateOTPResponse(decodedResponse.session_key, decodedResponse.tries_left);
    }

    static async ValidateOTP(OTP: string, sessionKey: string): Promise<ValidateOTPResponse> {
        const url = "https://www.idriss-crypto.com/v1/validateOTP";
        const searchParams = [];
        searchParams.push(["OTP", OTP]);
        searchParams.push(["session_key", sessionKey]);
        const response = await fetch(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'))
        if (response.status != 200) {
            const responseText = await response.text();
            let message;
            try {
                message = JSON.parse(responseText).message;
            } catch (ex) {
                message = responseText;
            }
            if (message == "Wrong OTP.")
                throw new WrongOTPException("Idriss api responded with code " + response.status + " " + response.statusText + "\r\n" + message);
            throw new Error("Idriss api responded with code " + response.status + " " + response.statusText + "\r\n" + message);
        }
        const decodedResponse = await (response.json());
        return new ValidateOTPResponse(decodedResponse.message, decodedResponse.txn_hash);
    }
}

export class CreateOTPResponse {
    public sessionKey: string;
    public triesLeft: number;

    constructor(sessionKey: string, triesLeft: number) {
        this.sessionKey = sessionKey;
        this.triesLeft = triesLeft;
    }
}

export class ValidateOTPResponse {
    public message: string;
    public txnHash: string;

    constructor(message: string, txnHash: string) {
        this.message = message;
        this.txnHash = txnHash;
    }
}

export class WrongOTPException extends Error {
    constructor(message: string) {
        super(message);
    }
}