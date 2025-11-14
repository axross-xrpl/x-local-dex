import { Xumm } from 'xumm';
import type { XummTypes } from 'xumm-sdk';
import type { WalletState, TransactionPayload } from './core';

export type XummResponse = XummTypes.XummPostPayloadResponse;

let xummInstance: Xumm | null = null;

const getEnvVar = (key: string): string => {
  return process.env[key] || '';
};

export const createXummConnection = (apiKey?: string, apiSecret?: string): Xumm => {
  const key = apiKey || getEnvVar('XUMM_API_KEY');
  const secret = apiSecret || getEnvVar('XUMM_API_SECRET');
  
  if (!xummInstance) {
    xummInstance = new Xumm(key, secret);
  }
  return xummInstance;
};

export const createPayload = async (payload: TransactionPayload): Promise<XummResponse | null> => {
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
    console.error('Payload creation failed:', error);
    return null;
  }
};

export const getPayloadStatus = async (payloadUuid: string): Promise<any> => {
  try {
    const xumm = createXummConnection();
    
    if (!xumm.payload) {
      throw new Error('Payload service not available');
    }
    
    const result = await xumm.payload.get(payloadUuid);
    return result;
  } catch (error) {
    console.error('Failed to get payload status:', error);
    return null;
  }
};

export const waitForPayloadResult = async (payloadUuid: string, timeoutMs = 5 * 60 * 1000): Promise<any> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await getPayloadStatus(payloadUuid);
    
    if (status && status.meta && status.meta.signed !== null) {
      return status;
    }
    
    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Payload timeout - no response received');
};