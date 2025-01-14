import React from 'react';
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

type HeaderProps = object;

const Header: React.FC<HeaderProps> = () => {
 return (
   <div className="flex items-center justify-between p-4 border-b border-zinc-800">
     <h1 className="text-white font-semibold">Chat Assistant</h1>
     <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
       <Settings className="h-5 w-5" />
     </Button>
   </div>
 );
};

export default Header;