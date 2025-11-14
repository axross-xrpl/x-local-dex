import { useState } from 'react';

interface PaymentFormBackendProps {
  fromAddress: string;
  onSuccess?: (txId: string) => void;
  onError?: (error: string) => void;
  apiService: {
    createPayment: (payload: any) => Promise<any>;
    getPayloadStatus: (uuid: string) => Promise<any>;
  };
}

export const PaymentFormBackend = ({ 
  fromAddress, 
  onSuccess, 
  onError,
  apiService 
}: PaymentFormBackendProps) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const pollPayloadStatus = async (uuid: string, maxAttempts = 150) => {
    for (let i = 0; i < maxAttempts; i++) {
      setStatusMessage(`Waiting for signature... (${i + 1}/${maxAttempts})`);
      
      const result = await apiService.getPayloadStatus(uuid);
      
      console.log(`Poll attempt ${i + 1}:`, result);
      
      if (result.success && result.data?.meta) {
        const { signed, resolved } = result.data.meta;
        
        console.log('Payload status:', { signed, resolved });
        
        // User signed the transaction (signed: true, resolved: true)
        if (signed === true && resolved === true) {
          const txId = result.data.response?.txid;
          console.log('Transaction signed! TxID:', txId);
          return { success: true, txId };
        }
        
        // User rejected the transaction (signed: false, resolved: true)
        if (signed === false && resolved === true) {
          console.log('Transaction rejected by user');
          return { success: false, error: 'Transaction was rejected by user' };
        }
        
        // Still waiting (resolved: false or signed: null)
        console.log('Still waiting for user action...');
      } else {
        console.log('Invalid response from backend:', result);
      }
      
      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { success: false, error: 'Transaction timeout - no response received' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;

    setIsLoading(true);
    setQrUrl(null);
    setDeepLink(null);
    setStatusMessage('Creating payment...');

    try {
      console.log('Creating payment with:', { fromAddress, toAddress, amount });
      
      // Create payment via backend
      const paymentResult = await apiService.createPayment({
        fromAddress,
        toAddress,
        amount,
      });

      console.log('Payment creation result:', paymentResult);

      if (!paymentResult.success || !paymentResult.data) {
        throw new Error(paymentResult.error || 'Failed to create payment');
      }

      const { uuid, qrUrl: qr, deepLink: link } = paymentResult.data;
      
      console.log('Payment created:', { uuid, qrUrl: qr, deepLink: link });
      
      setQrUrl(qr);
      setDeepLink(link);
      setStatusMessage('Please sign the transaction in your XUMM wallet...');

      // Poll for the result
      const pollResult = await pollPayloadStatus(uuid);

      if (pollResult.success && pollResult.txId) {
        setStatusMessage('Payment successful!');
        onSuccess?.(pollResult.txId);
        setToAddress('');
        setAmount('');
      } else {
        throw new Error(pollResult.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setStatusMessage('');
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setQrUrl(null);
        setDeepLink(null);
        setStatusMessage('');
      }, 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From Address
        </label>
        <input
          type="text"
          value={fromAddress}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To Address
        </label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="rDestinationAddress..."
          required
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount (XRP)
        </label>
        <input
          type="number"
          step="0.000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1.000000"
          required
          disabled={isLoading}
        />
      </div>

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          {statusMessage}
        </div>
      )}

      {qrUrl && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2 text-center">
            Scan QR Code with XUMM App:
          </p>
          <img src={qrUrl} alt="Payment QR Code" className="w-48 h-48 mx-auto" />
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-center bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Open in XUMM Wallet
            </a>
          )}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isLoading || !toAddress || !amount}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Send Payment via Backend'}
      </button>
    </form>
  );
};