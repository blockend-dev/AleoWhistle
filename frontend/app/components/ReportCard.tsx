import { Eye, CheckCircle, XCircle, MessageSquare } from "lucide-react";

interface ReportCardProps {
  report: any;
  onView: () => void;
  onAction: (id: string, action: "approve" | "reject" | "comment") => void;
}

const severityColors = {
  1: "text-neon-blue",
  2: "text-neon-green",
  3: "text-neon-yellow",
  4: "text-neon-red"
};

const categoryNames = ["Corruption", "Harassment", "Safety", "Fraud", "Other"];

export function ReportCard({ report, onView, onAction }: ReportCardProps) {
  return (
    <div className="terminal-window hover:border-neon-green transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-3">
            <span className={`font-mono text-sm ${severityColors[report.severity as keyof typeof severityColors]}`}>
              Severity: {report.severity}
            </span>
            <span className="text-neon-green font-mono text-sm">
              {categoryNames[report.category - 1] || "Unknown"}
            </span>
            <span className="text-gray-500 font-mono text-sm">
              ID: {report.report_id?.slice(0, 8)}...
            </span>
          </div>
          
          <div className="font-mono text-sm text-gray-400 mb-4">
            Submitted: {new Date(report.timestamp * 1000).toLocaleString()}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onView}
              className="flex items-center space-x-1 text-neon-blue hover:text-neon-blue/80"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </button>
            
            <button
              onClick={() => onAction(report.report_id, "approve")}
              className="flex items-center space-x-1 text-neon-green hover:text-neon-green/80"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Resolve</span>
            </button>
            
            <button
              onClick={() => onAction(report.report_id, "reject")}
              className="flex items-center space-x-1 text-neon-red hover:text-neon-red/80"
            >
              <XCircle className="h-4 w-4" />
              <span>Reject</span>
            </button>
            
            <button
              onClick={() => onAction(report.report_id, "comment")}
              className="flex items-center space-x-1 text-neon-purple hover:text-neon-purple/80"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}