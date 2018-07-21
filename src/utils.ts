import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';

import { AbiType, ConstructorAbi, DataItem } from '@0xproject/types';
import { ParamKind, ContractsBackend } from './types';

export function getPartialNameFromFileName(filename: string): string {
    return path.parse(filename).name;
}

export function getNamedContent(filename: string): { name: string; content: string } {
    const name = getPartialNameFromFileName(filename);

    try {
        const content = fs.readFileSync(filename).toString();

        return {
            name,
            content,
        };
    } catch (err) {
        throw new Error(`Failed to read ${filename}: ${err}`);
    }
}

export function getEmptyConstructor(): ConstructorAbi {
    return {
        type: AbiType.Constructor,
        stateMutability: 'nonpayable',
        payable: false,
        inputs: [],
    };
}

export function writeOutputFile(name: string, outputPath: string, output: string): void {
    const filePath = `${outputPath}/${name}.ts`;
    fs.writeFileSync(filePath, output);
}

function isUnionType(tsType: string): boolean {
    return tsType === 'number|BigNumber';
}

function isObjectType(tsType: string): boolean {
    return /^{.*}$/.test(tsType);
}

export function solTypeToTsType(paramKind: ParamKind, backend: ContractsBackend) {
    return (solType: string, components?: DataItem[]): string => {
        const trailingArrayRegex = /\[\d*\]$/;

        if (solType.match(trailingArrayRegex)) {
            const arrayItemSolType = solType.replace(trailingArrayRegex, '');
            const arrayItemTsType = solTypeToTsType(paramKind, backend)(arrayItemSolType, components);
            const arrayTsType =
                isUnionType(arrayItemTsType) || isObjectType(arrayItemTsType)
                    ? `Array<${arrayItemTsType}>`
                    : `${arrayItemTsType}[]`;
            return arrayTsType;
        } else {
            const solTypeRegexToTsType = [
                { regex: '^string$', tsType: 'string' },
                { regex: '^address$', tsType: 'string' },
                { regex: '^bool$', tsType: 'boolean' },
                { regex: '^u?int\\d*$', tsType: 'BigNumber' },
                { regex: '^bytes\\d*$', tsType: 'string' },
            ];

            if (paramKind === ParamKind.Input) {
                // web3 and ethers allow to pass those as numbers instead of bignumbers
                solTypeRegexToTsType.unshift({
                    regex: '^u?int(8|16|32)?$',
                    tsType: 'BigNumber | number',
                });
            }

            if (backend === ContractsBackend.Ethers && paramKind === ParamKind.Output) {
                // ethers-contracts automatically converts small BigNumbers to numbers
                solTypeRegexToTsType.unshift({
                    regex: '^u?int(8|16|32|48)?$',
                    tsType: 'number',
                });
            }

            for (const regexAndTxType of solTypeRegexToTsType) {
                const { regex, tsType } = regexAndTxType;
                if (solType.match(regex)) {
                    return tsType;
                }
            }

            const TUPLE_TYPE_REGEX = '^tuple$';
            if (solType.match(TUPLE_TYPE_REGEX)) {
                const componentsType = _.map(components, component => {
                    const componentValueType = solTypeToTsType(paramKind, backend)(component.type, component.components);
                    const componentType = `${component.name}: ${componentValueType}`;
                    return componentType;
                });
                return `{${componentsType}}`;
            }

            throw new Error(`Unknown Solidity type found: ${solType}`);
        }
    }
}
