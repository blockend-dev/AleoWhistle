'use client'

import { useState, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, MessageSquare, Download, Shield } from 'lucide-react'
import { useContract } from '@/hooks/useContract'
import { useIPFS } from '@/hooks/useIPFS'
import { decryptWithPrivateKey } from '@/lib/crypto'
import { ReportCard } from '@/components/ReportCard'
import { ReviewModal } from '@/components/ReviewModal'

export default function DashboardPage() {
}