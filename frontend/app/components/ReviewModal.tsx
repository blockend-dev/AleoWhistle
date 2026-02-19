import { useState } from "react";
import { X, Download, Lock } from "lucide-react";

export function ReviewModal({ report, onClose, onAction }: any) {
  const [comment, setComment] = useState("");
  const [decrypted, setDecrypted] = useState<any>(null);

  const handleDecrypt = async () => {
    // Simulate decryption – in production, use the reviewer's private key
    setDecrypted({ title: "Decrypted Report", description: "Sensitive details..." });
  };

  return (
    <div className="fixed inset-0 bg-cyber-black/90 flex items-center justify-center z-50 p-4">
      <div className="terminal-window max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-neon-red">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold glitch-text mb-6">Report Details</h2>

        {!decrypted ? (
          <div className="text-center py-8">
            <Lock className="h-16 w-16 text-neon-green mx-auto mb-4" />
            <p className="font-mono text-gray-400 mb-4">Content is encrypted. Use your private key to decrypt.</p>
            <button
              onClick={handleDecrypt}
              className="bg-neon-green text-cyber-black px-6 py-2 rounded-lg font-bold hover:bg-neon-green/90"
            >
              Decrypt with Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-neon-green font-mono">Title</label>
              <p className="bg-cyber-black p-2 rounded border border-neon-green/30">{decrypted.title}</p>
            </div>
            <div>
              <label className="text-sm text-neon-green font-mono">Description</label>
              <p className="bg-cyber-black p-2 rounded border border-neon-green/30 whitespace-pre-wrap">
                {decrypted.description}
              </p>
            </div>
            <div>
              <label className="text-sm text-neon-green font-mono">Evidence</label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 font-mono text-sm">{report.evidence_hash}</span>
                <a
                  href={`https://ipfs.io/ipfs/${report.evidence_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-blue hover:text-neon-blue/80"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm text-neon-green font-mono">Add Comment (encrypted)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full bg-cyber-black border border-neon-green/30 rounded-lg px-4 py-3 font-mono mt-2"
            placeholder="Write your comment..."
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => onAction(report.report_id, "comment", comment)}
              className="bg-neon-purple text-white px-4 py-2 rounded-lg font-bold hover:bg-neon-purple/80"
            >
              Submit Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}