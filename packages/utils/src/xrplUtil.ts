import * as xrpl from 'xrpl';

export const stringToHex = (str: string): string => {
    return xrpl.convertStringToHex(str);
};

export const hexToString = (hex: string): string => {
    return xrpl.convertHexToString(hex);
};