import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppKitProvider from "@/context";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chain Abstraction Demo",
  description: "Demo dapp for chain abstraction UX demonstration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased overflow-y-auto",
          inter.className,
        )}
      >
        <AppKitProvider cookies={cookies}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <div className="flex justify-center min-h-screen">{children}</div>
          </ThemeProvider>
        </AppKitProvider>
        <Toaster />
      </body>
    </html>
  );
}
