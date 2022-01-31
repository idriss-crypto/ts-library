const {IdrissCrypto, Authorization, CreateOTPResponse, WrongOTPException} = require("../../lib");
const assert = require('assert');
describe('translating address', () => {
    it('Basic request', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz")
        assert.equal(result["Metamask ETH"], "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
        assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")

    }).timeout(10000);
    it('Parametrized request 1', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz", {network: "evm", coin: "ETH"})
        assert.equal(result["Metamask ETH"], "0x11E9F9344A9720d2B2B5F0753225bb805161139B")
        assert(Object.keys(result).every(x => x.includes('ETH')))
    }).timeout(10000);
    it('Parametrized request 2', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("hello@idriss.xyz", {coin: "BTC"})
        assert.equal(result["Coinbase BTC"], "bc1qsvz5jumwew8haj4czxpzxujqz8z6xq4nxxh7vh")
        assert.equal(Object.keys(result).length, 1)
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