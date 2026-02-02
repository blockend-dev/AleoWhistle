
// Anonymous Whistleblowing System
program whistleblowing.aleo {
    // Report structures
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

    struct EncryptedContent {
        report_id: field,
        encrypted_data: field,
        encryption_key_hash: field
    }

    // On-chain Storage
    mapping reports: field => Report;
    mapping report_meta: field => ReportMeta;
    mapping encrypted_contents: field => EncryptedContent;
    mapping admins: address => bool;
    mapping reviewers: address => bool;
    
    // Global Stats counters (Key 0u8 for total, 1u8 for pending, 2u8 for resolved)
    mapping stats: u8 => u64;

    // Initialize the system
    async transition initialize()->Future {
        return finalize_initialize(self.caller);
    }

    async function finalize_initialize(owner: address) {
        admins.set(owner, true);
        stats.set(0u8, 0u64); // total
        stats.set(1u8, 0u64); // pending
        stats.set(2u8, 0u64); // resolved
    }

    // Submit an anonymous report
    async transition submit_report(
        reporter_seed: field,
        category: u8,
        severity: u8,
        content_hash: field,
        evidence_hash: field,
        encrypted_data: field,
        encryption_key_hash: field
    ) -> (field,Future) {
        let report_id: field = Poseidon2::hash_to_field(reporter_seed);
        
        return (report_id, finalize_submit_report(
            report_id, 
            category, 
            severity, 
            content_hash, 
            evidence_hash, 
            encrypted_data, 
            encryption_key_hash
        ));
    }

    async function finalize_submit_report(
        report_id: field,
        category: u8,
        severity: u8,
        content_hash: field,
        evidence_hash: field,
        encrypted_data: field,
        encryption_key_hash: field
    ) {
        let timestamp: u64 = block.height as u64; 

        let report: Report = Report {
            report_id: report_id,
            category: category,
            severity: severity,
            timestamp: timestamp,
            content_hash: content_hash,
            evidence_hash: evidence_hash,
            status: 1u8
        };
        
        let meta: ReportMeta = ReportMeta {
            report_id: report_id,
            category: category,
            severity: severity,
            timestamp: timestamp,
            status: 1u8
        };

        let content: EncryptedContent = EncryptedContent {
            report_id: report_id,
            encrypted_data: encrypted_data,
            encryption_key_hash: encryption_key_hash
        };

        reports.set(report_id, report);
        report_meta.set(report_id, meta);
        encrypted_contents.set(report_id, content);

        // Update Stats
        let total: u64 = stats.get_or_use(0u8, 0u64);
        let pending: u64 = stats.get_or_use(1u8, 0u64);
        stats.set(0u8, total + 1u64);
        stats.set(1u8, pending + 1u64);
    }

    // Update report status
    async transition update_status(
        report_id: field,
        new_status: u8
    )->Future {
        return finalize_update_status(self.caller, report_id, new_status);
    }

    async function finalize_update_status(
        caller: address,
        report_id: field,
        new_status: u8
    ) {
        // Auth check
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
            let resolved: u64 = stats.get(2u8);
            stats.set(1u8, pending - 1u64);
            stats.set(2u8, resolved + 1u64);
        }
    }

   
}