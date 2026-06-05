export type ExposureBand = "low" | "material" | "high";
export type EntityStatus = "active" | "inactive" | "unknown";
export type EmailConfidence = "verified" | "stale" | "unknown";
export type Coverage = "future-only" | "existing-only" | "future-and-existing" | "counsel-review";
export type AuthorityEvidence =
  | "director-record"
  | "delegated-authority"
  | "account-owner-confirmed"
  | "customer-certificate"
  | "legal-approved"
  | "none";
export type CustomerResponse =
  | "not-sent"
  | "sent"
  | "viewed"
  | "signed"
  | "negotiating"
  | "refused"
  | "wet-ink";

export type GateStatus = "clear" | "flagged";
export type FindingSeverity = "review" | "blocker";
export type GateName =
  | "Gate A - Entity / PPSR"
  | "Gate B - Signer Authority"
  | "Gate C - T&C Package";
export type FindingCode =
  | "NZBN_MISSING"
  | "PPSR_REGISTRATION_MISSING"
  | "ENTITY_NOT_ACTIVE"
  | "PPSR_DEBTOR_MISMATCH"
  | "SIGNER_MISSING"
  | "SIGNER_ROLE_MISSING"
  | "AUTHORITY_EVIDENCE_MISSING"
  | "DELIVERY_EMAIL_INVALID"
  | "DELIVERY_EMAIL_UNVERIFIED"
  | "AUTHORITY_WEAK_FOR_MATERIAL_ACCOUNT"
  | "TC_TEMPLATE_MISSING"
  | "COLLATERAL_CLAUSE_NOT_APPROVED"
  | "COVERAGE_NEEDS_COUNSEL_REVIEW"
  | "ESIGN_INELIGIBLE";
export type Disposition =
  | "signed-evidenced"
  | "human-review"
  | "in-chase"
  | "negotiation"
  | "credit-stop-review"
  | "wet-ink-or-counsel";

export interface ReadinessRecord {
  customerId: string;
  tradingName: string;
  legalName: string;
  nzbn: string;
  ppsrRegistrationNumber: string;
  exposureBand: ExposureBand;
  signerName: string;
  signerRole: string;
  signerEmail: string;
  authorityEvidence: AuthorityEvidence;
  templateVersion: string;
  coverage: Coverage;
  eSignEligible: boolean;
  entityStatus?: EntityStatus;
  ppsrDebtorMatches?: boolean;
  emailConfidence?: EmailConfidence;
  collateralClauseApproved?: boolean;
  customerResponse?: CustomerResponse;
}

export interface Finding {
  severity: FindingSeverity;
  code: FindingCode;
  message: string;
  recommendedNextAction: string;
}

export interface GateFinding {
  name: GateName;
  status: GateStatus;
  findings: Finding[];
}

export interface EvaluatedRecord extends ReadinessRecord {
  gates: GateFinding[];
  disposition: Disposition;
}

export interface CampaignEvaluation {
  records: EvaluatedRecord[];
  summary: Record<Disposition, number>;
}

const emptySummary = (): Record<Disposition, number> => ({
  "signed-evidenced": 0,
  "human-review": 0,
  "in-chase": 0,
  negotiation: 0,
  "credit-stop-review": 0,
  "wet-ink-or-counsel": 0
});

export function evaluateCampaign(records: ReadinessRecord[]): CampaignEvaluation {
  const evaluated = records.map(evaluateRecord);
  const summary = emptySummary();

  for (const record of evaluated) {
    summary[record.disposition] += 1;
  }

  return { records: evaluated, summary };
}

export function evaluateRecord(record: ReadinessRecord): EvaluatedRecord {
  const gates = [evaluateDebtorGate(record), evaluateAuthorityGate(record), evaluateAgreementGate(record)];
  const hasFlag = gates.some((gate) => gate.status === "flagged");

  return {
    ...record,
    gates,
    disposition: chooseDisposition(record, hasFlag)
  };
}

function evaluateDebtorGate(record: ReadinessRecord): GateFinding {
  const findings: Finding[] = [];

  if (!record.nzbn.trim()) {
    findings.push({
      severity: "blocker",
      code: "NZBN_MISSING",
      message: "NZBN / registry identifier is missing.",
      recommendedNextAction: "Confirm the customer legal entity before sending standard T&Cs."
    });
  }
  if (!record.ppsrRegistrationNumber.trim()) {
    findings.push({
      severity: "review",
      code: "PPSR_REGISTRATION_MISSING",
      message: "PPSR registration number is missing.",
      recommendedNextAction: "Locate or create the PPSR reference before closing the evidence packet."
    });
  }
  if ((record.entityStatus ?? "active") !== "active") {
    findings.push({
      severity: "blocker",
      code: "ENTITY_NOT_ACTIVE",
      message: "Legal entity is not confirmed active.",
      recommendedNextAction: "Resolve the entity status before sending standard T&Cs."
    });
  }
  if (record.ppsrDebtorMatches === false) {
    findings.push({
      severity: "blocker",
      code: "PPSR_DEBTOR_MISMATCH",
      message: "PPSR debtor does not match the verified legal entity.",
      recommendedNextAction: "Verify the debtor record before sending standard T&Cs."
    });
  }

  return gate("Gate A - Entity / PPSR", findings);
}

