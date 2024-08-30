import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import Provider from "./provider";

// eslint-disable-next-line new-cap
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TicTacToe",
  description: "Play TicTacToe with your friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider> {children} </Provider>
      </body>
    </html>
  );
}
