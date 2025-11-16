import { signTransaction, waitForTransactionResult } from './wallet/browser';
import type { WalletState, CredentialMetadata } from './wallet/core';
import * as xrpl from 'xrpl';

export interface CredentialCreateRequest {
  subject: string;
  credentialType: string;
  uri: string; // IPFS URL
}

export interface CredentialAcceptData {
  credentialType: string;
}

export interface CredentialAcceptResult {
  success: boolean;
  txHash?: string;
  error?: string;
  qrUrl?: string;      // Add QR code URL
  deepLink?: string;   // Add deep link
  uuid?: string;      // Add payload UUID
}

const stringToHex = (str: string): string => {
  return xrpl.convertStringToHex(str);
};

// Get system issuer address from backend
export const getSystemIssuer = async (): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/system/issuer');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get system issuer');
    }
    
    return data.issuer;
  } catch (error) {
    console.error('[CREDENTIAL] Failed to get system issuer:', error);
    throw new Error('Failed to get system issuer address');
  }
};

// Upload metadata to IPFS and get URL
export const uploadCredentialMetadata = async (
  metadata: CredentialMetadata
): Promise<string> => {
  try {
    console.log('[CREDENTIAL] Uploading metadata to IPFS:', metadata);
    
    const response = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonData: metadata }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to upload metadata to IPFS');
    }

    console.log('[CREDENTIAL] Metadata uploaded, URL:', data.data.url);
    return data.data.url;
  } catch (error) {
    console.error('[CREDENTIAL] Failed to upload metadata to IPFS:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload metadata');
  }
};

export const requestCredentialCreation = async (
  request: CredentialCreateRequest
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    console.log('[CREDENTIAL] Requesting credential creation:', request);

    const uriHex = stringToHex(request.uri);
    const credentialTypeHex = stringToHex(request.credentialType);
    
    const response = await fetch('http://localhost:3001/api/credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: request.subject,
        credentialType: credentialTypeHex,
        uri: uriHex
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to create credential'
      };
    }

    return {
      success: true,
      txHash: data.txHash
    };
  } catch (error) {
    console.error('[CREDENTIAL] Failed to request credential creation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request credential creation'
    };
  }
};

// Full flow: Upload metadata to IPFS, then create credential
export const createCredentialWithMetadata = async (
  subject: string,
  credentialType: string,
  metadata: CredentialMetadata
): Promise<{ success: boolean; txHash?: string; uri?: string; error?: string }> => {
  try {
    // Step 1: Upload metadata to IPFS
    const uri = await uploadCredentialMetadata(metadata);
    
    // Step 2: Create credential with the IPFS URI
    const result = await requestCredentialCreation({
      subject,
      credentialType,
      uri
    });

    if (result.success) {
      return {
        ...result,
        uri
      };
    }

    return result;
  } catch (error) {
    console.error('[CREDENTIAL] Failed to create credential with metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credential'
    };
  }
};

// Accept credential (Full flow: Step 1 - Create, Step 2 - Accept)
export const acceptCredential = async (
  wallet: WalletState,
  credentialData: CredentialAcceptData
): Promise<CredentialAcceptResult> => {
  if (!wallet.isConnected || !wallet.address) {
    return {
      success: false,
      error: 'Wallet not connected'
    };
  }

  try {
    // Step 1: Get system issuer
    const systemIssuer = await getSystemIssuer();

    // Step 2: Wait for credential to be confirmed on ledger
    await new Promise(resolve => setTimeout(resolve, 5000));

    const credentialTypeHex = stringToHex(credentialData.credentialType);

    // Step 3: User accepts the credential via XUMM
    const txjson: any = {
      TransactionType: 'CredentialAccept',
      Account: wallet.address, // The subject who is accepting
      Issuer: systemIssuer, // The system account that created the credential
      CredentialType: credentialTypeHex,
    };

    console.log('[CREDENTIAL-ACCEPT] Signing transaction:', txjson);

    // Sign transaction with XUMM - this will wait for user to sign
    const result = await signTransaction({ txjson });
    console.log('[CREDENTIAL-ACCEPT] Sign transaction result:', result);

    if (!result || !result.uuid || !result.refs?.qr_png || !result.next?.always) {
      return {
        success: false,
        error: 'Failed to create transaction payload'
      };
    }

    // Return QR code and deep link immediately
    return {
      success: true,
      qrUrl: result.refs.qr_png,
      deepLink: result.next.always,
      uuid: result.uuid
    };
  } catch (error) {
    console.error('[CREDENTIAL-ACCEPT] ❌ Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept credential'
    };
  }
};

export const validateCredentialAcceptData = (data: CredentialAcceptData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!data.credentialType) {
    errors.credentialType = 'Credential type is required';
  }

  return errors;
};