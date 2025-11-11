// Shared types and core logic
export type WalletState = {
  isConnected: boolean;
  address?: string;
  balance?: string;
  networkType?: string;
};

export type TransactionPayload = {
  txjson: {
    TransactionType: string;
    Account?: string;
    Destination?: string;
    Amount?: string;
    [key: string]: any;
  };
};

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