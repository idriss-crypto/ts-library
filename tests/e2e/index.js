const {IdrissCrypto, Authorization, CreateOTPResponse, WrongOTPException} = require("../../lib");
const assert = require('assert');
describe('translating address', () => {
    it('Basic request', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("idrisssystem@gmail.com")
        assert.equal(result["Essentials ELA native"], "EXeRYLa7NqLTTc5LpqN16Gma1s6HRqJ5KU")
        assert.equal(result["Metamask ETH"], "0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")
        assert.equal(result["Trust SOL"], "GT2Cxwi6jf6H7g3qymapq3WDQPzmH5yJUa31AfDCh1uT")

    }).timeout(10000);
    it('Parametrized request 1', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("idrisssystem@gmail.com", {network: "evm", coin: "ETH"})
        assert.equal(result["Metamask ETH"], "0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")
        assert(Object.keys(result).every(x => x.includes('ETH')))
    }).timeout(10000);
    it('Parametrized request 2', async () => {
        const obj = new IdrissCrypto()
        const result = await obj.resolve("idrisssystem@gmail.com", {coin: "SOL"})
        assert.equal(result["Trust SOL"], "GT2Cxwi6jf6H7g3qymapq3WDQPzmH5yJUa31AfDCh1uT")
        assert.equal(Object.keys(result).length, 1)
    }).timeout(10000);
});
describe('Authorization', () => {
    it('Wrong OTP', async () => {
        const result = await Authorization.CreateOTP("Metamask ETH", "idrisssystem@gmail.com", "0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")
        assert(result instanceof CreateOTPResponse);
        let error=null;
        try{
            await Authorization.ValidateOTP("0", result.sessionKey)
        }catch (e) {
            error=e;
        }
        assert(error instanceof WrongOTPException)
    }).timeout(10000);
});