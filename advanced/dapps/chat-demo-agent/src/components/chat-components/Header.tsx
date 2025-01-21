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
import Image from "next/image";

const Header = () => {
  const { clearChat, clearPermissions, state } = useChat();
  const { grantedPermissions } = state;
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [, setChainName] = useState<string>("");
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
    if (window.confirm("Are you sure you want to clear permissions? This will require you to restart the chat.")) {
      clearPermissions();
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect?")) {
      disconnect();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="grid h-20 border-b-2 border-foreground px-4">
      <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full">
        {/* Left section - Logo */}
        <div className="justify-self-start">
          <Image src="/reown-logo.svg" alt="Reown Logo" width={64} />
        </div>

        {/* Middle section - Permissions */}
        <div className="justify-self-center">
          {grantedPermissions?.expiry && (
            <div className="flex items-center gap-1 px-2 text-blue-500 bg-blue-400/10 rounded-full whitespace-nowrap">
              <Clock size={14} />
              <span>Permissions expires {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Right section - Actions */}
        <div className="justify-self-end flex items-center gap-3">
          {status === 'connecting' && (
            <Button 
              disabled
              style={{background: "var(hsla(0, 0%, 16%, 1))" }}
              className="text-white whitespace-nowrap"
            >
              Connecting...
            </Button>
          )}
          {status === 'disconnected' && !isConnected && (
            <Button 
              onClick={() => open({ view: "Connect" })}
              className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base text-white mt-4 bg-blue-400 hover:bg-blue-400/50"
            >
              Connect Wallet
            </Button>
            
          )}
          {isConnected && status === 'connected' && (
            <>
              {/* @ts-expect-error - Custom web component */}
              <w3m-button />
            </>
          )}
          <div className="h-6 w-px bg-zinc-700" />
          {grantedPermissions && <Button
            variant="ghost"
            size="sm"
            onClick={handleClearPermissions}
            className="text-red-500 bg-red-400/20 hover:text-red-400 hover:bg-red-400/10 whitespace-nowrap"
          >
            <XCircle className="h-4 w-4" /> Clear Permissions
          </Button> }
          {isConnected && status === 'connected' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-white bg-red-400 hover:bg-red-400/50 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
      </div>

        {/* Mobile view */}
        <div className="lg:hidden flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/reown-logo.svg" alt="Reown Logo" width={64} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-300">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border border-zinc-700">
              {grantedPermissions && (
                <>
                  <DropdownMenuLabel className="text-xs font-normal text-zinc-400">
                    Session Details
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1 px-2 text-blue-500 bg-blue-400/10 rounded-full">
                      <Clock size={14} />
                      <span>Permissions expires {timeLeft}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                </>
              )}
              <DropdownMenuLabel className="text-xs font-normal text-zinc-400">
                Wallet
              </DropdownMenuLabel>
              {isConnected && status === 'connected' ? (
                <DropdownMenuItem className="gap-2">
                  {/* @ts-expect-error - Custom web component */}
                  <w3m-button />
                </DropdownMenuItem>
              ) : status === 'connecting' ? (
                <DropdownMenuItem disabled className="gap-2 bg-blue-400 text-white hover:bg-[rgb(0,116,61)] focus:bg-[rgb(0,116,61)]">
                  Connecting...
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => open({ view: "Connect" })}
                  className="gap-2 bg-blue-400 text-white hover:bg-[rgb(0,116,61)] focus:bg-[rgb(0,116,61)]"
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
              <DropdownMenuItem onClick={handleClearChat} className="sm:hidden gap-2 text-red-400 hover:text-red-300 focus:bg-red-400/10">
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