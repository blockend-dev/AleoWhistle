// app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { ReportCard } from "@/app/components/ReportCard";
import { ReviewModal } from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateStatus, addComment } = useWhistleblowing();

  // In production, fetch reports from an indexer or Aleo node
  useEffect(() => {
    // Mock data – replace with actual contract queries
    setReports([
      {
        report_id: "0x1234...",
        category: 2,
        severity: 3,
        timestamp: Math.floor(Date.now() / 1000) - 86400,
        status: 1,
        evidence_hash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
      }
    ]);
    setLoading(false);
  }, []);

  const handleAction = async (reportId: string, action: string, comment?: string) => {
    try {
      if (action === "comment" && comment) {
        // Encrypt comment before adding (simplified)
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
          onClose={() => setSelectedReport(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}