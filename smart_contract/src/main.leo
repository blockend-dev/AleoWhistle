// program whistleblowing.aleo
program whistleblowing1.aleo {

    // --- Data Structures ---

    struct Report {
        report_id: field,
        category: u8,
        severity: u8,
        timestamp: u64,
        content_hash: field,
        evidence_hash: field,
        status: u8  // 1: Submitted, 2: Under Review, 3: Resolved, 4: Rejected
    }

    struct ReportMeta {
        report_id: field,
        category: u8,
        severity: u8,
        timestamp: u64,
        status: u8
    }

    // Encrypted content intended for reviewers
    struct EncryptedContent {
        report_id: field,
        encrypted_data: field,   // IPFS CID of the AES-encrypted report
        admin_key: field,        // AES Key encrypted with Admin's Public Key
        reviewer_key: field      // AES Key encrypted with Reviewer's Public Key
        ephemeral_key: field
    }

   // --- On-chain Storage ---

    mapping reports: field => Report;
    mapping report_meta: field => ReportMeta;
    mapping encrypted_contents: field => EncryptedContent;
    mapping admins: address => bool;
    mapping reviewers: address => bool;
    mapping stats: u8 => u64;
    
    // Global Stats counters (Key 0u8: total, 1u8: pending, 2u8: resolved)
    mapping stats: u8 => u64;

    // --- Initialization ---

    async transition initialize() -> Future {
        return finalize_initialize(self.caller);
    }

    async function finalize_initialize(owner: address) {
        // Only the first caller becomes admin
        let is_initialized: bool = admins.get_or_use(owner, false);
        assert(!is_initialized);

        admins.set(owner, true);
        stats.set(0u8, 0u64);
        stats.set(1u8, 0u64);
        stats.set(2u8, 0u64);
    }

    // --- Whistleblower Actions ---

    // Submit an anonymous report
    // reporter_seed: A private secret known only to the whistleblower
    async transition submit_report(
        private reporter_seed: field,
        public category: u8,
        public severity: u8,
        public content_hash: field,
        public evidence_hash: field,
        public encrypted_data: field,    // IPFS CID
        public admin_key: field,        
        public reviewer_key: field,
        public ephemeral_key: field
    ) -> (field, Future) {
        let report_id: field = Poseidon2::hash_to_field(reporter_seed);
        
        let f: Future = finalize_submit_report(
            report_id, 
            category, 
            severity, 
            content_hash, 
            evidence_hash, 
            encrypted_data, 
            admin_key,
            reviewer_key,
            ephemeral_key
        );

        return (report_id, f);
    }

    async function finalize_submit_report(
        report_id: field,
        category: u8,
        severity: u8,
        content_hash: field,
        evidence_hash: field,
        encrypted_data: field,
        admin_key: field,
        reviewer_key: field,
        ephemeral_key : field
    ) {
        let timestamp: u64 = block.height as u64; 

        let report: Report = Report {
            report_id,
            category,
            severity,
            timestamp,
            content_hash,
            evidence_hash,
            status: 1u8
        };
        
        let meta: ReportMeta = ReportMeta {
            report_id,
            category,
            severity,
            timestamp,
            status: 1u8
        };

        // Store the content with dual keys
        let content: EncryptedContent = EncryptedContent {
            report_id,
            encrypted_data,
            admin_key,
            reviewer_key,
            ephemeral_key
        };

        reports.set(report_id, report);
        report_meta.set(report_id, meta);
        encrypted_contents.set(report_id, content);

        let total: u64 = stats.get_or_use(0u8, 0u64);
        let pending: u64 = stats.get_or_use(1u8, 0u64);
        stats.set(0u8, total + 1u64);
        stats.set(1u8, pending + 1u64);
    }

    // --- Private Verification ---

    // Transition for the whistleblower to check status without revealing their seed on-chain
    transition check_status_privately(
        private reporter_seed: field,
        public report_id: field,
        public current_status: u8
    ) {
        let derived_id: field = Poseidon2::hash_to_field(reporter_seed);
        // This assertion happens in the ZK proof. 
        // If it fails, the transaction is invalid, protecting the reporter from fakes.
        assert_eq(derived_id, report_id);
    }

    // --- Reviewer & Admin Actions ---

    async transition update_status(
        public report_id: field,
        public new_status: u8
    ) -> Future {
        return finalize_update_status(self.caller, report_id, new_status);
    }

    async function finalize_update_status(
        caller: address,
        report_id: field,
        new_status: u8
    ) {
        let is_admin: bool = admins.get_or_use(caller, false);
        let is_reviewer: bool = reviewers.get_or_use(caller, false);
        assert(is_admin || is_reviewer);

        let report: Report = reports.get(report_id);
        
        // Update main report
        let updated_report: Report = Report {
            report_id: report.report_id,
            category: report.category,
            severity: report.severity,
            timestamp: report.timestamp,
            content_hash: report.content_hash,
            evidence_hash: report.evidence_hash,
            status: new_status
        };
        reports.set(report_id, updated_report);

        // Update metadata
        let updated_meta: ReportMeta = ReportMeta {
            report_id: report.report_id,
            category: report.category,
            severity: report.severity,
            timestamp: report.timestamp,
            status: new_status
        };
        report_meta.set(report_id, updated_meta);

        // Update stats if status is Resolved (3)
        if (new_status == 3u8) {
            let pending: u64 = stats.get(1u8);
            let resolved: u64 = stats.get_or_use(2u8, 0u64);
            stats.set(1u8, pending - 1u64);
            stats.set(2u8, resolved + 1u64);
        }
    }

    async transition add_reviewer(public reviewer: address) -> Future {
        return finalize_add_reviewer(self.caller, reviewer);
    }

    async function finalize_add_reviewer(caller: address, reviewer: address) {
        let is_admin: bool = admins.get_or_use(caller, false);
        assert(is_admin);
        reviewers.set(reviewer, true);
    }
}