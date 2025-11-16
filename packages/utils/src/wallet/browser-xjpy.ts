import { Client, Wallet } from 'xrpl';

const getEnvVar = (key: string): string => {
  return (import.meta.env as any)[`VITE_${key}`] || '';
};

const CURRENCY_CODE = 'XJP';
const ISSUER_ADDRESS = getEnvVar('ISSUER_ADDRESS');
const ISSUER_SECRET = getEnvVar('ISSUER_SECRET');
const NETWORK = getEnvVar("XRPL_ENDPOINT");

export const setTrustline = async (
  secret: string
): Promise<void> => {

  const client = new Client(NETWORK);

  try {
    await client.connect();

    const userWallet = Wallet.fromSeed(secret);
    const response = await client.submitAndWait(
      {
        TransactionType: 'TrustSet',
        Account: userWallet.address,
        Flags: 262144,
        LimitAmount: {
          issuer: ISSUER_ADDRESS,
          currency: CURRENCY_CODE,
          value: '1000000',
        },
      },
      { wallet: userWallet }
    );

    console.log('Transaction result:', response);
  } catch (error) {
    console.error('Error waiting for transaction result:', error);
    throw error;
  } finally {
    client.disconnect();
  }
};

export const issueXJPToken = async (
  secret: string
): Promise<void> => {

  const client = new Client(NETWORK);
  try {
    await client.connect();

    const userWallet = Wallet.fromSeed(secret);
    const issuerWallet = Wallet.fromSeed(ISSUER_SECRET);
    console.log("Issue XJP to -> " + userWallet.address);

    const response = await client.submitAndWait(
      {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: userWallet.address,
        Amount: {
          issuer: ISSUER_ADDRESS,
          currency: CURRENCY_CODE,
          value: '10000',
        },
      },
      { wallet: issuerWallet }
    );

    console.log('Transaction result:', response);

  } catch (error) {
    console.error('Error waiting for transaction result:', error);
    throw error;
  } finally {
    client.disconnect();
  }
};
