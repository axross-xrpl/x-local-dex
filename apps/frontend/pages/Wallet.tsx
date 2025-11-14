import { useState } from 'react';
import { WalletButton, PaymentForm, PaymentFormBackend } from '@repo/ui';
import type { WalletState } from '@repo/utils/wallet/core';
import { apiService } from '../src/services/api';

console.log('Wallet page loaded');
console.log('API Service:', apiService);
console.log('wallet-button and payment-form components imported successfully');
console.log('WalletButton component:', WalletButton);

const Wallet = () => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [useBackend, setUseBackend] = useState(false);

  console.log('walletState in Wallet page:', wallet);

  const handleWalletConnect = (walletState: WalletState) => {
    console.log('Wallet connected:', walletState);
    setWallet(walletState);
  };

  const handleWalletDisconnect = () => {
    setWallet({ isConnected: false });
  };

  const handlePaymentSuccess = (txId: string) => {
    alert(`Payment successful! Transaction ID: ${txId}`);
  };

  const handlePaymentError = (error: string) => {
    alert(`Payment failed: ${error}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4">
      <h1 className="text-3xl font-bold text-center">XRPL DEX</h1>
      
      <WalletButton 
        onConnect={handleWalletConnect}
        onDisconnect={handleWalletDisconnect}
      />
      
      {wallet.isConnected && wallet.address && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Send Payment</h2>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={useBackend}
                  onChange={(e) => setUseBackend(e.target.checked)}
                  className="mr-2"
                />
                Use Backend API
              </label>
            </div>
          </div>

          {useBackend ? (
            <PaymentFormBackend
              fromAddress={wallet.address}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              apiService={apiService}
            />
          ) : (
            <PaymentForm
              fromAddress={wallet.address}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Wallet;