import { useState } from 'react';
import { WalletButton, PaymentForm } from '@repo/ui';
import { WalletState } from '@repo/utils';

const Wallet = () => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });

  const handleWalletConnect = (walletState: WalletState) => {
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
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center">XRPL DEX</h1>
      
      <WalletButton 
        onConnect={handleWalletConnect}
        onDisconnect={handleWalletDisconnect}
      />
      
      {wallet.isConnected && wallet.address && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Send Payment</h2>
          <PaymentForm
            fromAddress={wallet.address}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      )}
    </div>
  );
};

export default Wallet;