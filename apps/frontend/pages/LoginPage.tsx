import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectWallet } from '@repo/utils/wallet/browser';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const walletState = await connectWallet();
      
      if (walletState.isConnected) {
        // Redirect to home page after successful connection
        navigate('/');
      } else {
        setError('Failed to connect wallet');
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-yellow-100 to-orange-200 flex items-center justify-center p-4">
      <div className="bg-[#fff4e0] rounded-3xl shadow-2xl p-12 max-w-6xl w-full text-center border-4 border-orange-300">
        {/* Title */}
        <h1 className="text-6xl text-gray-900 mb-8">
          地方創生DEX
        </h1>

        {/* Subtitle */}
        <p className="text-red-500 text-sm mb-12">
          ※プロトタイプのためXRPLのDevnetアカウントが必要です
        </p>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xl font-bold px-12 py-4 rounded-full hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isConnecting ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              接続中...
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;