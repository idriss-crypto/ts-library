import { TransactionReceipt } from "web3-core";
import { BigNumber, BigNumberish } from "ethers";

import { reverseTwitterID } from "./twitter";
import {
  ResolveOptions,
  AssetLiability,
  AssetType,
  ConnectionOptions,
  MultiSendToHashTransactionReceipt,
  SendToHashTransactionReceipt,
  PreparedTransaction,
  TransactionOptions,
  SendToAnyoneParams,
  VotingParams,
} from "./types";
import { Web3Provider } from "./web3Provider";
import { getWalletTag, WALLET_TAGS } from "./wallet";
import { Contract, ContractsAddresses, CONTRACTS_ADDRESSES } from "./contract";
import { ABIS } from "./abi";
import { matchInput, transformIdentifier } from "./utils";

const IDRISS_HOMEPAGE = "https://idriss.xyz";

export abstract class BaseIdrissCrypto {
  protected web3Provider: Web3Provider;
  protected registryWeb3Provider: Web3Provider;
  protected contractsAddressess: ContractsAddresses;

  private idrissRegistryContract: Contract;
  private idrissReverseMappingContract: Contract;
  private idrissSendToAnyoneContract: Contract;
  private priceOracleContract: Contract;
  private tippingContract: Contract;

  protected abstract digestMessage(message: string): Promise<string>;
  protected abstract getConnectedAccount(): Promise<string>;

  // we split web3 from web3 for registry, as registry is only accessible on Polygon,
  // and library is about to support multiple chains
  constructor(connectionOptions: ConnectionOptions) {
    this.contractsAddressess = {
      ...CONTRACTS_ADDRESSES,
      idrissRegistry:
        connectionOptions.idrissRegistryContractAddress ??
        CONTRACTS_ADDRESSES.idrissRegistry,
      idrissReverseMapping:
        connectionOptions.reverseIDrissMappingContractAddress ??
        CONTRACTS_ADDRESSES.idrissReverseMapping,
      priceOracle:
        connectionOptions.priceOracleContractAddress ??
        CONTRACTS_ADDRESSES.priceOracle,
      idrissSendToAnyone:
        connectionOptions.sendToAnyoneContractAddress ??
        CONTRACTS_ADDRESSES.idrissSendToAnyone,
      idrissTipping:
        connectionOptions.tippingContractAddress ??
        CONTRACTS_ADDRESSES.idrissTipping,
    };

    this.web3Provider = connectionOptions.web3Provider;
    // TODO: what about registry?
    this.registryWeb3Provider = connectionOptions.web3Provider;

    this.idrissRegistryContract = this.web3Provider.createContract(
      ABIS.IDrissRegistryAbi,
      this.contractsAddressess.idrissRegistry,
    );

    this.idrissReverseMappingContract = this.web3Provider.createContract(
      ABIS.IDrissReverseMappingAbi,
      this.contractsAddressess.idrissReverseMapping,
    );
    this.idrissSendToAnyoneContract = this.web3Provider.createContract(
      ABIS.IDrissSendToAnyoneAbi,
      this.contractsAddressess.idrissSendToAnyone,
    );
    this.priceOracleContract = this.web3Provider.createContract(
      ABIS.PriceOracleAbi,
      this.contractsAddressess.priceOracle,
    );
    this.tippingContract = this.web3Provider.createContract(
      ABIS.IDrissTippingAbi,
      this.contractsAddressess.idrissTipping,
    );
  }

  public static matchInput(input: string) {
    return matchInput(input);
  }

  public async resolve(input: string, options: ResolveOptions = {}) {
    let identifier = await transformIdentifier(input);
    let foundMatchesPromises: { [key: string]: Promise<string> } = {};
    for (let [network, coins] of Object.entries(WALLET_TAGS)) {
      if (options.network && network != options.network) continue;
      for (let [coin, tags] of Object.entries(coins)) {
        if (options.coin && coin != options.coin) continue;
        for (let [tag, tag_key] of Object.entries(tags)) {
          if (tag_key) {
            foundMatchesPromises[tag] = this.digestMessage(
              identifier + tag_key,
            ).then((digested) => {
              return this.idrissRegistryContract.callMethod({
                method: { name: "getIDriss", args: [digested] },
              });
            });
            foundMatchesPromises[tag];
            foundMatchesPromises[tag].catch(() => { });
          }
        }
      }
    }
    ///awaiting on the end for better performance
    let foundMatches: { [key: string]: string } = {};
    for (let [tag, promise] of Object.entries(foundMatchesPromises)) {
      try {
        let address = await promise;
        if (address && address.length > 0) {
          foundMatches[tag] = address;
        }
      } catch (e) {
        //ommit
      }
    }

    return foundMatches;
  }

