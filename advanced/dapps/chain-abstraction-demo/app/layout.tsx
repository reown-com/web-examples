import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cookieToInitialState } from "wagmi";
import { config } from "@/config";
import AppKitProvider from "@/context";
import { Toaster } from "@/components/ui/toaster";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
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
  const initialState = cookieToInitialState(config, headers().get("cookie"));

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased pt-12 pb-24 mt-12 overflow-y-auto",
          fontSans.variable
        )}
      >
        <AppKitProvider initialState={initialState}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <div className="flex items-center justify-center min-h-screen">
              {children}
            </div>
          </ThemeProvider>
        </AppKitProvider>
        <Toaster />
      </body>
    </html>
  );
}
