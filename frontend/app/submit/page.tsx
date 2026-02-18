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
                  placeholder="Report Title (Optional - keeps anonymous)"
                  className="w-full bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                  value={report.title}
                  onChange={(e) => setReport({ ...report, title: e.target.value })}
                />

                <textarea
                  placeholder="Describe the incident in detail..."
                  rows={8}
                  className="w-full bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                  value={report.description}
                  onChange={(e) => setReport({ ...report, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono"
                    value={report.category}
                    onChange={(e) => setReport({ ...report, category: parseInt(e.target.value) })}
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
                    onChange={(e) => setReport({ ...report, severity: parseInt(e.target.value) })}
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
              disabled={!report.description}
              className="w-full bg-neon-green text-cyber-black py-3 rounded-lg font-bold hover:bg-neon-green/90 transition disabled:opacity-50"
            >
              Continue to Encryption
            </button>
          </div>
        )}

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
                  Your report will be encrypted using the reviewer's public key. 
                  Only authorized reviewers can decrypt it.
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-neon-green/50 text-neon-green py-3 rounded-lg hover:bg-neon-green/10 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-neon-green text-cyber-black py-3 rounded-lg font-bold hover:bg-neon-green/90 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Anonymous Report'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="terminal-window text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-neon-green mx-auto mb-4" />
              <h2 className="text-2xl font-bold glitch-text mb-2">Report Submitted!</h2>
              <p className="text-gray-400 font-mono">
                Your report has been anonymously submitted to the blockchain.
              </p>
            </div>

            <div className="bg-cyber-black p-4 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-500 font-mono mb-2">Your Report ID (SAVE THIS):</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-cyber-darker p-2 rounded border border-neon-green/30 font-mono text-sm">
                  {result.reportId}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(result.reportId)}
                  className="px-3 py-2 bg-neon-green/10 text-neon-green rounded hover:bg-neon-green/20"
                >
                  Copy
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-neon-red/10 border border-neon-red/30 rounded">
                <p className="text-sm text-neon-red font-mono flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  IMPORTANT: Save your Report ID and seed to check status later!
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