  public async multitransferToIDriss(
    sendParams: SendToAnyoneParams[],
    transactionOptions: TransactionOptions = {},
  ) {
    let result: MultiSendToHashTransactionReceipt | TransactionReceipt;

    const sendToAnyoneContractAllowances = new Map<string, AssetLiability>();
    const tippingContractAllowances = new Map<string, AssetLiability>();

    const registeredUsersSendParams = [];
    const newUsersSendParams = [];

    for (let sendParam of sendParams) {
      if (this.web3Provider.isAddress(sendParam.beneficiary)) {
        sendParam.hash = sendParam.beneficiary;
        this.addAssetForAllowanceToMap(
          tippingContractAllowances,
          sendParam.asset,
        );
        registeredUsersSendParams.push(sendParam);
        continue;
      }

      const hash = await this.getUserHash(
        sendParam.walletType!,
        sendParam.beneficiary,
      );
      const resolvedIDriss = await this.resolve(sendParam.beneficiary);

      //TODO: add approve for all for ERC721
      if (
        resolvedIDriss &&
        resolvedIDriss[sendParam.walletType!.walletTag!] &&
        resolvedIDriss[sendParam.walletType!.walletTag!].length > 0
      ) {
        sendParam.hash = resolvedIDriss[sendParam.walletType!.walletTag!];
        this.addAssetForAllowanceToMap(
          tippingContractAllowances,
          sendParam.asset,
        );
        registeredUsersSendParams.push(sendParam);
      } else {
        sendParam.hash = hash;
        this.addAssetForAllowanceToMap(
          sendToAnyoneContractAllowances,
          sendParam.asset,
        );
        newUsersSendParams.push(sendParam);
      }
    }

    const signer = await this.getConnectedAccount();

    await this.approveAssets(
      [...Array.from(sendToAnyoneContractAllowances.values())],
      signer,
      this.contractsAddressess.idrissSendToAnyone,
      transactionOptions,
    );

    await this.approveAssets(
      [...Array.from(tippingContractAllowances.values())],
      signer,
      this.contractsAddressess.idrissTipping,
      transactionOptions,
    );

    if (registeredUsersSendParams.length > 0) {
      result = await this.callWeb3multiTipping(
        registeredUsersSendParams,
        transactionOptions,
      );
    }

    if (newUsersSendParams.length > 0) {
      result = await this.callWeb3multiSendToAnyone(
        newUsersSendParams,
        transactionOptions,
      );
    }

    return result!;
  }

  private async encodeTippingToHex(param: SendToAnyoneParams) {
    const method = await this.getTippingMethod(param);
    return method.encodeABI();
  }

  private async encodeSendToAnyoneToHex(
    hash: string,
    param: SendToAnyoneParams,
  ) {
    return this.idrissSendToAnyoneContract.encodeABI({
      method: {
        name: "sendToAnyone",
        args: [
          hash,
          param.asset.amount,
          param.asset.type.valueOf(),
          param.asset.assetContractAddress ?? this.contractsAddressess.zero,
          param.asset.assetId ?? 0,
          param.message ?? "",
        ],
      },
    });
  }

  private addAssetForAllowanceToMap(
    assetsMap: Map<string, AssetLiability>,
    asset: AssetLiability,
  ) {
    if (asset.type !== AssetType.Native) {
      if (!asset.assetContractAddress || asset.assetContractAddress === "") {
        throw new Error("Asset address cannot be undefined");
      }

      // because for ERC721 we have to approve each id separately
      const assetMapKey =
        asset.type === AssetType.ERC721
          ? `${asset.assetContractAddress}-${asset.assetId}`
          : `${asset.assetContractAddress}`;

      const savedAsset: AssetLiability = assetsMap.get(assetMapKey) ?? {
        ...asset,
        amount: 0,
      };

      savedAsset.amount = BigNumber.from(savedAsset.amount).add(asset.amount);
      assetsMap.set(assetMapKey, savedAsset);
    }
  }

