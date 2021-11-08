const {IdrissCrypto} = require("../../lib");
const assert = require('assert');
it('Basic request', async () => {
    const obj = new IdrissCrypto()
    const result = await obj.resolve("idrisssystem@gmail.com")
    assert.equal(result["ERC20"], "0xAB39e7C21b4a1D0f56a59699F0196d59efD739A5")
    assert.equal(result["Metamask ETH"], "0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")

});
it('Parametrized request 1', async () => {
    const obj = new IdrissCrypto()
    const result = await obj.resolve("idrisssystem@gmail.com", {network:"evm", coin:"ETH"})
    assert.equal(result["Metamask ETH"], "0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")
    assert(Object.keys(result).every(x=>x.includes('ETH')))
});
it('Parametrized request 2', async () => {
    const obj = new IdrissCrypto()
    const result = await obj.resolve("idrisssystem@gmail.com", {coin:"ERC20"})
    assert.equal(result["ERC20"], "0xAB39e7C21b4a1D0f56a59699F0196d59efD739A5")
    assert.equal(Object.keys(result).length, 1)
});