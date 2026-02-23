"use client";
import { useState, useEffect } from "react";
import { Shield, Activity, RefreshCw } from "lucide-react";
import { ReportCard } from "@/app/components/ReportCard";
import { ReviewModal } from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";
import { decryptWithAES, keyToUint8Array, parseAleoStruct } from "../lib/crypto";
import { useIPFS } from '@/app/hooks/useIPFS';
import { supabase } from "../lib/db";

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<Record<string, any>>({});
  
  const { updateStatus, addComment } = useWhistleblowing();
  const { fetchFromIPFS } = useIPFS();

  useEffect(() => {
    const fetchInitialReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports_index')
          .select('*')
          .order('created_at', { ascending: false });
        
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
      .channel('live_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports_index' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReports((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports((prev) => prev.map(r => r.report_id === payload.new.report_id ? payload.new : r));
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAction = async (reportId: string, action: string, comment?: string) => {
    try {
      if (action === "comment" && comment) {
        // Hex encode comment for Aleo field compatibility
        await addComment(reportId, `0x${Buffer.from(comment).toString('hex')}`);
        alert("Comment added to blockchain");
      } else {
        const newStatus = action === "approve" ? 3 : 4; // 3=Resolved, 4=Rejected
        
        await updateStatus(reportId, newStatus);
        
        const { error } = await supabase
          .from('reports_index')
          .update({ status: newStatus, updated_at: new Date() })
          .eq('report_id', reportId);

        if (error) throw error;
        alert(`Report ${action === "approve" ? "Resolved" : "Rejected"} successfully`);
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Blockchain transaction failed. Check wallet.");
    }
  };

  const handleUnlockReport = async (report: any) => {
    const reviewerSK = prompt("Enter Reviewer Private Key to decrypt evidence:");
    if (!reviewerSK) return;

    try {
      const { Group, PrivateKey } = await import('@provablehq/sdk');

      // Setup keys
      const privKey = PrivateKey.from_string(reviewerSK);
      
      // Fetch full on-chain mapping data to get ephemeral keys
      const response = await fetch(
        `https://api.provable.com/v2/testnet/program/new_whistleblowing_version1.aleo/mapping/reports/${report.report_id}field`
      );
      const rawMapping = await response.json();
      const chainData = parseAleoStruct(rawMapping);

      // ECDH Shared Secret Calculation
      const ephemeralPoint = Group.fromString(chainData.ephemeral_key);
      const sharedSecretPoint = ephemeralPoint.scalarMultiply(privKey.to_view_key().to_scalar());
      const secretBI = BigInt(sharedSecretPoint.toString().replace(/group$/, ''));

      // Recover AES Key via XOR
      const encryptedKeyBI = BigInt(chainData.reviewer_key);
      const recoveredKey = (encryptedKeyBI ^ secretBI).toString();

      // Fetch from IPFS and Decrypt
      const encryptedBlob = await fetchFromIPFS(chainData.evidence_hash);
      const decryptedData = await decryptWithAES(encryptedBlob, recoveredKey);

      setUnlockedContent(prev => ({
        ...prev,
        [report.report_id]: JSON.parse(decryptedData)
      }));

    } catch (err) {
      console.error("Decryption failed:", err);
      alert("Decryption failed: You may not be the authorized reviewer for this case.");
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold glitch-text flex items-center">
              <Shield className="h-10 w-10 mr-3 text-neon-green" />
              REVIEWER_DASHBOARD
            </h1>
            <p className="text-gray-500 font-mono mt-2 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-neon-blue" />
              Monitoring Aleo Mainnet...
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

        {/* Reports Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neon-blue font-mono animate-pulse">SYNCING_WITH_SUPABASE...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="terminal-window text-center py-20 border-dashed">
            <Shield className="h-16 w-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-500">NO PENDING CASES FOUND</h2>
            <p className="text-gray-600 font-mono text-sm mt-2">Waiting for new incoming transmissions...</p>
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

      {/* Overlays */}
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