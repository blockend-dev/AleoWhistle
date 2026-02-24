'use client'

import { useEffect, useState } from 'react'
import { Shield, Lock, Globe, FileText, AlertTriangle, ArrowRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { StatsCard } from '@/app/components/StatsCard'
import { supabase } from '@/app/lib/db'

export default function Home() {
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 })
  const [recentReports, setRecentReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const { data, error } = await supabase
          .from('reports_index')
          .select('status');

        if (error) throw error;

        if (data) {
          const total = data.length;
          const pending = data.filter(r => r.status === 1 || r.status === 2).length;
          const resolved = data.filter(r => r.status === 3).length;
          setStats({ total, pending, resolved });
        }

        const { data: recent } = await supabase
          .from('reports_index')
          .select('report_id, created_at, status')
          .order('created_at', { ascending: false })
          .limit(3);
        
        setRecentReports(recent || []);
      } catch (err) {
        console.error("Error fetching homepage stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStats();

    // Subscribe to real-time updates so stats change as people submit
    const channel = supabase
      .channel('public_stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports_index' }, () => {
        fetchLiveStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [])

  return (
    <div className="cyber-grid min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block p-2 bg-neon-green/10 rounded-full mb-8 border border-neon-green/30">
            <span className="text-neon-green font-mono text-sm uppercase tracking-widest">
              Live_Network_Status: Operational
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 glitch-text uppercase tracking-tighter">
            Speak Truth
            <span className="block text-neon-green">Without Fear</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
            The world's first fully decentralized whistleblowing portal. 
            Encrypted by <span className="text-white">Aleo ZK-SNARKs</span>, stored on <span className="text-white">IPFS</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/submit" 
              className="group bg-neon-green text-cyber-black px-8 py-4 rounded-lg font-bold hover:bg-neon-green/90 transition flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
            >
              <span>Submit Anonymous Report</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
            </Link>
            
            <Link href="/dashboard" 
              className="border border-neon-blue text-neon-blue px-8 py-4 rounded-lg font-bold hover:bg-neon-blue/10 transition"
            >
              Access Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard 
            icon={<FileText className="h-6 w-6" />}
            label="Encrypted Reports"
            value={loading ? 0 : stats.total}
            color="green"
          />
          <StatsCard 
            icon={<AlertTriangle className="h-6 w-6" />}
            label="In Review"
            value={loading ? 0 : stats.pending}
            color="yellow"
          />
          <StatsCard 
            icon={<Shield className="h-6 w-6" />}
            label="Resolved on-chain"
            value={loading ? 0 : stats.resolved}
            color="blue"
          />
        </div>
      </section>

      {/* Transparency Feed Section */}
      <section className="py-20 px-4 border-t border-white/5 bg-black/20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-12">
            <Activity className="text-neon-green h-5 w-5 animate-pulse" />
            <h2 className="text-2xl font-bold font-mono uppercase tracking-widest">Recent_Public_Ledger</h2>
          </div>

          <div className="space-y-4">
            {recentReports.map((report) => (
              <div key={report.report_id} className="p-4 border border-white/10 bg-cyber-black/50 rounded flex justify-between items-center font-mono text-sm">
                <div className="flex flex-col">
                  <span className="text-neon-blue">Case_{report.report_id.slice(0, 12)}...</span>
                  <span className="text-gray-600 text-xs">{new Date(report.created_at).toLocaleString()}</span>
                </div>
                <div className={`px-3 py-1 rounded text-[10px] border ${report.status === 3 ? 'border-neon-green text-neon-green' : 'border-neon-yellow text-neon-yellow'}`}>
                  {report.status === 3 ? 'RESOLVED' : 'ACTIVE_INVESTIGATION'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 uppercase tracking-widest">
            Security_Architecture
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Lock className="h-8 w-8 text-neon-green" />}
              title="Identity Zero"
              description="No wallets, no names, no logs. ZK-proofs verify you are a valid reporter without knowing who you are."
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8 text-neon-blue" />}
              title="IPFS Immutable"
              description="Evidence is shredded and distributed across a decentralized network. It cannot be deleted by any corporation."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-neon-purple" />}
              title="Dual-Key Encryption"
              description="Data is XOR-encrypted for specific reviewers. Only the chosen private key can unlock the truth."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="terminal-window hover:border-neon-green transition group">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 p-4 bg-cyber-black rounded-lg border border-white/5 group-hover:border-neon-green/50 transition">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{title}</h3>
        <p className="text-gray-400 font-mono text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}