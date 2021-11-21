It's a node.js library, that uses [Idriss-crypto](https://www.idriss-crypto.com/) to translate e-mail addresses and phone numbers to cryptocurrency wallet addresses.

## Sample usage
from cli
```bash
npm install idriss-crypto
```

And in code

```javascript
import {IdrissCrypto} from "idriss-crypto";
//or when using commonJS
const {IdrissCrypto} = require("idriss-crypto");

const idriss = new IdrissCrypto();
const result = await idriss.resolve("idrisssystem@gmail.com");
console.log(result);
```

And output of this is:

```javascript
{
  'Trust SOL': 'GT2Cxwi6jf6H7g3qymapq3WDQPzmH5yJUa31AfDCh1uT',
  'Metamask ETH': '0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8',
  'Essentials ELA native': 'EXeRYLa7NqLTTc5LpqN16Gma1s6HRqJ5KU'
}
```
## Documentation

### Class IdrissCrypto
#### constructor
```typescript
type ResolveOptions = {
  coin?: string|null,
  network?: string|null,
}

constructor(bscEndpoint: string = "https://bsc-dataseed.binance.org/")
```
Params:
* bscEndpoint (string) - uri to connect with blockchain. Default is "https://bsc-dataseed.binance.org/"

#### resolve
```typescript
public async resolve(input: string, options:ResolveOptions = {}): Promise<{ [index: string]: string }>
```
Converts input string (e-mail address of phone number) to wallets addresses. This method connects to Idriss-crypto api server and then to endpoint defined in constructor. 

Params:
* input (string) - e-mail address or phone number together with optional secret word
* options (ResolveOptions object) - optional parameters
  * coin (string) - for example "ETH"
    * currently supported coins: ETH, BNB, USDT, USDC, ELA, TLOS, MATIC, LINK, HT, FSN, FTM, AVAX, BTC, SOL and one ERC20 wildcard
  * network (string) - for example "evm"
    * currently supported network types: evm (for evm compatible addresses across different networks), btc and sol
  * currently, we support the following combinations:
    * network: evm
        * coin: ETH, BNB, USDT, USDC, ELA, TLOS, MATIC, LINK, HT, FSN, FTM, AVAX, BTC, ERC20
    * network: btc
        * coin: BTC, ELA
    * network: sol 
        * coin: SOL
* supported networks and coins will be updated on a regular basis. Any  wishes regarding supported combinations? Please send them to idrisssystem@gmail.com

Returns:
Promise, that resolves to dictionary (object), in which keys are names addresses, and values are these addresses (see example). In case nothing was found, promise will resolve to empty object. If unknown network or coin (or combination) was provided, error returns. Example: "message": "Network not found."