  public async transferToIDriss(
    beneficiary: string,
    walletType: Required<ResolveOptions>,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions = {},
  ) {
    if (walletType.network !== "evm") {
      throw new Error("Only transfers on Polygon are supported at the moment");
    }

    let result: SendToHashTransactionReceipt | TransactionReceipt;

    if (this.web3Provider.isAddress(beneficiary)) {
      result = await this.callWeb3Tipping(
        beneficiary,
        asset,
        message,
        transactionOptions,
      );
      return result;
    }

    const hash = await this.getUserHash(walletType, beneficiary);
    const resolvedIDriss = await this.resolve(beneficiary);

    if (
      resolvedIDriss &&
      resolvedIDriss[walletType.walletTag!] &&
      resolvedIDriss[walletType.walletTag!].length > 0
    ) {
      result = await this.callWeb3Tipping(
        resolvedIDriss[walletType.walletTag!],
        asset,
        message,
        transactionOptions,
      );
    } else {
      result = await this.callWeb3SendToAnyone(
        hash,
        beneficiary,
        asset,
        message,
        transactionOptions,
      );
    }

    return result;
  }

  //@dev only callable on supported gitcoin round networks (optimism)
  public async vote(
    encodedVote: string,
    asset: AssetLiability,
    roundContractAddress: string,
    transactionOptions: TransactionOptions = {},
  ) {
    let result: TransactionReceipt;

    result = await this.callWeb3Vote(
      encodedVote,
      asset,
      roundContractAddress,
      transactionOptions,
    );

    return result;
  }

  public async getUserHash(
    walletType: Required<ResolveOptions>,
    beneficiary: string,
  ) {
    const cleanedTag = getWalletTag(walletType);
    const transformedBeneficiary = await transformIdentifier(beneficiary);
    return this.digestMessage(transformedBeneficiary + cleanedTag);
  }

  public async claim(
    beneficiary: string,
    claimPassword: string,
    walletType: Required<ResolveOptions>,
    asset: AssetLiability,
    transactionOptions: TransactionOptions = {},
  ) {
    if (walletType.network !== "evm") {
      throw new Error("Only transfers on Polygon are supported at the moment");
    }

    const hash = await this.getUserHash(walletType, beneficiary);

    return this.callWeb3ClaimPayment(
      hash,
      claimPassword,
      asset,
      transactionOptions,
    );
  }

  public async revertPayment(
    beneficiary: string,
    assetType: AssetType,
    assetContractAddress: string = this.contractsAddressess.zero,
    transactionOptions: TransactionOptions = {},
  ) {
    return this.callRevertPayment(
      beneficiary,
      assetType,
      assetContractAddress,
      transactionOptions,
    );
  }

  public async getHashForIdentifier(
    identifier: string,
    walletType: Required<ResolveOptions>,
    claimPassword: string,
  ): Promise<string> {
    const hash = await this.getUserHash(walletType, identifier);
    return this.generateHashWithPassword(hash, claimPassword);
  }

  private async generateHashWithPassword(
    hash: string,
    claimPassword: string,
  ): Promise<string> {
    return this.idrissSendToAnyoneContract.callMethod({
      method: { name: "hashIDrissWithPassword", args: [hash, claimPassword] },
    });
  }

  private async callWeb3Vote(
    encodedVote: string,
    asset: AssetLiability,
    roundContractAddress: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const nativeToSend =
      asset.type === AssetType.Native
        ? BigNumber.from(asset.amount)
        : BigNumber.from("0");
    const signer = await this.getConnectedAccount();

    let transactionReceipt: TransactionReceipt;

    await this.approveAssets(
      [asset],
      signer,
      roundContractAddress,
      transactionOptions,
    );

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas = await (
          await this.getVotingMethod({
            encodedVote: encodedVote,
            roundContractAddress: roundContractAddress,
            asset: asset,
          })
        ).estimateGas({ from: signer, value: nativeToSend.toString() });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    const sendOptions = {
      from: signer,
      ...transactionOptions,
      value: nativeToSend.toString(),
    };

    transactionReceipt = await (
      await this.getVotingMethod({
        encodedVote: encodedVote,
        roundContractAddress: roundContractAddress,
        asset: asset,
      })
    ).send(sendOptions);

    return transactionReceipt;
  }

