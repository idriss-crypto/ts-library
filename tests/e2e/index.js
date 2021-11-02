const {IdrissCrypto} = require("../../lib");
var assert = require('assert');
it('Basic request', async () => {
    assert.equal(1,1)
    const obj = new IdrissCrypto()
    const result = await obj.resolve("idrisssystem@gmail.com")
    assert.equal(result["ERC20"],"0xAB39e7C21b4a1D0f56a59699F0196d59efD739A5")
    assert.equal(result["Metamask ETH"],"0xcC428D15930F1d3752672B2A8AB7a9b1f2085BC8")

});