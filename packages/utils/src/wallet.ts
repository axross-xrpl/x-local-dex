import { Xumm } from 'xumm';

// Import types from xumm-sdk with the correct structure
import type { 
  XummTypes
} from 'xumm-sdk';

// Custom wallet state type
export type WalletState = {
  isConnected: boolean;
  address?: string;
  balance?: string;
  networkType?: string;
};

// Use XUMM SDK's built-in types
export type TransactionPayload = XummTypes.XummPostPayloadBodyJson;
export type XummResponse = XummTypes.XummPostPayloadResponse;
export type PayloadResult = XummTypes.XummGetPayloadResponse;

// Initialize XUMM instance
let xummInstance: Xumm | null = null;

// Helper function to get environment variables
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    return (import.meta.env as any)[`VITE_${key}`] || '';
  }
  if (typeof process !== 'undefined') {
    return process.env[key] || '';
  }
  return '';
};

export const createXummConnection = (apiKey?: string, apiSecret?: string): Xumm => {
  const key = apiKey || getEnvVar('XUMM_API_KEY');
  const secret = apiSecret || getEnvVar('XUMM_API_SECRET');
  
  console.log('Creating XUMM connection with:', { 
    hasKey: !!key, 
    hasSecret: !!secret,
    runtime: 'browser'
  });
  
  if (!xummInstance) {
    xummInstance = new Xumm(key, secret);
  }
  console.log('XUMM instance created:', xummInstance);
  return xummInstance;
};

export const connectWallet = async (): Promise<WalletState> => {
  try {
    console.log('Starting wallet connection...');
    const xumm = createXummConnection();
    
    console.log('XUMM Runtime:', xumm.runtime);
    
    // Wait for XUMM to be ready
    await xumm.environment.ready;
    console.log('XUMM environment ready');

    
    // Check if we're in browser environment
    if (xumm.runtime && typeof xumm.runtime === 'object' && 'browser' in xumm.runtime) {
      console.log('Detected browser environment');
      
      try {
        // Check if authorize method exists
        if (typeof xumm.authorize === 'function') {
          console.log('Using browser OAuth flow...');
          const authResult = await xumm.authorize();
          console.log('Authorization result:', authResult);
          
          if (authResult && typeof authResult === 'object' && !('message' in authResult)) {
            // Successfully authorized
            console.log('Successfully authorized, getting user info...');
            console.log('xumm.user:', xumm.user);
            
            // Wait for user data to be available
            const account = await xumm.user.account;
            const networkType = await xumm.user.networkType;
            
            console.log('User account:', account);
            console.log('Network type:', networkType);
            const walletInfo = await getWalletInfo();
            console.log('User wallet info:', walletInfo);
            
            if (account) {
              return {
                isConnected: true,
                address: account,
                networkType: networkType
              };
            }
          }
        } else {
          console.log('authorize method not available, falling back to payload method');
          return await createPayloadFlow(xumm);
        }
        
        return { isConnected: false };
      } catch (authError) {
        console.error('Authorization error:', authError);
        console.log('Falling back to payload method');
        return await createPayloadFlow(xumm);
      }
    } else {
      // For non-browser environments or fallback, use payload method
      console.log('Using payload method...');
      return await createPayloadFlow(xumm);
    }

  } catch (error) {
    console.error('Wallet connection failed:', error);
    return { isConnected: false };
  }
};

// Separate function for payload-based flow
const createPayloadFlow = async (xumm: Xumm): Promise<WalletState> => {
  try {
    console.log('Creating SignIn payload...');
    
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

    console.log('Payload created:', payload);
    console.log('Scan QR or open in XUMM:', payload.next.always);
    
    return new Promise<WalletState>((resolve) => {
      let resolved = false;
      
      if (!xumm.payload) {
        resolve({ isConnected: false });
        return;
      }
      
      xumm.payload.subscribe(payload.uuid, async (event: any) => {
        console.log('Subscription event:', event);
        
        if (resolved) return;
        
        if (event.data.signed === true) {
          resolved = true;
          console.log('Payload signed successfully');
          
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

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('Connection timeout');
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
      console.warn('User service not available');
      return {};
    }
    
    const account = await xumm.user.account;
    const networkType = await xumm.user.networkType;
    console.log('Retrieved wallet info:', { account, networkType });
    
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
    
    xummInstance = null; // Reset instance
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout failed:', error);
    // Still reset instance even if logout fails
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

// Helper function to check if wallet is connected
export const isWalletConnected = async (): Promise<boolean> => {
  try {
    const walletInfo = await getWalletInfo();
    return !!walletInfo.address;
  } catch (error) {
    return false;
  }
};

// Helper function to get current wallet address
export const getCurrentWalletAddress = async (): Promise<string | null> => {
  try {
    const walletInfo = await getWalletInfo();
    return walletInfo.address || null;
  } catch (error) {
    return null;
  }
};

// Add this function to your wallet.ts file
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
        console.log('Transaction subscription event:', event);
        
        if (resolved) return;
        
        if (event.data.signed === true) {
          resolved = true;
          resolve(event.data);
        } else if (event.data.signed === false) {
          resolved = true;
          reject(new Error('Transaction was rejected by user'));
        }
      });

      // Timeout after 5 minutes
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