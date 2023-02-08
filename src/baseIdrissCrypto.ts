import {TwitterNameResolver} from "./twitterNameResolver";
import Web3 from "web3";
import {AbiItem} from "web3-utils";
import {provider, TransactionReceipt} from "web3-core";

import {ResolveOptions} from "./types/resolveOptions";
import {AssetLiability} from "./types/assetLiability";
import IDrissTippingAbi from "./abi/tipping.json";
import IDrissRegistryAbi from "./abi/idrissRegistry.json";
import IDrissReverseMappingAbi from "./abi/idrissReverseMapping.json";
import IDrissSendToAnyoneAbi from "./abi/idrissSendToAnyone.json";
import PriceOracleAbi from "./abi/priceOracleV3Aggregator.json";
import IERC20Abi from "./abi/ierc20.json";
import IERC721Abi from "./abi/ierc721.json";
import IERC1155Abi from "./abi/ierc1155.json";
import {AssetType} from "./types/assetType";
import {ConnectionOptions} from "./types/connectionOptions";
import {BigNumber, BigNumberish} from "ethers";
import {MultiSendToHashTransactionReceipt, SendToHashTransactionReceipt} from "./types/sendToHashTransactionReceipt";
import {TransactionOptions} from "./types/transactionOptions";
import {SendToAnyoneParams} from "./types/sendToAnyoneParams";

export abstract class BaseIdrissCrypto {
    protected web3Promise:Promise<Web3>;
    protected registryWeb3Promise: Promise<Web3>;
    private idrissRegistryContractPromise;
    private idrissReverseMappingContractPromise;
    private idrissSendToAnyoneContractPromise;
    private priceOracleContractPromise;
    private tippingContractPromise;
    private twitterNameResolver: TwitterNameResolver;
    protected ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    protected IDRISS_REGISTRY_CONTRACT_ADDRESS = '0x2EcCb53ca2d4ef91A79213FDDF3f8c2332c2a814';
    protected IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS = '0x561f1b5145897A52A6E94E4dDD4a29Ea5dFF6f64';
    protected PRICE_ORACLE_CONTRACT_ADDRESS = '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0';
    protected IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS = '0xf333EDE8D49dD100F02c946809C9F5D9867D10C0';
    protected IDRISS_TIPPING_CONTRACT_ADDRESS = '0xb05dC103DEc7c482CB30A7AF83053E3ea0F08027';
    protected IDRISS_HOMEPAGE = 'https://idriss.xyz';

    // we split web3 from web3 for registry, as registry is only accessible on Polygon,
    // and library is about to support multiple chains
    constructor(web3: Web3|Promise<Web3>, registryWeb3: Web3|Promise<Web3>, connectionOptions: ConnectionOptions) {
        this.IDRISS_REGISTRY_CONTRACT_ADDRESS = (typeof connectionOptions.idrissRegistryContractAddress !== 'undefined') ?
            connectionOptions.idrissRegistryContractAddress : this.IDRISS_REGISTRY_CONTRACT_ADDRESS
        this.IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS = (typeof connectionOptions.reverseIDrissMappingContractAddress !== 'undefined') ?
            connectionOptions.reverseIDrissMappingContractAddress : this.IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS
        this.PRICE_ORACLE_CONTRACT_ADDRESS = (typeof connectionOptions.priceOracleContractAddress !== 'undefined') ?
            connectionOptions.priceOracleContractAddress : this.PRICE_ORACLE_CONTRACT_ADDRESS
        this.IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS = (typeof connectionOptions.sendToAnyoneContractAddress !== 'undefined') ?
            connectionOptions.sendToAnyoneContractAddress : this.IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS
        this.IDRISS_TIPPING_CONTRACT_ADDRESS = (typeof connectionOptions.tippingContractAddress !== 'undefined') ?
            connectionOptions.tippingContractAddress : this.IDRISS_TIPPING_CONTRACT_ADDRESS

        this.web3Promise = Promise.resolve(web3)
        this.registryWeb3Promise = Promise.resolve(registryWeb3)
        this.twitterNameResolver = new TwitterNameResolver()
        this.idrissRegistryContractPromise = this.generateIDrissRegistryContract();
        this.idrissReverseMappingContractPromise = this.generateIDrissReverseMappingContract();
        this.idrissSendToAnyoneContractPromise = this.generateIDrissSendToAnyoneContract();
        this.priceOracleContractPromise = this.generatePriceOracleContract();
        this.tippingContractPromise = this.generateTippingContract();
    }

