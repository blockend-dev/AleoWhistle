'use client'

import { useState, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, MessageSquare, Download, Shield } from 'lucide-react'
import { useContract } from '@/hooks/useContract'
import { useIPFS } from '@/hooks/useIPFS'
import { decryptWithPrivateKey } from '@/lib/crypto'
import { ReportCard } from '@/components/ReportCard'
import { ReviewModal } from '@/components/ReviewModal'

export default function DashboardPage() {
    const [reports, setReports] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const { getPendingReports, updateStatus, addComment } = useContract()
  const { fetchFromIPFS } = useIPFS()

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      const pending = await getPendingReports()
      setReports(pending)
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (reportId: string, action: 'approve' | 'reject' | 'comment', comment?: string) => {
    try {
      if (action === 'comment' && comment) {
        const encryptedComment = await encryptComment(comment)
        await addComment(reportId, encryptedComment)
      } else {
        const status = action === 'approve' ? 3 : 4 // 3=Resolved, 4=Rejected
        await updateStatus(reportId, status)
      }
      await loadReports()
    } catch (error) {
      console.error('Action failed:', error)
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold glitch-text">
            <Shield className="inline-block h-8 w-8 mr-2 text-neon-green" />
            Reviewer Dashboard
          </h1>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-mono text-neon-green">
              {reports.length} Pending Reports
            </span>
            <button
              onClick={loadReports}
              className="px-4 py-2 border border-neon-green/50 text-neon-green rounded-lg hover:bg-neon-green/10"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400 font-mono">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="terminal-window text-center py-20">
            <CheckCircle className="h-16 w-16 text-neon-green mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-gray-400 font-mono">No pending reports to review.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                onView={() => setSelectedReport(report)}
                onAction={handleReview}
              />
            ))}
          </div>
        )}
      </div>

      {selectedReport && (
        <ReviewModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAction={handleReview}
        />
      )}
    </div>
  )
}