import type { TransactionReceipt } from 'web3-core/types';
import type { BigNumberish } from '@ethersproject/bignumber';
import { BigNumber } from '@ethersproject/bignumber';
import Web3 from 'web3';

import { reverseTwitterID } from './twitter/utils';
import type { Web3Provider } from './web3Provider';
import { Web3ProviderAdapter } from './web3Provider';
import { ABIS } from './abi/constants';
import { NonOptional } from './utils-types';
import { CONTRACTS_ADDRESSES } from './contract/constants';
import type { ContractsAddresses } from './contract/constants';
import type { Contract } from './contract/types';
import type { ConnectionOptions } from './types/connectionOptions';
import { matchInput } from './utils/matchInput';
import type { ResolveOptions } from './wallet/types';
import { transformIdentifier } from './utils/transformIdentifier';
import { filterWalletTags, getWalletTagAddress } from './wallet/utils';
import type { SendToAnyoneParams } from './types/sendToAnyoneParams';
import type {
  PreparedTransaction,
  TransactionOptions,
} from './types/transactionOptions';
import type {
  MultiSendToHashTransactionReceipt,
  SendToHashTransactionReceipt,
} from './types/sendToHashTransactionReceipt';
import type { AssetLiability } from './types/assetLiability';
import { AssetType } from './types/assetType';
import type { VotingParams } from './types/votingParams';

const IDRISS_HOMEPAGE = 'https://idriss.xyz';

export abstract class BaseIdrissCrypto {
  protected web3Provider: Web3Provider;
  protected registryWeb3Provider: Web3Provider;
  protected contractsAddressess: ContractsAddresses;

  private idrissRegistryContract: Contract;
  private idrissMultipleRegistryContract: Contract;
  private idrissReverseMappingContract: Contract;
  private idrissSendToAnyoneContract: Contract;
  private priceOracleContract: Contract;
  private tippingContract: Contract;

  protected abstract digestMessage(message: string): Promise<string>;
  protected abstract getConnectedAccount(): Promise<string>;

