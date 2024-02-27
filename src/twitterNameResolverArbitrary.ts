import {fetchSafe} from "../lib/utils";
import { object, string } from "zod";

const TwitterResponseSchema = object({
    data: object({
        id: string(),
        name: string(),
        username: string(),
    })
});

const callTwitterApi = async (url: string, BEARER_TOKEN: string) => {
    if (!BEARER_TOKEN) throw new Error(`Please provide API Token (Bearer Token) for Twitter.`)
    const response = await fetchSafe(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }
    return response.json();
}

export class TwitterNameResolverArbitrary {
    protected TWITTER_BEARER_TOKEN: null | string = null;

    constructor(twitterApiKey: string | null) {
        this.TWITTER_BEARER_TOKEN = twitterApiKey;
    }

    async getTwitterID(inputCombination: string): Promise<string> {
        const json = await callTwitterApi(`https://api.twitter.com/2/users/by/username/${inputCombination}`, this.TWITTER_BEARER_TOKEN as string);
        const validatedData = TwitterResponseSchema.parse(json);
        return validatedData?.data?.id as string;
    }

    async reverseTwitterID(id: string): Promise<string> {
        const json = await callTwitterApi(`https://api.twitter.com/2/users/${id}`, this.TWITTER_BEARER_TOKEN as string);
        const validatedData = TwitterResponseSchema.parse(json);
        return validatedData?.data?.username as string;
    }

}
