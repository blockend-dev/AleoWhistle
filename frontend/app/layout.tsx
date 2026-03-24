'use client'
import { Inter, Fira_Code } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/app/components/Navbar'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { ToastProvider } from '@/app/lib/toast';
import { ToastBridge } from '@/app/components/ToastBridge';

const inter    = Inter({ subsets: ['latin'], variable: '--font-inter' })
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${firaCode.variable} font-sans bg-cyber-dark text-cyber-light`}>
        <AleoWalletProvider
          wallets={[
            new ShieldWalletAdapter(),
            new PuzzleWalletAdapter(),
            new LeoWalletAdapter(),
            new FoxWalletAdapter(),
          ]}
          autoConnect={true}
          network={Network.TESTNET}
          decryptPermission={DecryptPermission.UponRequest}
          programs={["whistleblowing_version3.aleo","credits.aleo"]}
          onError={(error) => console.error(error.message)}
        >
          <WalletModalProvider>
            <ToastProvider>
              <ToastBridge />
              <Navbar />
              <main className="min-h-screen bg-gradient-to-br from-cyber-dark via-cyber-darker to-cyber-black">
                {children}
              </main>
            </ToastProvider>
          </WalletModalProvider>
        </AleoWalletProvider>
      </body>
    </html>
  )
}
