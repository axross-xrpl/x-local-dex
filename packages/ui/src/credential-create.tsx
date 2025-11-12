import { useState, useEffect } from 'react';
import { connectWallet, signTransaction, isWalletConnected, getCurrentWalletAddress,waitForTransactionResult } from '@repo/utils/wallet/browser';
import type { WalletState } from '@repo/utils/wallet/core';

export interface CredentialCreateData {
  subject: string; // Account ID of the credential subject
  issuer?: string; // Account ID of the credential issuer (optional, defaults to transaction sender)
  credentialType: string; // Arbitrary hex-encoded data representing the credential type
  expire?: number; // Optional ledger sequence number when the credential expires
}

export interface CredentialCreateProps {
  onCredentialCreated?: (txHash: string, credentialData: CredentialCreateData) => void;
  onWalletConnect?: (wallet: WalletState) => void;
  className?: string;
}

const credentialTypeOptions = [
  { value: '64656661756C74', label: '現地滞在証明書 (Current Resident)' },
  { value: '6C6561646572', label: 'リーダー滞在証明書 (Leader Resident)' },
  { value: '766F6C756E7465657273', label: 'ボランティア貢献証明書 (Volunteer Contributor)' },
  { value: '7072656D69756D', label: 'プレミアムレビュー証明書 (Premium Reviewer)' },
];

export const CredentialCreate = ({ 
  onCredentialCreated,
  onWalletConnect,
  className = "" 
}: CredentialCreateProps) => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [formData, setFormData] = useState<CredentialCreateData>({
    subject: '',
    credentialType: credentialTypeOptions[0].value,
    issuer: '',
    expire: undefined
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check wallet connection on mount
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const connected = await isWalletConnected();
        if (connected) {
          const address = await getCurrentWalletAddress();
          if (address) {
            const walletState = { isConnected: true, address };
            setWallet(walletState);
            setFormData(prev => ({ ...prev, issuer: address }));
          }
        }
      } catch (error) {
        console.error('Failed to check wallet:', error);
      }
    };
    checkWallet();
  }, []);

  const handleWalletConnect = async () => {
    console.log('Connecting wallet...');
    try {
      const walletState = await connectWallet();
      setWallet(walletState);
      if (walletState.isConnected && walletState.address) {
        onWalletConnect?.(walletState);
        setFormData(prev => ({ ...prev, issuer: walletState.address! }));
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate subject address
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject address is required';
    } else if (!/^r[a-zA-Z0-9]{24,34}$/.test(formData.subject.trim())) {
      newErrors.subject = 'Invalid XRPL address format';
    }

    // Validate credential type
    if (!formData.credentialType) {
      newErrors.credentialType = 'Credential type is required';
    }

    // Validate expire (if provided)
    if (formData.expire !== undefined && formData.expire <= 0) {
      newErrors.expire = 'Expire ledger sequence must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCredential = async () => {
  if (!validateForm() || !wallet.address) {
    return;
  }

  setIsCreating(true);
  try {
    // Prepare CredentialCreate transaction payload
    const txjson: any = {
      TransactionType: 'CredentialCreate',
      Account: wallet.address, // Transaction sender
      Subject: formData.subject.trim(),
      CredentialType: formData.credentialType,
    };

    // Add optional fields
    if (formData.issuer && formData.issuer !== wallet.address) {
      txjson.Issuer = formData.issuer;
    }

    if (formData.expire) {
      txjson.Expire = formData.expire;
    }

    console.log('Creating credential with transaction:', txjson);

    // Sign transaction with XUMM
    const result = await signTransaction({ txjson });
    console.log('XUMM signTransaction result:', result);
    
    if (!result) {
      throw new Error('Failed to create transaction payload');
    }


    // Wait for the transaction to be signed
    console.log('Waiting for user to sign transaction...');
    const payloadResult = await waitForTransactionResult(result.uuid);
    console.log('Transaction result:', payloadResult);

    if (payloadResult?.meta?.TransactionResult === 'tesSUCCESS') {
      console.log('Credential created successfully:', payloadResult);
      
      // Get the transaction hash
      const txHash = payloadResult.txid;
      
      // Notify parent component
      onCredentialCreated?.(txHash, formData);
      
      // Reset form
      setFormData({
        subject: '',
        credentialType: credentialTypeOptions[0].value,
        issuer: wallet.address,
        expire: undefined
      });
      setErrors({});
      
      // Show success message
      alert(`Credential created successfully! Transaction ID: ${txHash}`);
    } else {
      const errorMessage = payloadResult?.meta?.TransactionResult || 'Transaction was not signed or failed';
      throw new Error(`Transaction failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Failed to create credential:', error);
    setErrors({ general: error instanceof Error ? error.message : 'Failed to create credential' });
  } finally {
    setIsCreating(false);
  }
};

  const handleInputChange = (field: keyof CredentialCreateData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className={`bg-blue-50 p-8 rounded-lg text-center ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          資格情報作成にはウォレット接続が必要です
        </h2>
        <p className="text-gray-600 mb-6">
          XRPL CredentialCreateトランザクションを送信するためにXUMMウォレットに接続してください
        </p>
        <button
          onClick={handleWalletConnect}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          XUMMウォレットを接続
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 p-6 rounded-lg ${className}`}>
      <div className="mb-4 p-4 bg-green-100 rounded-lg">
        <p className="text-sm text-green-700">
          接続済み: {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-8)}
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">資格情報を作成</h2>

      {errors.general && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{errors.general}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border space-y-6">
        {/* Subject Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isCreating}
          />
          {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
          <p className="mt-1 text-sm text-gray-500">
            資格情報が発行される対象のXRPLアドレス
          </p>
        </div>

        {/* Credential Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credential Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.credentialType}
            onChange={(e) => handleInputChange('credentialType', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.credentialType ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isCreating}
          >
            {credentialTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.credentialType && <p className="mt-1 text-sm text-red-600">{errors.credentialType}</p>}
          <p className="mt-1 text-sm text-gray-500">
            資格情報の種類を選択してください
          </p>
        </div>

        {/* Issuer Address (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Issuer Address (Optional)
          </label>
          <input
            type="text"
            value={formData.issuer}
            onChange={(e) => handleInputChange('issuer', e.target.value)}
            placeholder="Default: Your wallet address"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
          />
          <p className="mt-1 text-sm text-gray-500">
            空白の場合、あなたのウォレットアドレスが発行者になります
          </p>
        </div>

        {/* Expire Ledger Sequence (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expire Ledger Sequence (Optional)
          </label>
          <input
            type="number"
            value={formData.expire || ''}
            onChange={(e) => handleInputChange('expire', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 85123456"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.expire ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isCreating}
            min="1"
          />
          {errors.expire && <p className="mt-1 text-sm text-red-600">{errors.expire}</p>}
          <p className="mt-1 text-sm text-gray-500">
            資格情報が期限切れになるレジャーシーケンス番号
          </p>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateCredential}
          disabled={isCreating}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              XUMMで作成中...
            </span>
          ) : (
            'Credential を作成'
          )}
        </button>
      </div>
    </div>
  );
};