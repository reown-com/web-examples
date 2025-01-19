import React, { useEffect, useState } from "react";
import { Clock, LogOut, Trash2, XCircle, Menu, X } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "../ui/button";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { ChainUtil } from "@/utils/ChainUtil";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

const Header: React.FC<object> = () => {
  const { clearChat, clearPermissions, state } = useChat();
  const { grantedPermissions } = state;
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [chainName, setChainName] = useState<string>("");
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [isMenuOpen] = useState(false);

  useEffect(() => {
    if (!grantedPermissions?.expiry) return;

    try {
      const parsedChainId = parseInt(grantedPermissions.chainId, 16);
      const chain = ChainUtil.getChain(parsedChainId);
      setChainName(chain?.name || "Unknown Network");

      const updateTimeLeft = () => {
        const now = new Date().getTime();
        const expiryTime = new Date(grantedPermissions.expiry * 1000).getTime();
        const difference = expiryTime - now;

        if (difference <= 0) {
          setTimeLeft("Expired");
          return;
        }

        setTimeLeft(
          formatDistanceToNow(new Date(grantedPermissions.expiry * 1000), {
            addSuffix: true,
          })
        );
      };

      updateTimeLeft();
      const timer = setInterval(updateTimeLeft, 60000);

      return () => clearInterval(timer);
    } catch (error) {
      console.error("Error processing permissions:", error);
      setTimeLeft("Error calculating time");
    }
  }, [grantedPermissions]);

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      clearChat();
    }
  };

  const handleClearPermissions = () => {
    if (
      window.confirm(
        "Are you sure you want to clear permissions? This will require you to restart the chat."
      )
    ) {
      clearPermissions();
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect?")) {
      disconnect();
    }
  };

  return (
    <div
      style={{
        height: '80px',
        borderBottom: '1px solid #4B5563', // Equivalent to border-zinc-700
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px', // Padding for mobile
        flexWrap: 'wrap', // Allow wrapping for smaller screens
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center', // Align items horizontally
          gap: '16px', // Space between Demo Agent and permissions details
          flexGrow: 1,
        }}
      >
        {/* Demo Agent Title */}
        <h1
          style={{
            fontSize: '1.125rem', // Equivalent to text-lg
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: '0', // Ensure no unnecessary margin
          }}
        >
          Demo Agent
        </h1>

        {/* Permissions Details */}
        {grantedPermissions && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: '0.875rem', // Equivalent to text-sm
                }}
              >
                {grantedPermissions.address.slice(0, 6)}...
                {grantedPermissions.address.slice(-4)}
              </span>
              <span
                style={{
                  fontSize: '0.75rem', // Equivalent to text-xs
                  color: '#A1A1AA', // Equivalent to text-zinc-400
                }}
              >
                on {chainName}
              </span>
            </div>
            {grantedPermissions?.expiry && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem', // Equivalent to text-xs
                  color: '#A1A1AA', // Equivalent to text-zinc-400
                }}
              >
                <Clock size={14} />
                <span>Permissions expire {timeLeft}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hamburger Menu for Mobile */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {isMenuOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-800">
            {isConnected ? (
              <>
                {/* Wallet Button */}
                <DropdownMenuItem asChild>
                  {/* @ts-expect-error - Custom web component */}
                  <w3m-button />
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    className="flex items-center w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Button
                  onClick={() => open({ view: "Connect" })}
                  className="bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,136,71)]/90 w-full"
                >
                  Connect Wallet
                </Button>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearPermissions}
                className="flex items-center w-full"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Clear Permissions
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearChat}
                className="flex items-center w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Chat
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Buttons for Desktop */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {isConnected ? (
          <>
            {/* @ts-expect-error - Custom web component */}
            <w3m-button />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              className="flex items-center"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            onClick={() => open({ view: "Connect" })}
            className="bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,136,71)]/90"
          >
            Connect Wallet
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearPermissions}
          className="flex items-center"
        >
          <XCircle className="mr-1 h-4 w-4" />
          Clear Permissions
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearChat}
          className="flex items-center"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear Chat
        </Button>
      </div>
    </div>
  );
};

export default Header;
