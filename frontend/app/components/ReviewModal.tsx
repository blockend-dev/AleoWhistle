import { useState } from "react";
import { X, Download, Lock, ShieldCheck } from "lucide-react";

interface ReviewModalProps {
  report: any;
  onClose: () => void;
  onAction: (id: string, action: string, data?: any) => void;
  onUnlock: (report: any) => Promise<any>;
  decryptedData: any; 
}

export function ReviewModal({ report, onClose, onAction, onUnlock, decryptedData }: ReviewModalProps) {
  const [comment, setComment] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecryptClick = async () => {
    setIsDecrypting(true);
    try {
      await onUnlock(report);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-cyber-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="terminal-window max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border-neon-green/50">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-neon-red transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-neon-green" />
          <h2 className="text-xl font-bold glitch-text">Report Decryption Terminal</h2>
        </div>

        {!decryptedData ? (
          <div className="text-center py-12 border border-dashed border-neon-green/20 rounded-lg bg-cyber-black/50">
            <Lock className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-pulse" />
            <p className="font-mono text-gray-400 mb-6 max-w-xs mx-auto">
              This report is end-to-end encrypted with your public key.
            </p>
            <button
              onClick={handleDecryptClick}
              disabled={isDecrypting}
              className="bg-neon-green text-cyber-black px-8 py-3 rounded-lg font-bold hover:bg-neon-green/90 transition-all transform hover:scale-105 disabled:opacity-50"
            >
              {isDecrypting ? "Computing Shared Secret..." : "Decrypt with Private Key"}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-cyber-black rounded border border-neon-blue/20">
                <label className="text-xs text-neon-blue font-mono block mb-1">CATEGORY</label>
                <span className="text-white">Corruption</span> {/* Map report.category here */}
              </div>
              <div className="p-3 bg-cyber-black rounded border border-neon-red/20">
                <label className="text-xs text-neon-red font-mono block mb-1">SEVERITY</label>
                <span className="text-white">Critical</span> {/* Map report.severity here */}
              </div>
            </div>

            <div>
              <label className="text-sm text-neon-green font-mono block mb-2">Decrypted Title</label>
              <p className="bg-cyber-black p-3 rounded border border-neon-green/30 text-white font-medium">
                {decryptedData.title || "No title provided"}
              </p>
            </div>

            <div>
              <label className="text-sm text-neon-green font-mono block mb-2">Decrypted Description</label>
              <div className="bg-cyber-black p-4 rounded border border-neon-green/30 text-gray-300 min-h-[150px] whitespace-pre-wrap leading-relaxed">
                {decryptedData.description}
              </div>
            </div>

            <div className="p-4 bg-neon-blue/5 rounded-lg border border-neon-blue/20">
              <label className="text-sm text-neon-blue font-mono block mb-2">Evidence CID</label>
              <div className="flex items-center justify-between bg-black/40 p-2 rounded">
                <code className="text-xs text-gray-400 truncate mr-4">{report.evidence_hash}</code>
                <a
                  href={`https://ipfs.io/ipfs/${report.evidence_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-neon-blue hover:text-white transition-colors text-sm font-mono"
                >
                  <Download className="h-4 w-4" />
                  <span>DOWNLOAD</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <label className="text-sm text-neon-purple font-mono block mb-2">Internal Reviewer Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full bg-cyber-black border border-neon-purple/30 rounded-lg px-4 py-3 font-mono text-sm focus:border-neon-purple/60 outline-none transition-all"
            placeholder="Document your findings for the blockchain..."
          />
          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-2">
               <button
                onClick={() => onAction(report.report_id, "reject")}
                className="px-4 py-2 border border-neon-red/50 text-neon-red rounded hover:bg-neon-red/10 transition-colors font-mono text-sm"
              >
                REJECT
              </button>
              <button
                onClick={() => onAction(report.report_id, "approve")}
                className="px-4 py-2 bg-neon-green/20 border border-neon-green/50 text-neon-green rounded hover:bg-neon-green/40 transition-colors font-mono text-sm"
              >
                RESOLVE
              </button>
            </div>
            
            <button
              onClick={() => onAction(report.report_id, "comment", comment)}
              className="bg-neon-purple text-white px-6 py-2 rounded-lg font-bold hover:bg-neon-purple/90 shadow-lg shadow-neon-purple/20 transition-all"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}