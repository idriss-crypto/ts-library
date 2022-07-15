const crypto = require('crypto');
const assert = require('assert');
const hre = require("hardhat");
const { ethers } = require("hardhat");

const { IdrissCrypto, Authorization, CreateOTPResponse, WrongOTPException } = require("../../lib");
const { BaseIdrissCrypto } = require("../../lib/baseIdrissCrypto");
const { AssetType } = require("../../lib/assetType");

const IDrissArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/IDriss.json')
const MaticPriceAggregatorV3MockArtifact = require('../artifacts/tests/contracts/mocks/MaticPriceAggregatorV3Mock.sol/MaticPriceAggregatorV3Mock.json')
const MockNFTArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockNFT.json')
const MockTokenArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockToken.json')
const SendToHashArtifact = require('../artifacts/tests/contracts/SendToHash.sol/SendToHash.json')

describe('Payments', () => {
    let url
    let sendToHashContract
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
        [ownerAddress, signer1Address, signer2Address, signer3Address, signer4Address] = await hre.web3.eth.getAccounts()

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

        idrissCryptoLib = new IdrissCrypto(url, {
            // web3Provider: hre.web3.currentProvider,
            sendToAnyoneContractAddress: sendToHashContract.address,
            idrissRegistryContractAddress: idrissContract.adress,
            priceOracleContractAddress: mockPriceOracleContract.adress,
        });

        idrissContract.functions.addIDriss(ownerHash, ownerAddress)
        idrissContract.functions.addIDriss(signer1Hash, signer1Address)
        idrissContract.functions.addIDriss(signer2Hash, signer2Address)
        idrissContract.functions.addIDriss(signer3Hash, signer3Address)
    });

    describe('Price feed', () => {
        it('is able to retrieve a price feed', async () => {
            const result = await idrissCryptoLib.getDollarPriceInWei()
            assert(result > 0)
        }).timeout(10000);
    });

    describe('Send to existing hash', () => {
        it('is able to send coins to existing IDriss', async () => {
            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', 'Metamask ETH', {
                amount: 100,
                type: AssetType.Native,
            })
            assert(result > 0)
        }).timeout(10000);
    });
});