    public static matchInput(input: string): "phone" | "mail" | "twitter" | null {
        const regPh = /^(\+\(?\d{1,4}\s?)\)?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
        const regM = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const regT = /^@[^\s]+/;
        if (input.match(regPh)) return "phone";
        if (input.match(regM)) return "mail";
        if (input.match(regT)) return "twitter";
        return null;
    }

    public async resolve(input: string, options: ResolveOptions = {}): Promise<{ [index: string]: string }> {
        let identifier = await this.transformIdentifier(input);
        let foundMatchesPromises: { [key: string]: Promise<string> } = {}
        for (let [network, coins] of Object.entries(BaseIdrissCrypto.getWalletTags())) {
            if (options.network && network != options.network) continue;
            for (let [coin, tags] of Object.entries(coins)) {
                if (options.coin && coin != options.coin) continue;
                for (let [tag, tag_key] of Object.entries(tags)) {
                    if (tag_key) {
                        foundMatchesPromises[tag] = this.digestMessage(identifier + tag_key).then(digested => this.callWeb3GetIDriss(digested));
                        foundMatchesPromises[tag]
                        foundMatchesPromises[tag].catch(() => {
                        })
                    }
                }
            }
        }
        ///awaiting on the end for better performance
        let foundMatches: { [key: string]: string } = {}
        for (let [tag, promise] of Object.entries(foundMatchesPromises)) {
            try {
                let address = await promise;
                if (address) {
                    foundMatches[tag] = address;
                }
            } catch (e) {
                //ommit
            }
        }

        return foundMatches
    }

    public async multitransferToIDriss(
       sendParams: SendToAnyoneParams[],
       transactionOptions: TransactionOptions = {}
    ):Promise<MultiSendToHashTransactionReceipt | TransactionReceipt> {
        let result: MultiSendToHashTransactionReceipt | TransactionReceipt

        const sendToAnyoneContractAllowances = new Map<string, AssetLiability>()
        const tippingContractAllowances = new Map<string, AssetLiability>()

        const registeredUsersSendParams = []
        const newUsersSendParams = []

        for (let sendParam of sendParams) {

            if ((await this.web3Promise).utils.isAddress(sendParam.beneficiary)) {
                sendParam.hash = sendParam.beneficiary;
                this.addAssetForAllowanceToMap(tippingContractAllowances, sendParam.asset)
                registeredUsersSendParams.push(sendParam)
                continue;
            }

            const hash = await this.getUserHash(sendParam.walletType!, sendParam.beneficiary);
            const resolvedIDriss = await this.resolve(sendParam.beneficiary)

            //TODO: add approve for all for ERC721
            if (resolvedIDriss
                && resolvedIDriss[sendParam.walletType!.walletTag!]
                && resolvedIDriss[sendParam.walletType!.walletTag!].length > 0) {
                sendParam.hash = resolvedIDriss[sendParam.walletType!.walletTag!]
                this.addAssetForAllowanceToMap(tippingContractAllowances, sendParam.asset)
                registeredUsersSendParams.push(sendParam)
            } else {
                sendParam.hash = hash
                this.addAssetForAllowanceToMap(sendToAnyoneContractAllowances, sendParam.asset)
                newUsersSendParams.push(sendParam)
            }
        }

        const signer = await this.getConnectedAccount()

        await this.approveAssets([
            ...Array.from(sendToAnyoneContractAllowances.values())
        ], signer, this.IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS, transactionOptions);

        await this.approveAssets([
            ...Array.from(tippingContractAllowances.values())
        ], signer, this.IDRISS_TIPPING_CONTRACT_ADDRESS, transactionOptions);

        if (registeredUsersSendParams.length > 0) {
            result = await this.callWeb3multiTipping(registeredUsersSendParams, transactionOptions)
        }

        if (newUsersSendParams.length > 0) {
            result = await this.callWeb3multiSendToAnyone(newUsersSendParams, transactionOptions)
        }

        return result!
    }

    private async encodeTippingToHex(param: SendToAnyoneParams): Promise<string> {
        const method = await this.getTippingMethod(param)
        return method.encodeABI()
    }

    private async encodeSendToAnyoneToHex(hash: string, param: SendToAnyoneParams): Promise<string> {
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise
        return sendToHashContract.methods
           .sendToAnyone(hash, param.asset.amount, param.asset.type.valueOf(),
              param.asset.assetContractAddress ?? this.ZERO_ADDRESS, param.asset.assetId ?? 0, param.message ?? '')
           .encodeABI()
    }

