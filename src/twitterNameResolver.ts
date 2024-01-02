import {fetchSafe} from "./utils";

const callTwitterApi = async (url: string, BEARER_TOKEN: string) => {
    const response = await fetchSafe(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
}

export class TwitterNameResolver {
    protected TWITTER_BEARER_TOKEN = "";

    constructor(twitterApiKey: string) {
        this.TWITTER_BEARER_TOKEN = twitterApiKey;
    }

    async getTwitterID(inputCombination: string): Promise<string> {
        const json = await callTwitterApi(`https://api.twitter.com/2/users/by/username/${inputCombination}`, this.TWITTER_BEARER_TOKEN);
        return json?.data?.id;
    }

    async reverseTwitterID(id: string): Promise<string> {
        const json = await callTwitterApi(`https://api.twitter.com/2/users/${id}`, this.TWITTER_BEARER_TOKEN);
        return json?.data?.username;
    }
}