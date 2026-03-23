program whistleblowing_version2.aleo {

  
    record ReporterReceipt {
        owner:     address,
        report_id: field,
        category:  u8,
        severity:  u8,
    }


    record EncryptedReport {
        owner:          address,   // admin or reviewer address
        report_id:      field,
        encrypted_data: field,     // IPFS CID of the AES-encrypted blob
        encrypted_key:  field,     // AES key XOR-encrypted for this recipient
        ephemeral_key:  field,     // ephemeral public-key x-coordinate for ECDH
    }

    struct Report {
        report_id:     field,
        category:      u8,
        severity:      u8,
        timestamp:     u64,
        content_hash:  field,
        evidence_hash: field,
        status:        u8    // 1=Submitted 2=Under Review 3=Resolved 4=Rejected
    }

    struct ReportMeta {
        report_id: field,
        category:  u8,
        severity:  u8,
        timestamp: u64,
        status:    u8
    }

    mapping reports:     field   => Report;
    mapping report_meta: field   => ReportMeta;
    mapping admins:      address => bool;
    mapping reviewers:   address => bool;
    mapping stats:       u8      => u64;

    @noupgrade
    async constructor() {}

    // ── Initialization ─────────────────────────────────────────────────────
    async transition initialize() -> Future {
        return finalize_initialize(self.caller);
    }

    async function finalize_initialize(owner: address) {
        let is_initialized: bool = admins.get_or_use(owner, false);
        assert(!is_initialized);
        admins.set(owner, true);
        stats.set(0u8, 0u64);   // total
        stats.set(1u8, 0u64);   // pending
        stats.set(2u8, 0u64);   // resolved
    }

    // ── Submit an anonymous report ─────────────────────────────────────────
    async transition submit_report(
        private reporter_seed:   field,    // stays in ZK proof — never on-chain
        public  category:        u8,
        public  severity:        u8,
        public  content_hash:    field,
        public  evidence_hash:   field,
        public  encrypted_data:  field,    // IPFS CID (public — content is AES-encrypted)
        public  admin_address:   address,
        public  admin_key:       field,    // AES key encrypted for admin (ECDH)
        public  reviewer_address: address,
        public  reviewer_key:    field,    // AES key encrypted for reviewer (ECDH)
        public  ephemeral_key:   field     // shared ephemeral group point x-coordinate
    ) -> (ReporterReceipt, EncryptedReport, EncryptedReport, Future) {

        let report_id: field = Poseidon2::hash_to_field(reporter_seed);

        let receipt: ReporterReceipt = ReporterReceipt {
            owner:     self.caller as address,
            report_id,
            category,
            severity,
        };

        // Private record owned by admin — carries admin's encrypted AES key
        let admin_record: EncryptedReport = EncryptedReport {
            owner:          admin_address,
            report_id,
            encrypted_data,
            encrypted_key:  admin_key,
            ephemeral_key,
        };

        // Private record owned by reviewer — carries reviewer's encrypted AES key
        let reviewer_record: EncryptedReport = EncryptedReport {
            owner:          reviewer_address,
            report_id,
            encrypted_data,
            encrypted_key:  reviewer_key,
            ephemeral_key,
        };

        let f: Future = finalize_submit_report(
            report_id, category, severity, content_hash, evidence_hash
        );

        return (receipt, admin_record, reviewer_record, f);
    }

    async function finalize_submit_report(
        report_id:     field,
        category:      u8,
        severity:      u8,
        content_hash:  field,
        evidence_hash: field,
    ) {
        let timestamp: u64 = block.height as u64;

        reports.set(report_id, Report {
            report_id,
            category,
            severity,
            timestamp,
            content_hash,
            evidence_hash,
            status: 1u8
        });

        report_meta.set(report_id, ReportMeta {
            report_id,
            category,
            severity,
            timestamp,
            status: 1u8
        });

        let total:   u64 = stats.get_or_use(0u8, 0u64);
        let pending: u64 = stats.get_or_use(1u8, 0u64);
        stats.set(0u8, total   + 1u64);
        stats.set(1u8, pending + 1u64);
    }

    // ── ZK ownership proof ─────────────────────────────────────────────────
    // Pure local transition — generates a ZK proof client-side that the caller
    // knows the preimage of report_id without revealing their seed.
    transition check_status_privately(
        private reporter_seed: field,
        public  report_id:     field,
        public  current_status: u8
    ) {
        let derived_id: field = Poseidon2::hash_to_field(reporter_seed);
        assert_eq(derived_id, report_id);
    }

    // ── Admin / Reviewer: update report status ─────────────────────────────
    async transition update_status(
        public report_id:  field,
        public new_status: u8
    ) -> Future {
        return finalize_update_status(self.caller, report_id, new_status);
    }

    async function finalize_update_status(
        caller:     address,
        report_id:  field,
        new_status: u8
    ) {
        let is_admin:    bool = admins.get_or_use(caller, false);
        let is_reviewer: bool = reviewers.get_or_use(caller, false);
        assert(is_admin || is_reviewer);

        let r: Report = reports.get(report_id);

        reports.set(report_id, Report {
            report_id:     r.report_id,
            category:      r.category,
            severity:      r.severity,
            timestamp:     r.timestamp,
            content_hash:  r.content_hash,
            evidence_hash: r.evidence_hash,
            status:        new_status
        });

        report_meta.set(report_id, ReportMeta {
            report_id: r.report_id,
            category:  r.category,
            severity:  r.severity,
            timestamp: r.timestamp,
            status:    new_status
        });

        if (new_status == 3u8) {
            let pending:  u64 = stats.get(1u8);
            let resolved: u64 = stats.get_or_use(2u8, 0u64);
            stats.set(1u8, pending  - 1u64);
            stats.set(2u8, resolved + 1u64);
        }
    }

    // ── Add reviewer ───────────────────────────────────────────────────────
    async transition add_reviewer(public reviewer: address) -> Future {
        return finalize_add_reviewer(self.caller, reviewer);
    }

    async function finalize_add_reviewer(caller: address, reviewer: address) {
        let is_admin: bool = admins.get_or_use(caller, false);
        assert(is_admin);
        reviewers.set(reviewer, true);
    }
}
