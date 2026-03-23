# AleoWhistle: Anonymous Whistleblowing System

**Built on Aleo Blockchain | Zero-Knowledge Privacy | End-to-End Encryption**

![Aleo](https://img.shields.io/badge/Aleo-ZK_Privacy-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Hackathon-Project-orange)

**Deployed Contract:** [whistleblowing_version2.aleo](https://testnet.explorer.provable.com/program/whistleblowing_version2.aleo)

---

## Overview

AleoWhistle is a fully decentralized, anonymous whistleblowing portal. Reporters submit evidence of misconduct with complete privacy — the report content is AES-256-GCM encrypted client-side, the encryption key is distributed via ECDH to authorized recipients as **private Aleo records**, and the reporter's identity is protected by a ZK proof. Nothing sensitive ever touches a public on-chain mapping.

---

## Privacy Architecture

### Zero-Knowledge Reporter Identity

The reporter generates a random `seed` locally. The Leo contract proves `report_id = Poseidon2::hash_to_field(seed)` inside the ZK circuit — the seed is a **private circuit input** that never appears on-chain. The reporter can later prove ownership of a report without revealing anything else.

### Private Record-Based Key Distribution

Unlike naive approaches that store encrypted keys in public mappings, AleoWhistle uses **Aleo `record` types** for all sensitive data:

| Record | Owner | Contains |
|--------|-------|----------|
| `ReporterReceipt` | Reporter | `report_id`, `category`, `severity` |
| `EncryptedReport` (×2) | Admin + Reviewer | `encrypted_key`, `ephemeral_key`, `encrypted_data` |

Records are private on-chain state — only the owner can view them with their view key. No ECDH key material is ever in a public mapping.

### ECDH Dual-Recipient Encryption

A single ephemeral key pair is generated per submission:

```
sharedSecret_admin    = ephemeral.viewKey × admin.pubKey
sharedSecret_reviewer = ephemeral.viewKey × reviewer.pubKey
adminEncryptedKey     = (caseKey XOR sharedSecret_admin)  & mask250
reviewerEncryptedKey  = (caseKey XOR sharedSecret_reviewer) & mask250
ephemeralField        = x-coordinate of ephemeral public-key group point
```

Both admin and reviewer can independently recover the AES case key using their own private view key. No coordination needed; no key escrow.

### Report Content Encryption

1. Reporter writes their report in-browser
2. A random 31-byte case key is generated
3. Report JSON is encrypted with **AES-256-GCM** (WebCrypto)
4. The encrypted blob is uploaded to **IPFS** (Pinata)
5. The IPFS CID is stored publicly on-chain; the content is unreadable without the case key

---

## System Architecture

```
Reporter (browser)
  │
  ├─ generate random seed + case key
  ├─ AES-256-GCM encrypt report → upload to IPFS
  ├─ ECDH: derive admin + reviewer encrypted keys (single ephemeral pair)
  ├─ submitReport() → Aleo wallet signs ZK transaction
  │
  └─ Aleo Testnet (whistleblowing_version2.aleo)
       ├─ ZK proof: report_id = Poseidon2(seed)  [seed never on-chain]
       ├─ ReporterReceipt record → reporter
       ├─ EncryptedReport record → admin       (private, contains encrypted_key)
       ├─ EncryptedReport record → reviewer    (private, contains encrypted_key)
       └─ reports / report_meta mappings       (public metadata only)
            │
            └─ Supabase (off-chain index)
                 ├─ report_id, tx_id, category, severity, status
                 ├─ evidence_cid (IPFS)
                 └─ report_comments (reviewer notes)

Admin / Reviewer (browser)
  │
  ├─ requestRecords(program) → find EncryptedReport where tx_id matches
  ├─ viewKey.decrypt(record.ciphertext) → plaintext Leo struct
  ├─ ECDH: ephemeralPoint × viewKeyScalar → sharedSecret
  ├─ recoverCaseKey: encryptedKey XOR sharedSecret (250-bit mask)
  └─ fetchFromIPFS(cid) → AES-256-GCM decrypt → plaintext report
```

---

## Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `initialize()` | Admin (once) | Bootstrap admin role + stats counters |
| `submit_report()` | Public | Submit encrypted report; emits 3 private records |
| `check_status_privately()` | Reporter | ZK ownership proof — proves seed preimage without revealing it |
| `update_status()` | Admin / Reviewer | Change report status on-chain |
| `add_reviewer()` | Admin | Grant reviewer role to an address |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Leo / Aleo (ZK-SNARKs) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | `@provablehq/aleo-wallet-adaptor-react` |
| Crypto | WebCrypto API (AES-256-GCM), `@provablehq/sdk` (ECDH, Poseidon2) |
| Storage | IPFS via Pinata |
| Database | Supabase (PostgreSQL, Realtime) |

---

## Quick Start

### Prerequisites

- Node.js 22+
- Leo CLI
- An Aleo-compatible wallet (Leo Wallet, Puzzle, Shield)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Required environment variables:

```
NEXT_PUBLIC_PROGRAM=whistleblowing_version2.aleo
NEXT_PUBLIC_ADMIN_ADDR=aleo1...
NEXT_PUBLIC_ADMIN_PRIVATE_KEY=APrivateKey1...   # demo only, never in production
NEXT_PUBLIC_REVIEWER_ADDR=aleo1...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_PINATA_JWT=...
```

### Smart Contract

```bash
cd smart_contract
leo build
leo deploy --broadcast
# After deployment, call initialize() once to bootstrap admin + stats
```

---

## Supabase Schema

```sql
create table reports_index (
  report_id  text primary key,
  tx_id      text,
  category   int,
  severity   int,
  status     int default 1,
  evidence_cid text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table report_comments (
  id         uuid primary key default gen_random_uuid(),
  report_id  text references reports_index(report_id),
  comment    text,
  created_at timestamptz default now()
);

-- RLS: allow anon read on both tables
create policy "Anyone can read reports"   on public.reports_index   for select to anon using (true);
create policy "Anyone can read comments"  on public.report_comments for select to anon using (true);
```

---


## License

MIT — see [LICENSE](LICENSE) for details.

**Built on Aleo.**
