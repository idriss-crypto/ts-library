require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  paths: {
    artifacts: 'tests/artifacts',
    sources: 'tests/contracts',
    tests: 'tests/e2e'
  },
  mocha: {
    timeout: 100000000000
  },
  defaultNetwork: "hardhat_node",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    ganache: {
      chainId: 1337, //event though config says it's 5777
      url: "http://127.0.0.1:7545",
    },
    hardhat_node: {
      chainId: 1337,
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
    }
  }
};
