import { ethers } from "ethers";
import Web3 from "web3";
import { Abi } from "./abi";

import { Contract } from "./contract";

interface IWeb3Provider {
  isAddress: (maybeAddress: string) => boolean;
  getConnectedAccount: () => Promise<string>;
  createContract: (abi: Abi[], address: string) => Contract;
  getTransactionCount: (address: string) => Promise<number>;
  randomHex: (bytesSize: number) => string;
}

type ConstructorProps = IWeb3Provider;

export class Web3Provider implements IWeb3Provider {
  isAddress: (maybeAddress: string) => boolean;
  getConnectedAccount: () => Promise<string>;
  getTransactionCount: (v: string) => Promise<number>;
  createContract: (abi: Abi[], address: string) => Contract;
  randomHex: (bytesSize: number) => string;

  constructor({
    isAddress,
    getConnectedAccount,
    getTransactionCount,
    createContract,
    randomHex,
  }: ConstructorProps) {
    this.isAddress = isAddress;
    this.getConnectedAccount = getConnectedAccount;
    this.getTransactionCount = getTransactionCount;
    this.createContract = createContract;
    this.randomHex = randomHex;
  }
}

export class Web3ProviderAdapter {
  public static fromWeb3(web3Provider: Web3) {
    return new Web3Provider({
      isAddress: web3Provider.utils.isAddress,
      getConnectedAccount: async () => {
        const accounts = await web3Provider.eth.getAccounts();
        return accounts[0];
      },
      createContract: (abi, address) => {
        const contract = new web3Provider.eth.Contract(abi, address);

        return {
          callMethod: ({ method }) => {
            return contract.methods[method.name](...method.args).call();
          },
          encodeABI: ({ method }) => {
            return contract.methods[method.name](...method.args).encodeABI();
          },
          estimateGas: ({ method, estimateGasOptions }) => {
            return contract.methods[method.name](...method.args).estimateGas(
              estimateGasOptions,
            );
          },
          prepareTransaction: ({ method }) => {
            return contract.methods[method.name](...method.args);
          },
          sendTransaction: ({ method, transactionOptions }) => {
            return contract.methods[method.name](...method.args).send(
              transactionOptions,
            );
          },
        };
      },
      getTransactionCount: web3Provider.eth.getTransactionCount,
      randomHex: web3Provider.utils.randomHex,
    });
  }

  public static fromEthersV5(
    ethersWeb3Provider: ethers.providers.JsonRpcProvider,
  ) {
    return new Web3Provider({
      isAddress: ethers.utils.isAddress,
      getConnectedAccount: async () => {
        const accounts = await ethersWeb3Provider.listAccounts();
        return accounts[0];
      },
      createContract: (abi, address) => {
        const contract = new ethers.Contract(address, abi, ethersWeb3Provider);

        return {
          callMethod: async ({ method }) => {
            const result = await contract.functions[method.name](
              ...method.args,
            );
            // normalize same way as web3 does
            return result.length === 1 ? result[0] : result;
          },
          encodeABI: ({ method }) => {
            const contractInterface = new ethers.utils.Interface(abi);
            return contractInterface.encodeFunctionData(
              method.name,
              method.args,
            );
          },
          estimateGas: ({ method, estimateGasOptions }) => {
            return contract.estimateGas[method.name](
              ...method.args,
              estimateGasOptions,
            );
          },
          prepareTransaction: async ({ method }) => {
            const populatedTransaction = await contract.populateTransaction[
              method.name
            ](...method.args);

            return {
              send: async (transactionOptions) => {
                const { gas, ...otherTransactionOptions } = transactionOptions;
                const adaptedSendOptions = {
                  ...otherTransactionOptions,
                  gasLimit: gas,
                };
                const result = await ethersWeb3Provider
                  .getSigner()
                  .sendTransaction({
                    ...populatedTransaction,
                    ...adaptedSendOptions,
                    to: address,
                  });
                const minedResult = await result.wait();

                return {
                  ...minedResult,
                  status: Boolean(minedResult.status),
                  gasUsed: minedResult.gasUsed.toNumber(),
                  cumulativeGasUsed: minedResult.cumulativeGasUsed.toNumber(),
                  effectiveGasPrice: minedResult.effectiveGasPrice.toNumber(),
                };
              },
              encodeABI: () => {
                return populatedTransaction.data ?? "";
              },
              estimateGas: async (options) => {
                const gasEstimation = await contract.estimateGas[method.name](
                  ...method.args,
                  options,
                );
                return gasEstimation.toNumber();
              },
            };
          },
          sendTransaction: async ({ method, transactionOptions }) => {
            const contractInterface = new ethers.utils.Interface(abi);

            const transactionData = contractInterface.encodeFunctionData(
              method.name,
              method.args,
            );

            const adaptedTransactionOptions = {
              to: address,
              data: transactionData,
              from: transactionOptions.from,
              gasPrice: transactionOptions.gasPrice,
              gasLimit: transactionOptions.gas,
              value: transactionOptions.value,
              nonce: transactionOptions.nonce,
            };

            const result = await ethersWeb3Provider
              .getSigner()
              .sendTransaction(adaptedTransactionOptions);

            const minedResult = await result.wait();
            return {
              ...minedResult,
              status: Boolean(minedResult.status),
              gasUsed: minedResult.gasUsed.toNumber(),
              cumulativeGasUsed: minedResult.cumulativeGasUsed.toNumber(),
              effectiveGasPrice: minedResult.effectiveGasPrice.toNumber(),
            };
          },
        };
      },
      getTransactionCount: (addr) => {
        return ethersWeb3Provider.getTransactionCount(addr);
      },
      randomHex: (bytesSize) => {
        const randomBytes = ethers.utils.randomBytes(bytesSize);

        const hexString = ethers.utils.hexlify(randomBytes);

        return hexString;
      },
    });
  }
}
