It's a node.js library, that uses [Idriss-crypto](https://www.idriss-crypto.com/) to translate e-mail addresses and phone numbers to cryptocurrency wallet addresses.

## Sample usage
from cli
```bash
npm install idriss-crypto
```

And in code

```javascript
import {IdrissCrypto} from "idriss-crypto";

const idriss = new IdrissCrypto();
const result = await idriss.resolve("idrisssystem@gmail.com");
console.log(result);
```

And output of this is:

```javascript
{
  'ERC20': '0xAB39e7C21b4a1D0f56a59699F0196d59efD739A5',
  'Metamask ETH': '0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8'
}
```
## Documentation

### Class IdrissCrypto
#### constructor
```typescript
constructor(ethEndpoint: string = "https://bsc-dataseed.binance.org/")
```
Params:
* ethEndpoint (string) - uri to connect with blockchain. Default is "https://bsc-dataseed.binance.org/"

#### resolve
```typescript
public async resolve(input: string): Promise<{ [index: string]: string }>
```
Converts input string (e-mail address of phone number) to wallets addresses. This method connects to Idriss-crypto api server and then to endpoint defined in constructor. 

Params:
* input (string) - e-mail address or phone number

Returns:
Promise, that resolves to dictionary (object), in which keys are names of typess of addresses, and values are these addresses (see example). In case nothing was found, promise will resolve to empty object.