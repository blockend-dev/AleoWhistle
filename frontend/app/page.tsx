'use client'

import { useEffect, useState } from 'react'
import { Shield, Lock, Globe, FileText, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { StatsCard } from '@/components/StatsCard'
import { useContract } from '@/hooks/useContract'

export default function Home() {
  const { getStats } = useContract()
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getStats()
      setStats(data)
    }
    fetchStats()
  }, [])

  return (
    <div className="cyber-grid min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block p-2 bg-neon-green/10 rounded-full mb-8 border border-neon-green/30">
            <span className="text-neon-green font-mono text-sm">Powered by Aleo ZK-SNARKs</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 glitch-text">
            Speak Truth
            <span className="block text-neon-green">Without Fear</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto font-mono">
            Anonymous whistleblowing platform with zero-knowledge proofs. 
            Your identity remains secret. The truth becomes public.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/submit" 
              className="group bg-neon-green text-cyber-black px-8 py-4 rounded-lg font-bold hover:bg-neon-green/90 transition flex items-center justify-center space-x-2"
            >
              <span>Submit Anonymous Report</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
            </Link>
            
            <Link href="/dashboard" 
              className="border border-neon-green/50 text-neon-green px-8 py-4 rounded-lg font-bold hover:bg-neon-green/10 transition"
            >
              Reviewer Dashboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            icon={<FileText className="h-6 w-6" />}
            label="Total Reports"
            value={stats.total}
            color="green"
          />
          <StatsCard 
            icon={<AlertTriangle className="h-6 w-6" />}
            label="Pending Review"
            value={stats.pending}
            color="yellow"
          />
          <StatsCard 
            icon={<Shield className="h-6 w-6" />}
            label="Resolved Cases"
            value={stats.resolved}
            color="blue"
          />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-cyber-darker/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="text-neon-green">[</span> Why WhistleCrypt <span className="text-neon-green">]</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-neon-green" />}
              title="Zero-Knowledge Privacy"
              description="Your identity never leaves your device. ZK proofs verify without revealing."
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8 text-neon-blue" />}
              title="Decentralized Storage"
              description="Evidence stored on IPFS, immutable and accessible forever."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-neon-purple" />}
              title="End-to-End Encryption"
              description="Reports encrypted for reviewers only. No one else can read them."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="terminal-window hover:border-neon-green transition">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 p-3 bg-cyber-black rounded-full border border-neon-green/30">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400 font-mono text-sm">{description}</p>
      </div>
    </div>
  )
}