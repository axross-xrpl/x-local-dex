import { Xumm } from 'xumm';
import type { XummTypes } from 'xumm-sdk';
import type { WalletState, TransactionPayload } from './core';

export type XummResponse = XummTypes.XummPostPayloadResponse;
export type PayloadResult = XummTypes.XummGetPayloadResponse;

let xummInstance: Xumm | null = null;

const getEnvVar = (key: string): string => {
  return (import.meta.env as any)[`VITE_${key}`] || '';
};

export const createXummConnection = (apiKey?: string, apiSecret?: string): Xumm => {
  const key = apiKey || getEnvVar('XUMM_API_KEY');
  const secret = apiSecret || getEnvVar('XUMM_API_SECRET');
  
  if (!xummInstance) {
    xummInstance = new Xumm(key, secret);
  }
  return xummInstance;
};

export const connectWallet = async (): Promise<WalletState> => {
  try {
    const xumm = createXummConnection();
    await xumm.environment.ready;

    if (xumm.runtime && typeof xumm.runtime === 'object' && 'browser' in xumm.runtime) {
      try {
        if (typeof xumm.authorize === 'function') {
          const authResult = await xumm.authorize();
          
          if (authResult && typeof authResult === 'object' && !('message' in authResult)) {
            const account = await xumm.user.account;
            const networkType = await xumm.user.networkType;
            
            if (account) {
              return {
                isConnected: true,
                address: account,
                networkType: networkType
              };
            }
          }
        } else {
          return await createPayloadFlow(xumm);
        }
        
        return { isConnected: false };
      } catch (authError) {
        console.error('Authorization error:', authError);
        return await createPayloadFlow(xumm);
      }
    } else {
      return await createPayloadFlow(xumm);
    }
  } catch (error) {
    console.error('Wallet connection failed:', error);
    return { isConnected: false };
  }
};

const createPayloadFlow = async (xumm: Xumm): Promise<WalletState> => {
  try {
    if (!xumm.payload) {
      throw new Error('Payload service not available');
    }
    
    const payload = await xumm.payload.create({
      txjson: {
        TransactionType: 'SignIn'
      }
    });

    if (!payload) {
      throw new Error('Failed to create payload');
    }
    
    return new Promise<WalletState>((resolve) => {
      let resolved = false;
      
      if (!xumm.payload) {
        resolve({ isConnected: false });
        return;
      }
      
      xumm.payload.subscribe(payload.uuid, async (event: any) => {
        if (resolved) return;
        
        if (event.data.signed === true) {
          resolved = true;
          
          try {
            const walletInfo = await getWalletInfo();
            resolve({
              isConnected: true,
              ...walletInfo
            });
          } catch (error) {
            console.error('Error getting wallet info:', error);
            resolve({ isConnected: false });
          }
        } else if (event.data.signed === false) {
          resolved = true;
          resolve({ isConnected: false });
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ isConnected: false });
        }
      }, 2 * 60 * 1000);
    });
  } catch (error) {
    console.error('Payload flow error:', error);
    return { isConnected: false };
  }
};

export const getWalletInfo = async (): Promise<Partial<WalletState>> => {
  try {
    const xumm = createXummConnection();
    
    if (!xumm.user) {
      return {};
    }
    
    const account = await xumm.user.account;
    const networkType = await xumm.user.networkType;
    
    if (account) {
      return {
        address: account,
        networkType: networkType
      };
    }

    return {};
  } catch (error) {
    console.error('Failed to get wallet info:', error);
    return {};
  }
};

export const logout = async (): Promise<void> => {
  try {
    const xumm = createXummConnection();
    
    if (typeof xumm.logout === 'function') {
      await xumm.logout();
    }
    
    xummInstance = null;
  } catch (error) {
    console.error('Logout failed:', error);
    xummInstance = null;
  }
};

export const signTransaction = async (payload: TransactionPayload): Promise<XummResponse | null> => {
  try {
    const xumm = createXummConnection();
    
    if (!xumm.payload) {
      throw new Error('Payload service not available');
    }
    
    const result = await xumm.payload.create(payload);

    if (!result) {
      throw new Error('Failed to create transaction payload');
    }

    return result as XummResponse;
  } catch (error) {
    console.error('Transaction signing failed:', error);
    return null;
  }
};

export const isWalletConnected = async (): Promise<boolean> => {
  try {
    const walletInfo = await getWalletInfo();
    return !!walletInfo.address;
  } catch (error) {
    return false;
  }
};

export const getCurrentWalletAddress = async (): Promise<string | null> => {
  try {
    const walletInfo = await getWalletInfo();
    return walletInfo.address || null;
  } catch (error) {
    return null;
  }
};

export const waitForTransactionResult = async (payloadUuid: string): Promise<any> => {
  try {
    const xumm = createXummConnection();
    
    if (!xumm.payload) {
      throw new Error('Payload service not available');
    }
    
    return new Promise((resolve, reject) => {
      let resolved = false;

      if (!xumm.payload) {
        reject(new Error('Payload service not available'));
        return;
      }
      
      xumm.payload.subscribe(payloadUuid, (event: any) => {
        if (resolved) return;

        console.log('Payload event received:', event);
        
        if (event.data.signed === true) {
          resolved = true;
          resolve(event.data);
        } else if (event.data.signed === false) {
          resolved = true;
          reject(new Error('Transaction was rejected by user'));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Transaction timeout - no response received'));
        }
      }, 5 * 60 * 1000);
    });
  } catch (error) {
    console.error('Error waiting for transaction result:', error);
    throw error;
  }
};