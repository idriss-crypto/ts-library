import { fetchSafe } from './utils'

export class TwitterNameResolver {
  async getTwitterID (inputCombination: string): Promise<string> {
    const response = await fetchSafe('https://www.idriss.xyz/v1/getTwitterID?identifier=' + encodeURIComponent(inputCombination))
    if (response.status !== 200) throw new Error('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + await response.text())
    const json: { twitterID: string } = await response.json()
    return json.twitterID
  }

  async reverseTwitterID (id: string): Promise<string> {
    const response = await fetchSafe('https://www.idriss.xyz/v1/getTwitterNames?ids=' + encodeURIComponent(id))
    if (response.status !== 200) throw new Error('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + await response.text())
    const json: { twitterNames: Record<string, string> } = await response.json()
    return json.twitterNames[id]
  }
}
