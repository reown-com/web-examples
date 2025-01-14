import React from 'react';
import { ScrollArea } from "../ui/scroll-area";
import ChatHistoryItem from './ChatHistory';

type SidebarProps = object;

const Sidebar: React.FC<SidebarProps> = () => {
 return (
   <div className="hidden md:flex w-64 flex-col bg-zinc-900 border-r border-zinc-800">
     <div className="p-4 border-b border-zinc-800">
       <h2 className="text-white font-semibold">Chat History</h2>
     </div>
     <ScrollArea className="flex-1">
       <div className="p-2">
         <div className="space-y-2">
           <ChatHistoryItem title="Previous Chat 1" />
           <ChatHistoryItem title="Previous Chat 2" />
         </div>
       </div>
     </ScrollArea>
   </div>
 );
};

export default Sidebar;