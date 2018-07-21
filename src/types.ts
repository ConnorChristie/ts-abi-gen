import { EventAbi, MethodAbi, ConstructorAbi } from '@0xproject/types';

export enum ParamKind {
    Input = 'input',
    Output = 'output'
}

export enum ContractsBackend {
    Web3 = 'web3',
    Ethers = 'ethers'
}

export interface Method extends MethodAbi {
    singleReturnValue: boolean;
    hasReturnValue: boolean;
    tsName: string;
    functionSignature: string;
}

export interface ContextData {
    contractName: string;
    constructor: ConstructorAbi;
    methods: Method[];
    events: EventAbi[];
    abi: string;
}