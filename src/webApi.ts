import fetch from "node-fetch";
export class WebApi {
    async encrypt(inputCombination: string):Promise<EncryptResponse> {
        const response = await fetch(`https://www.idriss-crypto.com//v1/encrypt?InputCombination=${encodeURIComponent(inputCombination)}`)
        if(response.status!=200) throw new Error("Idriss api responded with code "+response.status+" "+response.statusText)
        return await (response.json());
    }
}
interface EncryptResponse {
    result:{[index:string]:string}
}