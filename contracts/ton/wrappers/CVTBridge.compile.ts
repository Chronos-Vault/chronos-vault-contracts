import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: [
        'contracts/ton/imports/stdlib.fc',
        'contracts/ton/CVTBridge.fc'
    ],
};
