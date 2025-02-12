import React from 'react';
import { Loader2 } from 'lucide-react';

export const CheckWalletToast = () => {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <p className="text-sm font-medium">Check your wallet to approve transaction</p>
    </div>
  );
};