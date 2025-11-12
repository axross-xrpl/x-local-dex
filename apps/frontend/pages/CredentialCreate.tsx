import { useState } from 'react';
import { CredentialCreate  } from '@repo/ui';
import type { CredentialCreateData } from '@repo/ui';
import type { WalletState } from '@repo/utils/wallet/core';

const CredentialCreatePage = () => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [createdCredentials, setCreatedCredentials] = useState<Array<{
    txHash: string;
    data: CredentialCreateData;
    timestamp: Date;
  }>>([]);

  const handleCredentialCreated = async (txHash: string, credentialData: CredentialCreateData) => {
    console.log('Credential created:', { txHash, credentialData });
    
    // Add to the list of created credentials
    setCreatedCredentials(prev => [
      {
        txHash,
        data: credentialData,
        timestamp: new Date()
      },
      ...prev
    ]);

    // Optional: Send to backend for tracking
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          credentialData,
          walletAddress: wallet.address,
          createdAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        console.error('Failed to save credential to backend');
      }
    } catch (error) {
      console.error('Error saving credential:', error);
    }
  };

  const handleWalletConnect = (walletState: WalletState) => {
    setWallet(walletState);
    console.log('Wallet connected:', walletState);
  };

  const formatCredentialType = (hexType: string): string => {
    const typeMap: Record<string, string> = {
      '64656661756C74': '現地滞在証明書',
      '6C6561646572': 'リーダー滞在証明書',
      '766F6C756E7465657273': 'ボランティア貢献証明書',
      '7072656D69756D': 'プレミアムレビュー証明書'
    };
    return typeMap[hexType] || 'Unknown Type';
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const shortenTxHash = (hash: string): string => {
    return `${hash.slice(0, 12)}...${hash.slice(-12)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Credential Create
          </h1>
          <p className="text-gray-600">
            XRPLネットワーク上でCredentialCreateトランザクションを使用して新しい資格情報を作成します
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Credential Creation Form */}
          <div className="lg:col-span-2">
            <CredentialCreate
              onCredentialCreated={handleCredentialCreated}
              onWalletConnect={handleWalletConnect}
            />
          </div>

          {/* Right Column - Info and History */}
          <div className="space-y-6">

            {/* Transaction History */}
            {createdCredentials.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                   Recent Credentials
                </h3>
                <div className="space-y-3">
                  {createdCredentials.slice(0, 5).map((credential, index) => (
                    <div
                      key={credential.txHash}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-600">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {credential.timestamp.toLocaleTimeString('ja-JP')}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>{' '}
                          <span className="text-gray-600">
                            {formatCredentialType(credential.data.credentialType)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Subject:</span>{' '}
                          <span className="text-gray-600 font-mono">
                            {shortenAddress(credential.data.subject)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">TX:</span>{' '}
                          <a
                            href={`https://testnet.xrpl.org/transactions/${credential.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-mono"
                          >
                            {shortenTxHash(credential.txHash)}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialCreatePage;