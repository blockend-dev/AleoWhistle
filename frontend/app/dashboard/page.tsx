"use client";

import { useState, useEffect } from "react";
import {
  Shield, Activity, RefreshCw, Key, Copy, CheckCircle,
  Search, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "@/app/lib/toast";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ReportCard }   from "@/app/components/ReportCard";
import { ReviewModal }  from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";
import { decryptWithAES, parseAleoStruct, recoverCaseKey, REPORT_STATUS } from "../lib/crypto";
import { useIPFS } from "@/app/hooks/useIPFS";
import { supabase } from "../lib/db";

const PROGRAM    = process.env.NEXT_PUBLIC_PROGRAM ?? "whistleblowing_version2.aleo";
const ADMIN_ADDR = process.env.NEXT_PUBLIC_ADMIN_ADDR!;
const DEMO_KEY     = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY ?? "";


function DemoBanner({ onDismiss }: { onDismiss: () => void }) {
  const { copied, copy } = useCopy();
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="w-full mt-16 border-b border-yellow-500/50 bg-yellow-500/10 backdrop-blur-sm font-mono">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">

          {/* Left: label + description */}
          <div className="flex items-start md:items-center space-x-3 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5 mt-1 md:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
            </span>
            <div>
              <p className="text-yellow-400 font-bold text-sm tracking-widest">HACKATHON DEMO</p>
              <p className="text-yellow-300/60 text-[11px] leading-tight">
                Import this private key to test admin features
              </p>
            </div>
          </div>

          {/* Centre: key display */}
          <div className="flex-1 flex items-center space-x-2 bg-black/30 rounded-lg px-3 py-2 border border-yellow-500/20 min-w-0">
            <Key className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
            <code className="flex-1 text-[11px] text-yellow-300 truncate">
              {showKey ? DEMO_KEY : `${DEMO_KEY.slice(0, 18)}${"•".repeat(28)}`}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1 rounded text-yellow-400 hover:bg-yellow-500/20 transition flex-shrink-0"
              title={showKey ? "Hide key" : "Reveal key"}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => copy(DEMO_KEY, "banner")}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-yellow-400 text-black text-[11px] font-bold hover:bg-yellow-300 transition flex-shrink-0"
            >
              {copied === "banner"
                ? <><CheckCircle className="h-3 w-3 mr-1" />Copied!</>
                : <><Copy className="h-3 w-3 mr-1" />Copy Key</>}
            </button>
          </div>

          {/* Right: instructions + dismiss */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <p className="text-yellow-300/50 text-[11px] hidden lg:block">
              Wallet → Import Account → paste key → connect
            </p>
            <button
              onClick={onDismiss}
              className="text-yellow-500/50 hover:text-yellow-400 text-xs transition px-2 py-1 rounded hover:bg-yellow-500/10"
            >
              Dismiss
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: copy with flash feedback
// ─────────────────────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ─────────────────────────────────────────────────────────────────────────────
// Judge Credentials Panel
// ─────────────────────────────────────────────────────────────────────────────
function JudgePanel({
  adminPrivKey,
  setAdminPrivKey,
}: {
  adminPrivKey: string;
  setAdminPrivKey: (k: string) => void;
}) {
  const { copied, copy } = useCopy();
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="mb-8 rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-6 font-mono">
      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400" />
          </span>
          <h3 className="text-yellow-400 font-bold text-lg tracking-widest">
            ⚡ HACKATHON JUDGE CREDENTIALS
          </h3>
        </div>
        <span className="text-[10px] text-gray-500 border border-gray-700 rounded px-2 py-0.5">
          DEMO ONLY — NOT FOR PRODUCTION
        </span>
      </div>

      {/* Credentials grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Address */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">ADMIN ADDRESS</label>
          <div className="flex items-center space-x-2 bg-black/40 p-3 rounded-lg border border-yellow-500/20">
            <code className="flex-1 text-xs text-yellow-300 break-all">{ADMIN_ADDR}</code>
            <button
              onClick={() => copy(ADMIN_ADDR, "addr")}
              className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition flex-shrink-0"
            >
              {copied === "addr" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Private key */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">ADMIN PRIVATE KEY</label>
          <div className="flex items-center space-x-2 bg-black/40 p-3 rounded-lg border border-yellow-500/20">
            <code className="flex-1 text-xs text-yellow-300 break-all">
              {showKey ? DEMO_KEY : "APrivateKey1••••••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition flex-shrink-0"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => copy(DEMO_KEY, "key")}
              className="p-1.5 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition flex-shrink-0"
            >
              {copied === "key" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Active decryption key */}
      <div className="mb-6">
        <label className="text-xs text-gray-500 block mb-1.5">
          ACTIVE DECRYPTION KEY
          <span className="ml-2 text-neon-green">(pre-loaded — reports decrypt automatically)</span>
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="password"
            value={adminPrivKey}
            onChange={(e) => setAdminPrivKey(e.target.value)}
            placeholder="APrivateKey1..."
            className="flex-1 bg-black/40 border border-yellow-500/30 rounded-lg px-4 py-2.5 text-sm focus:border-yellow-500/60 outline-none transition"
          />
          {adminPrivKey && (
            <span className="flex items-center space-x-1.5 text-neon-green text-xs whitespace-nowrap">
              <CheckCircle className="h-4 w-4" />
              <span>Key Loaded</span>
            </span>
          )}
        </div>
      </div>

      {/* Wallet import instructions */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {[
          { name: "Shield Wallet",  step: "Settings → Import Account" },
          { name: "Puzzle Wallet",  step: "Profile → Import Private Key" },
          { name: "Leo Wallet",     step: "Settings → Import Wallet" },
        ].map(({ name, step }) => (
          <div key={name} className="bg-black/30 p-3 rounded-lg border border-gray-800">
            <p className="text-xs text-yellow-400 font-bold mb-1">{name}</p>
            <p className="text-xs text-gray-500">{step} → paste key above</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        ⚡ Reports auto-decrypt on &quot;View&quot; click — no private key prompt required.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporter status checker 
// ─────────────────────────────────────────────────────────────────────────────
function ReporterStatusChecker() {
  const [reportId, setReportId] = useState("");
  const [result, setResult]     = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  const checkStatus = async () => {
    if (!reportId.trim()) return;
    setLoading(true);
    setResult(null);
    setComments([]);
    try {
      // Fetch status + comments in parallel
      const [{ data, error }, { data: commentData }] = await Promise.all([
        supabase
          .from("reports_index")
          .select("report_id, status, category, severity, created_at, updated_at")
          .eq("report_id", reportId.trim())
          .single(),
        supabase
          .from("report_comments")
          .select("id, comment, created_at")
          .eq("report_id", reportId.trim())
          .order("created_at", { ascending: true }),
      ]);

      if (error || !data) {
        setResult({ error: "Report not found. Verify your Report ID." });
      } else {
        setResult(data);
        setComments(commentData ?? []);
      }
    } catch {
      setResult({ error: "Could not query status. Try again shortly." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="terminal-window">
      <div className="flex items-center space-x-2 mb-5">
        <Search className="h-5 w-5 text-neon-blue" />
        <h2 className="text-lg font-bold glitch-text">CHECK_REPORT_STATUS</h2>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Enter your Report ID to check status anonymously. Your identity is never revealed.
      </p>

      <div className="flex space-x-3">
        <input
          type="text"
          placeholder="Paste your Report ID..."
          className="flex-1 bg-cyber-black border border-neon-blue/30 rounded-lg px-4 py-2.5 font-mono text-sm focus:border-neon-blue/60 outline-none transition"
          value={reportId}
          onChange={(e) => setReportId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkStatus()}
        />
        <button
          onClick={checkStatus}
          disabled={loading || !reportId.trim()}
          className="px-5 py-2.5 bg-neon-blue text-cyber-black rounded-lg font-bold text-sm hover:bg-neon-blue/90 transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Querying..." : "Check"}
        </button>
      </div>

      {result && (
        <div className={`mt-5 rounded-lg border ${
          result.error ? "border-neon-red/30 bg-neon-red/5" : "border-neon-green/30 bg-neon-green/5"
        }`}>
          {result.error ? (
            <p className="text-neon-red font-mono text-sm p-4">{result.error}</p>
          ) : (
            <>
              {/* ── Status rows ── */}
              <div className="p-4 space-y-3 font-mono text-sm">
                <Row label="STATUS">
                  <span className={`font-bold ${REPORT_STATUS[result.status]?.color ?? "text-gray-400"}`}>
                    {REPORT_STATUS[result.status]?.label ?? "Unknown"}
                  </span>
                </Row>
                <Row label="SUBMITTED">
                  {new Date(result.created_at).toLocaleString()}
                </Row>
                {result.updated_at && (
                  <Row label="LAST UPDATE">
                    {new Date(result.updated_at).toLocaleString()}
                  </Row>
                )}
                <Row label="REPORT ID">
                  <span className="text-gray-400">{String(result.report_id).slice(0, 14)}…</span>
                </Row>
              </div>

              {/* ── Reviewer comments ── */}
              {comments.length > 0 && (
                <div className="border-t border-neon-green/20 px-4 pb-4 pt-3">
                  <p className="text-xs text-neon-purple font-mono font-bold mb-2 uppercase tracking-widest">
                    Reviewer Notes ({comments.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-cyber-black/60 rounded-lg px-3 py-2 border border-neon-purple/20"
                      >
                        <p className="text-gray-300 text-xs font-mono leading-relaxed">{c.comment}</p>
                        <p className="text-gray-600 text-[10px] mt-1 font-mono">
                          {new Date(c.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-300 text-xs">{children}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { address, connected, requestRecords,decrypt } = useWallet();
  const isAdmin = connected && address === ADMIN_ADDR;

  const [reports, setReports]               = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<Record<string, any>>({});
  const [adminPrivKey, setAdminPrivKey]     = useState(DEMO_KEY);
  const [showKeyPanel, setShowKeyPanel]     = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // per-report-action loading:  key = `${reportId}-${action}`
  const [actionLoading, setActionLoading]   = useState<Record<string, boolean>>({});
  // comments keyed by report_id
  const [comments, setComments]             = useState<Record<string, any[]>>({});

  const { updateStatus } = useWhistleblowing();
  const { fetchFromIPFS } = useIPFS();

  const setAction = (reportId: string, action: string, on: boolean) =>
    setActionLoading((prev) => ({ ...prev, [`${reportId}-${action}`]: on }));
  const isActionLoading = (reportId: string, action: string) =>
    !!actionLoading[`${reportId}-${action}`];

  useEffect(() => {
    const fetchReports = async () => {
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

    fetchReports();

    const channel = supabase
      .channel("admin_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports_index" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setReports((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setReports((prev) =>
            prev.map((r) => (r.report_id === payload.new.report_id ? payload.new : r))
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Fetch comments for a report ─────────────────────────────────────────
  const fetchComments = async (reportId: string) => {
    const { data } = await supabase
      .from("report_comments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    setComments((prev) => ({ ...prev, [reportId]: data ?? [] }));
  };

  // ── Decrypt a report using the admin's private key ───────────────────────

  const handleUnlockReport = async (report: any) => {
    if (!adminPrivKey) {
      toast.warning("Admin private key not loaded. Open the Judge Panel and enter the key.");
      return;
    }
    setAction(report.report_id, "decrypt", true);
    const toastId = toast.loading("Loading report keys…");
    try {
      const { Group, PrivateKey } = await import("@provablehq/sdk");
      const privKey = PrivateKey.from_string(adminPrivKey);
      const viewKey = privKey.to_view_key();

      // ── Fetch EncryptedReport record from wallet ────────────────────────
      if (!requestRecords) {
        throw new Error("Wallet does not support requestRecords. Please use a compatible Aleo wallet.");
      }

      toast.loading("Fetching records from wallet…", { id: toastId });
      const records: any[] = await requestRecords(PROGRAM, false);
      // Match by transactionId + not spent + correct record type
      const match = records.find((r: any) =>
        r.recordName === "EncryptedReport" &&
        r.transactionId.trim() == report.tx_id &&
        !r.spent
      );

      if (!match) {
        throw new Error(
          "No unspent EncryptedReport record found for this transaction. " +
          "Ensure the admin wallet is connected and owns this record."
        );
      }

      // Decrypt the raw ciphertext with the view key to get plaintext struct
      toast.loading("Decrypting record with view key…", { id: toastId });
      const plaintextStr = await decrypt(match.recordCiphertext);
      const recordData   = parseAleoStruct(plaintextStr);
      const encrypted_key = recordData.encrypted_key ?? "";
      const ephemeral_key = recordData.ephemeral_key ?? "";

      if (!encrypted_key || !ephemeral_key) {
        throw new Error("Could not extract encryption keys from the decrypted record.");
      }

      toast.loading("Computing ECDH shared secret…", { id: toastId });
      const ephemeralPoint    = Group.fromString(ephemeral_key + "group");
      const adminScalar       = viewKey.to_scalar();
      const sharedSecretPoint = ephemeralPoint.scalarMultiply(adminScalar);
      const recoveredKey      = recoverCaseKey(encrypted_key, sharedSecretPoint.toString());

      toast.loading("Downloading encrypted blob from IPFS…", { id: toastId });
      const cid = report.evidence_cid;
      if (!cid || cid === "0") throw new Error("No IPFS CID found for this report.");

      const encryptedBlob = await fetchFromIPFS(cid);
      const plain         = await decryptWithAES(encryptedBlob, recoveredKey);

      setUnlockedContent((prev) => ({ ...prev, [report.report_id]: JSON.parse(plain) }));
      toast.success("Report decrypted successfully", { id: toastId });
      return true;
    } catch (err: any) {
      console.error("Decryption failed:", err);
      toast.error(
        `Decryption failed: ${err?.message ?? "Invalid key or corrupted data."}`,
        { id: toastId }
      );
      return false;
    } finally {
      setAction(report.report_id, "decrypt", false);
    }
  };

  // ── One-click: auto-decrypt then open modal ──────────────────────────────
  const handleViewReport = async (report: any) => {
    if (!unlockedContent[report.report_id] && adminPrivKey) {
      const ok = await handleUnlockReport(report);
      if (!ok) return; // don't open modal if decryption failed
    }
    fetchComments(report.report_id);
    setSelectedReport(report);
  };

  // ── Status change (resolve / reject) + comments ──────────────────────────
  const handleAction = async (reportId: string, action: string, comment?: string) => {
    if (action === "comment") {
      if (!comment?.trim()) return;
      setAction(reportId, "comment", true);
      try {
        const { error } = await supabase.from("report_comments").insert([{
          report_id:  reportId,
          comment:    comment.trim(),
          created_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        // Refresh comments list so they show immediately
        await fetchComments(reportId);
        toast.success("Comment posted.");
      } catch (err: any) {
        toast.error(`Comment failed: ${err?.message}`);
      } finally {
        setAction(reportId, "comment", false);
      }
      return;
    }

    const newStatus = action === "approve" ? 3 : 4;
    const actionKey = action === "approve" ? "approve" : "reject";
    setAction(reportId, actionKey, true);

    const toastId = toast.loading(
      action === "approve" ? "Resolving report on-chain…" : "Rejecting report on-chain…"
    );

    try {
      await updateStatus(reportId, newStatus, (msg) =>
        toast.loading(msg, { id: toastId })
      );

      // Update Supabase + optimistically patch local state
      const now = new Date().toISOString();
      const { error: dbErr } = await supabase
        .from("reports_index")
        .update({ status: newStatus, updated_at: now })
        .eq("report_id", reportId);

      if (dbErr) {
        // Surface the Supabase error — likely an RLS policy issue
        console.error("Supabase update error:", dbErr);
        toast.warning(
          `On-chain ✓ but database update failed: ${dbErr.message}. ` +
          "Check your Supabase RLS policy — the anon key needs UPDATE permission on reports_index.",
          { id: toastId, duration: 8000 }
        );
      } else {
        // Optimistically update local state so the card reflects immediately
        setReports((prev) =>
          prev.map((r) => r.report_id === reportId ? { ...r, status: newStatus, updated_at: now } : r)
        );
        toast.success(
          action === "approve" ? "Report marked as Resolved." : "Report marked as Rejected.",
          { id: toastId }
        );
      }
    } catch (err: any) {
      console.error("Action failed:", err);
      toast.error(`Transaction failed: ${err?.message ?? "Check wallet connection."}`, { id: toastId });
      setSelectedReport(null); // close modal on failure — don't leave it in a confusing state
    } finally {
      setAction(reportId, actionKey, false);
    }
  };

  const showBanner = !isAdmin && !bannerDismissed;

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Not connected
  // ─────────────────────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen cyber-grid">
        {showBanner && <DemoBanner onDismiss={() => setBannerDismissed(true)} />}
        <div className="pt-24 px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold glitch-text flex items-center mb-2">
              <Shield className="h-8 w-8 mr-3 text-neon-green" />
              WHISTLECRYPT PORTAL
            </h1>
            <p className="text-gray-500 font-mono text-sm mb-10">
              Connect an authorized wallet for admin access, or check your report status below.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Admin access card */}
              <div className="terminal-window border-neon-green/40 flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <Key className="h-5 w-5 text-neon-green" />
                  <h2 className="font-bold text-neon-green text-lg">Admin / Reviewer Access</h2>
                </div>
                <p className="text-gray-500 text-sm mb-6">
                  Connect the authorized admin wallet to review, decrypt, and manage reports.
                </p>

                {/* Hackathon judge credential preview */}
                <div className="bg-black/30 rounded-lg border border-yellow-500/30 p-4 mb-6">
                  <p className="text-yellow-400 text-xs font-bold mb-3">⚡ HACKATHON JUDGES — IMPORT THIS KEY</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-gray-600 text-[10px] mb-1">ADMIN ADDRESS</p>
                      <code className="text-yellow-300 text-[10px] break-all">{ADMIN_ADDR}</code>
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] mb-1">PRIVATE KEY (see banner above for full key + copy)</p>
                      <code className="text-yellow-300 text-[10px]">{DEMO_KEY.slice(0, 22)}••••••••••••••••</code>
                    </div>
                  </div>
                  <p className="text-gray-600 text-[10px] mt-3">
                    Import into Shield / Puzzle / Leo wallet → connect below
                  </p>
                </div>

                <div className="mt-auto">
                  <WalletMultiButton />
                </div>
              </div>

              {/* Reporter status checker */}
              <ReporterStatusChecker />
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (!isAdmin) {
    return (
      <div className="min-h-screen cyber-grid">
        {showBanner && <DemoBanner onDismiss={() => setBannerDismissed(true)} />}
        <div className="pt-24 px-4 flex items-center justify-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
          <div className="max-w-lg w-full space-y-6">
            <ReporterStatusChecker />
            <div className="terminal-window border-neon-green/10 text-center py-8">
              <Shield className="h-8 w-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 font-mono text-xs">
                Connected as{" "}
                <span className="text-gray-500">{address?.slice(0, 10)}…</span>
                &nbsp;— this wallet does not have admin privileges.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Admin dashboard
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-24 px-4 cyber-grid">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl font-bold glitch-text flex items-center">
              <Shield className="h-10 w-10 mr-3 text-neon-green" />
              ADMIN_DASHBOARD
            </h1>
            <p className="text-gray-500 font-mono mt-2 flex items-center text-sm">
              <Activity className="h-4 w-4 mr-2 text-neon-blue" />
              Aleo Testnet · {address?.slice(0, 8)}…{address?.slice(-4)}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 font-mono uppercase">Cases</p>
              <p className="text-2xl font-bold text-neon-green">{reports.length}</p>
            </div>

            {/* Judge panel toggle */}
            <button
              onClick={() => setShowKeyPanel(!showKeyPanel)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg font-mono text-sm transition-all ${
                showKeyPanel
                  ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/10"
                  : "border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10"
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Judge Panel</span>
              {showKeyPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="p-2.5 border border-neon-green/30 text-neon-green rounded-full hover:bg-neon-green/10 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Judge credentials panel */}
        {showKeyPanel && (
          <JudgePanel adminPrivKey={adminPrivKey} setAdminPrivKey={setAdminPrivKey} />
        )}

        {/* Key status banner */}
        {!showKeyPanel && (
          <div className={`mb-6 px-4 py-2.5 rounded-lg border font-mono text-xs flex items-center space-x-2 ${
            adminPrivKey
              ? "border-neon-green/20 bg-neon-green/5 text-neon-green"
              : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"
          }`}>
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {adminPrivKey
                ? "Admin key loaded — click any report to auto-decrypt and view."
                : "No decryption key loaded. Open the Judge Panel to enter the admin private key."}
            </span>
          </div>
        )}

        {/* Reports grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neon-blue font-mono animate-pulse">SYNCING_WITH_SUPABASE...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="terminal-window text-center py-20 border-dashed">
            <Shield className="h-16 w-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-500">NO CASES FOUND</h2>
            <p className="text-gray-600 font-mono text-sm mt-2">Waiting for incoming transmissions…</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                isUnlocked={!!unlockedContent[report.report_id]}
                isDecrypting={isActionLoading(report.report_id, "decrypt")}
                onView={() => handleViewReport(report)}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {selectedReport && (
        <ReviewModal
          report={selectedReport}
          decryptedData={unlockedContent[selectedReport.report_id]}
          comments={comments[selectedReport.report_id] ?? []}
          onClose={() => setSelectedReport(null)}
          onAction={handleAction}
          onUnlock={() => handleUnlockReport(selectedReport)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
