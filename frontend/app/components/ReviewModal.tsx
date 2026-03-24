import { useState } from "react";
import { X, Download, Lock, ShieldCheck, Loader2, MessageSquare, CheckCircle, XCircle, Coins } from "lucide-react";
import { REPORT_CATEGORIES, REPORT_SEVERITY } from "../lib/crypto";

interface ReviewModalProps {
  report: any;
  decryptedData: any;
  comments: any[];
  actionLoading: Record<string, boolean>;
  bountyInfo?: { amount: number; claimed: boolean };
  onClose: () => void;
  onAction: (id: string, action: string, data?: any) => Promise<void>;
  onUnlock: (report: any) => Promise<any>;
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

export function ReviewModal({
  report, decryptedData, comments, actionLoading, bountyInfo, onClose, onAction, onUnlock,
}: ReviewModalProps) {
  const [comment, setComment]         = useState("");
  const [bountyAmount, setBountyAmount] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const id = report.report_id;
  const isApproving     = !!actionLoading[`${id}-approve`];
  const isRejecting     = !!actionLoading[`${id}-reject`];
  const isCommenting    = !!actionLoading[`${id}-comment`];
  const isFundingBounty = !!actionLoading[`${id}-fund_bounty`];

  const handleFundBounty = async () => {
    const amt = parseFloat(bountyAmount);
    if (!amt || amt <= 0) return;
    await onAction(id, "fund_bounty", amt);
    setBountyAmount("");
  };

  const handleDecryptClick = async () => {
    setIsDecrypting(true);
    try { await onUnlock(report); }
    finally { setIsDecrypting(false); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    await onAction(id, "comment", comment);
    setComment("");        // clear after a successful post
  };

  return (
    <div className="fixed inset-0 bg-cyber-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="terminal-window max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border-neon-green/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-neon-red transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-neon-green" />
          <h2 className="text-xl font-bold glitch-text">Report Decryption Terminal</h2>
        </div>

        {/* ── Locked state ── */}
        {!decryptedData ? (
          <div className="text-center py-12 border border-dashed border-neon-green/20 rounded-lg bg-cyber-black/50">
            <Lock className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-pulse" />
            <p className="font-mono text-gray-400 mb-6 max-w-xs mx-auto">
              This report is end-to-end encrypted with your public key.
            </p>
            <button
              onClick={handleDecryptClick}
              disabled={isDecrypting}
              className="inline-flex items-center space-x-2 bg-neon-green text-cyber-black px-8 py-3 rounded-lg font-bold hover:bg-neon-green/90 transition-all disabled:opacity-50"
            >
              {isDecrypting ? <><Spinner /><span>Decrypting…</span></> : <span>Decrypt with Private Key</span>}
            </button>
          </div>
        ) : (
          /* ── Decrypted content ── */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-cyber-black rounded border border-neon-blue/20">
                <label className="text-xs text-neon-blue font-mono block mb-1">CATEGORY</label>
                <span className="text-white font-mono">
                  {REPORT_CATEGORIES[report.category] || "Unknown"}
                </span>
              </div>
              <div className={`p-3 bg-cyber-black rounded border border-current ${REPORT_SEVERITY[report.severity]?.color || "text-gray-400"}`}>
                <label className="text-xs font-mono block mb-1 opacity-70">SEVERITY</label>
                <span className="text-white font-mono font-bold">
                  {REPORT_SEVERITY[report.severity]?.label || "N/A"}
                </span>
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
              <div className="bg-cyber-black p-4 rounded border border-neon-green/30 text-gray-300 min-h-[120px] whitespace-pre-wrap leading-relaxed">
                {decryptedData.description}
              </div>
            </div>

            {report.evidence_cid && (
              <div className="p-4 bg-neon-blue/5 rounded-lg border border-neon-blue/20">
                <label className="text-sm text-neon-blue font-mono block mb-2">Evidence CID</label>
                <div className="flex items-center justify-between bg-black/40 p-2 rounded">
                  <code className="text-xs text-gray-400 truncate mr-4">{report.evidence_cid}</code>
                  <a
                    href={`https://ipfs.io/ipfs/${report.evidence_cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-neon-blue hover:text-white transition-colors text-sm font-mono"
                  >
                    <Download className="h-4 w-4" />
                    <span>DOWNLOAD</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Comments thread ── */}
        {comments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex items-center space-x-2 mb-3">
              <MessageSquare className="h-4 w-4 text-neon-purple" />
              <label className="text-sm text-neon-purple font-mono">
                Reviewer Notes ({comments.length})
              </label>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map((c: any) => (
                <div key={c.id} className="bg-cyber-black p-3 rounded border border-neon-purple/20">
                  <p className="text-gray-300 text-sm font-mono">{c.comment}</p>
                  <p className="text-gray-600 text-[10px] mt-1">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action panel ── */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <label className="text-sm text-neon-purple font-mono block mb-2">
            Internal Reviewer Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full bg-cyber-black border border-neon-purple/30 rounded-lg px-4 py-3 font-mono text-sm focus:border-neon-purple/60 outline-none transition-all"
            placeholder="Document your findings…"
          />

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-2">
              {report.status === 3 ? (
                <span className="inline-flex items-center space-x-1.5 px-4 py-2 border border-neon-green/40 bg-neon-green/10 text-neon-green rounded font-mono text-sm cursor-default">
                  <CheckCircle className="h-4 w-4" />
                  <span>Resolved</span>
                </span>
              ) : report.status === 4 ? (
                <span className="inline-flex items-center space-x-1.5 px-4 py-2 border border-neon-red/40 bg-neon-red/10 text-neon-red rounded font-mono text-sm cursor-default">
                  <XCircle className="h-4 w-4" />
                  <span>Rejected</span>
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onAction(id, "reject")}
                    disabled={isRejecting || isApproving}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 border border-neon-red/50 text-neon-red rounded hover:bg-neon-red/10 transition-colors font-mono text-sm disabled:opacity-50"
                  >
                    {isRejecting ? <Spinner /> : null}
                    <span>{isRejecting ? "Rejecting…" : "REJECT"}</span>
                  </button>
                  <button
                    onClick={() => onAction(id, "approve")}
                    disabled={isApproving || isRejecting}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neon-green/20 border border-neon-green/50 text-neon-green rounded hover:bg-neon-green/40 transition-colors font-mono text-sm disabled:opacity-50"
                  >
                    {isApproving ? <Spinner /> : null}
                    <span>{isApproving ? "Resolving…" : "RESOLVE"}</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleComment}
              disabled={isCommenting || !comment.trim()}
              className="inline-flex items-center space-x-2 bg-neon-purple text-white px-6 py-2 rounded-lg font-bold hover:bg-neon-purple/90 shadow-lg shadow-neon-purple/20 transition-all disabled:opacity-50"
            >
              {isCommenting ? <Spinner /> : null}
              <span>{isCommenting ? "Posting…" : "Post Comment"}</span>
            </button>
          </div>
        </div>
        {/* ── Bounty panel (admin) ── */}
        <div className="mt-6 pt-6 border-t border-yellow-500/20">
          <div className="flex items-center space-x-2 mb-3">
            <Coins className="h-4 w-4 text-yellow-400" />
            <label className="text-sm text-yellow-400 font-mono font-bold">
              WHISTLEBLOWER BOUNTY
            </label>
            {bountyInfo && bountyInfo.amount > 0 && !bountyInfo.claimed && (
              <span className="ml-auto text-xs text-yellow-300 font-mono bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
                {(bountyInfo.amount / 1_000_000).toFixed(2)} ALEO locked
              </span>
            )}
            {bountyInfo?.claimed && (
              <span className="ml-auto inline-flex items-center space-x-1 text-xs text-neon-green font-mono bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 rounded">
                <CheckCircle className="h-3 w-3" />
                <span>Bounty Claimed</span>
              </span>
            )}
          </div>

          {!bountyInfo?.claimed && (
            <div className="flex space-x-2">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Amount in ALEO"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(e.target.value)}
                className="flex-1 bg-cyber-black border border-yellow-500/30 rounded-lg px-3 py-2 font-mono text-sm focus:border-yellow-500/60 outline-none transition"
              />
              <button
                onClick={handleFundBounty}
                disabled={isFundingBounty || !bountyAmount || parseFloat(bountyAmount) <= 0}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg font-mono text-sm hover:bg-yellow-500/30 transition disabled:opacity-50"
              >
                {isFundingBounty ? <Spinner /> : <Coins className="h-4 w-4" />}
                <span>{isFundingBounty ? "Funding…" : "Fund Bounty"}</span>
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-600 font-mono mt-2">
            Credits are locked on-chain. Reporter claims anonymously after resolution using their private receipt.
          </p>
        </div>
      </div>
    </div>
  );
}
