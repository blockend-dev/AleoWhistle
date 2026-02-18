  'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Wallet, Shield, Menu, X } from 'lucide-react'
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { address, connect, disconnect, connected } = useWallet()

  return (
    <nav className="fixed top-0 w-full z-50 bg-cyber-darker/90 backdrop-blur-md border-b border-neon-green/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-neon-green" />
              <span className="font-bold text-xl glitch-text">WhistleCrypt</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="hover:text-neon-green transition">Home</Link>
            <Link href="/submit" className="hover:text-neon-green transition">Submit Report</Link>
            <Link href="/dashboard" className="hover:text-neon-green transition">Dashboard</Link>
            <Link href="/about" className="hover:text-neon-green transition">About</Link>
            
            {!connected ? (
             <WalletMultiButton />
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-neon-green/70">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-neon-red/70 hover:text-neon-red transition"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-cyber-darker border-b border-neon-green/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/" className="block px-3 py-2 hover:text-neon-green">Home</Link>
            <Link href="/submit" className="block px-3 py-2 hover:text-neon-green">Submit Report</Link>
            <Link href="/dashboard" className="block px-3 py-2 hover:text-neon-green">Dashboard</Link>
            <Link href="/about" className="block px-3 py-2 hover:text-neon-green">About</Link>
          </div>
        </div>
      )}
    </nav>
  )
}