"use client";
import { useState, useEffect } from "react";
import { Shield, Activity, RefreshCw } from "lucide-react";
import { ReportCard } from "@/app/components/ReportCard";
import { ReviewModal } from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";
import { decryptWithAES, parseAleoStruct, recoverCaseKey } from "../lib/crypto";
import { useIPFS } from "@/app/hooks/useIPFS";
import { supabase } from "../lib/db";

const PROGRAM = "new_whistleblowing_version1.aleo";
const PROVABLE_API = "https://api.provable.com/v2/testnet";

export default function DashboardPage() {
  const [reports, setReports]           = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<Record<string, any>>({});

  const { updateStatus } = useWhistleblowing();
  const { fetchFromIPFS } = useIPFS();

  useEffect(() => {
    const fetchInitialReports = async () => {
      try {
        const { data, error } = await supabase
          .from("reports_index")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } catch (err) {
        console.error("Supabase fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialReports();

    const channel = supabase
      .channel("live_reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports_index" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReports((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((r) => r.report_id === payload.new.report_id ? payload.new : r)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (reportId: string, action: string, comment?: string) => {
    try {
      if (action === "comment") {
        if (!comment?.trim()) {
          alert("Please enter a comment before posting.");
          return;
        }

        // Store comment off-chain in Supabase (the Leo contract has no add_comment function)
        const { error } = await supabase
          .from("report_comments")
          .insert([{
            report_id: reportId,
            comment:   comment.trim(),
            created_at: new Date().toISOString(),
          }]);

        if (error) {
          console.error("Comment insert error:", error);
          alert("Could not save comment. Check your Supabase schema.");
        } else {
          alert("Comment saved.");
        }
        return;
      }

      // approve → status 3 (Resolved), reject → status 4 (Rejected)
      const newStatus = action === "approve" ? 3 : 4;

      await updateStatus(reportId, newStatus);

      const { error } = await supabase
        .from("reports_index")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("report_id", reportId);

      if (error) throw error;

      alert(`Report ${action === "approve" ? "resolved" : "rejected"} on-chain.`);
    } catch (error) {
      console.error("Action failed:", error);
      alert("Blockchain transaction failed. Check your wallet connection.");
    }
  };

  const handleUnlockReport = async (report: any) => {
    const reviewerSK = prompt("Enter your Aleo private key to decrypt this report:");
    if (!reviewerSK) return;

    try {
      const { Group, PrivateKey } = await import("@provablehq/sdk");

      const privKey = PrivateKey.from_string(reviewerSK);

      // Fetch the EncryptedContent mapping from the blockchain
      const response = await fetch(
        `${PROVABLE_API}/program/${PROGRAM}/mapping/encrypted_contents/${report.report_id}field`
      );
      if (!response.ok) {
        throw new Error(`Blockchain mapping fetch failed: ${response.statusText}`);
      }

      const rawMapping = await response.json();
      const chainData  = parseAleoStruct(rawMapping);

      // Reconstruct the ephemeral public-key group point from the stored x-coordinate.
      // During encryption we stored: ephemeral.address().toGroup().toString() stripped of "group".
      // Group.fromString("Xgroup") gives the curve point with x-coordinate X.
      const ephemeralPoint = Group.fromString(chainData.ephemeral_key + "group");

      // ECDH: ephemeral.pubKey × reviewer.viewKey_scalar = same shared secret as encryption
      const reviewerScalar     = privKey.to_view_key().to_scalar();
      const sharedSecretPoint  = ephemeralPoint.scalarMultiply(reviewerScalar);

      // Recover the AES case key via XOR (mask must match the encryption step)
      const recoveredKey = recoverCaseKey(chainData.reviewer_key, sharedSecretPoint.toString());

      // Fetch the encrypted report blob from IPFS.
      // Prefer the CID stored in Supabase (evidence_cid); fall back to chain's evidence field.
      const cid = report.evidence_cid ?? chainData.evidence_hash;
      if (!cid || cid === "0") {
        throw new Error("No valid IPFS CID found for this report.");
      }

      const encryptedBlob  = await fetchFromIPFS(cid);
      const decryptedData  = await decryptWithAES(encryptedBlob, recoveredKey);

      setUnlockedContent((prev) => ({
        ...prev,
        [report.report_id]: JSON.parse(decryptedData),
      }));
    } catch (err: any) {
      console.error("Decryption failed:", err);
      alert(
        `Decryption failed: ${err?.message ?? "You may not be the authorised reviewer for this case."}`
      );
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold glitch-text flex items-center">
              <Shield className="h-10 w-10 mr-3 text-neon-green" />
              REVIEWER_DASHBOARD
            </h1>
            <p className="text-gray-500 font-mono mt-2 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-neon-blue" />
              Monitoring Aleo Testnet...
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-xs text-gray-500 font-mono uppercase">Active Reports</p>
              <p className="text-xl font-bold text-neon-green">{reports.length}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-3 border border-neon-green/30 text-neon-green rounded-full hover:bg-neon-green/10 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reports */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neon-blue font-mono animate-pulse">SYNCING_WITH_SUPABASE...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="terminal-window text-center py-20 border-dashed">
            <Shield className="h-16 w-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-500">NO PENDING CASES FOUND</h2>
            <p className="text-gray-600 font-mono text-sm mt-2">Waiting for incoming transmissions...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                isUnlocked={!!unlockedContent[report.report_id]}
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
          decryptedData={unlockedContent[selectedReport.report_id]}
          onClose={() => setSelectedReport(null)}
          onAction={handleAction}
          onUnlock={() => handleUnlockReport(selectedReport)}
        />
      )}
    </div>
  );
}
