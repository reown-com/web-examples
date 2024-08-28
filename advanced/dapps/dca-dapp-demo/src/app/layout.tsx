import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import Provider from "./provider";

// eslint-disable-next-line new-cap
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DCA Dapp Demo",
  description: "Dollar Cost Averaging Dapp Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
