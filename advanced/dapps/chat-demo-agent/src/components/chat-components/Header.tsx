import React, { useEffect, useState } from 'react';
import { Clock, LogOut, Trash2, XCircle } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { Button } from '../ui/button';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import {ChainUtil} from '@/utils/ChainUtil';
import { formatDistanceToNow } from 'date-fns';

const Header: React.FC<object> = () => {
  const { clearChat, clearPermissions, state } = useChat();
  const { grantedPermissions } = state;
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [chainName, setChainName] = useState<string>('');
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount();
  const {open} = useAppKit();

  useEffect(() => {
    if (!grantedPermissions?.expiry) return;

    try {
      const parsedChainId = parseInt(grantedPermissions.chainId, 16);
      const chain = ChainUtil.getChain(parsedChainId);
      setChainName(chain?.name || 'Unknown Network');

      const updateTimeLeft = () => {
        const now = new Date().getTime();
        const expiryTime = new Date(grantedPermissions.expiry * 1000).getTime();
        const difference = expiryTime - now;

        if (difference <= 0) {
          setTimeLeft('Expired');
          return;
        }

        setTimeLeft(formatDistanceToNow(new Date(grantedPermissions.expiry * 1000), { 
          addSuffix: true 
        }));
      };

      updateTimeLeft();
      const timer = setInterval(updateTimeLeft, 60000);

      return () => clearInterval(timer);
    } catch (error) {
      console.error('Error processing permissions:', error);
      setTimeLeft('Error calculating time');
    }
  }, [grantedPermissions]);

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      clearChat();
    }
  };

  const handleClearPermissions = () => {
    if (window.confirm('Are you sure you want to clear permissions? This will require you to restart the chat.')) {
      clearPermissions();
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect?')) {
      disconnect();
    }
  };

  return (
    <div className="h-20 border-b border-zinc-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex gap-6">
          <h1 className="text-xl font-bold text-white">Demo Agent</h1>
          {grantedPermissions && <div className='flex flex-col'>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {grantedPermissions.address.slice(0, 6)}...{grantedPermissions.address.slice(-4)}
              </span>
              <span className="text-sm text-zinc-400">
                on {chainName}
              </span>
            </div>
            {grantedPermissions?.expiry && (
              <div className="flex items-center gap-1 text-sm text-zinc-400">
                <Clock size={14} />
                <span>Permissions expire {timeLeft}</span>
              </div>
            )}
          </div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isConnected ?
        <>
           {/* @ts-expect-error - Custom web component */}
          <w3m-button />
          <Button 
          variant="destructive" 
          size="sm"
          onClick={handleDisconnect}
        >
          <LogOut className=" h-4 w-4" />
        </Button>
        </>
        :<Button 
              onClick={() => open({ view: "Connect" })}
              className="bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,136,71)]/90"
            >
              Connect Wallet
            </Button>
      }
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleClearPermissions}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Clear Permissions
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleClearChat}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Chat
        </Button>

      </div>
    </div>
  );
};

export default Header;