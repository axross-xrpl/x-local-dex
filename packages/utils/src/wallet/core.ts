import type { XummTypes } from 'xumm-sdk';

// Shared types and core logic
export type WalletState = {
  isConnected: boolean;
  address?: string;
  balance?: string;
  networkType?: string;
};

export type TransactionPayload = XummTypes.XummJsonTransaction | XummTypes.XummPostPayloadBodyJson | XummTypes.XummPostPayloadBodyBlob;

export const createPaymentTransaction = (
  fromAccount: string,
  toAccount: string,
  amount: string
): TransactionPayload => {
  return {
    txjson: {
      TransactionType: 'Payment',
      Account: fromAccount,
      Destination: toAccount,
      Amount: amount
    }
  };
};