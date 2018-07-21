import * as _ from 'lodash';

import { AbiType, ConstructorAbi, AbiDefinition, MethodAbi, EventAbi, ContractAbi } from '@0xproject/types';
import { abiUtils } from '@0xproject/utils';

import { getNamedContent, getEmptyConstructor } from './utils';
import { ContextData } from './types';

export class Contract {
    public name: string;
    private ABI: ContractAbi = [];

    constructor(abiFileName: string) {
        const namedContent = getNamedContent(abiFileName);
        const parsedContent = JSON.parse(namedContent.content);

        this.name = namedContent.name;

        if (_.isArray(parsedContent)) {
            this.ABI = parsedContent; // ABI file
        } else if (!_.isUndefined(parsedContent.abi)) {
            this.ABI = parsedContent.abi; // Truffle artifact
        } else if (!_.isUndefined(parsedContent.compilerOutput.abi)) {
            this.ABI = parsedContent.compilerOutput.abi; // 0x artifact
        }

        if (_.isEmpty(this.ABI)) {
            console.error(`ABI not found in ${abiFileName}.`);
            process.exit(1);
        }
    }

    get context(): ContextData {
        return {
            contractName: this.name,
            constructor: this.getConstructor(),
            methods: this.getMethods(),
            events: this.getEvents(),
            abi: JSON.stringify(this.ABI)
        };
    }

    private getConstructor() {
        let ctor = this.ABI.find((abi: AbiDefinition) => abi.type === AbiType.Constructor) as ConstructorAbi;
        if (_.isUndefined(ctor)) {
            ctor = getEmptyConstructor();
        }
        return ctor;
    }

    private getMethods() {
        const methodAbis = this.ABI.filter((abi: AbiDefinition) => abi.type === AbiType.Function) as MethodAbi[];
        const sanitizedMethodAbis = abiUtils.renameOverloadedMethods(methodAbis) as MethodAbi[];

        const methodsData = _.map(methodAbis, (methodAbi, methodAbiIndex: number) => {
            _.forEach(methodAbi.inputs, (input, inputIndex: number) => {
                if (_.isEmpty(input.name)) {
                    // Auto-generated getters don't have parameter names
                    input.name = `index_${inputIndex}`;
                }
            });

            const methodData = {
                ...methodAbi,
                singleReturnValue: methodAbi.outputs.length === 1,
                hasReturnValue: methodAbi.outputs.length !== 0,
                tsName: sanitizedMethodAbis[methodAbiIndex].name,
                functionSignature: abiUtils.getFunctionSignature(methodAbi),
            };

            return methodData;
        });

        return methodsData;
    }

    private getEvents() {
        return this.ABI.filter((abi: AbiDefinition) => abi.type === AbiType.Event) as EventAbi[];
    }
}