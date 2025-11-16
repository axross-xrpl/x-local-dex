import { signTransaction, waitForTransactionResult } from './wallet/browser';
import type { WalletState } from './wallet/core';

export interface CredentialCreateRequest {
  subject: string;
  credentialType: string;
  metadata?: {
    name: string;
    type: string;
    location?: string;
    expireDate?: string;
    rate?: number;
  };
}

export interface CredentialAcceptData {
  credentialType: string;
}

export interface CredentialAcceptResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

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

export const requestCredentialCreation = async (
  request: CredentialCreateRequest
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    
    const response = await fetch('http://localhost:3001/api/credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
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

    // Step 2: Request credential creation from system
    const createResult = await requestCredentialCreation({
      subject: wallet.address,
      credentialType: credentialData.credentialType,
      metadata: {
        name: `Credential for ${wallet.address}`,
        type: credentialData.credentialType
      }
    });

    if (!createResult.success) {
      console.error('[CREDENTIAL-ACCEPT] Failed to create credential:', createResult.error);
      return {
        success: false,
        error: createResult.error || 'Failed to create credential'
      };
    }


    // Step 3: Wait for credential to be confirmed on ledger
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: User accepts the credential via XUMM
    const txjson: any = {
      TransactionType: 'CredentialAccept',
      Account: wallet.address, // The subject who is accepting
      Issuer: systemIssuer, // The system account that created the credential
      CredentialType: credentialData.credentialType,
    };


    // Sign transaction with XUMM - this will wait for user to sign
    const result = await signTransaction({ txjson });

    if (!result) {
      return {
        success: false,
        error: 'Failed to create transaction payload'
      };
    }

    // Wait for user to sign the transaction
    const payloadResult = await waitForTransactionResult(result.uuid);

    // Check if transaction was signed
    if (payloadResult.meta.signed === true) {
      return {
        success: true,
        txHash: payloadResult.response.txid
      };
    } else {
      return {
        success: false,
        error: 'Transaction was rejected or not signed'
      };
    }
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