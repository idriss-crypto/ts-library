import fetch from "node-fetch";
import {ResolveOptions} from "./resolveOptions";
import {URL} from "url";


export class WebApi {
    async encrypt(inputCombination: string, options: ResolveOptions = {}): Promise<EncryptResponse> {
        const url = new URL("https://www.idriss-crypto.com//v1/encrypt");
        url.searchParams.append("InputCombination", inputCombination);
        if (options.coin != null)
            url.searchParams.append("coin", options.coin);
        if (options.network != null)
            url.searchParams.append("network", options.network);
        const response = await fetch(url)
        if (response.status != 200) throw new Error("Idriss api responded with code " + response.status + " " + response.statusText + "\r\n" + await response.text())
        return await (response.json());
    }
}

interface EncryptResponse {
    result: { [index: string]: string }
}