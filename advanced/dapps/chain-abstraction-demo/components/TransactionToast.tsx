import React from 'react';
import { Loader2 } from 'lucide-react';

interface TransactionToastProps {
  hash?: string;
  networkName?: string;
  elapsedTime?: number; // in seconds
  status: 'waiting-approval' | 'pending' | 'success' | 'error';
}

export const TransactionToast = ({ hash, networkName, elapsedTime, status }: TransactionToastProps) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderContent = () => {
    switch (status) {
      case 'waiting-approval':
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm font-medium">Check your wallet to approve transaction</p>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <div className="flex flex-col">
              <p className="text-sm font-medium">Sending Gift Donut</p>
              {hash && networkName && (
                <a
                  href={`${networkName}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  View transaction
                </a>
              )}
              {elapsedTime && (
                <p className="text-xs text-secondary">Time elapsed: {formatTime(elapsedTime)}</p>
              )}
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col">
            <p className="text-sm font-medium">Transaction completed!</p>
            {elapsedTime && (
              <p className="text-xs text-secondary">Completed in {formatTime(elapsedTime)}</p>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col">
            <p className="text-sm font-medium">Transaction failed</p>
            {elapsedTime && (
              <p className="text-xs text-secondary">Failed after {formatTime(elapsedTime)}</p>
            )}
          </div>
        );
    }
  };

  return <div className="w-full">{renderContent()}</div>;
};