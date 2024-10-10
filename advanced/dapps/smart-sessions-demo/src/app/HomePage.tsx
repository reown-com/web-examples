import React from "react";
import DemoApplicationList from "@/components/DemoApplicationList";
import { smartSessionsDemoAppMetadata } from "@/utils/DataUtil";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold text-lg">Smart Session Demos</span>
          </a>
        </div>
      </header>
      <Separator />
      <main className="container mx-auto px-4 py-6">
        <DemoApplicationList demoAppsMetadata={smartSessionsDemoAppMetadata} />
      </main>
    </div>
  );
}
