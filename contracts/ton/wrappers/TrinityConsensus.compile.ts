// Trinity Protocol v3.5.18 - Updated: 2025-11-25T19:34:37.795Z
import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: [
        'contracts/ton/imports/stdlib.fc',
        'contracts/ton/imports/helpers.fc',
        'contracts/ton/TrinityConsensus.fc'
    ],
};
