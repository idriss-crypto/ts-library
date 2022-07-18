const crypto = require('crypto');
const assert = require('assert');
const hre = require("hardhat");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const { IdrissCrypto } = require("../../lib");
const { AssetType } = require("../../lib/assetType");

const IDrissArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/IDriss.json')
const MaticPriceAggregatorV3MockArtifact = require('../artifacts/tests/contracts/mocks/MaticPriceAggregatorV3Mock.sol/MaticPriceAggregatorV3Mock.json')
const MockNFTArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockNFT.json')
const MockTokenArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockToken.json')
const SendToHashArtifact = require('../artifacts/tests/contracts/SendToHash.sol/SendToHash.json')

describe('Payments', () => {
    let url
    let sendToHashContract
    let testProvider
    let idrissContract
    let idrissCryptoLib
    let mockTokenContract
    let mockNFTContract
    let mockPriceOracleContract
    let ownerAddress
    let signer1Address
    let signer2Address
    let signer3Address
    let signer4Address
    let ownerHash
    let signer1Hash
    let signer2Hash
    let signer3Hash

    const digestMessage = async (message) => {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    before(async () => {
        url = hre.network.config.url;
        const accounts = await web3.eth.getAccounts();
        [ownerAddress, signer1Address, signer2Address, signer3Address, signer4Address] = accounts

        ownerHash   = await digestMessage('hello@idriss.xyz' + 'Metamask ETH')
        signer1Hash = await digestMessage('+16506655942' + 'Coinbase ETH')
        signer2Hash = await digestMessage('@IDriss_xyz' + 'Tally ETH')
        signer3Hash = await digestMessage('deliriusz.eth@gmail.com' + 'Public ETH')

        mockPriceOracleContract = await hre.ethers.getContractFactoryFromArtifact(MaticPriceAggregatorV3MockArtifact).then(contract => contract.deploy())
        idrissContract = await hre.ethers.getContractFactoryFromArtifact(IDrissArtifact).then(contract => contract.deploy())

        await Promise.all([
            mockPriceOracleContract.deployed(),
            idrissContract.deployed()
        ])

        sendToHashContract = await hre.ethers.getContractFactoryFromArtifact(SendToHashArtifact).then(contract => contract.deploy(idrissContract.address, mockPriceOracleContract.address))
        mockNFTContract = await hre.ethers.getContractFactoryFromArtifact(MockNFTArtifact).then(contract => contract.deploy())
        mockTokenContract = await hre.ethers.getContractFactoryFromArtifact(MockTokenArtifact).then(contract => contract.deploy())

        await Promise.all([
            sendToHashContract.deployed(),
            mockNFTContract.deployed(),
            mockTokenContract.deployed(),
        ])

        testProvider = new HDWalletProvider({
            mnemonic: {
                phrase: hre.config.networks.hardhat_node.accounts.mnemonic
            },
            providerOrUrl: url
        });

        idrissCryptoLib = new IdrissCrypto(url, {
            web3Provider: testProvider,
            sendToAnyoneContractAddress: sendToHashContract.address,
            idrissRegistryContractAddress: idrissContract.address,
            priceOracleContractAddress: mockPriceOracleContract.address,
        });

        await idrissContract.functions.addIDriss(ownerHash, ownerAddress)
        await idrissContract.functions.addIDriss(signer1Hash, signer1Address)
        await idrissContract.functions.addIDriss(signer2Hash, signer2Address)
        await idrissContract.functions.addIDriss(signer3Hash, signer3Address)
    });

    describe('Price feed', () => {
        it('is able to retrieve a price feed', async () => {
            const result = await idrissCryptoLib.getDollarPriceInWei()
            assert(result > 0)
        }).timeout(1000000);
    });

    describe('Send to existing hash', () => {
        it('is able to send coins to existing IDriss', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', 'Metamask ETH', {
                // ethers uses BigNumber and rejects normal numbers that are bigger than certain threshold
                // changing the value to string resolves the problem
                amount: (dollarPrice + 1000) + '',
                type: AssetType.Native,
            })
            
            assert(result.status)
        }).timeout(10000);
    });
});