    private addAssetForAllowanceToMap(assetsMap: Map<string, AssetLiability>, asset: AssetLiability) {
        if (asset.type !== AssetType.Native) {
            if (!asset.assetContractAddress || asset.assetContractAddress === '') {
                throw new Error("Asset address cannot be undefined")
            }

            // because for ERC721 we have to approve each id separately
            const assetMapKey = asset.type === AssetType.ERC721
               ? `${asset.assetContractAddress}-${asset.assetId}`
               : `${asset.assetContractAddress}`

            const savedAsset: AssetLiability = assetsMap
                  .get(assetMapKey)
                   ?? {...asset, amount: 0}

            savedAsset.amount = BigNumber.from(savedAsset.amount).add(asset.amount)
            assetsMap.set(assetMapKey, savedAsset)
        }
    }

    public async transferToIDriss(
        beneficiary: string,
        walletType: Required<ResolveOptions>,
        asset: AssetLiability,
        message: string,
        transactionOptions: TransactionOptions = {}
    ):Promise<SendToHashTransactionReceipt | TransactionReceipt> {
        if (walletType.network !== 'evm') {
            throw new Error('Only transfers on Polygon are supported at the moment')
        }

        let result: SendToHashTransactionReceipt | TransactionReceipt

        if ((await this.web3Promise).utils.isAddress(beneficiary)) {
            result = await this.callWeb3Tipping(beneficiary, asset, message, transactionOptions)
            return result
        }

        const hash = await this.getUserHash(walletType, beneficiary);
        const resolvedIDriss = await this.resolve(beneficiary)

        if (resolvedIDriss
            && resolvedIDriss[walletType.walletTag!]
            && resolvedIDriss[walletType.walletTag!].length > 0) {
            result = await this.callWeb3Tipping(resolvedIDriss[walletType.walletTag!], asset, message, transactionOptions)
        } else {
            result = await this.callWeb3SendToAnyone(hash, beneficiary, asset, message, transactionOptions)
        }

        return result
    }

    public async getUserHash(walletType: Required<ResolveOptions>, beneficiary: string) {
        const cleanedTag = this.getWalletTag(walletType);
        const transformedBeneficiary = await this.transformIdentifier(beneficiary)
        return await this.digestMessage(transformedBeneficiary + cleanedTag);
    }

    private getWalletTag(walletType: Required<ResolveOptions>) {
        const walletTags = BaseIdrissCrypto.getWalletTags()
        return walletTags[walletType.network!][walletType.coin!][walletType.walletTag!.trim()];
    }

    public async claim(
        beneficiary: string,
        claimPassword: string,
        walletType: Required<ResolveOptions>,
        asset: AssetLiability,
        transactionOptions: TransactionOptions = {}
    ):Promise<TransactionReceipt> {
        if (walletType.network !== 'evm') {
            throw new Error('Only transfers on Polygon are supported at the moment')
        }

        const hash = await this.getUserHash(walletType, beneficiary);

        return await this.callWeb3ClaimPayment(hash, claimPassword, asset, transactionOptions)
    }

    public async revertPayment(
        beneficiary: string,
        assetType: AssetType,
        assetContractAddress: string = this.ZERO_ADDRESS,
        transactionOptions: TransactionOptions = {}
    ):Promise<TransactionReceipt> {

        let result: TransactionReceipt

        result = await this.callRevertPayment(beneficiary, assetType, assetContractAddress, transactionOptions)
        return result

    }

    protected async transformIdentifier(input: string): Promise<string> {
        let identifier = this.lowerFirst(input).replace(" ", "");
        const inputType = BaseIdrissCrypto.matchInput(input);

        if (inputType === null) {
            throw new Error("Not a valid input. Input must start with valid phone number, email or @twitter handle.")
        } else if (inputType == "phone") {
            identifier = this.convertPhone(identifier)
        } else if (inputType == "twitter") {
            identifier = await this.twitterNameResolver.getTwitterID(identifier);
            if (identifier == "Not found")
                throw new Error("Twitter handle not found.")
        }

        return identifier
    }

    private async callWeb3GetIDriss(encrypted: string) {
        return await (await this.idrissRegistryContractPromise).methods.getIDriss(encrypted).call();
    }

    private async callWeb3ReverseIDriss(address: string): Promise<string> {
        return await (await this.idrissReverseMappingContractPromise).methods.reverseIDriss(address).call();
    }

    private async generateIDrissRegistryContract() {
        return new (await this.registryWeb3Promise).eth.Contract(
            IDrissRegistryAbi as AbiItem[],
            this.IDRISS_REGISTRY_CONTRACT_ADDRESS
        );
    }

    private async generateIDrissReverseMappingContract() {
        return new (await this.web3Promise).eth.Contract(
            IDrissReverseMappingAbi as AbiItem[],
            this.IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS
        );
    }

