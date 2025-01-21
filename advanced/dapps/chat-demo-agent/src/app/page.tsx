"use client";
import React from "react";
import ChatInterface from "@/components/chat-components/ChatInterface";
import AppkitProvider from "./provider";

export default function Home() {
    return (
      <AppkitProvider>
          <ChatInterface />
      </AppkitProvider>
    );
  
}
