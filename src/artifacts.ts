import type { EvaluatedRecord } from "./pipeline";

export interface TermsDraftArtifact {
  customerId: string;
  filename: string;
  contentType: "text/html";
  content: string;
}

export interface CampaignArtifacts {
  termsDrafts: TermsDraftArtifact[];
  chaseTrackerCsv: string;
  exceptionReportCsv: string;
  evidenceManifestCsv: string;
}

const chaseTrackerHeader = [
  "customer_id",
  "trading_name",
  "legal_name",
  "signer_name",
  "signer_email",
  "disposition",
  "next_action"
];

const exceptionReportHeader = [
  "customer_id",
  "trading_name",
  "legal_name",
  "disposition",
  "gate",
  "severity",
  "code",
  "message",
  "recommended_next_action"
];

const evidenceManifestHeader = [
  "customer_id",
  "legal_name",
  "template_version",
  "signer_name",
  "signer_email",
  "authority_evidence",
  "evidence_status",
  "evidence_reference"
];

export function generateCampaignArtifacts(records: EvaluatedRecord[]): CampaignArtifacts {
  const sendableRecords = records.filter(isSendableCleanRecord);
  const exceptionRecords = records.filter(isExceptionRecord);
  const signedRecords = records.filter((record) => record.disposition === "signed-evidenced");

  return {
    termsDrafts: sendableRecords.map(createTermsDraft),
    chaseTrackerCsv: toCsv([
      chaseTrackerHeader,
      ...sendableRecords.map((record) => [
        record.customerId,
        record.tradingName,
        record.legalName,
        record.signerName,
        record.signerEmail,
        record.disposition,
        "Prepare offline synthetic draft for e-sign chase"
      ])
    ]),
    exceptionReportCsv: toCsv([
      exceptionReportHeader,
      ...exceptionRecords.flatMap((record) => exceptionRowsFor(record))
    ]),
    evidenceManifestCsv: toCsv([
      evidenceManifestHeader,
      ...signedRecords.map((record) => [
        record.customerId,
        record.legalName,
        record.templateVersion,
        record.signerName,
        record.signerEmail,
        record.authorityEvidence,
        "offline-synthetic-signed",
        `SYNTHETIC-EVIDENCE-${record.customerId}`
      ])
    ])
  };
}

function isSendableCleanRecord(record: EvaluatedRecord): boolean {
  return hasClearGates(record) && record.disposition === "in-chase";
}

function isExceptionRecord(record: EvaluatedRecord): boolean {
  return !hasClearGates(record) || ["negotiation", "credit-stop-review", "wet-ink-or-counsel"].includes(record.disposition);
}

function hasClearGates(record: EvaluatedRecord): boolean {
  return record.gates.every((gate) => gate.status === "clear");
}

function createTermsDraft(record: EvaluatedRecord): TermsDraftArtifact {
  return {
    customerId: record.customerId,
    filename: `${record.customerId}-synthetic-tc-draft.html`,
    contentType: "text/html",
    content: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '  <meta charset="utf-8" />',
      `  <title>Non-legal synthetic T&amp;C sample - ${escapeHtml(record.customerId)}</title>`,
      "</head>",
      "<body>",
      "  <h1>NON-LEGAL SAMPLE TEXT - Synthetic Trade Credit Terms Draft</h1>",
      "  <p>This offline demo artifact is synthetic sample text only. It is not legal advice, not firm T&amp;Cs, and not suitable for use as customer terms.</p>",
      "  <h2>Prefill Summary</h2>",
      "  <dl>",
      `    <dt>Customer ID</dt><dd>${escapeHtml(record.customerId)}</dd>`,
      `    <dt>Trading name</dt><dd>${escapeHtml(record.tradingName)}</dd>`,
      `    <dt>Legal name</dt><dd>${escapeHtml(record.legalName)}</dd>`,
      `    <dt>NZBN</dt><dd>${escapeHtml(record.nzbn)}</dd>`,
      `    <dt>PPSR reference</dt><dd>${escapeHtml(record.ppsrRegistrationNumber)}</dd>`,
      `    <dt>Signer</dt><dd>${escapeHtml(record.signerName)} (${escapeHtml(record.signerRole)})</dd>`,
      `    <dt>Signer email</dt><dd>${escapeHtml(record.signerEmail)}</dd>`,
      `    <dt>Template version</dt><dd>${escapeHtml(record.templateVersion)}</dd>`,
      "  </dl>",
      "  <h2>Synthetic Sample Clauses</h2>",
      "  <p>The customer agrees that any real trade-credit terms would be supplied by counsel-approved templates outside this demo.</p>",
      "  <p>The customer details above are included only to demonstrate offline merge-field prefill behavior.</p>",
      "</body>",
      "</html>"
    ].join("\n")
  };
}

function exceptionRowsFor(record: EvaluatedRecord): string[][] {
  const gateRows = record.gates.flatMap((gate) =>
    gate.findings.map((finding) => [
      record.customerId,
      record.tradingName,
      record.legalName,
      record.disposition,
      gate.name,
      finding.severity,
      finding.code,
      finding.message,
      finding.recommendedNextAction
    ])
  );

  if (gateRows.length > 0) return gateRows;

  return [
    [
      record.customerId,
      record.tradingName,
      record.legalName,
      record.disposition,
      "Disposition",
      "review",
      dispositionCode(record),
      dispositionMessage(record),
      dispositionNextAction(record)
    ]
  ];
}

function dispositionCode(record: EvaluatedRecord): string {
  if (record.disposition === "negotiation") return "NEGOTIATION";
  if (record.disposition === "credit-stop-review") return "CREDIT_STOP_REVIEW";
  if (record.disposition === "wet-ink-or-counsel") return "WET_INK_OR_COUNSEL";
  return "NON_SENDABLE_DISPOSITION";
}

function dispositionMessage(record: EvaluatedRecord): string {
  if (record.disposition === "negotiation") return "Customer is negotiating the terms.";
  if (record.disposition === "credit-stop-review") return "Customer refused the standard T&C path.";
  if (record.disposition === "wet-ink-or-counsel") return "Record needs wet-ink signature or counsel routing.";
  return "Record is not eligible for the sendable clean campaign path.";
}

function dispositionNextAction(record: EvaluatedRecord): string {
  if (record.disposition === "negotiation") return "Route to commercial owner or counsel for negotiated terms.";
  if (record.disposition === "credit-stop-review") return "Route to business owner for credit-stop review.";
  if (record.disposition === "wet-ink-or-counsel") return "Prepare wet-ink or counsel-reviewed workflow.";
  return "Review before generating any customer-facing artifact.";
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
