require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require('hardhat-contract-sizer');

const testAccounts = {
  mnemonic: "test test test test test test test test test test test junk",
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 20,
      passphrase: "",
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 300
      }
    }
  },
  paths: {
    artifacts: 'tests/artifacts',
    sources: 'tests/contracts/src/contracts',
    tests: 'tests/e2e'
  },
  mocha: {
    timeout: 100000000000
  },
  defaultNetwork: "hardhat_node",
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: testAccounts,
      allowUnlimitedContractSize: true
    },
    ganache: {
      chainId: 1337, //event though config says it's 5777
      url: "http://127.0.0.1:7545",
      accounts: testAccounts,
      allowUnlimitedContractSize: true
    },
    hardhat_node: {
      chainId: 1337,
      url: "http://127.0.0.1:8545",
      accounts: testAccounts,
      allowUnlimitedContractSize: true
    }
  }
};
