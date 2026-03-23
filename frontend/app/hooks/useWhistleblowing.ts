"use client"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";

const PROGRAM        = process.env.NEXT_PUBLIC_PROGRAM ?? "whistleblowing_version2.aleo";
const POLL_INTERVAL  = 3000;
const POLL_MAX       = 80; // ~4 minutes

export function useWhistleblowing() {
  const { executeTransaction, transactionStatus } = useWallet();

  const pollTransaction = async (
    temporaryId: string,
    onStatus?: (msg: string) => void,
  ): Promise<string> => {
    for (let i = 1; i <= POLL_MAX; i++) {
      onStatus?.(`Confirming on Aleo testnet… (${i}/${POLL_MAX})`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      try {
        const status = await transactionStatus?.(temporaryId);
        if (!status) continue;

        if (status.status === "Accepted" && status.transactionId) {
          onStatus?.("Transaction accepted ✓");
          return status.transactionId;
        }
        if (status.status === "Failed" || status.status === "Aborted") {
          throw new Error(
            `Transaction ${status.status.toLowerCase()}. ` +
            "Check your wallet has enough credits and the program is deployed."
          );
        }
      } catch (err: any) {
        if (/rejected|aborted|failed/i.test(err?.message ?? "")) throw err;
        // transient network error — keep polling
      }
    }
    throw new Error(
      `Transaction timed out after ${(POLL_MAX * POLL_INTERVAL) / 60000} minutes. ` +
      "Check the Aleo explorer — it may still confirm."
    );
  };

  // ── Submit report (v2: passes admin + reviewer addresses so the contract
  //    can mint private EncryptedReport records to each recipient) ───────────
  const submitReport = async (
    {
      seed, category, severity, contentHash, evidenceCID,
      adminAddress, adminKeyField,
      reviewerAddress, reviewerKeyField,
      ephemeralKey,
    }: {
      seed: string;
      category: number;
      severity: number;
      contentHash: string;
      evidenceCID: string;
      adminAddress: string;
      adminKeyField: string;
      reviewerAddress: string;
      reviewerKeyField: string;
      ephemeralKey: string;
    },
    onStatus?: (msg: string) => void,
  ) => {
    const { cidToAleoField } = await import("@/app/lib/crypto");
    const evidenceField = cidToAleoField(evidenceCID);

    onStatus?.("Requesting wallet signature…");

    const tx = await executeTransaction({
      program: PROGRAM,
      function: "submit_report",
      inputs: [
        `${seed}field`,              // private reporter_seed
        `${category}u8`,
        `${severity}u8`,
        `${contentHash}`,            // already has "field" suffix
        `${evidenceField}`,
        `${evidenceField}`,          // encrypted_data = CID field
        adminAddress,                // admin_address: address
        `${adminKeyField}field`,
        reviewerAddress,             // reviewer_address: address
        `${reviewerKeyField}field`,
        `${ephemeralKey}field`,
      ],
      fee: 1500000,
      privateFee: false,
    });

    const temporaryId = typeof tx === "string" ? tx : (tx as any)?.transactionId;
    if (!temporaryId) throw new Error("Wallet did not return a transaction ID.");

    onStatus?.("Transaction broadcast — waiting for confirmation…");
    const finalTxId = await pollTransaction(temporaryId, onStatus);
    return { finalTxId };
  };

  const updateStatus = async (
    reportId: string,
    newStatus: number,
    onStatus?: (msg: string) => void,
  ) => {
    onStatus?.("Requesting wallet signature…");

    const tx = await executeTransaction({
      program: PROGRAM,
      function: "update_status",
      inputs: [`${reportId}field`, `${newStatus}u8`],
      fee: 50000,
      privateFee: false,
    });

    const temporaryId = typeof tx === "string" ? tx : (tx as any)?.transactionId;
    if (!temporaryId) throw new Error("Wallet did not return a transaction ID.");

    onStatus?.("Transaction broadcast — waiting for confirmation…");
    return pollTransaction(temporaryId, onStatus);
  };

  return { submitReport, updateStatus };
}