function evaluateAuthorityGate(record: ReadinessRecord): GateFinding {
  const findings: Finding[] = [];

  if (!record.signerName.trim()) {
    findings.push({
      severity: "blocker",
      code: "SIGNER_MISSING",
      message: "No proposed signatory recorded.",
      recommendedNextAction: "Identify a proposed signer before preparing the envelope."
    });
  }
  if (!record.signerRole.trim()) {
    findings.push({
      severity: "review",
      code: "SIGNER_ROLE_MISSING",
      message: "No signer role recorded.",
      recommendedNextAction: "Record the signer's role so authority can be assessed."
    });
  }
  if (record.authorityEvidence === "none") {
    findings.push({
      severity: "blocker",
      code: "AUTHORITY_EVIDENCE_MISSING",
      message: "No authority evidence recorded for proposed signer.",
      recommendedNextAction: "Collect role or authority evidence before sending standard T&Cs."
    });
  }
  if (!record.signerEmail.includes("@")) {
    findings.push({
      severity: "blocker",
      code: "DELIVERY_EMAIL_INVALID",
      message: "Delivery email is invalid.",
      recommendedNextAction: "Correct the delivery email before preparing the envelope."
    });
  }
  if ((record.emailConfidence ?? "verified") !== "verified") {
    findings.push({
      severity: "review",
      code: "DELIVERY_EMAIL_UNVERIFIED",
      message: "Delivery email is not verified.",
      recommendedNextAction: "Confirm the delivery address before sending the envelope."
    });
  }
  if (record.exposureBand !== "low" && record.authorityEvidence === "account-owner-confirmed") {
    findings.push({
      severity: "review",
      code: "AUTHORITY_WEAK_FOR_MATERIAL_ACCOUNT",
      message: "Material accounts need stronger authority evidence than account-owner confirmation.",
      recommendedNextAction: "Collect director, delegated authority, customer certificate, or legal-approved evidence."
    });
  }

  return gate("Gate B - Signer Authority", findings);
}

function evaluateAgreementGate(record: ReadinessRecord): GateFinding {
  const findings: Finding[] = [];

  if (!record.templateVersion.trim()) {
    findings.push({
      severity: "blocker",
      code: "TC_TEMPLATE_MISSING",
      message: "T&C template version is missing.",
      recommendedNextAction: "Select the approved T&C template before preparing the envelope."
    });
  }
  if (record.collateralClauseApproved === false) {
    findings.push({
      severity: "review",
      code: "COLLATERAL_CLAUSE_NOT_APPROVED",
      message: "Collateral / security clause is not approved.",
      recommendedNextAction: "Confirm the security clause position before sending standard T&Cs."
    });
  }
  if (record.coverage === "counsel-review") {
    findings.push({
      severity: "review",
      code: "COVERAGE_NEEDS_COUNSEL_REVIEW",
      message: "Coverage of existing / future credit needs counsel review.",
      recommendedNextAction: "Route the coverage question for human review before sending."
    });
  }
  if (!record.eSignEligible) {
    findings.push({
      severity: "blocker",
      code: "ESIGN_INELIGIBLE",
      message: "Record is not eligible for the e-sign path.",
      recommendedNextAction: "Route to wet-ink signature or counsel review before proceeding."
    });
  }

  return gate("Gate C - T&C Package", findings);
}

function gate(name: GateName, findings: Finding[]): GateFinding {
  return {
    name,
    findings,
    status: findings.length === 0 ? "clear" : "flagged"
  };
}

function chooseDisposition(record: ReadinessRecord, hasGateFlag: boolean): Disposition {
  if (hasGateFlag) return record.eSignEligible ? "human-review" : "wet-ink-or-counsel";

  const customerResponse = record.customerResponse ?? "not-sent";

  if (customerResponse === "signed") return "signed-evidenced";
  if (customerResponse === "negotiating") return "negotiation";
  if (customerResponse === "refused") return "credit-stop-review";
  if (customerResponse === "wet-ink") return "wet-ink-or-counsel";

  return "in-chase";
}
