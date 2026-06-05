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
export type Disposition =
  | "signed-evidenced"
  | "human-review"
  | "in-chase"
  | "negotiation"
  | "credit-stop-review"
  | "wet-ink-or-counsel";

export interface ReadinessRecord {
  id: string;
  tradingName: string;
  legalEntity: string;
  nzbn: string;
  entityStatus: EntityStatus;
  ppsrDebtorMatches: boolean;
  exposureBand: ExposureBand;
  proposedSignatory: string;
  signatoryRole: string;
  authorityEvidence: AuthorityEvidence;
  deliveryEmail: string;
  emailConfidence: EmailConfidence;
  templateVersion: string;
  collateralClauseApproved: boolean;
  coverage: Coverage;
  eSignEligible: boolean;
  customerResponse: CustomerResponse;
}

export interface GateFinding {
  name: "Debtor / PPSR" | "Authority / Delivery" | "Agreement / E-sign";
  status: GateStatus;
  findings: string[];
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
  const findings: string[] = [];

  if (!record.nzbn.trim()) findings.push("NZBN / registry identifier is missing");
  if (record.entityStatus !== "active") findings.push("Legal entity is not confirmed active");
  if (!record.ppsrDebtorMatches) findings.push("PPSR debtor does not match verified legal entity");

  return gate("Debtor / PPSR", findings);
}

function evaluateAuthorityGate(record: ReadinessRecord): GateFinding {
  const findings: string[] = [];

  if (!record.proposedSignatory.trim()) findings.push("No proposed signatory recorded");
  if (record.authorityEvidence === "none") findings.push("No authority evidence recorded for proposed signer");
  if (!record.deliveryEmail.includes("@")) findings.push("Delivery email is invalid");
  if (record.emailConfidence !== "verified") findings.push("Delivery email is not verified");
  if (record.exposureBand !== "low" && record.authorityEvidence === "account-owner-confirmed") {
    findings.push("Material accounts need stronger authority evidence than account-owner confirmation");
  }

  return gate("Authority / Delivery", findings);
}

function evaluateAgreementGate(record: ReadinessRecord): GateFinding {
  const findings: string[] = [];

  if (!record.templateVersion.trim()) findings.push("T&C template version is missing");
  if (!record.collateralClauseApproved) findings.push("Collateral / security clause is not approved");
  if (record.coverage === "counsel-review") findings.push("Coverage of existing / future credit needs counsel review");
  if (!record.eSignEligible) findings.push("Record is not eligible for the e-sign path");

  return gate("Agreement / E-sign", findings);
}

function gate(name: GateFinding["name"], findings: string[]): GateFinding {
  return {
    name,
    findings,
    status: findings.length === 0 ? "clear" : "flagged"
  };
}

function chooseDisposition(record: ReadinessRecord, hasGateFlag: boolean): Disposition {
  if (hasGateFlag) return record.eSignEligible ? "human-review" : "wet-ink-or-counsel";

  if (record.customerResponse === "signed") return "signed-evidenced";
  if (record.customerResponse === "negotiating") return "negotiation";
  if (record.customerResponse === "refused") return "credit-stop-review";
  if (record.customerResponse === "wet-ink") return "wet-ink-or-counsel";

  return "in-chase";
}
