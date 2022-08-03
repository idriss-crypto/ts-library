# Integrate IDriss Into Your Project

<p align="center">
<img alt="Let's Integrate!" src="img/integrate_idriss.png"/>
</p>

This is a node.js and webpack library for integrating [IDriss](https://www.idriss.xyz/) into your project.

IDriss is a decentralized mapping of emails, phone numbers and Twitter usernames to cryptocurrency wallet addresses.

The key benefits of integrating IDriss are:

- User-friendly wallet address format that can be easily shared verbally, or in writing for the purpose of sending or receiving crypto
- Effective organization and quicker access to your multiple wallet addresses (you have them available under one, memorable IDriss)
- Easier deposits into your wallet from crypto exchanges and other wallets
- (Coming soon) Additional revenue stream for your project

**The library has 4 main functions:**
1. Resolving IDriss names
2. Reverse Resolving IDriss names
3. Sending MATIC/ERC20/ERC721 to existing and nonexistent IDriss users
4. Registering IDriss names inside your app

**IDriss name - email, phone number or Twitter username*

## Sample Usage
From cli:
```bash
npm install idriss-crypto
```

And in code:

```javascript
//for nodejs
import {IdrissCrypto} from "idriss-crypto";
//or when using commonJS
const {IdrissCrypto} = require("idriss-crypto");

//for browser
import {IdrissCrypto} from "idriss-crypto/lib/browser";

const idriss = new IdrissCrypto();
const resultEmail = await idriss.resolve("hello@idriss.xyz");
console.log(resultEmail);
```

And the output of this is:

```javascript
{
    'Coinbase BTC': 'bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh',
    'Metamask ETH': '0x11E9F9344A9720d2B2B5F0753225bb805161139B'
}
```

The same is possible with Twitter usernames:

```javascript
    const resultTwitter = await idriss.resolve("@idriss_xyz");
    console.log(resultTwitter);
```
Resolves to: 
```javascript
{
    'Metamask ETH': '0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9',
    'Coinbase ETH': '0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac',
    'Argent ETH': '0x4B994A4b85378906B3FE9C5292C749f79c9aD661',
    'Tally ETH': '0xa1ce10d433bb841cefd82a43f10b6b597538fa1d',
    'Trust ETH': '0xE297b1E893e7F8849413D8ee7407DB343979A449',
    'Rainbow ETH': '0xe10A2331Ac5498e7544579167755d6a756786a9F'
}
```

And phone numbers:

```javascript
    const resultPhone = await idriss.resolve("+16506655942");
    console.log(resultPhone);
```
Resolves to: 
```javascript
{
    'Binance BTC': '1FdqxZsS6HVEs1NaQUdkoQWKYA9R9yfhdz',
    'Essentials ELA': 'EL4bLnZALyJKkoEf99qjZMrKVresHU76JU',
    'Phantom SOL': '6GmzRK2qLhBPK2WwYM14EGnxh95jBTsJGXMgFyM3VeVk'
}
```
# Functions
## 1. Resolving IDriss Names

### Resolve emails, phone numbers, and Twitter usernames to wallet addresses.

*Class IdrissCrypto*

An example of implementation in the user interface:

<p align="center">
<img alt="UI Implementation Example" src="img/resolving_idriss.png"/>
</p>

#### constructor
```typescript
type ResolveOptions = {
  coin?: string|null,
  network?: string|null,
}

constructor(polygonEndpoint: string = "https://polygon-rpc.com/")
```
Params:
* polygonEndpoint (string) - uri to connect with blockchain. Default is empty https://polygon-rpc.com/.

#### resolve
```typescript
public async resolve(input: string, options:ResolveOptions = {}): Promise<{ [index: string]: string }>
```
Converts input string (e-mail address, phone number or Twitter handle) to wallets addresses. This method connects to IDriss API server and then to endpoint defined in constructor.

Params:
* input (string) - e-mail address, phone number (starting with (+) country code) or Twitter handle (starting with "@") together with optional secret word
* options (ResolveOptions object) - optional parameters
    * coin (string) - for example "ETH"
        * currently supported coins: ETH, BNB, USDT, USDC, ELA, MATIC, BTC, SOL and one ERC20 wildcard
    * network (string) - for example "evm"
        * currently supported network types: evm (for evm compatible addresses across different networks), btc and sol
    * currently, we support the following combinations:
        * network: evm
            * coin: ETH, BNB, USDT, USDC, ELA, MATIC, ERC20
        * network: btc
            * coin: BTC, ELA
        * network: sol
            * coin: SOL
* supported networks and coins will be updated on a regular basis. Any  wishes regarding supported combinations? Please join our [Discord](https://discord.gg/RJhJKamjw5) and let us know.

Returns:
Promise, that resolves to dictionary (object), in which keys are names addresses, and values are these addresses (see example). In case nothing was found, promise will resolve to empty object. If unknown network or coin (or combination) was provided, error returns. Example: "message": "Network not found."

## 2. Reverse Resolving IDriss Names

### Show emails, phone numbers, and Twitter usernames instead of wallet addresses.

Use reverseResolve

```typescript
public async reverseResolve(input: string): Promise<string>
```
And in code:

```typescript

const obj = new IdrissCrypto()

const reverse = await obj.reverseResolve("0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac")

console.log(reverse)

```
This resolves to: 
```javascript
"@idriss_xyz"
```

You can also call the smart contact directly:

```typescript
async function loadContractReverse(web3) {
    return await new web3.eth.Contract([{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reverseIDriss","outputs":   [{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
        "0x561f1b5145897A52A6E94E4dDD4a29Ea5dFF6f64"
    );
}

let reverseContract = await loadContractReverse(defaultWeb3);
reverse = await reverseContract.methods.reverseIDriss(address).call();
```

*Note: The code above provides resolution to Twitter IDs. The IDs still must be translated to usernames with Twitter API. Our library takes care of this translation.*

An example of implementation in the user interface:

<p align="center">
<img alt="UI Implementation Example" src="img/reverse_resolving.png"/>
</p>

## 3. Sending MATIC/ERC20/ERC721 to existing and nonexistent IDriss users on Polygon

### Send MATIC/ERC20/ERC721 to send assets to both users that have IDriss registered, and to those who are yet to have one on Polygon chain
In case that the user resolves to an address in IDriss registry, asset transfer is performed directly to the user.
The asset is being send to SendToAnyone smart contract, so that the user can claim it after registering.
Please note that if the smart contract is used, it additionally invokes approve function for the contract to be able to hold it in hte escrow.

Use transferToIDriss

```typescript
public async transferToIDriss (
    beneficiary: string,
    walletType: Required<ResolveOptions>,
    asset: AssetLiability
): Promise<TransactionReceipt>
```
And in code:

```typescript

const obj = new IdrissCrypto()

const transactionReceipt = await obj.transferToIDriss(
    "hello@idriss.xyz",
    {
        network: "evm",
        coin: "MATIC",
        walletTag: "Metamask ETH"
    },
    {
        type: AssetType.ERC20,
        amount: 150,
        assetContractAddress: "0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac"
    })

console.log(transactionReceipt)

```
This resolves to SendToHashTransactionReceipt object, which gives info about the transaction that was performed and if SendToHash smart contract was used, it returns claim password for the user

You can also call the smart contact directly:

```typescript
async function loadContractSendToAnyone(web3) {
    return await new web3.eth.Contract(
        [{ "inputs": [ { "internalType": "string", "name": "_IDrissHash", "type": "string" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "enum AssetType", "name": "_assetType", "type": "uint8" }, { "internalType": "address", "name": "_assetContractAddress", "type": "address" }, { "internalType": "uint256", "name": "_assetId", "type": "uint256" }], "name": "sendToAnyone", "outputs": [], "stateMutability": "payable", "type": "function"}],
        "0xTODOchangeme"
    );
}

const hashWithPassword = await (await this.idrissSendToAnyoneContractPromise).methods
    .hashIDrissWithPassword(IDrissHash, claimPassword).call()

let sendToAnyoneContract = await loadContractSendToAnyone(defaultWeb3);
reverse = await sendToAnyoneContract.methods
    .sendToAnyone(hashWithPassword, 150, ASSET_TYPE_ERC20, '0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac', 0)
    .send({
        from: '0x5559C5Fb84e0f8e34bb3B35b72cAe0770AEb38Ac',
        value: 1_000_000_000_000_000
    });
```

## 3. Registering IDriss Names Inside Your Project

<span style="color:red">Awaits an update.</span>

### Onboard users to IDriss directly from your app's interface.

*Class Authorization*

An example of implementation in the user interface:

<p align="center">
<img alt="UI Implementation Example" src="img/registering_idriss.png"/>
</p>
 

The workflow should follow this procedure:

<p align="center">
<img alt="Registration Workflow" src="img/signupWorkflow.png"/>
</p>


#### CreateOTP

```typescript
 public static async CreateOTP(tag:string, identifier:string, address:string, secretWord:string | null = null):Promise<CreateOTPResponse>
```

Params:

* tag (string) - identifier for wallet. See below for options. Contact us on [Discord](https://discord.gg/RJhJKamjw5) to add additional tags.
* identifier (string) - email, phone number with country code or @twitter handle (including "@")
* address (string) - address to be linked with identifier+secret_word
* secretWord(string, optional) - to be appended to identifier when using the resolver


returns:

```typescript
 class CreateOTPResponse {
    public sessionKey: string;
    public triesLeft: number;
}
```

example:

```typescript
import {Authorization} from "idriss-crypto";

const result = await Authorization.CreateOTP("Metamask ETH", "hello@idriss.xyz", "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
console.log(result.sessionKey)
```


available tags:

* "Metamask ETH", "Binance ETH", "Coinbase ETH", "Exchange ETH", "Private ETH", "Essentials ETH", "Rainbow ETH", "Argent ETH", "Tally ETH", "Trust ETH", "Public ETH",
* "Essentials BTC", "Binance BTC", "Coinbase BTC", "Exchange BTC", "Private BTC",
* "Metamask USDT", "Binance USDT", "Coinbase USDT", "Exchange USDT", "Private USDT", "Essentials USDT", 
* "Metamask USDC", "Binance USDC", "Coinbase USDC", "Exchange USDC", "Private USDC", "Essentials USDC", 
* "Solana SOL", "Coinbase SOL", "Trust SOL", "Binance SOL", "Phantom SOL",
* "Metamask BNB", "Essentials BNB", 
* "Essentials ELA SC", "Essentials ELA" (Smart Chain and native ELA network)
* "Essentials MATIC",  
* "ERC20"

tags must match address type, error thrown otherwise.

#### ValidateOTP

```typescript
static async ValidateOTP(OTP:string, sessionKey:string):Promise<ValidateOTPResponse>
```

Validates if OTP is correct. If OTP is wrong, WrongOTPException is thrown. If correct, link will be saved on the blockchain and txn_hash is returned. Once the transaction went through, link can be found with resolver.

Params:
* OTP (string) - 6-digit number
* sessionKey (string) - session key provided in first call 

Returns:

```typescript
export class ValidateOTPResponse {
    public message: string;
    public txnHash: string;
}
```

Example:

```typescript

import {Authorization, WrongOTPException} from "idriss-crypto";

try {
    await Authorization.ValidateOTP("123456", "QNmxmWdWVZ3pm1rHEN7G");
    console.log("Validated succesfully");
} catch (ex) {
    if (ex instanceof WrongOTPException) {
        console.log("OTP is wrong");
    } else {
        console.log("Other error");
    }
}
```
Error is thrown if session is not valid anymore (more than 3 wrong OTPs), wrong OTP is provided, the transaction failed or the session key is unknown.

## Testing
In order to run tests, please execute following commands:
```
yarn compileWeb3
yarn hardhat node
yarn testE2e
```