import { useState } from 'react';
import { signTransaction, waitForTransactionResult } from '@repo/utils/wallet/browser';
import { createPaymentTransaction } from '@repo/utils/wallet/core';

interface PaymentFormProps {
  fromAddress: string;
  onSuccess?: (txId: string) => void;
  onError?: (error: string) => void;
}

export const PaymentForm = ({ fromAddress, onSuccess, onError }: PaymentFormProps) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;

    setIsLoading(true);
    try {
      const amountInDrops = (parseFloat(amount) * 1000000).toString();
      
      const paymentTx = createPaymentTransaction(fromAddress, toAddress, amountInDrops);
      const result = await signTransaction(paymentTx);
      
      if (result) {
        console.log('Payment initiated:', result.next.always);
        
        const txResult = await waitForTransactionResult(result.uuid);
        console.log('Transaction result:', txResult);
        if (txResult.signed && txResult.txid) {
          onSuccess?.(txResult.txid);
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading || !toAddress || !amount}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Send Payment'}
      </button>
    </form>
  );
};