  private async callWeb3Tipping(
    resolvedAddress: string,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const paymentFee = await this.calculateTippingPaymentFee(
      asset.amount,
      asset.type,
    );

    const maticToSend =
      asset.type === AssetType.Native
        ? BigNumber.from(asset.amount)
        : paymentFee;
    const signer = await this.getConnectedAccount();

    let transactionReceipt: TransactionReceipt;

    await this.approveAssets(
      [asset],
      signer,
      this.contractsAddressess.idrissTipping,
      transactionOptions,
    );

    message = message ?? "";

    if (!transactionOptions.gas) {
      try {
        const tippingMethod = await this.getTippingMethod({
          asset: asset,
          message: message,
          beneficiary: message,
          hash: resolvedAddress,
        });
        transactionOptions.gas = await tippingMethod.estimateGas({
          from: signer,
          value: maticToSend.toString(),
        });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    const sendOptions = {
      from: signer,
      ...transactionOptions,
      value: maticToSend.toString(),
    };

    const tippingMethod = await this.getTippingMethod({
      asset: asset,
      message: message,
      beneficiary: message,
      hash: resolvedAddress,
    });

    transactionReceipt = await tippingMethod.send(sendOptions);

    return transactionReceipt;
  }

  private async callRevertPayment(
    beneficiary: string,
    assetType: number,
    assetContractAddress: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const signer = await this.getConnectedAccount();
    let transactionReceipt: TransactionReceipt;

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: {
              name: "revertPayment",
              args: [beneficiary, assetType, assetContractAddress],
            },
            estimateGasOptions: {
              from: signer,
            },
          });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    const sendOptions = {
      from: signer,
      ...transactionOptions,
    };

    transactionReceipt = await this.idrissSendToAnyoneContract.sendTransaction({
      method: {
        name: "revertPayment",
        args: [beneficiary, assetType, assetContractAddress],
      },
      transactionOptions: sendOptions,
    });

    return transactionReceipt;
  }

  private async getVotingMethod(
    params: VotingParams,
  ): Promise<PreparedTransaction> {
    if (params.asset.type !== AssetType.Native) {
      throw new Error(
        `Expected native asset type, received: ${params.asset.type}`,
      );
    }

    const votingContract = this.web3Provider.createContract(
      ABIS.GitcoinVotingAbi,
      params.roundContractAddress,
    );

    return votingContract.prepareTransaction({
      method: {
        name: "vote",
        args: [params.encodedVote],
      },
    });
  }

