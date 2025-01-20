import React from 'react';
import { Button } from "@/components/ui/button";

type ConnectionScreenProps = {
  onConnect: () => void;
  isConnected: boolean;
  status: "reconnecting" | "connected" | "disconnected" | "connecting" | undefined;
};
const ConnectionScreen = ({ onConnect, isConnected, status }: ConnectionScreenProps) => (
  <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 px-4 sm:px-6 md:px-8">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 text-center">
      Welcome to Smart-Session x AI Agent
    </h1>
    
    <div className="flex flex-col gap-4 text-center max-w-xs sm:max-w-md">
      <div className="bg-zinc-800/50 p-4 rounded-lg">
        <p className="text-sm sm:text-base text-zinc-400 mb-2">
          When connecting, use Email Wallet with:
        </p>
        <p className="font-mono text-white bg-zinc-700/50 p-2 rounded">
          youremail<span className="text-blue-400">+smart-sessions</span>@domain.com
        </p>
        <p className="text-sm text-zinc-400 mt-2">
          Example: john<span className="text-blue-400">+smart-sessions</span>@doe.com
        </p>
      </div>
    </div>
    {status === 'connecting' && (
        <Button 
          disabled
          style={{background: "var(hsla(0, 0%, 16%, 1))" }}
          className="text-white whitespace-nowrap"
        >
          Connecting...
        </Button>
      )}
      { !isConnected && (status === 'disconnected' || !status) && (
        <Button 
        onClick={onConnect}
        className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base text-white mt-4 bg-blue-400 hover:bg-blue-400/50"
      >
        Connect Wallet
      </Button>
    )}
  </div>
);

export default ConnectionScreen;