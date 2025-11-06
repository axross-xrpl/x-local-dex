import { useState } from 'react';
import { connectWallet, signTransaction, createPaymentTransaction, WalletState,logout } from '@repo/utils';

interface WalletButtonProps {
  onConnect?: (wallet: WalletState) => void;
  onDisconnect?: () => void;
  className?: string;
}

export const WalletButton = ({ onConnect, onDisconnect, className }: WalletButtonProps) => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const walletState = await connectWallet();
      setWallet(walletState);
      if (walletState.isConnected) {
        onConnect?.(walletState);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWallet({ isConnected: false });
    logout();
    onDisconnect?.();
  };

  if (wallet.isConnected) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className || ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Connected</p>
            <p className="text-xs text-green-600 truncate">
              {wallet.address}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 ${className || ''}`}
    >
      {isConnecting ? 'Connecting...' : 'Connect XUMM Wallet'}
    </button>
  );
};