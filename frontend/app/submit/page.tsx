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

  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono
                  ${step >= i ? 'border-neon-green text-neon-green' : 'border-gray-600 text-gray-600'}
                `}>
                  {step > i ? <CheckCircle className="h-5 w-5" /> : i}
                </div>
                {i < 3 && (
                  <div className={`w-24 h-0.5 mx-2 ${step > i ? 'bg-neon-green' : 'bg-gray-600'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm font-mono">
            <span>Write Report</span>
            <span>Encrypt & Upload</span>
            <span>Confirmation</span>
          </div>
        </div>

      )
}