  // we split web3 from web3 for registry, as registry is only accessible on Polygon,
  // and library is about to support multiple chains
  constructor(url: string, connectionOptions: ConnectionOptions) {
    this.contractsAddressess = {
      ...CONTRACTS_ADDRESSES,
      idrissRegistry:
        connectionOptions.idrissRegistryContractAddress ??
        CONTRACTS_ADDRESSES.idrissRegistry,
      idrissMultipleRegistry:
        connectionOptions.idrissMultipleRegistryContractAddress ??
        CONTRACTS_ADDRESSES.idrissMultipleRegistry,
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

    this.registryWeb3Provider = Web3ProviderAdapter.fromWeb3(
      new Web3(new Web3.providers.HttpProvider(url)),
    );

    this.idrissRegistryContract = this.registryWeb3Provider.createContract(
      ABIS.IDrissRegistryAbi,
      this.contractsAddressess.idrissRegistry,
    );

    this.idrissMultipleRegistryContract =
      this.registryWeb3Provider.createContract(
        ABIS.IDrissMultipleRegistryAbiJson,
        this.contractsAddressess.idrissMultipleRegistry,
      );

    this.idrissReverseMappingContract =
      this.registryWeb3Provider.createContract(
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

  public getIDriss(hash: string) {
    return this.idrissRegistryContract.callMethod({
      method: { name: 'getIDriss', args: [hash] },
    });
  }

  public async resolve(input: string, resolveOptions: ResolveOptions = {}) {
    const identifier = await transformIdentifier(input);
    const filteredWalletTags = filterWalletTags(resolveOptions);

    const digestPromises = filteredWalletTags.map(
      async ({ tagAddress, tagName }) => {
        const digested = await this.digestMessage(identifier + tagAddress);
        return { digested, tagName };
      },
    );

    const digestionResult = await Promise.all(digestPromises);
    const digestedMessages = digestionResult.map((v) => v.digested);

    const getMultipleIDrissResponse: Array<[string, string]> =
      await this.idrissMultipleRegistryContract.callMethod({
        method: { name: 'getMultipleIDriss', args: [digestedMessages] },
      });

    return Object.fromEntries(
      getMultipleIDrissResponse
        .map(([digested, resolvedAddress]) => {
          if (!resolvedAddress) {
            return;
          }

          const foundResult = digestionResult.find(
            (v) => v.digested === digested,
          );

          if (!foundResult) {
            throw new Error(`Expected digested message: ${digested}`);
          }

          return [foundResult.tagName, resolvedAddress];
        })
        .filter(Boolean),
    );
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

    for (const sendParam of sendParams) {
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
      [...sendToAnyoneContractAllowances.values()],
      signer,
      this.contractsAddressess.idrissSendToAnyone,
      transactionOptions,
    );

    await this.approveAssets(
      [...tippingContractAllowances.values()],
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
        name: 'sendToAnyone',
        args: [
          hash,
          param.asset.amount,
          param.asset.type.valueOf(),
          param.asset.assetContractAddress ?? this.contractsAddressess.zero,
          param.asset.assetId ?? 0,
          param.message ?? '',
        ],
      },
    });
  }

  private addAssetForAllowanceToMap(
    assetsMap: Map<string, AssetLiability>,
    asset: AssetLiability,
  ) {
    if (asset.type !== AssetType.Native) {
      if (!asset.assetContractAddress || asset.assetContractAddress === '') {
        throw new Error('Asset address cannot be undefined');
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
    resolveOptions: NonOptional<ResolveOptions>,
    asset: AssetLiability,
    message: string,
    transactionOptions: TransactionOptions = {},
  ) {
    if (resolveOptions.network !== 'evm') {
      throw new Error('Only transfers on Polygon are supported at the moment');
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

    const hash = await this.getUserHash(resolveOptions, beneficiary);
    const resolvedIDriss = await this.resolve(beneficiary);

    result = await (resolvedIDriss &&
    resolvedIDriss[resolveOptions.walletTag!] &&
    resolvedIDriss[resolveOptions.walletTag!].length > 0
      ? this.callWeb3Tipping(
          resolvedIDriss[resolveOptions.walletTag!],
          asset,
          message,
          transactionOptions,
        )
      : this.callWeb3SendToAnyone(
          hash,
          beneficiary,
          asset,
          message,
          transactionOptions,
        ));

    return result;
  }

  vote(
    encodedVote: string,
    asset: AssetLiability,
    roundContractAddress: string,
    transactionOptions: TransactionOptions = {},
  ) {
    return this.callWeb3Vote(
      encodedVote,
      asset,
      roundContractAddress,
      transactionOptions,
    );
  }

  public async getUserHash(
    resolveOptions: NonOptional<ResolveOptions>,
    beneficiary: string,
  ) {
    const cleanedTagAddress = getWalletTagAddress(resolveOptions);
    const transformedBeneficiary = await transformIdentifier(beneficiary);
    return this.digestMessage(transformedBeneficiary + cleanedTagAddress);
  }

  public async claim(
    beneficiary: string,
    claimPassword: string,
    walletType: NonOptional<ResolveOptions>,
    asset: AssetLiability,
    transactionOptions: TransactionOptions = {},
  ) {
    if (walletType.network !== 'evm') {
      throw new Error('Only transfers on Polygon are supported at the moment');
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
    walletType: NonOptional<ResolveOptions>,
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
      method: { name: 'hashIDrissWithPassword', args: [hash, claimPassword] },
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
        : BigNumber.from('0');
    const signer = await this.getConnectedAccount();

    await this.approveAssets(
      [asset],
      signer,
      roundContractAddress,
      transactionOptions,
    );

    if (!transactionOptions.gas) {
      try {
        const votingMethod = await this.getVotingMethod({
          encodedVote: encodedVote,
          roundContractAddress: roundContractAddress,
          asset: asset,
        });
        transactionOptions.gas = await votingMethod.estimateGas({
          from: transactionOptions.from ?? signer,
          value: nativeToSend.toString(),
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const sendOptions = {
      ...transactionOptions,
      from: transactionOptions.from ?? signer,
      value: nativeToSend.toString(),
    };

    const votingMethod = await this.getVotingMethod({
      encodedVote: encodedVote,
      roundContractAddress: roundContractAddress,
      asset: asset,
    });

    const transactionReceipt = await votingMethod.send(sendOptions);

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

    await this.approveAssets(
      [asset],
      signer,
      this.contractsAddressess.idrissTipping,
      transactionOptions,
    );

    message = message ?? '';

    if (!transactionOptions.gas) {
      try {
        const tippingMethod = await this.getTippingMethod({
          asset: asset,
          message: message,
          beneficiary: message,
          hash: resolvedAddress,
        });
        transactionOptions.gas = await tippingMethod.estimateGas({
          from: transactionOptions.from ?? signer,
          value: maticToSend.toString(),
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const sendOptions = {
      ...transactionOptions,
      from: transactionOptions.from ?? signer,
      value: maticToSend.toString(),
    };

    const tippingMethod = await this.getTippingMethod({
      asset: asset,
      message: message,
      beneficiary: message,
      hash: resolvedAddress,
    });

    const transactionReceipt = await tippingMethod.send(sendOptions);

    return transactionReceipt;
  }

  private async callRevertPayment(
    beneficiary: string,
    assetType: number,
    assetContractAddress: string,
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    const signer = await this.getConnectedAccount();
    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: {
              name: 'revertPayment',
              args: [beneficiary, assetType, assetContractAddress],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const sendOptions = {
      ...transactionOptions,
      from: transactionOptions.from ?? signer,
    };

    const transactionReceipt =
      await this.idrissSendToAnyoneContract.sendTransaction({
        method: {
          name: 'revertPayment',
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
        name: 'vote',
        args: [params.encodedVote],
      },
    });
  }

  private async getTippingMethod(
    params: SendToAnyoneParams,
  ): Promise<PreparedTransaction> {
    let method: PreparedTransaction;
    const message = params.message ?? '';

    switch (params.asset.type) {
      case AssetType.Native: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendTo',
            args: [params.hash, params.asset.amount.toString(), message],
          },
        });
        break;
      }
      case AssetType.ERC20: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendTokenTo',
            args: [
              params.hash,
              params.asset.amount.toString(),
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      }
      case AssetType.ERC721: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendERC721To',
            args: [
              params.hash,
              params.asset.assetId,
              params.asset.assetContractAddress,
              message,
            ],
          },
        });
        break;
      }
      case AssetType.ERC1155: {
        method = await this.tippingContract.prepareTransaction({
          method: {
            name: 'sendERC1155To',
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
    }

    return method;
  }

  private async callWeb3multiTipping(
    params: SendToAnyoneParams[],
    transactionOptions: TransactionOptions,
  ): Promise<TransactionReceipt> {
    let maticToSend: BigNumberish = BigNumber.from(0);

    const signer = await this.getConnectedAccount();
    const encodedCalldata = [];

    for (const param of params) {
      const paymentFee = await this.calculateTippingPaymentFee(
        param.asset.amount,
        param.asset.type,
      );
      const properParamAmountToSend =
        param.asset.type === AssetType.Native ? param.asset.amount : paymentFee;

      maticToSend = maticToSend.add(properParamAmountToSend);

      encodedCalldata.push(await this.encodeTippingToHex(param));
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas = await this.tippingContract.estimateGas({
          method: { name: 'batch', args: [encodedCalldata] },
          estimateGasOptions: {
            from: transactionOptions.from ?? signer,
            value: maticToSend.toString(),
          },
        });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const transactionReceipt = await this.tippingContract.sendTransaction({
      method: {
        name: 'batch',
        args: [encodedCalldata],
      },
      transactionOptions: {
        ...transactionOptions,
        from: transactionOptions.from ?? signer,
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
    const beneficiaryClaims = [];

    for (const param of params) {
      const newParam = { ...param, asset: { ...param.asset } };
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
        '$TBD$',
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
            method: { name: 'batch', args: [encodedCalldata] },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
              value: maticToSend.toString(),
            },
          });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const transactionReceipt =
      await this.idrissSendToAnyoneContract.sendTransaction({
        method: {
          name: 'batch',
          args: [encodedCalldata],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
          value: maticToSend.toString(),
        },
      });

    delete transactionOptions.gas;

    for (const val of beneficiaryClaims) {
      val.claimUrl = val.claimUrl.replace(
        '$TBD$',
        `${transactionReceipt.blockNumber}`,
      );
    }

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
        : '';
    const assetAddress =
      asset.type === AssetType.Native
        ? ''
        : `&assetAddress=${asset.assetContractAddress}`;
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
              name: 'sendToAnyone',
              args: [
                hashWithPassword,
                asset.amount,
                asset.type.valueOf(),
                asset.assetContractAddress ?? this.contractsAddressess.zero,
                asset.assetId ?? 0,
                message ?? '',
              ],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
              value: maticToSend.toString(),
            },
          });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    const transactionReceipt =
      await this.idrissSendToAnyoneContract.sendTransaction({
        method: {
          name: 'sendToAnyone',
          args: [
            hashWithPassword,
            asset.amount,
            asset.type.valueOf(),
            asset.assetContractAddress ?? this.contractsAddressess.zero,
            asset.assetId ?? 0,
            message ?? '',
          ],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
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

    for (const asset of assets) {
      switch (asset.type) {
        case AssetType.ERC20: {
          approvalTransactionReceipt = await this.authorizeERC20ForContract(
            signer,
            toContract,
            asset,
            transactionOptions,
          );

          break;
        }
        case AssetType.ERC721: {
          approvalTransactionReceipt = await this.authorizeERC721ForContract(
            signer,
            toContract,
            asset,
            transactionOptions,
          );

          break;
        }
        case AssetType.ERC1155: {
          approvalTransactionReceipt =
            await this.setAuthorizationForERC1155Contract(
              signer,
              toContract,
              asset,
              true,
              transactionOptions,
            );

          break;
        }
        // No default
      }

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
    if (assetType === AssetType.ERC20) return '0';
    return this.tippingContract.callMethod({
      method: {
        name: 'getPaymentFee',
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
        name: 'getPaymentFee',
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
      throw new Error('Invalid asset contract address sent for claiming');
    }

    if (!transactionOptions.gas) {
      try {
        transactionOptions.gas =
          await this.idrissSendToAnyoneContract.estimateGas({
            method: {
              name: 'claim',
              args: [
                hash,
                claimPass,
                asset.type.valueOf(),
                asset.assetContractAddress ?? this.contractsAddressess.zero,
              ],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
      } catch (error) {
        console.log('Could not estimate gas:', error);
      }
    }

    return this.idrissSendToAnyoneContract.sendTransaction({
      method: {
        name: 'claim',
        args: [
          hash,
          claimPass,
          asset.type.valueOf(),
          asset.assetContractAddress ?? this.contractsAddressess.zero,
        ],
      },
      transactionOptions: {
        ...transactionOptions,
        from: transactionOptions.from ?? signer,
        //TODO: check on this, should work automatically
        nonce: await this.web3Provider.getTransactionCount(
          transactionOptions.from ?? signer,
        ),
      },
    });
  }

  protected async generateClaimPassword() {
    const hex = this.web3Provider.randomHex(16).slice(2);
    return hex;
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
        name: 'allowance',
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
              name: 'approve',
              args: [
                contractToAuthorize,
                BigNumber.from(asset.amount).toString(),
              ],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
          transactionOptions.gas = BigNumber.isBigNumber(transactionOptions.gas)
            ? transactionOptions.gas.toNumber()
            : transactionOptions.gas;
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }

      const approval = await contract.sendTransaction({
        method: {
          name: 'approve',
          args: [contractToAuthorize, BigNumber.from(asset.amount).toString()],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
        },
      });
      delete transactionOptions.gas;
      return approval;
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
        name: 'getApproved',
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
              name: 'approve',
              args: [contractToAuthorize, asset.assetId],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }

      const approval = await contract.sendTransaction({
        method: { name: 'approve', args: [contractToAuthorize, asset.assetId] },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
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
        name: 'isApprovedForAll',
        args: [signer, contractToAuthorize],
      },
    });

    if (isApproved !== authToSet) {
      if (!transactionOptions.gas) {
        try {
          transactionOptions.gas = await contract.estimateGas({
            method: {
              name: 'setApprovalForAll',
              args: [contractToAuthorize, true],
            },
            estimateGasOptions: {
              from: transactionOptions.from ?? signer,
            },
          });
        } catch (error) {
          console.log('Could not estimate gas:', error);
        }
      }
      // unfortunately ERC1155 standard does not allow granular permissions, and only option is to approve all user tokens
      const approval = await contract.sendTransaction({
        method: {
          name: 'setApprovalForAll',
          args: [contractToAuthorize, true],
        },
        transactionOptions: {
          ...transactionOptions,
          from: transactionOptions.from ?? signer,
        },
      });
      delete transactionOptions.gas;
      return approval;
    }
    return true;
  }

  public async getDollarPriceInWei(): Promise<BigNumberish> {
    const currentPriceData = await this.priceOracleContract.callMethod({
      method: { name: 'latestRoundData', args: [] },
    });
    const priceDecimals = await this.priceOracleContract.callMethod({
      method: { name: 'decimals', args: [] },
    });

    // because the Oracle provides only MATIC price, we calculate the opposite: dollar price in MATIC
    const etherInWei = BigNumber.from(10).pow(18);
    const priceDecimalsMul = BigNumber.from(10).pow(priceDecimals);
    return etherInWei.mul(priceDecimalsMul).div(currentPriceData.answer);
  }

  public async reverseResolve(address: string) {
    const result = await this.idrissReverseMappingContract.callMethod({
      method: { name: 'reverseIDriss', args: [address] },
    });

    return +result
      ? ('@' + (await reverseTwitterID(result))).toLowerCase()
      : result;
  }
}
