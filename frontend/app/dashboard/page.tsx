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
}