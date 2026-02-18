'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Lock, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { useWhistleblowing } from '@/hooks/useWhistleblowing'
import { useIPFS } from '@/hooks/useIPFS'
import { generateSeed, encryptForReviewer } from '@/lib/crypto'

export default function SubmitPage() {
  const [step, setStep] = useState(1)
  const [report, setReport] = useState({
    title: '',
    description: '',
    category: 1,
    severity: 2,
    files: [] as File[]
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ reportId: string; seed: string } | null>(null)

  const { submitReport } = useWhistleblowing()
  const { uploadToIPFS } = useIPFS()

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => setReport({ ...report, files: [...report.files, ...files] })
  })

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Step 1: Generate random seed
      const seed = generateSeed()
      
      // Step 2: Encrypt content for reviewers
      const reviewerPublicKey = process.env.NEXT_PUBLIC_REVIEWER_PUBLIC_KEY!
      const encrypted = await encryptForReviewer(
        JSON.stringify({
          title: report.title,
          description: report.description,
          timestamp: Date.now()
        }),
        reviewerPublicKey
      )

      // Step 3: Upload encrypted files to IPFS
      const evidenceCID = await uploadToIPFS(report.files)
      
      // Step 4: Hash content for verification
      const contentHash = await hashContent(encrypted)
      
      // Step 5: Submit to Aleo
      const reportId = await submitReport({
        seed,
        category: report.category,
        severity: report.severity,
        contentHash,
        evidenceHash: evidenceCID,
        encryptedData: encrypted.data,
        encryptionKeyHash: encrypted.keyHash
      })

      setResult({ reportId, seed })
      setStep(3)
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  
}