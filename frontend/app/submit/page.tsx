'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Lock, AlertCircle, CheckCircle, Shield, Copy } from 'lucide-react'
import { useWhistleblowing } from '@/app/hooks/useWhistleblowing'
import { useIPFS } from '@/app/hooks/useIPFS'
import {
  generateSeed,
  encryptCaseKeyForBothRecipients,
  hashContent,
  generate31ByteKey,
  keyToUint8Array,
  encryptWithAES,
  getBlockchainReceipt,
  parseReportIdFromReceipt,
  parseRecordCiphertexts,
} from '@/app/lib/crypto'
import Link from 'next/link'
import { supabase } from '../lib/db'

export default function SubmitPage() {
  const [step, setStep] = useState(1)
  const [report, setReport] = useState({
    title: '',
    description: '',
    category: 1,
    severity: 2,
    files: [] as File[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg]   = useState<string>('')
  const [error, setError]   = useState<string | null>(null)
  const [result, setResult] = useState<{
    reportId: string;
    seed: string;
    txId: string;
  } | null>(null)

  const { submitReport } = useWhistleblowing()
  const { uploadToIPFS }  = useIPFS()

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => setReport(prev => ({ ...prev, files: [...prev.files, ...files] })),
  })

  const handleSubmit = async () => {
    setError(null)
    setStatusMsg('')
    setSubmitting(true)

    try {
      const adminAddr    = process.env.NEXT_PUBLIC_ADMIN_ADDR
      const reviewerAddr = process.env.NEXT_PUBLIC_REVIEWER_ADDR
      if (!adminAddr || !reviewerAddr) {
        throw new Error(
          'Admin or reviewer address is not configured. ' +
          'Set NEXT_PUBLIC_ADMIN_ADDR and NEXT_PUBLIC_REVIEWER_ADDR in your .env.local.'
        )
      }

      setStatusMsg('Generating encryption keys…')
      const caseKey      = generate31ByteKey()
      const caseKeyBytes = keyToUint8Array(caseKey)

      setStatusMsg('Encrypting report…')
      const reportPayload = JSON.stringify({
        title:       report.title,
        description: report.description,
        category:    report.category,
        severity:    report.severity,
      })
      const reportBlob = await encryptWithAES(reportPayload, caseKeyBytes)

      setStatusMsg('Uploading encrypted report to IPFS…')
      const reportCID  = await uploadToIPFS(reportBlob)

      setStatusMsg('Deriving dual-recipient ECDH keys…')
      const { adminEncryptedKey, reviewerEncryptedKey, ephemeralField } =
        await encryptCaseKeyForBothRecipients(caseKey, adminAddr, reviewerAddr)

      const seed = generateSeed()

      const { finalTxId } = await submitReport(
        {
          seed,
          category:         report.category,
          severity:         report.severity,
          contentHash:      await hashContent(caseKey),
          evidenceCID:      reportCID,
          adminAddress:     adminAddr,
          adminKeyField:    adminEncryptedKey,
          reviewerAddress:  reviewerAddr,
          reviewerKeyField: reviewerEncryptedKey,
          ephemeralKey:     ephemeralField,
        },
        (msg) => setStatusMsg(msg),
      )

      setStatusMsg('Fetching on-chain report ID and record ciphertexts…')
      const receipt       = await getBlockchainReceipt(finalTxId)
      const onChainId     = parseReportIdFromReceipt(receipt)
      const ciphertexts   = parseRecordCiphertexts(receipt)
      console.log(ciphertexts)
      setStatusMsg('Indexing report in database…')
      const { error: dbError } = await supabase
        .from('reports_index')
        .insert([{
          report_id:                  onChainId,
          tx_id:                      finalTxId,
          category:                   report.category,
          severity:                   report.severity,
          evidence_cid:               reportCID,
          admin_record_ciphertext:    ciphertexts.adminRecord,
          reviewer_record_ciphertext: ciphertexts.reviewerRecord,
        }])

      if (dbError) console.error('Supabase insert error:', dbError)

      setResult({ reportId: onChainId || 'Pending Confirmation', seed, txId: finalTxId })
      setStep(3)
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err?.message ?? 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
      setStatusMsg('')
    }
  }

  const copyToClipboard = (text: string) =>
    navigator.clipboard.writeText(text).catch(() => {})

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

        {/* Step 1: Write Report */}
        {step === 1 && (
          <div className="terminal-window">
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-neon-green mb-4">
                <Lock className="h-5 w-5" />
                <span className="font-mono">Secure Report Drafting</span>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Report Title (Optional — stays anonymous)"
                  className="w-full bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                  value={report.title}
                  onChange={(e) => setReport(prev => ({ ...prev, title: e.target.value }))}
                />

                <textarea
                  placeholder="Describe the incident in detail..."
                  rows={8}
                  className="w-full bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                  value={report.description}
                  onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                    value={report.category}
                    onChange={(e) => setReport(prev => ({ ...prev, category: parseInt(e.target.value) }))}
                  >
                    <option value={1}>Corruption</option>
                    <option value={2}>Harassment</option>
                    <option value={3}>Safety Violation</option>
                    <option value={4}>Fraud</option>
                    <option value={5}>Other</option>
                  </select>

                  <select
                    className="bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                    value={report.severity}
                    onChange={(e) => setReport(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!report.description.trim()}
              className="w-full bg-neon-green text-cyber-black py-3 rounded-lg font-bold hover:bg-neon-green/90 transition disabled:opacity-50"
            >
              Continue to Encryption
            </button>
          </div>
        )}

        {/* Step 2: Encrypt & Upload */}
        {step === 2 && (
          <div className="terminal-window">
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-neon-green mb-4">
                <Upload className="h-5 w-5" />
                <span className="font-mono">Upload Evidence (Optional)</span>
              </div>

              <div
                {...getRootProps()}
                className="border-2 border-dashed border-neon-green/30 rounded-lg p-8 text-center cursor-pointer hover:border-neon-green transition"
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-neon-green/70" />
                <p className="font-mono text-gray-400">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-600 mt-2">Files will be encrypted before upload</p>
              </div>

              {report.files.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-mono text-neon-green mb-2">Selected Files:</h4>
                  {report.files.map((file, i) => (
                    <div key={i} className="text-sm text-gray-400 font-mono">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-cyber-black rounded-lg border border-neon-green/20">
                <div className="flex items-center space-x-2 text-neon-blue mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-mono text-sm">End-to-End Encryption Active</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  Your report is encrypted client-side with AES-256-GCM.
                  Dual ECDH keys ensure only authorized reviewers can decrypt.
                </p>
              </div>

              {submitting && statusMsg && (
                <div className="mt-4 p-3 bg-neon-blue/10 border border-neon-blue/30 rounded">
                  <p className="text-sm text-neon-blue font-mono flex items-center">
                    <span className="mr-2 h-2 w-2 rounded-full bg-neon-blue animate-pulse inline-block flex-shrink-0" />
                    {statusMsg}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-neon-red/10 border border-neon-red/30 rounded">
                  <p className="text-sm text-neon-red font-mono flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => { setStep(1); setError(null); }}
                className="flex-1 border border-neon-green/50 text-neon-green py-3 rounded-lg hover:bg-neon-green/10 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-neon-green text-cyber-black py-3 rounded-lg font-bold hover:bg-neon-green/90 transition disabled:opacity-50"
              >
                {submitting ? (statusMsg || 'Submitting…') : 'Submit Anonymous Report'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && result && (
          <div className="terminal-window text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-neon-green mx-auto mb-4" />
              <h2 className="text-2xl font-bold glitch-text mb-2">Report Submitted!</h2>
              <p className="text-gray-400 font-mono">
                Your report has been anonymously submitted to the Aleo blockchain.
              </p>
            </div>

            {/* Report ID */}
            <div className="bg-cyber-black p-4 rounded-lg mb-4 text-left">
              <p className="text-sm text-gray-500 font-mono mb-2">Report ID (save this):</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-cyber-darker p-2 rounded border border-neon-green/30 font-mono text-xs break-all">
                  {result.reportId}
                </code>
                <button
                  onClick={() => copyToClipboard(result.reportId)}
                  className="p-2 bg-neon-green/10 text-neon-green rounded hover:bg-neon-green/20"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Seed */}
            <div className="bg-cyber-black p-4 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-500 font-mono mb-2">Reporter Seed (save this securely):</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-cyber-darker p-2 rounded border border-neon-red/30 font-mono text-xs break-all">
                  {result.seed}
                </code>
                <button
                  onClick={() => copyToClipboard(result.seed)}
                  className="p-2 bg-neon-red/10 text-neon-red rounded hover:bg-neon-red/20"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 p-3 bg-neon-red/10 border border-neon-red/30 rounded">
                <p className="text-xs text-neon-red font-mono flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  CRITICAL: Store both values offline. Your seed is the ONLY way to prove you
                  submitted this report. It is never sent to any server.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-block bg-neon-green text-cyber-black px-8 py-3 rounded-lg font-bold hover:bg-neon-green/90 transition"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
