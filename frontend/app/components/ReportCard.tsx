import { Eye, CheckCircle, XCircle, Lock, Unlock } from "lucide-react";
import { REPORT_STATUS } from "../lib/crypto";

interface ReportCardProps {
  report: any;
  isUnlocked: boolean;
  onView: () => void;
  onAction: (id: string, action: "approve" | "reject") => void;
}

const severityColors: Record<number, string> = {
  1: "text-neon-blue",
  2: "text-neon-green",
  3: "text-yellow-400",
  4: "text-neon-red",
};

const categoryNames = ["Corruption", "Harassment", "Safety Violation", "Fraud", "Other"];

export function ReportCard({ report, isUnlocked, onView, onAction }: ReportCardProps) {
  const status = REPORT_STATUS[report.status as number];

  return (
    <div
      className={`terminal-window hover:border-neon-green transition relative ${
        isUnlocked ? "border-neon-green/50" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-3 flex-wrap gap-y-2">
            {/* Encryption status */}
            <span
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                isUnlocked
                  ? "border-neon-green text-neon-green bg-neon-green/10"
                  : "border-gray-500 text-gray-500 bg-gray-500/10"
              }`}
            >
              {isUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              <span>{isUnlocked ? "DECRYPTED" : "ENCRYPTED"}</span>
            </span>

            {/* Status badge */}
            {status && (
              <span className={`font-mono text-xs px-2 py-0.5 rounded border border-current ${status.color}`}>
                {status.label}
              </span>
            )}

            <span className={`font-mono text-sm ${severityColors[report.severity] ?? "text-gray-400"}`}>
              Severity: {report.severity}
            </span>

            <span className="text-neon-green font-mono text-sm">
              {categoryNames[(report.category ?? 1) - 1] ?? "Unknown"}
            </span>

            <span className="text-gray-500 font-mono text-sm">
              ID: {String(report.report_id).slice(0, 8)}...
            </span>
          </div>

          <div className="font-mono text-sm text-gray-400 mb-4">
            Submitted: {new Date(report.created_at ?? Date.now()).toLocaleString()}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onView}
              className="flex items-center space-x-1 text-neon-blue hover:text-neon-blue/80 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>{isUnlocked ? "View Content" : "Decrypt & View"}</span>
            </button>

            <button
              onClick={() => onAction(report.report_id, "approve")}
              className="flex items-center space-x-1 text-neon-green hover:text-neon-green/80 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Resolve</span>
            </button>

            <button
              onClick={() => onAction(report.report_id, "reject")}
              className="flex items-center space-x-1 text-neon-red hover:text-neon-red/80 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
