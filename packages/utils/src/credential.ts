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
    console.log('[CREDENTIAL] Requesting credential creation:', request);
    
    const response = await fetch('http://localhost:3001/api/credential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    console.log('[CREDENTIAL] Credential creation response:', data);

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
  console.log('[CREDENTIAL-ACCEPT] Starting credential accept process');
  console.log('[CREDENTIAL-ACCEPT] Wallet:', wallet);
  console.log('[CREDENTIAL-ACCEPT] Credential data:', credentialData);

  if (!wallet.isConnected || !wallet.address) {
    return {
      success: false,
      error: 'Wallet not connected'
    };
  }

  try {
    // Step 1: Get system issuer
    console.log('[CREDENTIAL-ACCEPT] Step 1: Getting system issuer...');
    const systemIssuer = await getSystemIssuer();
    console.log('[CREDENTIAL-ACCEPT] System issuer:', systemIssuer);

    // Step 2: Request credential creation from system
    console.log('[CREDENTIAL-ACCEPT] Step 2: Requesting credential creation from system...');
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

    console.log('[CREDENTIAL-ACCEPT] Credential created by system, txHash:', createResult.txHash);

    // Step 3: Wait for credential to be confirmed on ledger
    console.log('[CREDENTIAL-ACCEPT] Step 3: Waiting 5 seconds for ledger confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: User accepts the credential via XUMM
    console.log('[CREDENTIAL-ACCEPT] Step 4: Preparing CredentialAccept transaction...');
    const txjson: any = {
      TransactionType: 'CredentialAccept',
      Account: wallet.address, // The subject who is accepting
      Issuer: systemIssuer, // The system account that created the credential
      CredentialType: credentialData.credentialType,
    };

    console.log('[CREDENTIAL-ACCEPT] Transaction JSON:', txjson);

    // Sign transaction with XUMM - this will wait for user to sign
    console.log('[CREDENTIAL-ACCEPT] Opening XUMM for signature...');
    const result = await signTransaction({ txjson });
    console.log('[CREDENTIAL-ACCEPT] SignTransaction result:', result);

    if (!result) {
      return {
        success: false,
        error: 'Failed to create transaction payload'
      };
    }

    // Wait for user to sign the transaction
    console.log('[CREDENTIAL] Waiting for user to sign...');
    const payloadResult = await waitForTransactionResult(result.uuid);
    console.log('[CREDENTIAL] Transaction result:', payloadResult);

    // Check if transaction was signed
    if (payloadResult.meta.signed === true) {
      console.log('[CREDENTIAL] Credential created successfully');
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