    private async generateERC20Contract(contractAddress: string) {
        return new (await this.web3Promise).eth.Contract(
            IERC20Abi as AbiItem[],
            contractAddress
        );
    }

    private async generateERC721Contract(contractAddress: string) {
        return new (await this.web3Promise).eth.Contract(
            IERC721Abi as AbiItem[],
            contractAddress
        );
    }

    private async generateERC1155Contract(contractAddress: string) {
        return new (await this.web3Promise).eth.Contract(
            IERC1155Abi as AbiItem[],
            contractAddress
        );
    }

    public async getHashForIdentifier(identifier: string, walletType: Required<ResolveOptions>, claimPassword: string): Promise<string> {
        const hash = await this.getUserHash(walletType, identifier)
        return this.generateHashWithPassword(hash, claimPassword)
    }

    private async generateHashWithPassword (hash: string, claimPassword: string): Promise<string> {
        return (await this.idrissSendToAnyoneContractPromise).methods.hashIDrissWithPassword(hash, claimPassword).call()
    }

    private async callWeb3Tipping(resolvedAddress: string, asset: AssetLiability, message: string, transactionOptions:TransactionOptions):Promise<TransactionReceipt> {
        const paymentFee = await this.calculateTippingPaymentFee(asset.amount, asset.type)
        const maticToSend = asset.type === AssetType.Native ? BigNumber.from(asset.amount) : paymentFee
        const signer = await this.getConnectedAccount()

        let transactionReceipt: TransactionReceipt

        await this.approveAssets([asset], signer,
           this.IDRISS_TIPPING_CONTRACT_ADDRESS, transactionOptions);

        message = message ?? ''

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await (await this.getTippingMethod({
                    asset: asset,
                    message: message,
                    beneficiary: message,
                    hash: resolvedAddress
                })).estimateGas({from: signer, value: maticToSend.toString()});
            }
            catch (e) {
                console.log("Could not estimate gas: ", e);
            }
        }

        const sendOptions = {
                from: signer,
                ...transactionOptions,
                value: maticToSend.toString()
            }

        transactionReceipt = (await this.getTippingMethod({
            asset: asset,
            message: message,
            beneficiary: message,
            hash: resolvedAddress
        })).send(sendOptions)

        return transactionReceipt
    }

    private async callRevertPayment(beneficiary: string, assetType: number, assetContractAddress: string, transactionOptions:TransactionOptions):Promise<TransactionReceipt> {

        const signer = await this.getConnectedAccount()
        let transactionReceipt: TransactionReceipt
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await sendToHashContract.methods.revertPayment(beneficiary, assetType, assetContractAddress).estimateGas({from: signer});
            }
            catch (e) {
                console.log("Could not estimate gas: ", e);
            }
        }

        const sendOptions = {
                from: signer,
                ...transactionOptions
            }

        transactionReceipt = await sendToHashContract.methods
            .revertPayment(beneficiary, assetType, assetContractAddress)
            .send(sendOptions);

        return transactionReceipt
    }

    private async getTippingMethod(params: SendToAnyoneParams): Promise<any> {
        let method: any
        const message = params.message ?? ''
        const tippingContract = await this.tippingContractPromise

        switch (params.asset.type) {
            case AssetType.Native:
                method = await tippingContract.methods
                    .sendTo(params.hash, params.asset.amount.toString(), message)
                break;
            case AssetType.ERC20:
                method = await tippingContract.methods
                    .sendTokenTo(params.hash, params.asset.amount.toString(), params.asset.assetContractAddress, message)
                break;
            case AssetType.ERC721:
                method = await tippingContract.methods
                    .sendERC721To(params.hash, params.asset.assetId, params.asset.assetContractAddress, message)
                break;
            case AssetType.ERC1155:
                method = await tippingContract.methods
                    .sendERC1155To(params.hash, params.asset.assetId, params.asset.amount.toString(), params.asset.assetContractAddress, message)
                break;
        }

        return method
    }

    private async callWeb3multiTipping(params: SendToAnyoneParams[], transactionOptions:TransactionOptions):Promise<TransactionReceipt> {
        let maticToSend: BigNumberish = BigNumber.from(0)
        const signer = await this.getConnectedAccount()
        let transactionReceipt: TransactionReceipt
        const tippingContract = await this.tippingContractPromise
        const encodedCalldata = []

        for (let param of params) {
            const paymentFee = await this.calculateTippingPaymentFee(param.asset.amount, param.asset.type)
            let properParamAmountToSend

            if (param.asset.type === AssetType.Native) {
                properParamAmountToSend = param.asset.amount
            } else {
                properParamAmountToSend = paymentFee
            }

            maticToSend = maticToSend.add(properParamAmountToSend)

            encodedCalldata.push(await this.encodeTippingToHex(param))
        }

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await tippingContract.methods.batch(encodedCalldata).estimateGas({from: signer, value: maticToSend.toString()});
            }
            catch (e) {
               console.log("Could not estimate gas: ", e);
           }
        }

        transactionReceipt = await tippingContract.methods
            .batch(encodedCalldata)
            .send({
                from: signer,
                ...transactionOptions,
                value: maticToSend.toString()
            })

        delete transactionOptions.gas

        return transactionReceipt
    }

    private async callWeb3multiSendToAnyone(params: SendToAnyoneParams[], transactionOptions:TransactionOptions):Promise<MultiSendToHashTransactionReceipt> {
        let maticToSend: BigNumberish = BigNumber.from(0)
        const signer = await this.getConnectedAccount()
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise
        const encodedCalldata = []
        let transactionReceipt: TransactionReceipt
        const beneficiaryClaims = []

        for (let param of params) {
                console.log("Asset amount pre-iteration is: ", param.asset.amount.toString())
        }

        for (let param of params) {
            const paymentFee = await this.calculateSendToAnyonePaymentFee(param.asset.amount, param.asset.type)
            let properParamAmountToSend
            let newParam = {...param, asset: {...param.asset}}

            if (param.asset.type === AssetType.Native) {
                console.log("Asset amount this iteration is: ", param.asset.amount.toString())
                properParamAmountToSend = BigNumber.from(param.asset.amount).add(paymentFee)
                // for native currency we pass item value in amount
                newParam.asset.amount = properParamAmountToSend
            } else {
                properParamAmountToSend = paymentFee
            }

            maticToSend = maticToSend.add(properParamAmountToSend)
            params[params.indexOf(param)] = newParam

            const claimPassword = await this.generateClaimPassword()
            const hashWithPassword = await this.generateHashWithPassword(param.hash!, claimPassword)
            encodedCalldata.push(await this.encodeSendToAnyoneToHex(hashWithPassword, param))

            const claimUrl = this.generateClaimUrl(param.beneficiary, param.asset, "$TBD$", claimPassword)
            beneficiaryClaims.push({beneficiary: param.hash!, claimPassword: claimPassword, claimUrl: claimUrl})
        }

        console.log("Finals params: ", params)
        console.log("Sending amount: ", maticToSend.toString())

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await sendToHashContract.methods.batch(encodedCalldata).estimateGas({from: signer, value: maticToSend.toString()});
            }
            catch (e) {
                console.log("Could not estimate gas: ", e);
            }
        }

        transactionReceipt = await sendToHashContract.methods
           .batch(encodedCalldata)
           .send({
               from: signer,
               ...transactionOptions,
               value: maticToSend.toString()
           })

        delete transactionOptions.gas

        beneficiaryClaims.forEach((val) => {
            val.claimUrl = val.claimUrl.replace('$TBD$', `${transactionReceipt.blockNumber}`)
        })

        return {
            transactionReceipt,
            // @ts-ignore
            data: beneficiaryClaims
        }
    }

    private generateClaimUrl (beneficiary: string, asset: AssetLiability, block: string, claimPassword: string) {
        const assetId = asset.type === AssetType.ERC1155 || asset.type === AssetType.ERC721
            ? `&assetId=${asset.assetId}` : ''
        const assetAddress = asset.type !== AssetType.Native ? `&assetAddress=${asset.assetContractAddress}` : ''
        return `${this.IDRISS_HOMEPAGE}/claim?identifier=${beneficiary}&claimPassword=${claimPassword}`
            + `${assetId}&assetType=${asset.type}${assetAddress}&blockNumber=${block}`
    }

    private async callWeb3SendToAnyone(hash: string, beneficiary: string, asset: AssetLiability,
                                       message: string, transactionOptions:TransactionOptions)
                                            :Promise<{ transactionReceipt: TransactionReceipt; claimUrl: string; claimPassword: string }> {
        const paymentFee = await this.calculateSendToAnyonePaymentFee(asset.amount, asset.type)
        const maticToSend = asset.type === AssetType.Native ? BigNumber.from(asset.amount).add(paymentFee) : paymentFee
        const signer = await this.getConnectedAccount()
        let transactionReceipt: TransactionReceipt
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise

        await this.approveAssets([asset], signer,
           this.IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS, transactionOptions);

        const claimPassword = await this.generateClaimPassword()
        const hashWithPassword = await this.generateHashWithPassword(hash, claimPassword)

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await sendToHashContract.methods.sendToAnyone(hashWithPassword, asset.amount, asset.type.valueOf(), asset.assetContractAddress ?? this.ZERO_ADDRESS, asset.assetId ?? 0, message ?? '').estimateGas({from: signer, value: maticToSend.toString()});
            }
            catch (e) {
                console.log("Could not estimate gas: ", e);
            }
        }

        transactionReceipt = await sendToHashContract.methods
            .sendToAnyone(hashWithPassword, asset.amount, asset.type.valueOf(),
                asset.assetContractAddress ?? this.ZERO_ADDRESS, asset.assetId ?? 0, message ?? '')
            .send({
                from: signer,
                ...transactionOptions,
                value: maticToSend.toString()
            })

        return {
            transactionReceipt,
            claimPassword,
            claimUrl: this.generateClaimUrl(beneficiary, asset, `${transactionReceipt.blockNumber}`, claimPassword)
        }
    }

    private async approveAssets(
       assets: AssetLiability[],
       signer: string,
       toContract: string,
       transactionOptions: TransactionOptions
    ) {
        let approvalTransactionReceipt: TransactionReceipt | boolean = false

        for (let asset of assets) {
            if (asset.type === AssetType.ERC20) {
                approvalTransactionReceipt = await this.authorizeERC20ForContract(
                   signer,
                   toContract,
                   asset,
                   transactionOptions)
            } else if (asset.type === AssetType.ERC721) {
                approvalTransactionReceipt = await this.authorizeERC721ForContract(
                   signer,
                   toContract,
                   asset,
                   transactionOptions)
            } else if (asset.type === AssetType.ERC1155) {
                approvalTransactionReceipt = await this.setAuthorizationForERC1155Contract(
                   signer,
                   toContract,
                   asset,
                   true,
                   transactionOptions)
            }

            // @ts-ignore
            if (approvalTransactionReceipt !== true && approvalTransactionReceipt && !approvalTransactionReceipt.status) {
                throw new Error(`Setting asset allowance failed for address ${asset.assetContractAddress}. Please check your asset balance.`)
            }
        }

        return approvalTransactionReceipt
    }

    public async calculateTippingPaymentFee(paymentAmount: BigNumberish, assetType: AssetType) {
        const tippingContract = await this.tippingContractPromise
        return await tippingContract.methods.getPaymentFee(paymentAmount, assetType).call()
    }

    public async calculateSendToAnyonePaymentFee(paymentAmount: BigNumberish, assetType: AssetType) {
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise
        return await sendToHashContract.methods.getPaymentFee(paymentAmount, assetType).call()
    }

    private async callWeb3ClaimPayment(
        hash: string,
        claimPass: string,
        asset: AssetLiability,
        transactionOptions: TransactionOptions = {}
    ):Promise<TransactionReceipt> {
        const signer = await this.getConnectedAccount()
        const sendToHashContract = await this.idrissSendToAnyoneContractPromise

        if (asset.type !== AssetType.Native && (!asset.assetContractAddress || asset.assetContractAddress.length === 0)) {
            throw Error("Invalid asset contract address sent for claiming")
        }

        if (!transactionOptions.gas) {
            try {
                transactionOptions.gas = await sendToHashContract.methods.claim(hash, claimPass, asset.type.valueOf(), asset.assetContractAddress ?? this.ZERO_ADDRESS).estimateGas({from: signer});
            }
            catch (e) {
                console.log("Could not estimate gas: ", e);
            }
        }

        return await sendToHashContract.methods
            .claim(hash, claimPass, asset.type.valueOf(), asset.assetContractAddress ?? this.ZERO_ADDRESS)
            .send({
                from: signer,
                ...transactionOptions,
                //TODO: check on this, should work automatically
                nonce: await (await this.web3Promise).eth.getTransactionCount(transactionOptions.from ?? signer)
            })
    }

    protected async generateClaimPassword(): Promise<string> {
        return (await this.web3Promise).utils.randomHex(16).slice(2)
    }

    private async authorizeERC20ForContract (
        signer: string,
        contractToAuthorize: string,
        asset: AssetLiability,
        transactionOptions: TransactionOptions = {}): Promise<TransactionReceipt | boolean> {
        const contract = await this.generateERC20Contract(asset.assetContractAddress!)
        const allowance = await contract.methods.allowance(signer, contractToAuthorize).call()

        if (BigNumber.from(allowance).lte(asset.amount)) {
            return contract.methods
                .approve(contractToAuthorize, BigNumber.from(asset.amount).sub(allowance).toString())
                .send({
                    from: signer,
                    ...transactionOptions
                })
        }
        return true
    }

    private async authorizeERC721ForContract (
        signer: string,
        contractToAuthorize: string,
        asset: AssetLiability,
        transactionOptions: TransactionOptions): Promise<TransactionReceipt | boolean> {
        const contract = await this.generateERC721Contract(asset.assetContractAddress!)
        const approvedAccount = await contract.methods.getApproved(asset.assetId).call()

        if (`${approvedAccount}`.toLowerCase() !== `${contractToAuthorize}`.toLowerCase()) {
            return contract.methods
                .approve(contractToAuthorize, asset.assetId)
                .send ({
                    from: signer,
                    ...transactionOptions
                })
        }
        return true
    }

    private async setAuthorizationForERC1155Contract (
        signer: string,
        contractToAuthorize: string,
        asset: AssetLiability,
        authToSet: boolean,
        transactionOptions: TransactionOptions): Promise<TransactionReceipt | boolean> {
        const contract = await this.generateERC1155Contract(asset.assetContractAddress!)
        const isApproved = await contract.methods.isApprovedForAll(signer, contractToAuthorize).call()

        if (isApproved !== authToSet) {
            return contract.methods
                // unfortunately ERC1155 standard does not allow granular permissions, and only option is to approve all user tokens
                .setApprovalForAll(contractToAuthorize, true)
                .send ({
                    from: signer,
                    ...transactionOptions
                })
        }
        return true
    }

    private async generateIDrissSendToAnyoneContract() {
        return new (await this.web3Promise).eth.Contract(
            IDrissSendToAnyoneAbi as AbiItem[],
            this.IDRISS_SEND_TO_ANYONE_CONTRACT_ADDRESS
        );
    }

    private async generateTippingContract() {
        return new (await this.web3Promise).eth.Contract(
            IDrissTippingAbi as AbiItem[],
            this.IDRISS_TIPPING_CONTRACT_ADDRESS
        );
    }

    private async generatePriceOracleContract() {
        return new (await this.web3Promise).eth.Contract(
            PriceOracleAbi as AbiItem[],
            this.PRICE_ORACLE_CONTRACT_ADDRESS
        );
    }

    protected static getWalletTags(): { [key: string]: { [key: string]: { [key: string]: string } } } {
        return {
            evm: {
                ETH: {
                    "Metamask ETH": "5d181abc9dcb7e79ce50e93db97addc1caf9f369257f61585889870555f8c321",
                    "Binance ETH": "4b118a4f0f3f149e641c6c43dd70283fcc07eacaa624efc762aa3843d85b2aba",
                    "Coinbase ETH": "92c7f97fb58ddbcb06c0d5a7cb720d74bc3c3aa52a0d706e477562cba68eeb73",
                    "Exchange ETH": "ec72020f224c088671cfd623235b59c239964a95542713390a2b6ba07dd1151c",
                    "Private ETH": "005ba8fbc4c85a25534ac36354d779ef35e0ee31f4f8732b02b61c25ee406edb",
                    "Essentials ETH": "3ea9415b82f0ee7db933aab0be377ee1c1a405969d8b8c2454bcce7372a161c2",
                    "Rainbow ETH": "992335db5f54ef94a5f23be8b925ed2529b044537c19b59643d39696936b6d6c",
                    "Argent ETH": "682614f9b037714bbf001db3a8d6e894fbdcf75cbbb9dea5a42edce33e880072",
                    "Tally ETH": "f368de8673a59b860b71f54c7ba8ab17f0b9648ad014797e5f8d8fa9f7f1d11a",
                    "Trust ETH": "df3d3f0233e396b2b27c3943269b10ecf2e7c1070a485e1b6b8f2201cb23cb52",
                    "Public ETH": "9306eda974cb89b82c0f38ab407f55b6d124159d1fa7779f2e088b2b786573c1",
                },
                BNB: {
                    "Metamask BNB": "3bee8eefc6afe6b4f7dbcc024eb3ad4ceaa5e458d34b7877319f2fe9f676e983",
                    "Essentials BNB": "639c9abb5605a14a557957fa72e146e9abf727be32e5149dca377b647317ebb9",
                },
                USDT: {
                    "Metamask USDT": "74a3d8986c81769ed3bb99b773d66b60852f7ee3fa0d55a6a144523116c671c1",
                    "Binance USDT": "77c27c19cc85e24b1d4650800cc4b1bc607986dd3e78608435cececd31c35015",
                    "Coinbase USDT": "f2faabf9d133f31a13873ba8a15e676e063a730898ffadfcb0077f723260f563",
                    "Exchange USDT": "683e7b694b374ce0d81ba525361fa0c27fff7237eb12ec41b6e225449d5702b9",
                    "Private USDT": "8c9a306a7dc200c52d32e3c1fcbf2f65e8037a68127b81807e8e58428004bc57",
                    "Essentials USDT": "74dcb573a5c63382484f597ae8034a6153c011e291c01eb3da40e9d83c436a9a",
                },
                USDC: {
                    "Metamask USDC": "6f763fea691b1a723ef116e98c02fae07a4397e1a2b4b4c749d06845fa2ff5e4",
                    "Binance USDC": "7d2b0e0ee27a341da84ce56e95eb557988f9d4ff95fe452297fc765265bb27a2",
                    "Coinbase USDC": "6fe7c1a2fdd154e0b35283598724adee9a5d3b2e6523787d8b6de7cd441f15ca",
                    "Exchange USDC": "8c4a231c47a4cfa7530ba4361b6926da4acd87f569167b8ba55b268bf99640d0",
                    "Private USDC": "54c9da06ab3d7c6c7f813f36491b22b7f312ae8f3b8d12866d35b5d325895e3e",
                    "Essentials USDC": "23a66df178daf25111083ee1610fb253baf3d12bd74c6c2aae96077558e3737a",
                },
                ELA: {
                    "Essentials ELA SC": "c17c556467fe7c9fe5667dde7ca8cdbca8a24d0473b9e9c1c2c8166c1f355f6c",
                },
                MATIC: {
                    "Essentials MATIC": "336fb6cdd7fec196c6e66966bd1c326072538a94e700b8bc1111d1574b8357ba",
                },
                ERC20: {
                    ERC20: "63d95e64e7caff988f97fdf32de5f16624f971149749c90fbc7bbe44244d3ced",
                },
            },
            btc: {
                BTC: {
                    "Binance BTC": "450efeca15651e50995ed494ac24a945e61d67f60bed0dbb3b2d8d7df122a8ca",
                    "Coinbase BTC": "b3c77df93f865dd21a6196266d5c291adad15c7db9c81ddc78409a22f36ebe84",
                    "Exchange BTC": "a3f104cace8d66ed9971b19f749a821ae4397349155ea1a8724451c3e680335b",
                    "Private BTC": "a7d3f51b26dad11f5f4842d29f2fc419a48e3471bdec0a2c713c7d18d3143d65",
                    "Essentials BTC": "39d18497a64591bb1b061940309c453495398d00f9d9deab8b2c1e0979e4cbe7",
                },
                ELA: {
                    "Essentials ELA": "35ae820c72397977701524ee610e7ef2ca3d64539ccdc65e5198470d8e49eccb",
                },
            },
            sol: {
                SOL: {
                    "Solana SOL": "62994eac84217f90c44d7acf962861f044a5f2e653400c154a8bcbf114da16fb",
                    "Coinbase SOL": "b5a72b6402de8a0fa649e23c81ae165dcfcce22c960a4a67a218243a73f49b1f",
                    "Trust SOL": "70190458e6435ad1e8f575ac60a7d8542ae5a4927aba336789de377a47b839d4",
                    "Binance SOL": "19cd4e6feb1efb40eb6506fb448a22cefeb63690ecaa35fee65914607adee606",
                    "Phantom SOL": "88f5c6ddb68a1cee77543f2de2788ade913b87bbac1c38d354707bc8ee3a0328",
                },
            },
        };
    }

    public async getDollarPriceInWei(): Promise<BigNumberish> {
        const contract = (await this.priceOracleContractPromise)
        const currentPriceData = await contract.methods.latestRoundData().call();
        const priceDecimals = await contract.methods.decimals().call();

        // because the Oracle provides only MATIC price, we calculate the opposite: dollar price in MATIC
        const etherInWei = BigNumber.from(10).pow(18)
        const priceDecimalsMul = BigNumber.from(10).pow(priceDecimals)
        return etherInWei.mul(priceDecimalsMul).div(currentPriceData.answer)
    }

    protected lowerFirst(input: string): string {
        return input.charAt(0).toLowerCase() + input.slice(1);
    }

    protected convertPhone(input: string): string {
        // allow for letters because secret word can follow phone number
        return "+" + input.replace(/[^\da-zA-Z]/, "")
    }

    protected abstract digestMessage(message: string): Promise<string>

    protected abstract getConnectedAccount(): Promise<string>

    protected static generateWeb3(web3: Promise<any>, url: string, provider?: provider) {
        return web3
            .then(x=>x.default)
            .then(Web3=>new Web3(
                provider ?? new Web3.providers.HttpProvider(url)
            ))
    }

    public async reverseResolve(address: string) {
        let result = await this.callWeb3ReverseIDriss(address);
        if (+result) {
            return ('@' + await this.twitterNameResolver.reverseTwitterID(result)).toLowerCase();
        } else {
            return result;
        }
    }
}