  private async getTippingMethod(
    params: SendToAnyoneParams,
  ): Promise<PreparedTransaction> {
    let method: PreparedTransaction;
    const message = params.message ?? "";

    switch (params.asset.type) {
      case AssetType.Native:
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: "sendTo",
            args: [params.hash, params.asset.amount.toString(), message],
          },
        });
        break;
      case AssetType.ERC20:
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: "sendTokenTo",
            args: [
              params.hash,
              params.asset.amount.toString(),
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      case AssetType.ERC721:
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: "sendERC721To",
            args: [
              params.hash,
              params.asset.assetId,
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      case AssetType.ERC1155:
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: "sendERC1155To",
            args: [
              params.hash,
              params.asset.assetId,
              params.asset.amount.toString(),
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
    }

    return method;
  }

  private async callWeb3multiTipping(
    params: SendToAnyoneParams[],
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    let maticToSend: BigNumberish = BigNumber.from(0);

    const signer = await this.getConnectedAccount();
    let transactionReceipt: TransactionReceipt;
    const encodedCalldata = [];

    for (let param of params) {
      const paymentFee = await this.calculateTippingPaymentFee(
        param.asset.amount,
        param.asset.type,
      );
      let properParamAmountToSend;

      if (param.asset.type === AssetType.Native) {
        properParamAmountToSend = param.asset.amount;
      } else {
        properParamAmountToSend = paymentFee;
      }

      maticToSend = maticToSend.add(properParamAmountToSend);

      encodedCalldata.push(await this.encodeTippingToHex(param));
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas = await this.tippingContract.estimateGas({
          method: { name: "batch", args: [encodedCalldata] },
          estimateGasOptions: {
            from: signer,
            value: maticToSend.toString(),
          },
        });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    transactionReceipt = await this.tippingContract.sendTransaction({
      method: {
        name: "batch",
        args: [encodedCalldata],
      },
      transactionOptions: {
        from: signer,
        ...transactionOptions,
        value: maticToSend.toString(),
      },
    });

    delete transactionOptions.gas;

    return transactionReceipt;
  }

  private async callWeb3multiSendToAnyone(
    params: SendToAnyoneParams[],
    transactionOptions: TransactionOptions,
  ): Promise<MultiSendToHashTransactionReceipt> {
    let maticToSend: BigNumberish = BigNumber.from(0);
    const signer = await this.getConnectedAccount();
    const encodedCalldata = [];
    let transactionReceipt: TransactionReceipt;
    const beneficiaryClaims = [];

    for (let param of params) {
      let newParam = { ...param, asset: { ...param.asset } };
      const paymentFee = await this.calculateSendToAnyonePaymentFee(
        newParam.asset.amount,
        newParam.asset.type,
      );
      let properParamAmountToSend;

      if (newParam.asset.type === AssetType.Native) {
        properParamAmountToSend = BigNumber.from(newParam.asset.amount).add(
          paymentFee,
        );
        // for native currency we pass item value in amount
        newParam.asset.amount = properParamAmountToSend;
      } else {
        properParamAmountToSend = paymentFee;
      }

      maticToSend = maticToSend.add(properParamAmountToSend);

      const claimPassword = await this.generateClaimPassword();
      const hashWithPassword = await this.generateHashWithPassword(
        newParam.hash!,
        claimPassword,
      );
      encodedCalldata.push(
        await this.encodeSendToAnyoneToHex(hashWithPassword, newParam),
      );

      const claimUrl = this.generateClaimUrl(
        newParam.beneficiary,
        newParam.asset,
        "$TBD$",
        claimPassword,
      );
      beneficiaryClaims.push({
        beneficiary: newParam.hash!,
        claimPassword: claimPassword,
        claimUrl: claimUrl,
      });

      params[params.indexOf(param)] = newParam;
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: { name: "batch", args: [encodedCalldata] },
            estimateGasOptions: {
              from: signer,
              value: maticToSend.toString(),
            },
          });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    transactionReceipt = await this.idrissSendToAnyoneContract.sendTransaction({
      method: {
        name: "batch",
        args: [encodedCalldata],
      },
      transactionOptions: {
        from: signer,
        ...transactionOptions,
        value: maticToSend.toString(),
      },
    });

    delete transactionOptions.gas;

    beneficiaryClaims.forEach((val) => {
      val.claimUrl = val.claimUrl.replace(
        "$TBD$",
        `${transactionReceipt.blockNumber}`,
      );
    });

    return {
      transactionReceipt,
      data: beneficiaryClaims,
    };
  }

  private generateClaimUrl(
    beneficiary: string,
    asset: AssetLiability,
    block: string,
    claimPassword: string,
  ) {
    const assetId =
      asset.type === AssetType.ERC1155 || asset.type === AssetType.ERC721
        ? `&assetId=${asset.assetId}`
        : "";
    const assetAddress =
      asset.type !== AssetType.Native
        ? `&assetAddress=${asset.assetContractAddress}`
        : "";
    return (
      `${IDRISS_HOMEPAGE}/claim?identifier=${beneficiary}&claimPassword=${claimPassword}` +
      `${assetId}&assetType=${asset.type}${assetAddress}&blockNumber=${block}`
    );
  }

  private async callWeb3SendToAnyone(
    hash: string,
    beneficiary: string,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions,
  ): Promise<{
    transactionReceipt: TransactionReceipt;
    claimUrl: string;
    claimPassword: string;
  }> {
    const paymentFee = await this.calculateSendToAnyonePaymentFee(
      asset.amount,
      asset.type,
    );
    const maticToSend =
      asset.type === AssetType.Native
        ? BigNumber.from(asset.amount).add(paymentFee)
        : paymentFee;
    const signer = await this.getConnectedAccount();
    let transactionReceipt: TransactionReceipt;

    await this.approveAssets(
      [asset],
      signer,
      this.contractsAddressess.idrissSendToAnyone,
      transactionOptions,
    );

    const claimPassword = await this.generateClaimPassword();
    const hashWithPassword = await this.generateHashWithPassword(
      hash,
      claimPassword,
    );
    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: {
              name: "sendToAnyone",
              args: [
                hashWithPassword,
                asset.amount,
                asset.type.valueOf(),
                asset.assetContractAddress ?? this.contractsAddressess.zero,
                asset.assetId ?? 0,
                message ?? "",
              ],
            },
            estimateGasOptions: {
              from: signer,
              value: maticToSend.toString(),
            },
          });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    // TODO: fails here on ethers
    transactionReceipt = await this.idrissSendToAnyoneContract.sendTransaction({
      method: {
        name: "sendToAnyone",
        args: [
          hashWithPassword,
          asset.amount,
          asset.type.valueOf(),
          asset.assetContractAddress ?? this.contractsAddressess.zero,
          asset.assetId ?? 0,
          message ?? "",
        ],
      },
      transactionOptions: {
        from: signer,
        ...transactionOptions,
        value: maticToSend.toString(),
      },
    });

    return {
      transactionReceipt,
      claimPassword,
      claimUrl: this.generateClaimUrl(
        beneficiary,
        asset,
        `${transactionReceipt.blockNumber}`,
        claimPassword,
      ),
    };
  }

  private async approveAssets(
    assets: AssetLiability[],
    signer: string,
    toContract: string,
    transactionOptions: TransactionOptions,
  ) {
    let approvalTransactionReceipt: TransactionReceipt | boolean = false;

    for (let asset of assets) {
      if (asset.type === AssetType.ERC20) {
        approvalTransactionReceipt = await this.authorizeERC20ForContract(
          signer,
          toContract,
          asset,
          transactionOptions,
        );
      } else if (asset.type === AssetType.ERC721) {
        approvalTransactionReceipt = await this.authorizeERC721ForContract(
          signer,
          toContract,
          asset,
          transactionOptions,
        );
      } else if (asset.type === AssetType.ERC1155) {
        approvalTransactionReceipt =
          await this.setAuthorizationForERC1155Contract(
            signer,
            toContract,
            asset,
            true,
            transactionOptions,
          );
      }

      // @ts-ignore
      if (
        approvalTransactionReceipt !== true &&
        approvalTransactionReceipt &&
        !approvalTransactionReceipt.status
      ) {
        throw new Error(
          `Setting asset allowance failed for address ${asset.assetContractAddress}. Please check your asset balance.`,
        );
      }
    }

    return approvalTransactionReceipt;
  }

  public async calculateTippingPaymentFee(
    paymentAmount: BigNumberish,
    assetType: AssetType,
  ) {
    if (assetType === AssetType.ERC20) return "0";
    return this.tippingContract.callMethod({
      method: {
        name: "getPaymentFee",
        args: [paymentAmount, assetType],
      },
    });
  }

  public async calculateSendToAnyonePaymentFee(
    paymentAmount: BigNumberish,
    assetType: AssetType,
  ) {
    return this.idrissSendToAnyoneContract.callMethod({
      method: {
        name: "getPaymentFee",
        args: [paymentAmount, assetType],
      },
    });
  }

  private async callWeb3ClaimPayment(
    hash: string,
    claimPass: string,
    asset: AssetLiability,
    transactionOptions: TransactionOptions = {},
  ): Promise<TransactionReceipt> {
    const signer = await this.getConnectedAccount();

    if (
      asset.type !== AssetType.Native &&
      (!asset.assetContractAddress || asset.assetContractAddress.length === 0)
    ) {
      throw Error("Invalid asset contract address sent for claiming");
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: {
              name: "claim",
              args: [
                hash,
                claimPass,
                asset.type.valueOf(),
                asset.assetContractAddress ?? this.contractsAddressess.zero,
              ],
            },
            estimateGasOptions: {
              from: signer,
            },
          });
      } catch (e) {
        console.log("Could not estimate gas: ", e);
      }
    }

    return this.idrissSendToAnyoneContract.sendTransaction({
      method: {
        name: "claim",
        args: [
          hash,
          claimPass,
          asset.type.valueOf(),
          asset.assetContractAddress ?? this.contractsAddressess.zero,
        ],
      },
      transactionOptions: {
        from: signer,
        ...transactionOptions,
        //TODO: check on this, should work automatically
        nonce: await this.web3Provider.getTransactionCount(
          transactionOptions.from ?? signer,
        ),
      },
    });
  }

  protected async generateClaimPassword(): Promise<string> {
    return this.web3Provider.randomHex(16).slice(2);
  }

  private async authorizeERC20ForContract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    transactionOptions: TransactionOptions = {},
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC20Abi,
      asset.assetContractAddress!,
    );

    const allowance = await contract.callMethod({
      method: {
        name: "allowance",
        args: [signer, contractToAuthorize],
      },
    });

    const allowanceAsBigNumber = BigNumber.isBigNumber(allowance)
      ? allowance
      : BigNumber.from(allowance);

    if (allowanceAsBigNumber.lte(asset.amount)) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: "approve",
              args: [
                contractToAuthorize,
                BigNumber.from(asset.amount).toString(),
              ],
            },
            estimateGasOptions: {
              from: signer,
            },
          });
          transactionOptions.gas = BigNumber.isBigNumber(transactionOptions.gas)
            ? transactionOptions.gas.toNumber()
            : transactionOptions.gas;
        } catch (e) {
          console.log("Could not estimate gas: ", e);
        }
      }
      try {
        let approval = await contract.sendTransaction({
          method: {
            name: "approve",
            args: [
              contractToAuthorize,
              BigNumber.from(asset.amount).toString(),
            ],
          },
          transactionOptions: {
            from: signer,
            ...transactionOptions,
          },
        });
        delete transactionOptions.gas;
        return approval;
      } catch (e) {
        console.log(e);
      }
    }

    return true;
  }

  private async authorizeERC721ForContract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC721Abi,
      asset.assetContractAddress!,
    );

    const approvedAccount = await contract.callMethod({
      method: {
        name: "getApproved",
        args: [asset.assetId],
      },
    });

    if (
      `${approvedAccount}`.toLowerCase() !==
      `${contractToAuthorize}`.toLowerCase()
    ) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: "approve",
              args: [contractToAuthorize, asset.assetId],
            },
            estimateGasOptions: {
              from: signer,
            },
          });
        } catch (e) {
          console.log("Could not estimate gas: ", e);
        }
      }

      let approval = await contract.sendTransaction({
        method: { name: "approve", args: [contractToAuthorize, asset.assetId] },
        transactionOptions: {
          from: signer,
          ...transactionOptions,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }
    return true;
  }

  private async setAuthorizationForERC1155Contract(
    signer: string,
    contractToAuthorize: string,
    asset: AssetLiability,
    authToSet: boolean,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt | boolean> {
    const contract = this.web3Provider.createContract(
      ABIS.IERC1155Abi,
      asset.assetContractAddress!,
    );

    const isApproved = await contract.callMethod({
      method: {
        name: "isApprovedForAll",
        args: [signer, contractToAuthorize],
      },
    });

    if (isApproved !== authToSet) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: "setApprovalForAll",
              args: [contractToAuthorize, true],
            },
            estimateGasOptions: {
              from: signer,
            },
          });
        } catch (e) {
          console.log("Could not estimate gas: ", e);
        }
      }
      // unfortunately ERC1155 standard does not allow granular permissions, and only option is to approve all user tokens
      let approval = await contract.sendTransaction({
        method: {
          name: "setApprovalForAll",
          args: [contractToAuthorize, true],
        },
        transactionOptions: {
          from: signer,
          ...transactionOptions,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }
    return true;
  }

  public async getDollarPriceInWei(): Promise<BigNumberish> {
    const currentPriceData = await this.priceOracleContract.callMethod({
      method: { name: "latestRoundData", args: [] },
    });
    const priceDecimals = await this.priceOracleContract.callMethod({
      method: { name: "decimals", args: [] },
    });

    // because the Oracle provides only MATIC price, we calculate the opposite: dollar price in MATIC
    const etherInWei = BigNumber.from(10).pow(18);
    const priceDecimalsMul = BigNumber.from(10).pow(priceDecimals);
    return etherInWei.mul(priceDecimalsMul).div(currentPriceData.answer);
  }

  public async reverseResolve(address: string) {
    const result = await this.idrissReverseMappingContract.callMethod({
      method: { name: "reverseIDriss", args: [address] },
    });

    if (+result) {
      return ("@" + (await reverseTwitterID(result))).toLowerCase();
    } else {
      return result;
    }
  }
}
