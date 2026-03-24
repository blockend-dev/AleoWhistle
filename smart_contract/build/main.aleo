import credits.aleo;
program whistleblowing_version3.aleo;

record ReporterReceipt:
    owner as address.private;
    report_id as field.private;
    category as u8.private;
    severity as u8.private;

record EncryptedReport:
    owner as address.private;
    report_id as field.private;
    encrypted_data as field.private;
    encrypted_key as field.private;
    ephemeral_key as field.private;

struct Report:
    report_id as field;
    category as u8;
    severity as u8;
    timestamp as u64;
    content_hash as field;
    evidence_hash as field;
    status as u8;

struct ReportMeta:
    report_id as field;
    category as u8;
    severity as u8;
    timestamp as u64;
    status as u8;

mapping reports:
    key as field.public;
    value as Report.public;

mapping report_meta:
    key as field.public;
    value as ReportMeta.public;

mapping admins:
    key as address.public;
    value as boolean.public;

mapping reviewers:
    key as address.public;
    value as boolean.public;

mapping stats:
    key as u8.public;
    value as u64.public;

mapping bounties:
    key as field.public;
    value as u64.public;

mapping claimed:
    key as field.public;
    value as boolean.public;

function initialize:
    async initialize self.caller into r0;
    output r0 as whistleblowing_version3.aleo/initialize.future;

finalize initialize:
    input r0 as address.public;
    get.or_use admins[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;
    set true into admins[r0];
    set 0u64 into stats[0u8];
    set 0u64 into stats[1u8];
    set 0u64 into stats[2u8];

function submit_report:
    input r0 as field.private;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as field.public;
    input r6 as address.public;
    input r7 as field.public;
    input r8 as address.public;
    input r9 as field.public;
    input r10 as field.public;
    hash.psd2 r0 into r11 as field;
    cast self.caller into r12 as address;
    cast r12 r11 r1 r2 into r13 as ReporterReceipt.record;
    cast r6 r11 r5 r7 r10 into r14 as EncryptedReport.record;
    cast r8 r11 r5 r9 r10 into r15 as EncryptedReport.record;
    async submit_report r11 r1 r2 r3 r4 into r16;
    output r13 as ReporterReceipt.record;
    output r14 as EncryptedReport.record;
    output r15 as EncryptedReport.record;
    output r16 as whistleblowing_version3.aleo/submit_report.future;

finalize submit_report:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    cast block.height into r5 as u64;
    cast r0 r1 r2 r5 r3 r4 1u8 into r6 as Report;
    set r6 into reports[r0];
    cast r0 r1 r2 r5 1u8 into r7 as ReportMeta;
    set r7 into report_meta[r0];
    get.or_use stats[0u8] 0u64 into r8;
    get.or_use stats[1u8] 0u64 into r9;
    add r8 1u64 into r10;
    set r10 into stats[0u8];
    add r9 1u64 into r11;
    set r11 into stats[1u8];

function check_status_privately:
    input r0 as field.private;
    input r1 as field.public;
    input r2 as u8.public;
    hash.psd2 r0 into r3 as field;
    assert.eq r3 r1;

function update_status:
    input r0 as field.public;
    input r1 as u8.public;
    async update_status self.caller r0 r1 into r2;
    output r2 as whistleblowing_version3.aleo/update_status.future;

finalize update_status:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u8.public;
    get.or_use admins[r0] false into r3;
    get.or_use reviewers[r0] false into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    get reports[r1] into r6;
    cast r6.report_id r6.category r6.severity r6.timestamp r6.content_hash r6.evidence_hash r2 into r7 as Report;
    set r7 into reports[r1];
    cast r6.report_id r6.category r6.severity r6.timestamp r2 into r8 as ReportMeta;
    set r8 into report_meta[r1];
    is.eq r2 3u8 into r9;
    branch.eq r9 false to end_then_0_0;
    get stats[1u8] into r10;
    get.or_use stats[2u8] 0u64 into r11;
    sub r10 1u64 into r12;
    set r12 into stats[1u8];
    add r11 1u64 into r13;
    set r13 into stats[2u8];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function add_reviewer:
    input r0 as address.public;
    async add_reviewer self.caller r0 into r1;
    output r1 as whistleblowing_version3.aleo/add_reviewer.future;

finalize add_reviewer:
    input r0 as address.public;
    input r1 as address.public;
    get.or_use admins[r0] false into r2;
    assert.eq r2 true;
    set true into reviewers[r1];

function fund_bounty:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    call credits.aleo/transfer_private_to_public r0 whistleblowing_version3.aleo r2 into r3 r4;
    async fund_bounty r4 self.caller r1 r2 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as whistleblowing_version3.aleo/fund_bounty.future;

finalize fund_bounty:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as address.public;
    input r2 as field.public;
    input r3 as u64.public;
    await r0;
    get.or_use admins[r1] false into r4;
    assert.eq r4 true;
    get.or_use claimed[r2] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    get.or_use bounties[r2] 0u64 into r7;
    add r7 r3 into r8;
    set r8 into bounties[r2];

function claim_bounty:
    input r0 as ReporterReceipt.record;
    input r1 as address.public;
    input r2 as u64.public;
    call credits.aleo/transfer_public_to_private r1 r2 into r3 r4;
    async claim_bounty r4 r0.report_id r2 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as whistleblowing_version3.aleo/claim_bounty.future;

finalize claim_bounty:
    input r0 as credits.aleo/transfer_public_to_private.future;
    input r1 as field.public;
    input r2 as u64.public;
    get reports[r1] into r3;
    assert.eq r3.status 3u8;
    get.or_use claimed[r1] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    get bounties[r1] into r6;
    assert.eq r6 r2;
    await r0;
    set true into claimed[r1];
    set 0u64 into bounties[r1];

constructor:
    assert.eq edition 0u16;
