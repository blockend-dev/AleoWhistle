"use client"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";

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
    adminKeyField,     // Encrypted AES key for Admin
    reviewerKeyField,  // Encrypted AES key for Reviewer
    ephemeralKey       // Shared ephemeral group point (x-coordinate, no suffix)
  }: {
    seed: string;
    category: number;
    severity: number;
    contentHash: string;
    evidenceCID: string;
    adminKeyField: string;
    reviewerKeyField: string;
    ephemeralKey: string;
  }) => {
    const { cidToAleoField } = await import("@/app/lib/crypto");
    const evidenceField = cidToAleoField(evidenceCID);

    const tx = await executeTransaction({
      program: "new_whistleblowing_version1.aleo",
      function: "submit_report",
      inputs: [
        `${seed}field`,           // private reporter_seed: field
        `${category}u8`,          // public category: u8
        `${severity}u8`,          // public severity: u8
        `${contentHash}`,         // public content_hash: field  (already has suffix)
        `${evidenceField}`,       // public evidence_hash: field (already has suffix)
        `${evidenceField}`,       // public encrypted_data: field (same CID)
        `${adminKeyField}field`,  // public admin_key: field
        `${reviewerKeyField}field`, // public reviewer_key: field
        `${ephemeralKey}field`,   // public ephemeral_key: field (group x-coord)
      ],
      fee: 1500000,
      privateFee: false,
    });

    const temporaryId = typeof tx === "string" ? tx : (tx as any)?.transactionId;
    const finalTxId = await pollTransaction(temporaryId);
    return { finalTxId };
  };

  const updateStatus = async (reportId: string, newStatus: number) => {
    const tx = await executeTransaction({
      program: "new_whistleblowing_version1.aleo",
      function: "update_status",
      inputs: [
        `${reportId}field`,  // public report_id: field
        `${newStatus}u8`,    // public new_status: u8
      ],
      fee: 50000,
      privateFee: false,
    });

    const temporaryId = typeof tx === "string" ? tx : (tx as any)?.transactionId;
    if (!temporaryId) throw new Error("No transaction ID returned");

    return pollTransaction(temporaryId);
  };

  return {
    submitReport,
    updateStatus,
  };
}
