import { fetchSafe } from './utils'

export class AuthorizationTestnet {
  static async CreateOTP (tag: string, identifier: string, address: string, secretWord: string | null = null): Promise<CreateOTPResponseTestnet> {
    const url = 'https://www.idriss.xyz/v1/createOTP/testnet'
    const searchParams = []
    searchParams.push(['tag', tag])
    searchParams.push(['identifier', identifier])
    searchParams.push(['address', address])
    if (secretWord != null) { searchParams.push(['secretWord', secretWord]) }
    const response = await fetchSafe(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'))
    if (response.status != 200) {
      const responseText = await response.text()
      let message
      try {
        message = JSON.parse(responseText).message
      } catch (ex) {
        message = responseText
      }
      throw new Error('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + message)
    }
    const decodedResponse = await (response.json())
    return new CreateOTPResponseTestnet(decodedResponse.network, decodedResponse.session_key, decodedResponse.tries_left, decodedResponse.address, decodedResponse.hash, decodedResponse.message, decodedResponse.next_step, decodedResponse.twitter_id, decodedResponse.twitter_msg)
  }

  static async ValidateOTP (OTP: string, sessionKey: string): Promise<ValidateOTPResponseTestnet> {
    const url = 'https://www.idriss.xyz/v1/validateOTP/testnet'
    const searchParams = []
    searchParams.push(['OTP', OTP])
    searchParams.push(['session_key', sessionKey])
    const response = await fetchSafe(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'), {
      method: 'POST'
    })
    if (response.status != 200) {
      const responseText = await response.text()
      let message
      try {
        message = JSON.parse(responseText).message
      } catch (ex) {
        message = responseText
      }
      if (message == 'Validation failed') { throw new WrongOTPExceptionTestnet('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + message) } else { throw new Error('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + message) }
    }
    const decodedResponse = await (response.json())
    return new ValidateOTPResponseTestnet(decodedResponse.message, decodedResponse.session_key, decodedResponse.priceMATIC, decodedResponse.priceETH, decodedResponse.priceBNB, decodedResponse.receiptID, decodedResponse.gas, decodedResponse.network)
  }

  static async CheckPayment (token: string, sessionKey: string): Promise<CheckPaymentResponseTestnet> {
    const url = 'https://www.idriss.xyz/v1/checkPayment/testnet'
    const searchParams = []
    searchParams.push(['token', token])
    searchParams.push(['session_key', sessionKey])
    const response = await fetchSafe(url + '?' + searchParams.map(x => encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1])).join('&'), {
      method: 'GET'
    })
    if (response.status != 200) {
      const responseText = await response.text()
      let message
      try {
        message = JSON.parse(responseText).message
      } catch (ex) {
        message = responseText
      }
      throw new Error('IDriss api responded with code ' + response.status + ' ' + response.statusText + '\r\n' + message)
    }
    const decodedResponse = await (response.json())
    return new CheckPaymentResponseTestnet(decodedResponse.network, decodedResponse.message, decodedResponse.txn_hash, decodedResponse.session_key, decodedResponse.referralLink)
  }
}

export class CreateOTPResponseTestnet {
  public network: string
  public sessionKey: string
  public triesLeft: number
  public address: string
  public hash: string
  public message: string
  public nextStep: string
  public twitterId: string
  public twitterMsg: string

  constructor (network: string, sessionKey: string, triesLeft: number, address: string, hash: string, message: string, nextStep: string, twitterId: string, twitterMsg: string) {
    this.network = network
    this.sessionKey = sessionKey
    this.triesLeft = triesLeft
    this.address = address
    this.hash = hash
    this.message = message
    this.nextStep = nextStep
    this.twitterId = twitterId
    this.twitterMsg = twitterMsg
  }
}

export class ValidateOTPResponseTestnet {
  public message: string
  public session_key: string
  public priceMATIC: number
  public priceETH: number
  public priceBNB: number
  public receiptID: string
  public gas: number
  public network: string

  constructor (message: string, session_key: string, priceMATIC: number, priceETH: number, priceBNB: number, receiptID: string, gas: number, network: string) {
    this.message = message
    this.session_key = session_key
    this.priceMATIC = priceMATIC
    this.priceETH = priceETH
    this.priceBNB = priceBNB
    this.receiptID = receiptID
    this.gas = gas
    this.network = network
  }
}

export class CheckPaymentResponseTestnet {
  public network: string
  public message: string
  public txnHash: string
  public sessionKey: string
  public referralLink: string

  constructor (network: string, message: string, txnHash: string, sessionKey: string, referralLink: string) {
    this.network = network
    this.message = message
    this.txnHash = txnHash
    this.sessionKey = sessionKey
    this.referralLink = referralLink
  }
}

export class WrongOTPExceptionTestnet extends Error {
  constructor (message: string) {
    super(message)
  }
}
