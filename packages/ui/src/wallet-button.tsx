import { useState } from 'react';
import { connectWallet, logout } from '@repo/utils/wallet/browser';
import type { WalletState } from '@repo/utils/wallet/core';

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
      <div className={`bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 shadow-md ${className || ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-semibold text-emerald-900">Connected</p>
            </div>
            <p className="text-xs text-emerald-700 font-mono truncate">
              {wallet.address}
            </p>
            {wallet.networkType && (
              <p className="text-xs text-emerald-600 mt-1">
                Network: {wallet.networkType}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
      className={`bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl ${className || ''}`}
    >
      {isConnecting ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </span>
      ) : (
        'Connect XUMM Wallet'
      )}
    </button>
  );
};