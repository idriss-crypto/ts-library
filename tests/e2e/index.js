const {IdrissCrypto, Authorization, CreateOTPResponse, WrongOTPException} = require("../../lib");
const assert = require('assert');
describe('translating address', () => {
    it('Basic request', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz")
        assert.equal(result["Metamask ETH"], "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
        assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        //const result = await obj.resolve("+16506655942")
        //assert.equal(result["Metamask ETH"], "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
        //assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        const result = await obj.resolve("@IDriss_xyz")
        assert.equal(result["Metamask ETH"], "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9")
        assert.equal(result["Coinbase ETH"], "0x995945Fb74e0f8e345b3f35472c3e07202Eb38Ac")
        assert.equal(result["Argent ETH"], "0x4B994A4b85378906B3FE9C5292C749f79c9aD661")
        assert.equal(result["Tally ETH"], "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d")
        assert.equal(result["Trust ETH"], "0xE297b1E893e7F8849413D8ee7407DB343979A449")
        assert.equal(result["Rainbow ETH"], "0xe10A2331Ac5498e7544579167755d6a756786a9F")

    }).timeout(10000);
    it('Parametrized request 1', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz", {network: "btc", coin: "BTC"})
        assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        assert(Object.keys(result).every(x => x.includes('BTC')))
        //const result = await obj.resolve("+16506655942", {network: "evm", coin: "ETH"})
        //assert.equal(result["Metamask ETH"], "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
        //assert(Object.keys(result).every(x => x.includes('ETH')))
        const result = await obj.resolve("@IDriss_xyz", {network: "evm", coin: "ETH"})
        assert.equal(result["Metamask ETH"], "0x5ABca791C22E7f99237fCC04639E094Ffa0cCce9")
        assert(Object.keys(result).every(x => x.includes('ETH')))
    }).timeout(10000);
    it('Parametrized request 2', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz", {coin: "BTC"})
        assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        assert.equal(Object.keys(result).length, 1)
        //const result = await obj.resolve("+16506655942", {coin: "BTC"})
        //assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        //assert.equal(Object.keys(result).length, 1)
        const result = await obj.resolve("@IDriss_xyz", {coin: "ETH"})
        assert.equal(result["Tally ETH"], "0xa1ce10d433bb841cefd82a43f10b6b597538fa1d")
        assert.equal(Object.keys(result).length, 6)
    }).timeout(10000);
});
describe('Authorization', () => {
    it('Wrong OTP', async () => {
        const secretWord = Math.random().toString();
        const result = await Authorization.CreateOTP("Metamask ETH", "hello@idriss.xyz", "0x11E9F9344A9720d2B2B5F0753225bb805161139B", secretWord)
        assert(result instanceof CreateOTPResponse);
        let error = null;
        try {
            await Authorization.ValidateOTP("0", result.sessionKey, secretWord)
        } catch (e) {
            error = e;
        }
        assert(error instanceof WrongOTPException)
    }).timeout(10000);
});