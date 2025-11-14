import { useState, useEffect } from 'react';
import { connectWallet, isWalletConnected, getCurrentWalletAddress } from '@repo/utils/wallet/browser';
import { acceptCredential, validateCredentialAcceptData } from '@repo/utils';
import type { WalletState } from '@repo/utils/wallet/core';
import type { CredentialAcceptData } from '@repo/utils';

export interface CredentialAcceptProps {
  onCredentialAccepted?: (txHash: string, credentialData: CredentialAcceptData) => void;
  onWalletConnect?: (wallet: WalletState) => void;
  className?: string;
}

const credentialTypeOptions = [
  { value: '64656661756C74', label: '現地滞在証明書 (Current Resident)' },
  { value: '6C6561646572', label: 'リーダー滞在証明書 (Leader Resident)' },
  { value: '766F6C756E7465657273', label: 'ボランティア貢献証明書 (Volunteer Contributor)' },
  { value: '7072656D69756D', label: 'プレミアムレビュー証明書 (Premium Reviewer)' },
];

export const CredentialAccept = ({ 
  onCredentialAccepted,
  onWalletConnect,
  className = "" 
}: CredentialAcceptProps) => {
  const [wallet, setWallet] = useState<WalletState>({ isConnected: false });
  const [formData, setFormData] = useState<CredentialAcceptData>({
    credentialType: credentialTypeOptions[0].value,
  });
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'creating' | 'waiting' | 'accepting' | 'done'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check wallet connection on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const connected = await isWalletConnected();
        if (connected) {
          const address = await getCurrentWalletAddress();
          if (address) {
            const walletState = { isConnected: true, address };
            setWallet(walletState);
          }
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    initialize();
  }, []);

  const handleWalletConnect = async () => {
    console.log('Connecting wallet...');
    try {
      const walletState = await connectWallet();
      setWallet(walletState);
      if (walletState.isConnected && walletState.address) {
        onWalletConnect?.(walletState);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleAcceptCredential = async () => {
    console.log('Accepting credential with data:', formData);
    // Validate form
    const validationErrors = validateCredentialAcceptData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    console.log('Form data is valid, proceeding to accept credential.');

    setIsAccepting(true);
    setErrors({});

    try {
      setCurrentStep('creating');
      console.log('Step 1: System creating credential...');

      setCurrentStep('waiting');
      console.log('Step 2: Waiting for credential confirmation...');

      setCurrentStep('accepting');
      console.log('Step 3: User accepting credential via XUMM...');

      // Call the utility function (handles all steps internally)
      const result = await acceptCredential(wallet, formData);

      if (result.success && result.txHash) {
        console.log('Credential accepted successfully:', result.txHash);
        setCurrentStep('done');
        
        // Notify parent component
        onCredentialAccepted?.(result.txHash, formData);
        
        // Reset form after a delay
        setTimeout(() => {
          setFormData({
            credentialType: credentialTypeOptions[0].value,
          });
          setCurrentStep('idle');
        }, 3000);
        
        // Show success message
        alert(`Credential accepted successfully! Transaction ID: ${result.txHash}`);
      } else {
        setErrors({ general: result.error || 'Failed to accept credential' });
        setCurrentStep('idle');
      }
    } catch (error) {
      console.error('Failed to accept credential:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to accept credential' });
      setCurrentStep('idle');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleInputChange = (value: string) => {
    setFormData({ credentialType: value});
    if (errors.credentialType) {
      setErrors(prev => ({ ...prev, credentialType: '' }));
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className={`bg-green-50 p-8 rounded-lg text-center ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          資格情報を受け入れるにはウォレット接続が必要です
        </h2>
        <p className="text-gray-600 mb-6">
          XRPL CredentialAcceptトランザクションを送信するためにXUMMウォレットに接続してください
        </p>
        <button
          onClick={handleWalletConnect}
          className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          XUMMウォレットを接続
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 p-6 rounded-lg ${className}`}>
      <div className="mb-4 p-4 bg-green-100 rounded-lg">
        <p className="text-sm text-green-700">
          接続済み: {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-8)}
        </p>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">資格情報を受け入れる</h2>

      {errors.general && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700">{errors.general}</p>
        </div>
      )}

      {/* Progress Steps */}
      {currentStep !== 'idle' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${currentStep === 'creating' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              {currentStep === 'creating' ? '🔄' : '✅'} システムが資格情報を作成中...
            </div>
            <div className={`flex items-center gap-2 ${currentStep === 'waiting' ? 'text-blue-600 font-medium' : currentStep === 'creating' ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentStep === 'waiting' ? '🔄' : currentStep === 'creating' ? '⏳' : '✅'} レジャーでの確認を待機中...
            </div>
            <div className={`flex items-center gap-2 ${currentStep === 'accepting' ? 'text-blue-600 font-medium' : ['creating', 'waiting'].includes(currentStep) ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentStep === 'accepting' ? '🔄' : ['creating', 'waiting'].includes(currentStep) ? '⏳' : '✅'} XUMMで資格情報を受け入れ中...
            </div>
            {currentStep === 'done' && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                ✅ 完了しました！
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border space-y-6">
        {/* Credential Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credential Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.credentialType}
            onChange={(e) => handleInputChange(e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
              errors.credentialType ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isAccepting}
          >
            {credentialTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.credentialType && <p className="mt-1 text-sm text-red-600">{errors.credentialType}</p>}
          <p className="mt-1 text-sm text-gray-500">
            受け入れる資格情報の種類を選択してください
          </p>
        </div>

        {/* Accept Button */}
        <button
          onClick={handleAcceptCredential}
          disabled={isAccepting}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAccepting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              処理中...
            </span>
          ) : (
            'Credential を受け入れる'
          )}
        </button>
      </div>
    </div>
  );
};