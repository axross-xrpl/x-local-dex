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

export interface CredentialMetadata {
  name: string;
  expireDate?: string;
  type: string;
  location?: string;
  rate?: number;
}

export const createCredentialTransaction = (
  account: string,
  subject: string,
  credentialType: string,
  metadata?: CredentialMetadata,
  issuer?: string,
  expire?: number
): TransactionPayload => {
  const txjson: any = {
    TransactionType: 'CredentialCreate',
    Account: account,
    Subject: subject,
    CredentialType: credentialType,
  };

  // Add optional issuer
  if (issuer && issuer !== account) {
    txjson.Issuer = issuer;
  }

  // Add optional expire
  if (expire) {
    txjson.Expire = expire;
  }

  // Add metadata as URI (JSON string, hex encoded)
  if (metadata) {
    const metadataJson = JSON.stringify({
      name: metadata.name,
      'expire-date': metadata.expireDate,
      type: metadata.type,
      location: metadata.location,
      rate: metadata.rate
    });
    
    // Convert to hex
    const metadataHex = Buffer.from(metadataJson, 'utf8').toString('hex').toUpperCase();
    txjson.URI = metadataHex;
  }

  return { txjson };
};