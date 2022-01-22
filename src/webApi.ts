import fetch from "node-fetch";
import {ResolveOptions} from "./resolveOptions";

export class WebApi {
    async encrypt(inputCombination: string, options: ResolveOptions = {}): Promise<EncryptResponse> {
        const url = "https://www.idriss-crypto.com//v1/encrypt";
        const searchParams = [];
        searchParams.push(["InputCombination", inputCombination]);
        if (options.coin != null)
            searchParams.push(["coin", options.coin]);
        if (options.network != null)
            searchParams.push(["network", options.network]);
        const response = await fetch(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'))
        if (response.status != 200) throw new Error("Idriss api responded with code " + response.status + " " + response.statusText + "\r\n" + await response.text())
        return await (response.json()) as EncryptResponse;
    }
}

interface EncryptResponse {
    result: { [index: string]: string }
}