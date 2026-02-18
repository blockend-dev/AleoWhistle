import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
export function useWhistleblowing() {
  const { executeTransaction, transactionStatus } = useWallet()

  const pollTransaction = async (temporaryId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await transactionStatus?.(temporaryId)
          
          if (!status) return

          if (status.status === "Accepted" && status.transactionId) {
            console.log(status.transactionId, 'final tx id in poll')
            clearInterval(interval)
            resolve(status.transactionId) 
          } else if (status.status !== "pending") {
            clearInterval(interval)
            reject(new Error(`Transaction ${status.status}`))
          }
        } catch (error) {
          clearInterval(interval)
          reject(error)
        }
      }, 2000)
    })
  }

  const submitReport = async ({
    seed,
    category,
    severity,
    contentHash,
    evidenceHash,
    encryptedData,
    encryptionKeyHash
  }: any) => {
    try {
      // Execute the transaction
      const tx = await executeTransaction({
        program: "whistleblowing1.aleo",
        function: "submit_report",
        inputs: [
          seed,
          category.toString(),
          severity.toString(),
          contentHash,
          evidenceHash,
          encryptedData,
          encryptionKeyHash
        ],
        fee: 100000,
        privateFee: false,
      })

      const temporaryId = typeof tx === "string" ? tx : tx?.transactionId

      if (!temporaryId) {
        throw new Error("No transaction ID returned")
      }

      // Poll for final acceptance
      const finalTxId = await pollTransaction(temporaryId)
      const reportId = await deriveReportId(seed) 

      return { reportId, finalTxId }
    } catch (error) {
      console.error('Submit report failed:', error)
      throw error
    }
  }

  const updateStatus = async (reportId: string, newStatus: number) => {
    try {
      const tx = await executeTransaction({
        program: "whistleblowing.aleo",
        function: "update_status",
        inputs: [reportId, newStatus.toString()],
        fee: 50000,
        privateFee: false,
      })

      const temporaryId = typeof tx === "string" ? tx : tx?.transactionId
      if (!temporaryId) throw new Error("No transaction ID")

      const finalTxId = await pollTransaction(temporaryId)
      return finalTxId
    } catch (error) {
      console.error('Update status failed:', error)
      throw error
    }
  }

  const addComment = async (reportId: string, encryptedNote: string) => {
    try {
      const tx = await executeTransaction({
        program: "whistleblowing.aleo",
        function: "add_comment",
        inputs: [reportId, encryptedNote],
        fee: 50000,
        privateFee: false,
      })

      const temporaryId = typeof tx === "string" ? tx : tx?.transactionId
      if (!temporaryId) throw new Error("No transaction ID")

      const finalTxId = await pollTransaction(temporaryId)
      return finalTxId
    } catch (error) {
      console.error('Add comment failed:', error)
      throw error
    }
  }

  // Helper to derive report_id (must match contract's Poseidon2::hash_to_field)
  const deriveReportId = async (seed: string): Promise<string> => {
    return seed 
  }

  return {
    submitReport,
    updateStatus,
    addComment
  }
}