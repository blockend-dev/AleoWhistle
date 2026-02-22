"use client";
import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { ReportCard } from "@/app/components/ReportCard";
import { ReviewModal } from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";
import { decryptWithAES, keyToUint8Array, parseAleoStruct } from "../lib/crypto";
import { useIPFS } from '@/app/hooks/useIPFS'


export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateStatus, addComment } = useWhistleblowing();
  const [unlockedContent, setUnlockedContent] = useState<Record<string, any>>({});
  const { fetchFromIPFS } = useIPFS()

  useEffect(() => {
    const syncBlockchain = async () => {
      try {
        const response = await fetch(
          `https://api.provable.com/v2/testnet/program/new_whistleblowing.aleo/mapping/reports`
        );

        if (!response.ok) throw new Error("Network latency on Aleo node");

        const rawData = await response.json();

        const liveReports = rawData.map((item: any) => ({
          report_id: item.key.replace('field', ''),
          ...parseAleoStruct(item.value)
        }));

        setReports(liveReports);
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setLoading(false);
      }
    };

    syncBlockchain();
  }, []);

  const handleAction = async (reportId: string, action: string, comment?: string) => {
    try {
      if (action === "comment" && comment) {
        // Encrypt comment before adding 
        await addComment(reportId, `0x${btoa(comment)}`);
      } else {
        const newStatus = action === "approve" ? 3 : 4; // 3=Resolved, 4=Rejected
        await updateStatus(reportId, newStatus);
      }
      alert("Action completed");
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed");
    }
  };

  const handleUnlockReport = async (report: any) => {
    const reviewerSK = prompt("Enter Reviewer Private Key to decrypt:");
    if (!reviewerSK) return;

    try {
      const { Group, PrivateKey } = await import('@provablehq/sdk');

      const privKey = PrivateKey.from_string(reviewerSK);
      const ephemeralPoint = Group.fromString(report.ephemeral_key);

      const sharedSecretPoint = ephemeralPoint.scalarMultiply(privKey.to_view_key().to_scalar());
      const secretBI = BigInt(sharedSecretPoint.toString().replace(/group$/, ''));

      // Recover AES Key
      const encryptedKeyBI = BigInt(report.reviewer_key);
      const recoveredKey = (encryptedKeyBI ^ secretBI).toString();

      // Fetch and Decrypt IPFS data
      const encryptedBlob = await fetchFromIPFS(report.evidence_hash);
      const decryptedData = await decryptWithAES(encryptedBlob, recoveredKey);

      setUnlockedContent(prev => ({
        ...prev,
        [report.report_id]: JSON.parse(decryptedData)
      }));

    } catch (err) {
      console.error("Decryption failed:", err);
      alert("Invalid Key: You do not have permission to view this report.");
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold glitch-text">
            <Shield className="inline-block h-8 w-8 mr-2 text-neon-green" />
            Reviewer Dashboard
          </h1>

          <div className="flex items-center space-x-4">
            <span className="text-sm font-mono text-neon-green">
              {reports.length} Pending Reports
            </span>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-neon-green/50 text-neon-green rounded-lg hover:bg-neon-green/10"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400 font-mono">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="terminal-window text-center py-20">
            <Shield className="h-16 w-16 text-neon-green mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">All Caught Up!</h2>
            <p className="text-gray-400 font-mono">No pending reports to review.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                onView={() => setSelectedReport(report)}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {selectedReport && (
        <ReviewModal
          report={selectedReport}
          decryptedData={unlockedContent[(selectedReport as any).report_id]}
          onClose={() => setSelectedReport(null)}
          onAction={handleAction}
          onUnlock={() => handleUnlockReport(selectedReport)}
        />
      )}
    </div>
  );
}