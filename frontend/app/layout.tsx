// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Fira_Code } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Providers } from '@/components/Providers'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
// Import wallet adapter CSS
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira' })

export const metadata: Metadata = {
  title: 'WhistleCrypt - Anonymous Reporting',
  description: 'Secure, private whistleblowing on Aleo blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${firaCode.variable} font-sans bg-cyber-dark text-cyber-light`}>
        
        <AleoWalletProvider
      wallets={[
        new ShieldWalletAdapter(),
        new PuzzleWalletAdapter(),
        new LeoWalletAdapter(),
        new FoxWalletAdapter(),
        new SoterWalletAdapter(),
      ]}
      autoConnect={true}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
  programs={["credits.aleo", "hello_world.aleo", "test_credit_me.aleo"]}
      onError={error => console.error(error.message)}
    >
      <WalletModalProvider>
      <Providers>
          <Navbar />
          <main className="min-h-screen bg-gradient-to-br from-cyber-dark via-cyber-darker to-cyber-black">
            {children}
          </main>
        </Providers>
      </WalletModalProvider>
    </AleoWalletProvider
      </body>
    </html>
  )
}