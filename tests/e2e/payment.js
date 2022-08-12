const crypto = require('crypto');
const assert = require('assert');
const hre = require("hardhat");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const { IdrissCrypto } = require("../../lib");
const { AssetType } = require("../../lib/types/assetType");

const IDrissArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/IDriss.json')
const MaticPriceAggregatorV3MockArtifact = require('../artifacts/tests/contracts/mocks/MaticPriceAggregatorV3Mock.sol/MaticPriceAggregatorV3Mock.json')
const MockNFTArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockNFT.json')
const MockTokenArtifact = require('../artifacts/tests/contracts/mocks/IDrissRegistryMock.sol/MockToken.json')
const SendToHashArtifact = require('../artifacts/tests/contracts/SendToHash.sol/SendToHash.json')
const {BigNumber} = require("ethers");

describe('Payments', () => {
    let url
    let sendToHashContract
    let testProvider
    let idrissContract
    let idrissCryptoLib
    let mockTokenContract
    let mockToken2Contract
    let mockNFTContract
    let mockNFT2Contract
    let mockPriceOracleContract
    let ownerAddress
    let signer1Address
    let signer2Address
    let signer3Address
    let signer4Address
    let signer5Address
    let signer1Hash
    let signer2Hash
    let signer3Hash
    let signer4Hash
    const testWalletType = {
        network: 'evm',
        coin: 'ETH',
        walletTag: 'Metamask ETH',
    }

    const digestMessage = async (message) => {
        return crypto.createHash('sha256').update(message).digest('hex');
    }

    before(async () => {
        url = hre.network.config.url;
        [
            ownerAddress,
            signer1Address,
            signer2Address,
            signer3Address,
            signer4Address,
            signer5Address
        ] = await web3.eth.getAccounts();

        signer1Hash = await digestMessage('hello@idriss.xyz' + "5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321")
        signer2Hash = await digestMessage('+16506655942' + "92c7f97fb58ddbcb06c0d5a7cb720d74bc3c3aa52a0d706e477562cba68eeb73")
        signer3Hash = await digestMessage('@IDriss_xyz' + "4b118a4f0f3f149e641c6c43dd70283fcc07eacaa624efc762aa3843d85b2aba")
        signer4Hash = await digestMessage('deliriusz.eth@gmail.com' + "ec72020f224c088671cfd623235b59c239964a95542713390a2b6ba07dd1151c")

        mockPriceOracleContract = await hre.ethers.getContractFactoryFromArtifact(MaticPriceAggregatorV3MockArtifact).then(contract => contract.deploy())
        idrissContract = await hre.ethers.getContractFactoryFromArtifact(IDrissArtifact).then(contract => contract.deploy())

        await Promise.all([
            mockPriceOracleContract.deployed(),
            idrissContract.deployed()
        ])

        sendToHashContract = await hre.ethers.getContractFactoryFromArtifact(SendToHashArtifact).then(contract => contract.deploy(idrissContract.address, mockPriceOracleContract.address))
        mockNFTContract = await hre.ethers.getContractFactoryFromArtifact(MockNFTArtifact).then(contract => contract.deploy())
        mockNFT2Contract = await hre.ethers.getContractFactoryFromArtifact(MockNFTArtifact).then(contract => contract.deploy())
        mockTokenContract = await hre.ethers.getContractFactoryFromArtifact(MockTokenArtifact).then(contract => contract.deploy())
        mockToken2Contract = await hre.ethers.getContractFactoryFromArtifact(MockTokenArtifact).then(contract => contract.deploy())

        await Promise.all([
            sendToHashContract.deployed(),
            mockNFTContract.deployed(),
            mockNFT2Contract.deployed(),
            mockTokenContract.deployed(),
            mockToken2Contract.deployed(),
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

        await idrissContract.functions.addIDriss(signer1Hash, signer1Address)
        await idrissContract.functions.addIDriss(signer2Hash, signer2Address)
        await idrissContract.functions.addIDriss(signer3Hash, signer3Address)
        await idrissContract.functions.addIDriss(signer4Hash, signer4Address)
        await mockNFTContract.functions.safeMint(ownerAddress, 0).catch(e => {console.log(e)})
        await mockNFTContract.functions.safeMint(ownerAddress, 1).catch(e => {console.log(e)})
        await mockNFTContract.functions.safeMint(ownerAddress, 2).catch(e => {console.log(e)})
        await mockNFTContract.functions.safeMint(ownerAddress, 3).catch(e => {console.log(e)})
        await mockToken2Contract.functions.transfer(signer4Address, (await mockToken2Contract.functions.totalSupply()).toString())
        await mockNFT2Contract.functions.safeMint(signer4Address, 1).catch(e => {console.log(e)})
    });

    describe('Price feed', () => {
        it('is able to retrieve a price feed', async () => {
            const result = await idrissCryptoLib.getDollarPriceInWei()
            assert(result > 0)
        })
    });

    describe('Send to existing hash', () => {
        it('is able to send coins to existing IDriss', async () => {
            const balanceBefore = await web3.eth.getBalance(signer1Address)

            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', testWalletType, {
                amount: 1000,
                type: AssetType.Native,
            })

            const balanceAfter = await web3.eth.getBalance(signer1Address)

            assert(result.transactionReceipt.status)
            assert.equal(BigNumber.from(balanceAfter).sub(BigNumber.from(balanceBefore)), 1000)
        })

        it('is able to send ERC20 to existing IDriss', async () => {
            const balanceBefore = await mockTokenContract.functions.balanceOf(signer2Address)

            const result = await idrissCryptoLib.transferToIDriss('+16506655942', {...testWalletType, walletTag: "Coinbase ETH"}, {
                amount: 1000,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address
            })

            const balanceAfter = await mockTokenContract.functions.balanceOf(signer2Address)

            assert(result.transactionReceipt.status)
            assert.equal(balanceAfter - balanceBefore, 1000)
        })

        it('is able to send ERC721 to existing IDriss', async () => {
            const testNFTid = 0
            const ownerBefore = await mockNFTContract.functions.ownerOf(testNFTid)

            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', testWalletType, {
                amount: 1,
                type: AssetType.ERC721,
                assetContractAddress: mockNFTContract.address,
                assetId: 0
            })

            const ownerAfter = await mockNFTContract.functions.ownerOf(testNFTid)

            assert(result.transactionReceipt.status)
            assert.equal(ownerBefore, ownerAddress)
            assert.equal(ownerAfter, signer1Address)
        })
    });

    describe('Send to nonexisting hash', () => {
        it('is able to send coins to nonexisting IDriss', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = BigNumber.from(dollarPrice).add('159755594')

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.Native,
            })

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, 0, idrissCryptoLib.ZERO_ADDRESS)
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(transaction.value, amountToSend.toString())
            assert.equal(contractBalanceBefore, 0)
            assert.equal(contractBalanceAfter, amountToSend)
            assert.equal(userBalanceAfter.toString(), '159755594')
        })

        it('is able to send ERC20 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = 50

            const contractBalanceBefore = await mockTokenContract.functions.balanceOf(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address,
            })

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, 1, mockTokenContract.address)
            const contractBalanceAfter = await mockTokenContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), amountToSend)
            assert.equal(contractBalanceBefore, 0)
            assert.equal(contractBalanceAfter.toString(), amountToSend)
        })

        it('is able to send ERC721 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = digestMessage(testMail + walletTagHash)
            const amountToSend = 1

            const contractBalanceBefore = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.ERC721,
                assetContractAddress: mockNFTContract.address,
                assetId: 1
            })

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, 2, mockNFTContract.address)
            const contractBalanceAfter = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), 1)
            assert.equal(contractBalanceBefore, 0)
            assert.equal(contractBalanceAfter.toString(), 1)
        });

        it('it throws an error if it is unable to set allowance for an ERC20 token', async () => {
            const testMail = 'nonexisting@idriss.xyz'
            let error
            try {
                await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                    amount: 15,
                    type: AssetType.ERC20,
                    assetContractAddress: mockToken2Contract.address,
                })
            } catch (e) {
                error = e
            }

            assert(error instanceof Error)
        });

        it('it throws an error if it is unable to set allowance for an ERC721 token', async () => {
            const testMail = 'nonexisting@idriss.xyz'
            let error
            try {
                await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                    amount: 1,
                    type: AssetType.ERC721,
                    assetContractAddress: mockNFT2Contract.address,
                    assetId: 1
                })
            } catch (e) {
                error = e
            }

            assert(error instanceof Error)
        });

        it('it throws an error if non-evm network is passed in wallet', async () => {
            const testMail = 'nonexisting@idriss.xyz'
            let error
            try {
                await idrissCryptoLib.transferToIDriss(testMail, {...testWalletType, network: 'sol'}, {
                    amount: 1,
                    type: AssetType.ERC721,
                    assetContractAddress: mockNFT2Contract.address,
                    assetId: 1
                })
            } catch (e) {
                error = e
            }

            assert(error instanceof Error)
        });
    });

    //TODO: improve tests
    describe('Claim payment', () => {
        it('is able to claim payment', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = BigNumber.from(dollarPrice).add('159755594')
            const asset = {
                amount: amountToSend,
                type: AssetType.Native,
            };
            const assetNFT = {
                amount: 1,
                type: AssetType.ERC721,
                assetContractAddress: mockNFTContract.address,
                assetId: 3
            };
            const assetToken = {
                amount: amountToSend,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address,
            };

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)
            const userMaticBalanceBefore = await web3.eth.getBalance(ownerAddress)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, asset)
            const resultToken = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetToken)
            const resultNFT = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetNFT)

            await idrissContract.functions.addIDriss(testHash, ownerAddress)

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash);
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const claimNativeResult = await idrissCryptoLib.claim(testMail, result.claimPassword, testWalletType, asset)
            const claimTokenResult = await idrissCryptoLib.claim(testMail, resultToken.claimPassword, testWalletType, assetToken)
            const claimNFTResult = await idrissCryptoLib.claim(testMail, resultNFT.claimPassword, testWalletType, assetNFT)

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, 0, idrissCryptoLib.ZERO_ADDRESS);
            const userMaticBalanceAfter = await web3.eth.getBalance(ownerAddress);
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address);

            assert(result.transactionReceipt.status)
            assert(claimNativeResult.status)
            assert.equal(transaction.value, amountToSend.toString())
            assert.equal(userBalanceAfter.toString(), '0')
            //TODO: change connected account to test different user claiming assets
            // assert.equal(BigNumber.from(userMaticBalanceAfter).sub(userMaticBalanceBefore).toString(), '159755594')
            // assert.equal(contractBalanceAfter, amountToSend.toString())
        })

        it('allows to override connection options', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting3@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = BigNumber.from(dollarPrice).add('159755594')
            const assetToken = {
                amount: amountToSend,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address,
            };

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)
            const userMaticBalanceBefore = await web3.eth.getBalance(signer5Address)

            const resultToken = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetToken,
                {
                    gasPrice:8288999,
                })
            assert.equal(resultToken.transactionReceipt.effectiveGasPrice, 8288999)

            await idrissContract.functions.addIDriss(testHash, signer5Address)

            const transaction = await web3.eth.getTransaction(resultToken.transactionReceipt.transactionHash);
            let hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, resultToken.claimPassword))
            if (Array.isArray(hashWithPassword)) {
                hashWithPassword = hashWithPassword[0]
            }

            const claimTokenResult = await idrissCryptoLib.claim(testMail, resultToken.claimPassword, testWalletType, assetToken, {
                from: signer5Address,
            })

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, 1, mockTokenContract.address);
            const userMaticBalanceAfter = await web3.eth.getBalance(signer5Address);
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address);

            assert.equal(userBalanceAfter[0].toString(), '0')
            assert(resultToken.transactionReceipt.status)
            assert(claimTokenResult.status)
            //TODO: check
            // assert.equal(transaction.value, amountToSend.toString())
        })
    })

    describe('Misc', () => {
        it('returns the same hash for getHashForIdentifier() when called multiple times', async () => {
            const testMail = 'nonexisting2@idriss.xyz'
            const testPassword = 'dfgRH568gDFGHfyk59e567DFGHHNn'
            const baseHash = await idrissCryptoLib.getHashForIdentifier(testMail, testWalletType, testPassword)

            for (let i = 0; i < 10; i++) {
                assert.equal(await idrissCryptoLib.getHashForIdentifier(testMail, testWalletType, testPassword), baseHash)
            }
        })
    })
});