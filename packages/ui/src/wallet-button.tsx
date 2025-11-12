import { useState, useEffect } from 'react';
import { connectWallet, logout, isWalletConnected, getCurrentWalletAddress } from '@repo/utils/wallet/browser';
import type { WalletState } from '@repo/utils/wallet/core';

interface WalletButtonProps {
  onConnect?: (wallet: WalletState) => void;
  onDisconnect?: () => void;
  className?: string;
}

export const WalletButton = ({ onConnect, onDisconnect, className }: WalletButtonProps) => {
  console.log('Rendering WalletButton component');
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  console.log('WalletButton rendered with props:', { onConnect, onDisconnect, className });

  console.log('Current wallet state:', wallet);
  // Check for existing wallet connection on mount
  useEffect(() => {
    console.log('WalletButton mounted');
    const checkWalletConnection = async () => {
      try {
        console.log('Checking wallet connection...');
        const isConnected = await isWalletConnected();
        console.log('Wallet connected status:', isConnected);
        if (isConnected) {
          const address = await getCurrentWalletAddress();
          console.log('Wallet address:', address);
          if (address) {
            setWallet({
              isConnected: true,
              address: address
            });
          }
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  const handleConnect = async () => {
  console.log('[WALLET-BUTTON] handleConnect called');
  console.log('[WALLET-BUTTON] walletState before connect:', wallet);
  setIsConnecting(true);
  
  try {
    console.log('[WALLET-BUTTON] Calling connectWallet...');
    const walletState = await connectWallet();
    console.log('[WALLET-BUTTON] connectWallet returned:', walletState);
    
    setWallet(walletState);
    
    if (walletState.isConnected) {
      console.log('[WALLET-BUTTON] Wallet connected, calling onConnect callback');
      onConnect?.(walletState);
    } else {
      console.log('[WALLET-BUTTON] Wallet connection failed');
    }
  } catch (error) {
    console.error('[WALLET-BUTTON] Failed to connect wallet:', error);
    alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setWallet({ isConnected: false });
  } finally {
    console.log('[WALLET-BUTTON] Setting isConnecting to false');
    setIsConnecting(false);
  }
};

  const handleDisconnect = async () => {
    try {
      // Call logout first to clear XUMM session
      await logout();

      // Then update local state
      setWallet({ isConnected: false });

      // Notify parent component
      onDisconnect?.();

      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      // Force reset state even if logout fails
      setWallet({ isConnected: false });
      onDisconnect?.();
    }
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