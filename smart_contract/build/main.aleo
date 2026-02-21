program new_whistleblowing.aleo;

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

struct EncryptedContent:
    report_id as field;
    encrypted_data as field;
    admin_key as field;
    reviewer_key as field;
    ephemeral_key as field;

mapping reports:
    key as field.public;
    value as Report.public;

mapping report_meta:
    key as field.public;
    value as ReportMeta.public;

mapping encrypted_contents:
    key as field.public;
    value as EncryptedContent.public;

mapping admins:
    key as address.public;
    value as boolean.public;

mapping reviewers:
    key as address.public;
    value as boolean.public;

mapping stats:
    key as u8.public;
    value as u64.public;

function initialize:
    async initialize self.caller into r0;
    output r0 as new_whistleblowing.aleo/initialize.future;

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
    input r6 as field.public;
    input r7 as field.public;
    input r8 as field.public;
    hash.psd2 r0 into r9 as field;
    async submit_report r9 r1 r2 r3 r4 r5 r6 r7 r8 into r10;
    output r9 as field.private;
    output r10 as new_whistleblowing.aleo/submit_report.future;

finalize submit_report:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as field.public;
    input r6 as field.public;
    input r7 as field.public;
    input r8 as field.public;
    cast block.height into r9 as u64;
    cast r0 r1 r2 r9 r3 r4 1u8 into r10 as Report;
    cast r0 r1 r2 r9 1u8 into r11 as ReportMeta;
    cast r0 r5 r6 r7 r8 into r12 as EncryptedContent;
    set r10 into reports[r0];
    set r11 into report_meta[r0];
    set r12 into encrypted_contents[r0];
    get.or_use stats[0u8] 0u64 into r13;
    get.or_use stats[1u8] 0u64 into r14;
    add r13 1u64 into r15;
    set r15 into stats[0u8];
    add r14 1u64 into r16;
    set r16 into stats[1u8];

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
    output r2 as new_whistleblowing.aleo/update_status.future;

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
    output r1 as new_whistleblowing.aleo/add_reviewer.future;

finalize add_reviewer:
    input r0 as address.public;
    input r1 as address.public;
    get.or_use admins[r0] false into r2;
    assert.eq r2 true;
    set true into reviewers[r1];

constructor:
    assert.eq edition 0u16;
