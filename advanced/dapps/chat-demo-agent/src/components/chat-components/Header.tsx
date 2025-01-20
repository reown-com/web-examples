import React, { useEffect, useState } from "react";
import { Clock, LogOut, Trash2, XCircle, Menu } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "../ui/button";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { ChainUtil } from "@/utils/ChainUtil";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const Header: React.FC = () => {
  const { clearChat, clearPermissions, state } = useChat();
  const { grantedPermissions } = state;
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [chainName, setChainName] = useState<string>("");
  const { disconnect } = useDisconnect();
  const { isConnected, status } = useAppKitAccount();
  const { open } = useAppKit();

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
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/75">
      <div className="h-20 border-b border-zinc-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <div className="bg-[rgb(0,136,71)] p-2 rounded-lg">
              <h1 className="text-lg font-bold text-white m-0">Reown Agent</h1>
            </div>
          </div>

          {/* Permissions Details */}
          {grantedPermissions && (
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">
                  {grantedPermissions.address.slice(0, 6)}...
                  {grantedPermissions.address.slice(-4)}
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
                  {chainName}
                </span>
              </div>
              {grantedPermissions?.expiry && (
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock size={14} />
                  <span>Expires {timeLeft}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isConnected && status === 'connected' ? (
            <>
              {/* @ts-expect-error - Custom web component */}
              <w3m-button />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : status === 'connecting' 
          ? <Button
              disabled
              className="bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,116,61)]"
          >
            Connecting...
          </Button>
          : (
            <Button
              onClick={() => open({ view: "Connect" })}
              className="bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,116,61)]"
            >
              Connect Wallet
            </Button>
          )}
          <div className="h-6 w-px bg-zinc-700" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearPermissions}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <XCircle className="h-4 w-4" /> Clear Permissions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" /> Clear Chat
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-300">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border border-zinc-700">
              {grantedPermissions && (
                <>
                  <DropdownMenuLabel className="text-xs font-normal text-zinc-400">
                    Session Details
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="flex flex-col items-start gap-1">
                    <span className="text-sm font-medium text-zinc-400">
                      {grantedPermissions.address.slice(0, 6)}...
                      {grantedPermissions.address.slice(-4)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {chainName} • Expires {timeLeft}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                </>
              )}
              <DropdownMenuLabel className="text-xs font-normal text-zinc-400">
                Wallet
              </DropdownMenuLabel>
              {isConnected && status === 'connected' ? (
                <>
                  <DropdownMenuItem className="gap-2">
                    {/* @ts-expect-error - Custom web component */}
                    <w3m-button />
                  </DropdownMenuItem>
                </>
              ) : status === 'connecting' 
              ? <DropdownMenuItem
                  disabled
                  className="gap-2 bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,116,61)] focus:bg-[rgb(0,116,61)]"
              >
                Connecting...
              </DropdownMenuItem>
              :(
                <DropdownMenuItem
                  onClick={() => open({ view: "Connect" })}
                  className="gap-2 bg-[rgb(0,136,71)] text-white hover:bg-[rgb(0,116,61)] focus:bg-[rgb(0,116,61)]"
                >
                  Connect Wallet
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuLabel className="text-xs font-normal text-zinc-400">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleClearPermissions} className="gap-2 text-red-400 hover:text-red-300 focus:bg-red-400/10">
                <XCircle className="h-4 w-4" />
                Clear Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClearChat} className="gap-2 text-red-400 hover:text-red-300 focus:bg-red-400/10">
                <Trash2 className="h-4 w-4" />
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;