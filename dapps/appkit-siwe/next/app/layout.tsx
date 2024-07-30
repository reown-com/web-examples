import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { cookieToInitialState } from 'wagmi';

import { config } from './config';
import Web3ModalProvider from './context';

export const metadata: Metadata = {
  title: 'Appkit SIWE Example - Next.js',
  description: 'Appkit example using SIWE with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(config, headers().get('cookie'));
  return (
    <html lang='en'>
      <body>
        <Web3ModalProvider initialState={initialState}>
          {children}
        </Web3ModalProvider>
      </body>
    </html>
  );
}
