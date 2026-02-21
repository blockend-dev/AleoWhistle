"use client"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { cidToAleoField } from "@/app/lib/crypto";

export function useWhistleblowing() {
  const { executeTransaction, transactionStatus } = useWallet();

  const pollTransaction = async (temporaryId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await transactionStatus?.(temporaryId);
          if (!status) return;

          if (status.status === "Accepted" && status.transactionId) {
            clearInterval(interval);
            resolve(status.transactionId);
          } else if (status.status === "Failed" || status.status === "Aborted") {
            clearInterval(interval);
            reject(new Error(`Transaction ${status.status}`));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 3000);
    });
  };

  const submitReport = async ({
    seed,
    category,
    severity,
    contentHash,
    evidenceCID,
    adminKeyField,    // Encrypted AES key for Admin
    reviewerKeyField,  // Encrypted AES key for Reviewer
    ephemeralKey
  }: any) => {
    try {

      console.log( contentHash, evidenceCID);
      const evidenceField = cidToAleoField(evidenceCID);

      const tx = await executeTransaction({
        program: "new_whistleblowing_version1.aleo",
        function: "submit_report",
        inputs: [
          `${seed}field`,
          `${category}u8`,
          `${severity}u8`,
          `${contentHash}`,
          `${evidenceField}`,      // evidence_hash
          `${evidenceField}`,      // encrypted_data (pointing to same CID)
          `${adminKeyField}field`,      // admin_key
          `${reviewerKeyField}field`,    // reviewer_key
          `${ephemeralKey}`         // ephemeral_key
        ],
        fee: 1500000,
        privateFee: false,
      });

      const temporaryId = typeof tx === "string" ? tx : (tx as any)?.transactionId;
      const finalTxId = await pollTransaction(temporaryId);
      return { finalTxId };
    } catch (error) {
      console.error('Submit report failed:', error);
      throw error;
    }
  };

  const updateStatus = async (reportId: string, newStatus: number) => {
    try {
      const tx = await executeTransaction({
        program: "new_whistleblowing_version1.aleo",
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
        program: "new_whistleblowing_version1.aleo",
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