"use client";

import { useState, useEffect } from "react";
import {
  Shield, Activity, RefreshCw, Key, Copy, CheckCircle,
  Search, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ReportCard }   from "@/app/components/ReportCard";
import { ReviewModal }  from "@/app/components/ReviewModal";
import { useWhistleblowing } from "@/app/hooks/useWhistleblowing";
import { decryptWithAES, parseAleoStruct, recoverCaseKey, REPORT_STATUS } from "../lib/crypto";
import { useIPFS } from "@/app/hooks/useIPFS";
import { supabase } from "../lib/db";

const PROGRAM      = process.env.NEXT_PUBLIC_PROGRAM ?? "new_whistleblowing_version1.aleo";
const PROVABLE_API = "https://api.provable.com/v2/testnet";
const ADMIN_ADDR   = process.env.NEXT_PUBLIC_ADMIN_ADDR!;
const DEMO_KEY     = process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY ?? "";

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
// Reporter status checker (shared between non-admin and unauthenticated views)
// ─────────────────────────────────────────────────────────────────────────────
function ReporterStatusChecker() {
  const [reportId, setReportId]     = useState("");
  const [result, setResult]         = useState<any>(null);
  const [loading, setLoading]       = useState(false);

  const checkStatus = async () => {
    if (!reportId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase
        .from("reports_index")
        .select("report_id, status, category, severity, created_at, updated_at")
        .eq("report_id", reportId.trim())
        .single();
      setResult(error || !data ? { error: "Report not found. Verify your Report ID." } : data);
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
        <div className={`mt-5 p-4 rounded-lg border ${
          result.error
            ? "border-neon-red/30 bg-neon-red/5"
            : "border-neon-green/30 bg-neon-green/5"
        }`}>
          {result.error ? (
            <p className="text-neon-red font-mono text-sm">{result.error}</p>
          ) : (
            <div className="space-y-3 font-mono text-sm">
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
  const { address, connected } = useWallet();
  const isAdmin = connected && address === ADMIN_ADDR;

  const [reports, setReports]           = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [unlockedContent, setUnlockedContent] = useState<Record<string, any>>({});
  const [adminPrivKey, setAdminPrivKey] = useState(DEMO_KEY);
  const [showKeyPanel, setShowKeyPanel] = useState(false);

  const { updateStatus } = useWhistleblowing();
  const { fetchFromIPFS } = useIPFS();

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

  // ── Decrypt a report using the loaded admin private key ──────────────────
  const handleUnlockReport = async (report: any) => {
    if (!adminPrivKey) {
      alert("Admin private key not loaded. Open the Judge Panel and enter the key.");
      return;
    }
    try {
      const { Group, PrivateKey } = await import("@provablehq/sdk");
      const privKey = PrivateKey.from_string(adminPrivKey);

      const res = await fetch(
        `${PROVABLE_API}/program/${PROGRAM}/mapping/encrypted_contents/${report.report_id}field`
      );
      if (!res.ok) throw new Error(`Chain mapping fetch failed: ${res.statusText}`);

      const chainData = parseAleoStruct(await res.json());

      // Reconstruct ephemeral public key from stored x-coordinate
      const ephemeralPoint     = Group.fromString(chainData.ephemeral_key + "group");
      const adminScalar        = privKey.to_view_key().to_scalar();
      const sharedSecretPoint  = ephemeralPoint.scalarMultiply(adminScalar);

      // Recover AES case key (use admin_key since we're authenticating as admin)
      const recoveredKey = recoverCaseKey(chainData.admin_key, sharedSecretPoint.toString());

      // Fetch encrypted blob from IPFS (Supabase CID takes priority)
      const cid = report.evidence_cid ?? chainData.evidence_hash;
      if (!cid || cid === "0") throw new Error("No IPFS CID found for this report.");

      const encryptedBlob = await fetchFromIPFS(cid);
      const plain         = await decryptWithAES(encryptedBlob, recoveredKey);

      setUnlockedContent((prev) => ({ ...prev, [report.report_id]: JSON.parse(plain) }));
    } catch (err: any) {
      console.error("Decryption failed:", err);
      alert(`Decryption failed: ${err?.message ?? "Invalid key or corrupted data."}`);
    }
  };

  // ── One-click: auto-decrypt then open modal ──────────────────────────────
  const handleViewReport = async (report: any) => {
    if (!unlockedContent[report.report_id] && adminPrivKey) {
      await handleUnlockReport(report);
    }
    setSelectedReport(report);
  };

  // ── Status change (resolve / reject) ────────────────────────────────────
  const handleAction = async (reportId: string, action: string, comment?: string) => {
    try {
      if (action === "comment") {
        if (!comment?.trim()) return;
        await supabase.from("report_comments").insert([{
          report_id:  reportId,
          comment:    comment.trim(),
          created_at: new Date().toISOString(),
        }]);
        return;
      }

      const newStatus = action === "approve" ? 3 : 4;
      await updateStatus(reportId, newStatus);
      await supabase
        .from("reports_index")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("report_id", reportId);
    } catch (err) {
      console.error("Action failed:", err);
      alert("Blockchain transaction failed. Check your wallet connection.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Not connected
  // ─────────────────────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen pt-24 px-4 cyber-grid">
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
                Connect the authorized admin wallet to review reports, decrypt evidence, and manage case status.
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
                    <p className="text-gray-600 text-[10px] mb-1">PRIVATE KEY</p>
                    <code className="text-yellow-300 text-[10px]">{DEMO_KEY.slice(0, 20)}••••••••••••••••••</code>
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
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Connected but NOT admin → reporter-only status checker
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 px-4 cyber-grid flex items-center justify-center">
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
                onView={() => handleViewReport(report)}
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
