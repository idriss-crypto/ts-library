import { AbiItem } from 'web3-utils'

import {BaseIdrissCrypto} from "./baseIdrissCrypto";
import { ResolveOptions } from "./resolveOptions";
import IDrissRegistryContract from './abi/idrissRegistry.json';
import IDrissReverseMappingContract from './abi/idrissReverseMapping.json';


var crypto = require('crypto');

export class IdrissCrypto extends BaseIdrissCrypto {
    private idrissRegistryContractPromise;
    private idrissReverseMappingContractPromise;
    private IDRISS_REGISTRY_CONTRACT_ADDRESS = '0x2EcCb53ca2d4ef91A79213FDDF3f8c2332c2a814';
    private IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS = '0x561f1b5145897A52A6E94E4dDD4a29Ea5dFF6f64';

    constructor(polygonEndpoint: string = "https://polygon-rpc.com/") {
        const Web3Promise = import("web3");
        super(Web3Promise.then(x=>x.default).then(Web3=>new Web3(new Web3.providers.HttpProvider(polygonEndpoint))));
        this.idrissRegistryContractPromise = this.generateIDrissRegistryContract();
        this.idrissReverseMappingContractPromise = this.generateIDrissReverseMappingContract();
    }

    protected async digestMessage(message: string):Promise<string> {
        return crypto.createHash('sha256').update(message).digest('hex');
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

    public async reverseResolve(address: string) {
        let result = await this.callWeb3ReverseIDriss(address);
        if (+result) {
            return ('@' + await this.webApi.reverseTwitterID(result)).toLowerCase();
        } else {
            return result;
        }
    }

    private async callWeb3GetIDriss(encrypted: string) {
        return await (await this.idrissRegistryContractPromise).methods.getIDriss(encrypted).call();
    }

    private async callWeb3ReverseIDriss(address: string): Promise<string> {
        return await (await this.idrissReverseMappingContractPromise).methods.reverseIDriss(address).call();
    }


    private async generateIDrissRegistryContract() {
        return new (await this.web3Promise).eth.Contract(IDrissRegistryContract as AbiItem[], this.IDRISS_REGISTRY_CONTRACT_ADDRESS);
    }

    private async generateIDrissReverseMappingContract() {
        return new (await this.web3Promise).eth.Contract(IDrissReverseMappingContract as AbiItem[], this.IDRISS_REVERSE_MAPPING_CONTRACT_ADDRESS);
    }

}
