const crypto = require('crypto');
const assert = require('assert');
const hre = require("hardhat");
const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const { IdrissCrypto } = require("../../lib");
const { AssetType } = require("../../lib/types/assetType");

const IDrissArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/IDriss.json')
const MaticPriceAggregatorV3MockArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/MaticPriceAggregatorV3Mock.sol/MaticPriceAggregatorV3Mock.json')
const MockERC1155Artifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockERC1155.json')
const MockNFTArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockNFT.json')
const MockTokenArtifact = require('../artifacts/tests/contracts/src/contracts/mocks/IDrissRegistryMock.sol/MockToken.json')
const SendToHashArtifact = require('../artifacts/tests/contracts/src/contracts/SendToHash.sol/SendToHash.json')
const TippingArtifact = require('../artifacts/tests/contracts/src/contracts/Tipping.sol/Tipping.json')
const { BigNumber, ethers } = require("ethers");
const { Web3ProviderAdapter } = require('../../lib/web3Provider');

describe('Payments', async () => {
    let url
    let sendToHashContract
    let tippingContract
    let testProvider
    let idrissContract
    let idrissCryptoLib
    let mockTokenContract
    let mockToken2Contract
    let mockNFTContract
    let mockNFT2Contract
    let mockERC1155Contract
    let mockERC1155_2Contract
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
        tippingContract = await hre.ethers.getContractFactoryFromArtifact(TippingArtifact).then(contract => contract.deploy(mockPriceOracleContract.address))
        mockERC1155Contract = await hre.ethers.getContractFactoryFromArtifact(MockERC1155Artifact).then(contract => contract.deploy())
        mockERC1155_2Contract = await hre.ethers.getContractFactoryFromArtifact(MockERC1155Artifact).then(contract => contract.deploy())
        mockNFTContract = await hre.ethers.getContractFactoryFromArtifact(MockNFTArtifact).then(contract => contract.deploy())
        mockNFT2Contract = await hre.ethers.getContractFactoryFromArtifact(MockNFTArtifact).then(contract => contract.deploy())
        mockTokenContract = await hre.ethers.getContractFactoryFromArtifact(MockTokenArtifact).then(contract => contract.deploy())
        mockToken2Contract = await hre.ethers.getContractFactoryFromArtifact(MockTokenArtifact).then(contract => contract.deploy())

        await Promise.all([
            tippingContract.deployed(),
            sendToHashContract.deployed(),
            mockERC1155Contract.deployed(),
            mockERC1155_2Contract.deployed(),
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

        // const web3Provider = Web3ProviderAdapter.fromWeb3(new Web3(testProvider));
        const web3Provider = Web3ProviderAdapter.fromEthersV5(new ethers.providers.Web3Provider(testProvider));

        idrissCryptoLib = new IdrissCrypto({
            web3Provider: web3Provider,
            sendToAnyoneContractAddress: sendToHashContract.address,
            tippingContractAddress: tippingContract.address,
            idrissRegistryContractAddress: idrissContract.address,
            priceOracleContractAddress: mockPriceOracleContract.address,
        });

        await idrissContract.functions.addIDriss(signer1Hash, signer1Address)
        await idrissContract.functions.addIDriss(signer2Hash, signer2Address)
        await idrissContract.functions.addIDriss(signer3Hash, signer3Address)
        await idrissContract.functions.addIDriss(signer4Hash, signer4Address)
        await mockERC1155Contract.functions.mint(ownerAddress, 0, 1).catch(_ => { })
        await mockERC1155Contract.functions.mint(ownerAddress, 1, 1).catch(_ => { })
        await mockERC1155Contract.functions.mint(ownerAddress, 2, 10).catch(_ => { })
        await mockERC1155Contract.functions.mint(ownerAddress, 3, 90).catch(_ => { })
        await mockERC1155Contract.functions.mint(ownerAddress, 4, 500).catch(_ => { })
        await mockERC1155_2Contract.functions.mint(ownerAddress, 0, 1).catch(_ => { })
        await mockERC1155_2Contract.functions.mint(ownerAddress, 1, 1_000_000).catch(_ => { })
        await mockNFTContract.functions.safeMint(ownerAddress, 0).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 1).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 2).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 3).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 10).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 11).catch(e => { console.log(e) })
        await mockNFTContract.functions.safeMint(ownerAddress, 12).catch(e => { console.log(e) })
        await mockToken2Contract.functions.transfer(signer4Address, (await mockToken2Contract.functions.totalSupply()).toString())
        await mockNFT2Contract.functions.safeMint(signer4Address, 1).catch(e => { console.log(e) })
    });

    describe('Price feed', () => {
        it('is able to retrieve a price feed', async () => {
            const result = await idrissCryptoLib.getDollarPriceInWei()
            assert(result > 0)
        })

        it('properly calculates msg.value for native coin transfers', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)
            const senderBalanceBefore = await web3.eth.getBalance(ownerAddress)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: 1000,
                type: AssetType.Native,
            }, "dk")

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]
            const userBalanceAfter = (await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0))[0]

            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address);
            const senderBalanceAfter = await web3.eth.getBalance(ownerAddress);

            const transactionCost = BigNumber.from(result.transactionReceipt.gasUsed).mul(result.transactionReceipt.effectiveGasPrice)

            assert(result.transactionReceipt.status)
            assert.equal(BigNumber.from(contractBalanceAfter).sub(BigNumber.from(contractBalanceBefore)).toString(), BigNumber.from(dollarPrice).add(1000).toString())
            assert.equal(BigNumber.from(userBalanceAfter).toString(), 1000)
            assert.equal(BigNumber.from(senderBalanceAfter).add(transactionCost).add(1000).add(dollarPrice).toString(), senderBalanceBefore)
        })

        it('properly calculates msg.value for ERC20 token transfers', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = 50

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address,
            }, "")
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]
            const userBalanceAfter = (await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC20, mockTokenContract.address, 0))[0]

            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(BigNumber.from(contractBalanceAfter).sub(BigNumber.from(contractBalanceBefore)).toString(), BigNumber.from(dollarPrice).toString())
            assert.equal(BigNumber.from(userBalanceAfter).toString(), amountToSend)
        })

        it('properly calculates msg.value when fee changes', async () => {
            let dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            let balanceBefore = await web3.eth.getBalance(ownerAddress)

            let testMail = 'nonexisting2@idriss.xyz'
            let testAmount = web3.utils.toWei('2', 'ether')

            let result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: testAmount,
                type: AssetType.Native,
            }, "dk")

            let balanceAfter = await web3.eth.getBalance(ownerAddress)
            let transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)

            assert(BigNumber.from(balanceBefore).sub(
                dollarPrice
                    .add(result.transactionReceipt.gasUsed * transaction.gasPrice)
                    .add(testAmount)
            ).lte(BigNumber.from(balanceAfter)))

            const newMaticPrice = '250000000' // 2.5 MATIC

            await mockPriceOracleContract.functions.setPrice(newMaticPrice)

            dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            balanceBefore = await web3.eth.getBalance(ownerAddress)

            result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: testAmount,
                type: AssetType.Native,
            }, "dk", {
                nonce: (await web3.eth.getTransactionCount(ownerAddress))
            })

            transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)
            balanceAfter = await web3.eth.getBalance(ownerAddress)

            assert(BigNumber.from(balanceBefore).sub(
                dollarPrice
                    .add(result.transactionReceipt.gasUsed * transaction.gasPrice)
                    .add(testAmount)
            ).lte(BigNumber.from(balanceAfter)))
        })
    });

    describe('Send to existing hash', () => {
        it('is able to send coins to existing IDriss', async () => {
            const payerBalanceBefore = await web3.eth.getBalance(ownerAddress)
            const payerBalanceBeforeAsBigNumber = BigNumber.from(payerBalanceBefore);

            const recipientBalanceBefore = await web3.eth.getBalance(signer1Address)
            const recipientBalanceBeforeAsBigNumber = BigNumber.from(recipientBalanceBefore);

            const amount = '10000000000000000000'

            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', testWalletType, {
                amount: amount,
                type: AssetType.Native,
            })

            const weiUsed = BigNumber.from(result.gasUsed).mul(result.effectiveGasPrice)
            const recipientBalanceAfter = await web3.eth.getBalance(signer1Address)
            const recipientBalanceAfterAsBigNumber = BigNumber.from(recipientBalanceAfter);

            const payerBalanceAfter = await web3.eth.getBalance(ownerAddress)



            assert(result.status)
            assert.equal(recipientBalanceAfterAsBigNumber.sub(recipientBalanceBeforeAsBigNumber).toString(),
                BigNumber.from(amount).sub(BigNumber.from(amount).div(100)).toString())
            assert.equal(payerBalanceBeforeAsBigNumber.sub(BigNumber.from(payerBalanceAfter)).sub(weiUsed).toString(), amount) //1% fee
        })

        it('is able to multisend coins to existing IDriss', async () => {
            const recipientBalanceBefore = await web3.eth.getBalance(signer1Address)
            const payerBalanceBefore = await web3.eth.getBalance(ownerAddress)
            const balance1 = BigNumber.from('10000000000000000000')
            const balance2 = BigNumber.from('35000')

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: balance1,
                        type: AssetType.Native,
                    }
                },
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: balance2,
                        type: AssetType.Native,
                    }
                }
            ])

            const weiUsed = BigNumber.from(result.gasUsed).mul(result.effectiveGasPrice)
            const recipientBalanceAfter = await web3.eth.getBalance(signer1Address)
            const payerBalanceAfter = await web3.eth.getBalance(ownerAddress)

            assert(result.status)

            assert.equal(BigNumber.from(payerBalanceBefore).sub(BigNumber.from(payerBalanceAfter)).sub(weiUsed).toString(),
                balance1.add(balance2).toString()) //1% fee

            assert.equal(BigNumber.from(recipientBalanceAfter).sub(BigNumber.from(recipientBalanceBefore)).toString(),
                balance1.add(balance2).sub(balance1.add(balance2).div(100)).toString())
        })

        it('is able to send ERC20 to existing IDriss', async () => {
            const balanceBefore = await mockTokenContract.functions.balanceOf(signer2Address)

            const result = await idrissCryptoLib.transferToIDriss('+16506655942', { ...testWalletType, walletTag: "Coinbase ETH" }, {
                amount: 1000,
                type: AssetType.ERC20,
                assetContractAddress: mockTokenContract.address
            })

            const balanceAfter = await mockTokenContract.functions.balanceOf(signer2Address)

            assert(result.status)
            assert.equal(balanceAfter - balanceBefore, 990) //1% fee
        })

        //TODO: check getting the same IDriss from the registry twice
        it('is able to multisend ERC20 to existing IDriss', async () => {
            const balanceBefore = await mockTokenContract.functions.balanceOf(signer1Address)
            const balanceBefore2 = await mockTokenContract.functions.balanceOf(signer2Address)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: 500,
                        type: AssetType.ERC20,
                        assetContractAddress: mockTokenContract.address
                    }
                },
                {
                    beneficiary: '+16506655942',
                    walletType: { ...testWalletType, walletTag: "Coinbase ETH" },
                    asset: {
                        amount: 1000,
                        type: AssetType.ERC20,
                        assetContractAddress: mockTokenContract.address
                    }
                }
            ])

            const balanceAfter = await mockTokenContract.functions.balanceOf(signer1Address)
            const balanceAfter2 = await mockTokenContract.functions.balanceOf(signer2Address)

            assert(result.status)

            assert(result.status)
            assert.equal(balanceAfter - balanceBefore, 495) //1% fee
            assert.equal(balanceAfter2 - balanceBefore2, 990) //1% fee
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

            assert(result.status)
            assert.equal(ownerBefore, ownerAddress)
            assert.equal(ownerAfter, signer1Address)
        })

        it('is able to multisend ERC721 to existing IDriss', async () => {
            const testNFTid = 1
            const testNFTid2 = 2
            const ownerBefore = await mockNFTContract.functions.ownerOf(testNFTid)
            const ownerBefore2 = await mockNFTContract.functions.ownerOf(testNFTid2)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: 1,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 1
                    }
                },
                {
                    beneficiary: '+16506655942',
                    walletType: { ...testWalletType, walletTag: "Coinbase ETH" },
                    asset: {
                        amount: 1,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 2
                    }
                }
            ])

            const ownerAfter = await mockNFTContract.functions.ownerOf(testNFTid)
            const ownerAfter2 = await mockNFTContract.functions.ownerOf(testNFTid2)

            assert(result.status)
            assert.equal(ownerBefore, ownerAddress)
            assert.equal(ownerAfter, signer1Address)
            assert.equal(ownerBefore2, ownerAddress)
            assert.equal(ownerAfter2, signer2Address)
        })

        it('is able to send ERC1155 to existing IDriss', async () => {
            const testERC1155id = 0
            const ownerBalanceBefore = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id)
            const signer1BalanceBefore = await mockERC1155Contract.functions.balanceOf(signer1Address, testERC1155id)

            const result = await idrissCryptoLib.transferToIDriss('hello@idriss.xyz', testWalletType, {
                amount: 1,
                type: AssetType.ERC1155,
                assetContractAddress: mockERC1155Contract.address,
                assetId: 0
            })

            const ownerBalanceAfter = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id)
            const signer1BalanceAfter = await mockERC1155Contract.functions.balanceOf(signer1Address, testERC1155id)

            assert(result.status)
            assert.equal(ownerBalanceBefore, 1)
            assert.equal(ownerBalanceAfter, 0)
            assert.equal(signer1BalanceBefore, 0)
            assert.equal(signer1BalanceAfter, 1)
        })

        it('is able to multisend ERC1155 to existing IDriss', async () => {
            const testERC1155id = 1
            const testERC1155id2 = 2
            const ownerBalanceBefore = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id)
            const signer1BalanceBefore = await mockERC1155Contract.functions.balanceOf(signer1Address, testERC1155id)
            const ownerBalanceBefore2 = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id2)
            const signer2BalanceBefore = await mockERC1155Contract.functions.balanceOf(signer2Address, testERC1155id2)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: 1,
                        type: AssetType.ERC1155,
                        assetContractAddress: mockERC1155Contract.address,
                        assetId: testERC1155id
                    }
                },
                {
                    beneficiary: '+16506655942',
                    walletType: { ...testWalletType, walletTag: "Coinbase ETH" },
                    asset: {
                        amount: 5,
                        type: AssetType.ERC1155,
                        assetContractAddress: mockERC1155Contract.address,
                        assetId: testERC1155id2
                    }
                }
            ])

            const ownerBalanceAfter = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id)
            const signer1BalanceAfter = await mockERC1155Contract.functions.balanceOf(signer1Address, testERC1155id)
            const ownerBalanceAfter2 = await mockERC1155Contract.functions.balanceOf(ownerAddress, testERC1155id2)
            const signer2BalanceAfter = await mockERC1155Contract.functions.balanceOf(signer2Address, testERC1155id2)

            assert(result.status)
            assert.equal(ownerBalanceBefore, 1)
            assert.equal(ownerBalanceBefore2, 10)
            assert.equal(ownerBalanceAfter, 0)
            assert.equal(ownerBalanceAfter2, 5)
            assert.equal(signer1BalanceBefore, 0)
            assert.equal(signer1BalanceAfter, 1)
            assert.equal(signer2BalanceBefore, 0)
            assert.equal(signer2BalanceAfter, 5)
        })
    });

    describe('Send to nonexisting hash', () => {
        it('is able to send coins to nonexisting IDriss', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = '159755594'
            const userFee = BigNumber.from(dollarPrice).add(amountToSend)

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.Native,
            })

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0)
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(transaction.value, userFee.toString())
            assert.equal(BigNumber.from(contractBalanceAfter).sub(contractBalanceBefore), userFee.toString())
            assert.equal(userBalanceAfter.toString(), amountToSend)
        })

        it('is able to multisend coins to nonexisting IDriss', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testMail2 = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const testHash2 = await digestMessage(testMail2 + walletTagHash)
            const amountToSend = '10000000000000000'
            const amountToSend2 = '10000000000000000'

            const userFee = BigNumber.from(dollarPrice).mul(2).add(amountToSend).add(amountToSend2)

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: testMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.Native,
                    }
                },
                {
                    beneficiary: testMail2,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend2,
                        type: AssetType.Native,
                    }
                },
            ])

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.data[0].claimPassword))[0]
            const hashWithPassword2 = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash2, result.data[1].claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0)
            const userBalanceAfter2 = await sendToHashContract.functions.balanceOf(hashWithPassword2, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0)
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.data.length, 2)
            assert.equal(result.data[0].claimPassword.length, 32)
            assert.equal(result.data[1].claimPassword.length, 32)
            assert.equal(transaction.value, userFee.toString())
            assert.equal(BigNumber.from(contractBalanceAfter).sub(contractBalanceBefore), userFee.toString())
            assert.equal(userBalanceAfter.toString(), amountToSend)
            assert.equal(userBalanceAfter2.toString(), amountToSend2)
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

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC20, mockTokenContract.address, 0)
            const contractBalanceAfter = await mockTokenContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), amountToSend)
            assert.equal(BigNumber.from(contractBalanceAfter.toString()).sub(contractBalanceBefore.toString()), amountToSend)
        })

        it('is able to multisend ERC20 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testMail2 = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const testHash2 = await digestMessage(testMail2 + walletTagHash)
            const amountToSend = 50
            const amountToSend2 = 1900

            const contractBalanceBefore = await mockTokenContract.functions.balanceOf(sendToHashContract.address)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: testMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC20,
                        assetContractAddress: mockTokenContract.address,
                    }
                },
                {
                    beneficiary: testMail2,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend2,
                        type: AssetType.ERC20,
                        assetContractAddress: mockTokenContract.address,
                    }
                },
            ])

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.data[0].claimPassword))[0]
            const hashWithPassword2 = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash2, result.data[1].claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC20, mockTokenContract.address, 0)
            const userBalanceAfter2 = await sendToHashContract.functions.balanceOf(hashWithPassword2, AssetType.ERC20, mockTokenContract.address, 0)
            const contractBalanceAfter = await mockTokenContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.data.length, 2)
            assert.equal(result.data[0].claimPassword.length, 32)
            assert.equal(result.data[1].claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), amountToSend)
            assert.equal(userBalanceAfter2.toString(), amountToSend2)
            assert.equal(
                BigNumber.from(contractBalanceAfter.toString()).sub(contractBalanceBefore.toString()),
                BigNumber.from(amountToSend).add(amountToSend2).toString()
            )
        })

        //please note that you have to perform this test manually by debugging
        // it('is doesn\'t check for allowance for second time', async () => {
        //     const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
        //     const testMail = 'nonexisting@idriss.xyz'
        //     const testHash = await digestMessage(testMail + walletTagHash)
        //     const amountToSend = 1
        //
        //     await mockNFTContract.approve(sendToHashContract.address, 1)
        //
        //     await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
        //         amount: amountToSend,
        //         type: AssetType.ERC721,
        //         assetContractAddress: mockNFTContract.address,
        //         assetId: 1
        //     })
        // });

        it('is able to send ERC721 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = 1

            const contractBalanceBefore = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.ERC721,
                assetContractAddress: mockNFTContract.address,
                assetId: 10
            })

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC721, mockNFTContract.address, 10)
            const contractBalanceAfter = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), 1)
            assert.equal(contractBalanceBefore, 0)
            assert.equal(contractBalanceAfter.toString(), 1)
        });

        it('is able to multisend ERC721 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testMail2 = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const testHash2 = await digestMessage(testMail2 + walletTagHash)
            const amountToSend = 1

            const contractBalanceBefore = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: testMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 11
                    }
                },
                {
                    beneficiary: testMail2,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC721,
                        assetContractAddress: mockNFTContract.address,
                        assetId: 12
                    }
                },
            ])

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.data[0].claimPassword))[0]
            const hashWithPassword2 = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash2, result.data[1].claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC721, mockNFTContract.address, 11)
            const userBalanceAfter2 = await sendToHashContract.functions.balanceOf(hashWithPassword2, AssetType.ERC721, mockNFTContract.address, 12)
            const contractBalanceAfter = await mockNFTContract.functions.balanceOf(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.data.length, 2)
            assert.equal(result.data[0].claimPassword.length, 32)
            assert.equal(result.data[1].claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), 1)
            assert.equal(userBalanceAfter2.toString(), 1)
            assert.equal(contractBalanceAfter[0].sub(contractBalanceBefore[0]).toString(), 2)
        });

        it('is able to multisend ERC1155 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testMail2 = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const testHash2 = await digestMessage(testMail2 + walletTagHash)
            const amountToSend = 1

            const contractBalanceBefore = await mockERC1155Contract.functions.balanceOf(sendToHashContract.address, 0)

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: testMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC1155,
                        assetContractAddress: mockERC1155Contract.address,
                        assetId: 2
                    }
                },
                {
                    beneficiary: testMail2,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.ERC1155,
                        assetContractAddress: mockERC1155Contract.address,
                        assetId: 3
                    }
                },
            ])

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.data[0].claimPassword))[0]
            const hashWithPassword2 = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash2, result.data[1].claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC1155, mockERC1155Contract.address, 2)
            const userBalanceAfter2 = await sendToHashContract.functions.balanceOf(hashWithPassword2, AssetType.ERC1155, mockERC1155Contract.address, 3)
            const contractBalanceAfter = await mockERC1155Contract.functions.balanceOf(sendToHashContract.address, 2)
            const contractBalanceAfter2 = await mockERC1155Contract.functions.balanceOf(sendToHashContract.address, 3)

            assert(result.transactionReceipt.status)
            assert.equal(result.data.length, 2)
            assert.equal(result.data[0].claimPassword.length, 32)
            assert.equal(result.data[1].claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), 1)
            assert.equal(userBalanceAfter2.toString(), 1)
            assert.equal(contractBalanceBefore, 0)
            assert.equal(contractBalanceAfter.toString(), 1)
            assert.equal(contractBalanceAfter2.toString(), 1)
        });

        it('is able to send ERC1155 to nonexisting IDriss', async () => {
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = 2

            const contractBalanceBefore = await mockERC1155Contract.functions.balanceOf(sendToHashContract.address, 3)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.ERC1155,
                assetContractAddress: mockERC1155Contract.address,
                assetId: 3
            })

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC1155, mockERC1155Contract.address, 3)
            const contractBalanceAfter = await mockERC1155Contract.functions.balanceOf(sendToHashContract.address, 3)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(userBalanceAfter.toString(), 2)
            assert.equal(contractBalanceAfter[0].sub(contractBalanceBefore[0]).toString(), 2)
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

        it('it throws an error if it is unable to set allowance for an ERC1155 token', async () => {
            const testMail = 'nonexisting@idriss.xyz'
            let error
            try {
                await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                    amount: 1,
                    type: AssetType.ERC1155,
                    assetContractAddress: mockERC11552Contract.address,
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
                await idrissCryptoLib.transferToIDriss(testMail, { ...testWalletType, network: 'sol' }, {
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

    describe('Send to existing and nonexisting hash', () => {

        // Proof of concept test
        it('is able to multisend coins to existing and nonexisting IDriss', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const existingMail = 'hello@idriss.xyz'
            const nonexistingMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(nonexistingMail + walletTagHash)

            const existingBalanceBefore = await web3.eth.getBalance(signer1Address)

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const amountToSend = '100000000000000'
            const amountToSend2 = '42000000000000'

            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: existingMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.Native,
                    }
                },
                {
                    beneficiary: nonexistingMail,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend2,
                        type: AssetType.Native,
                    }
                }
            ])

            const existingBalanceAfter = await web3.eth.getBalance(signer1Address)

            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.data[0].claimPassword))[0]

            nonexistingBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0)

            assert(result.transactionReceipt.status)
            assert(result.data.length, 1)
            assert.equal(result.data[0].claimPassword.length, 32)
            // not checking again for exact amount, see other tests
            assert(existingBalanceAfter > existingBalanceBefore)
            assert.equal(nonexistingBalanceAfter.toString(), amountToSend2)
        })

    });

    describe('Send to IDriss hash and wallet address', () => {

        // Proof of concept test
        it('is able to multisend coins to existing IDriss and wallet address', async () => {
            const recipient1BalanceBefore = await web3.eth.getBalance(signer1Address)
            const recipient2BalanceBefore = await web3.eth.getBalance(signer2Address)
            const payerBalanceBefore = await web3.eth.getBalance(ownerAddress)
            const amountToSend = BigNumber.from('10000000000000000000')
            const amountToSend2 = BigNumber.from('35000')


            // TODO: for some reason sometimes it gives warning BigNumber.toString does not accept any parameters; base-10 is assumed
            const result = await idrissCryptoLib.multitransferToIDriss([
                {
                    beneficiary: signer2Address,
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend,
                        type: AssetType.Native,
                    }
                },
                {
                    beneficiary: 'hello@idriss.xyz',
                    walletType: testWalletType,
                    asset: {
                        amount: amountToSend2,
                        type: AssetType.Native,
                    }
                }
            ])


            const weiUsed = BigNumber.from(result.gasUsed).mul(result.effectiveGasPrice)
            const recipient1BalanceAfter = await web3.eth.getBalance(signer1Address)
            const recipient2BalanceAfter = await web3.eth.getBalance(signer2Address)
            const payerBalanceAfter = await web3.eth.getBalance(ownerAddress)

            assert(result.status)

            assert.equal(BigNumber.from(payerBalanceBefore).sub(BigNumber.from(payerBalanceAfter)).sub(weiUsed).toString(),
                amountToSend.add(amountToSend2).toString())

            //1% fee
            assert.equal(BigNumber.from(recipient1BalanceAfter).add(BigNumber.from(recipient2BalanceAfter)).sub(BigNumber.from(recipient1BalanceBefore)).sub(BigNumber.from(recipient2BalanceBefore)).toString(),
                amountToSend.add(amountToSend2).sub(amountToSend.add(amountToSend2).div(100)).toString())
        })

    });

    describe('Send to wallet address', () => {

        it('is able to send coins to wallet address', async () => {
            const recipientBalanceBefore = await web3.eth.getBalance(signer1Address)
            const payerBalanceBefore = await web3.eth.getBalance(ownerAddress)
            const amount = '10000000000000000000'

            const result = await idrissCryptoLib.transferToIDriss(signer1Address, testWalletType, {
                amount: amount,
                type: AssetType.Native,
            })

            const weiUsed = BigNumber.from(result.gasUsed).mul(result.effectiveGasPrice)
            const recipientBalanceAfter = await web3.eth.getBalance(signer1Address)
            const payerBalanceAfter = await web3.eth.getBalance(ownerAddress)

            assert(result.status)
            assert.equal(BigNumber.from(recipientBalanceAfter).sub(BigNumber.from(recipientBalanceBefore)).toString(),
                BigNumber.from(amount).sub(BigNumber.from(amount).div(100)).toString())
            assert.equal(BigNumber.from(payerBalanceBefore).sub(BigNumber.from(payerBalanceAfter)).sub(weiUsed).toString(), amount) //1% fee
        })

    });

    describe('Send to nonexisting hash and revert payment', () => {
        it('is able to send coins to nonexisting IDriss and revert the payment', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = '159755594'
            const userFee = BigNumber.from(dollarPrice).add(amountToSend)

            const contractBalanceBefore = await web3.eth.getBalance(sendToHashContract.address)

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, {
                amount: amountToSend,
                type: AssetType.Native,
            })

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash)
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0)
            const contractBalanceAfter = await web3.eth.getBalance(sendToHashContract.address)

            assert(result.transactionReceipt.status)
            assert.equal(result.claimPassword.length, 32)
            assert.equal(transaction.value, userFee.toString())
            assert.equal(BigNumber.from(contractBalanceAfter).sub(contractBalanceBefore), userFee.toString())
            assert.equal(userBalanceAfter.toString(), amountToSend)

            const contractBalanceBefore2 = await web3.eth.getBalance(sendToHashContract.address)
            const senderBalanceBefore = await web3.eth.getBalance(ownerAddress)

            const revertedResult = await idrissCryptoLib.revertPayment(hashWithPassword, AssetType.Native)

            const contractBalanceAfter2 = await web3.eth.getBalance(sendToHashContract.address)
            const senderBalanceAfter = await web3.eth.getBalance(ownerAddress)

            const transactionRevert = await web3.eth.getTransaction(revertedResult.transactionHash)

            assert(revertedResult.status)
            assert.equal(BigNumber.from(contractBalanceBefore2).sub(amountToSend).toString(), contractBalanceAfter2.toString())
        })

        it('it throws an error if revertPayment fails', async () => {

            const notClaimableIDrissHash = '0x50c5a97607e73b12ea1fa5e437860f9cb7c138cc6210cf1d9804aed5f5ac5305'

            let error
            try {
                const result = await idrissCryptoLib.revertPayment(notClaimableIDrissHash, AssetType.Native)
            } catch (e) {
                error = e
            }

            assert(error instanceof Error)
        });

    });

    describe('Calculate fee', () => {
        it('returns proper payment fee', async () => {
            // Just to satisfy ethers tests for now, probably will be a separate test case for ethers provider
            const convert = (v) => {
                return BigNumber.isBigNumber(v) ? v.toString() : v;
            }
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(0, AssetType.ERC20)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(0, AssetType.ERC721)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(dollarPrice.mul(10), AssetType.ERC20)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(dollarPrice.mul(18), AssetType.ERC721)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(dollarPrice, AssetType.Native)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(dollarPrice.mul(25), AssetType.Native)), dollarPrice)
            assert.equal(convert(await idrissCryptoLib.calculateSendToAnyonePaymentFee(dollarPrice.mul(2500), AssetType.Native)), dollarPrice.mul(25))
        });
    })

    //TODO: improve tests
    describe('Claim payment', () => {
        it('is able to claim payment', async () => {
            const dollarPrice = await idrissCryptoLib.getDollarPriceInWei()
            const walletTagHash = '5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321'
            const testMail = 'nonexisting2@idriss.xyz'
            const testHash = await digestMessage(testMail + walletTagHash)
            const amountToSend = '159755594'
            const asset = {
                amount: amountToSend,
                type: AssetType.Native,
            };
            const assetERC1155 = {
                amount: 1,
                type: AssetType.ERC1155,
                assetContractAddress: mockERC1155Contract.address,
                assetId: 3
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

            const result = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, asset)
            const resultToken = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetToken)
            const resultNFT = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetNFT)
            const resultERC1155 = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetERC1155)

            await idrissContract.functions.addIDriss(testHash, ownerAddress)

            const transaction = await web3.eth.getTransaction(result.transactionReceipt.transactionHash);
            const transactionToken = await web3.eth.getTransaction(resultToken.transactionReceipt.transactionHash);
            const transactionNFT = await web3.eth.getTransaction(resultNFT.transactionReceipt.transactionHash);
            const transactionERC1155 = await web3.eth.getTransaction(resultERC1155.transactionReceipt.transactionHash);
            const hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, result.claimPassword))[0]

            const claimNativeResult = await idrissCryptoLib.claim(testMail, result.claimPassword, testWalletType, asset)
            const claimTokenResult = await idrissCryptoLib.claim(testMail, resultToken.claimPassword, testWalletType, assetToken)
            const claimNFTResult = await idrissCryptoLib.claim(testMail, resultNFT.claimPassword, testWalletType, assetNFT)
            const claimERC1155Result = await idrissCryptoLib.claim(testMail, resultERC1155.claimPassword, testWalletType, assetERC1155)

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.Native, idrissCryptoLib.contractsAddressess.zero, 0);

            assert(result.transactionReceipt.status)
            assert(resultToken.transactionReceipt.status)
            assert(resultNFT.transactionReceipt.status)
            assert(resultERC1155.transactionReceipt.status)
            assert.equal(transaction.value, dollarPrice.add(amountToSend))
            assert.equal(transactionToken.value, dollarPrice)
            assert.equal(transactionNFT.value, dollarPrice)
            assert.equal(transactionERC1155.value, dollarPrice)
            assert(claimNativeResult.status)
            assert(claimTokenResult.status)
            assert(claimNFTResult.status)
            assert(claimERC1155Result.status)
            assert.equal(transaction.value, dollarPrice.add(amountToSend))
            assert.equal(userBalanceAfter.toString(), '0')
            //TODO: change connected account to test different user claiming assets
            // assert.equal(BigNumber.from(userMaticBalanceAfter).sub(userMaticBalanceBefore).toString(), '159755594')
            // assert.equal(contractBalanceAfter, amountToSend.toString())
        })

        it.skip('allows to override connection options', async () => {
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

            const resultToken = await idrissCryptoLib.transferToIDriss(testMail, testWalletType, assetToken, "",
                {
                    gasPrice: 10288999,
                })
            assert.equal(resultToken.transactionReceipt.effectiveGasPrice, 10288999)

            await idrissContract.functions.addIDriss(testHash, signer5Address)

            let hashWithPassword = (await sendToHashContract.functions
                .hashIDrissWithPassword(testHash, resultToken.claimPassword))
            if (Array.isArray(hashWithPassword)) {
                hashWithPassword = hashWithPassword[0]
            }

            const claimTokenResult = await idrissCryptoLib.claim(testMail, resultToken.claimPassword, testWalletType, assetToken, {
                from: signer5Address,
            })

            const userBalanceAfter = await sendToHashContract.functions.balanceOf(hashWithPassword, AssetType.ERC20, mockTokenContract.address, 0);

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

