import {
  resolveInsolvencyRemediation,
  type InsolvencyRemediation,
  type InsolvencyRemediationPath
} from "./insolvencyRemediation";

export { type InsolvencyRemediation, type InsolvencyRemediationPath } from "./insolvencyRemediation";

export type ExposureBand = "low" | "material" | "high";
export type EntityStatus = "active" | "inactive" | "unknown";
export type EmailConfidence = "verified" | "stale" | "unknown";
export type DebtorType = "company" | "trust" | "partnership" | "sole-trader" | "unknown";
export type InsolvencyRisk = "low" | "elevated" | "unknown";
export type RestrictedPeriodIndicator = "none" | "unrelated" | "related-party" | "unknown";
export type PpsrCorrectionType = "none" | "amend-typo" | "re-register-wrong-entity" | "counsel-review";
export type SecurityAgreementStatus = "signed" | "unsigned" | "unknown";
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
export type EvidenceStatus = "unverified" | "complete";
export type GateName =
  | "Gate A - Entity / PPSR"
  | "Gate B - Signer Authority"
  | "Gate C - T&C Package"
  | "Gate D - Insolvency / Clawback"
  | "Gate E - Guarantee / FTA";
export type FindingCode =
  | "NZBN_MISSING"
  | "PPSR_REGISTRATION_MISSING"
  | "ENTITY_STATUS_UNKNOWN"
  | "ENTITY_NOT_ACTIVE"
  | "PPSR_DEBTOR_MATCH_UNKNOWN"
  | "PPSR_DEBTOR_MISMATCH"
  | "DEBTOR_TYPE_UNKNOWN"
  | "DEBTOR_TYPE_REQUIRES_HUMAN_REVIEW"
  | "LEGAL_NAME_VERIFICATION_UNKNOWN"
  | "LEGAL_NAME_NOT_VERIFIED"
  | "INCORPORATION_NUMBER_MISSING"
  | "PPSR_CORRECTION_STATUS_UNKNOWN"
  | "SECURITY_AGREEMENT_STATUS_UNKNOWN"
  | "PPSR_UNSUPPORTED_REGISTRATION"
  | "PPSR_WRONG_ENTITY_REREGISTER"
  | "SIGNER_MISSING"
  | "SIGNER_ROLE_MISSING"
  | "AUTHORITY_EVIDENCE_MISSING"
  | "DELIVERY_EMAIL_INVALID"
  | "DELIVERY_EMAIL_CONFIDENCE_UNKNOWN"
  | "DELIVERY_EMAIL_UNVERIFIED"
  | "AUTHORITY_WEAK_FOR_MATERIAL_ACCOUNT"
  | "TC_TEMPLATE_MISSING"
  | "COLLATERAL_CLAUSE_APPROVAL_UNKNOWN"
  | "COLLATERAL_CLAUSE_NOT_APPROVED"
  | "COVERAGE_NEEDS_COUNSEL_REVIEW"
  | "ESIGN_INELIGIBLE"
  | "ANTECEDENT_DEBT_CLAWBACK_RISK"
  | "RELATED_PARTY_CHARGE_RISK"
  | "INSOLVENCY_RISK_ELEVATED"
  | "INSOLVENCY_RISK_UNKNOWN"
  | "RELATED_PARTY_STATUS_UNKNOWN"
  | "PERSONAL_GUARANTEE_REQUIRES_SEPARATE_SIGNER"
  | "GUARANTOR_MISSING"
  | "GUARANTEE_STATUS_UNKNOWN"
  | "FTA_UNFAIR_TERMS_REVIEW"
  | "FTA_VALUE_UNKNOWN";
export type Disposition =
  | "reported-signed"
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
  debtorType?: DebtorType;
  incorporationNumber?: string;
  legalNameVerified?: boolean;
  insolvencyRisk?: InsolvencyRisk;
  relatedParty?: boolean;
  legacyBalanceNzd?: number;
  willExtendNewCredit?: boolean;
  newCreditLimitNzd?: number;
  restrictedPeriodIndicator?: RestrictedPeriodIndicator;
  commerciallyWorthRemediating?: boolean;
  residualRiskApprovedBy?: string;
  annualContractValueNzd?: number;
  hasPersonalGuarantee?: boolean;
  guarantorName?: string;
  guarantorEmail?: string;
  ppsrCorrectionType?: PpsrCorrectionType;
  securityAgreementStatus?: SecurityAgreementStatus;
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
  insolvencyRemediation: InsolvencyRemediation;
  evidenceStatus: EvidenceStatus;
  disposition: Disposition;
}

export interface CampaignEvaluation {
  records: EvaluatedRecord[];
  summary: Record<Disposition, number>;
}

const emptySummary = (): Record<Disposition, number> => ({
  "reported-signed": 0,
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
  const gates = [
    evaluateDebtorGate(record),
    evaluateAuthorityGate(record),
    evaluateAgreementGate(record),
    evaluateInsolvencyGate(record),
    evaluateGuaranteeGate(record)
  ];
  const hasFlag = gates.some((gate) => gate.status === "flagged");
  const insolvencyRemediation = resolveInsolvencyRemediation(record);

  return {
    ...record,
    gates,
    insolvencyRemediation,
    evidenceStatus: "unverified",
    disposition: chooseDisposition(record, gates, hasFlag, insolvencyRemediation)
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
  if (record.entityStatus === undefined) {
    findings.push({
      severity: "review",
      code: "ENTITY_STATUS_UNKNOWN",
      message: "Legal entity status was not supplied.",
      recommendedNextAction: "Supply entity status from NZBN/Miseiri enrichment before treating the record as clean."
    });
  } else if (record.entityStatus !== "active") {
    findings.push({
      severity: "blocker",
      code: "ENTITY_NOT_ACTIVE",
      message: "Legal entity is not confirmed active.",
      recommendedNextAction: "Resolve the entity status before sending standard T&Cs."
    });
  }
  if (record.ppsrDebtorMatches === undefined) {
    findings.push({
      severity: "review",
      code: "PPSR_DEBTOR_MATCH_UNKNOWN",
      message: "PPSR debtor match status was not supplied.",
      recommendedNextAction: "Compare the PPSR debtor against the verified legal entity before sending."
    });
  } else if (record.ppsrDebtorMatches === false) {
    findings.push({
      severity: "blocker",
      code: "PPSR_DEBTOR_MISMATCH",
      message: "PPSR debtor does not match the verified legal entity.",
      recommendedNextAction: "Verify the debtor record before sending standard T&Cs."
    });
  }
  const debtorType = record.debtorType;
  if (debtorType === undefined || debtorType === "unknown") {
    findings.push({
      severity: "review",
      code: "DEBTOR_TYPE_UNKNOWN",
      message: "Debtor type was not verified.",
      recommendedNextAction: "Verify whether the debtor is a company, trust, partnership, or sole trader."
    });
  } else if (debtorType !== "company") {
    findings.push({
      severity: "review",
      code: "DEBTOR_TYPE_REQUIRES_HUMAN_REVIEW",
      message: `Debtor type "${debtorType}" requires human review before standard T&Cs.`,
      recommendedNextAction: "Confirm capacity and signing authority for the non-company debtor."
    });
  }
  if (record.legalNameVerified === undefined) {
    findings.push({
      severity: "review",
      code: "LEGAL_NAME_VERIFICATION_UNKNOWN",
      message: "Legal-name verification status was not supplied.",
      recommendedNextAction: "Verify the registered legal name before sending."
    });
  } else if (record.legalNameVerified === false) {
    findings.push({
      severity: "review",
      code: "LEGAL_NAME_NOT_VERIFIED",
      message: "Legal entity name has not been verified against the registry.",
      recommendedNextAction: "Verify the legal name and incorporation number before sending."
    });
  }
  if ((debtorType === undefined || debtorType === "unknown" || debtorType === "company") && !record.incorporationNumber?.trim()) {
    findings.push({
      severity: "review",
      code: "INCORPORATION_NUMBER_MISSING",
      message: "Incorporation number is missing for a company debtor.",
      recommendedNextAction: "Confirm the incorporation number from the Companies Register."
    });
  }
  if (record.ppsrCorrectionType === undefined) {
    findings.push({
      severity: "review",
      code: "PPSR_CORRECTION_STATUS_UNKNOWN",
      message: "PPSR correction status was not supplied.",
      recommendedNextAction: "Classify the PPSR record as matched, amendable, re-registration, or counsel review."
    });
  }
  if (record.securityAgreementStatus === undefined) {
    findings.push({
      severity: "review",
      code: "SECURITY_AGREEMENT_STATUS_UNKNOWN",
      message: "Security-agreement status was not supplied.",
      recommendedNextAction: "Confirm whether a signed security agreement supports the PPSR registration."
    });
  }
  if (
    record.securityAgreementStatus === "unsigned" &&
    record.ppsrRegistrationNumber.trim()
  ) {
    findings.push({
      severity: "review",
      code: "PPSR_UNSUPPORTED_REGISTRATION",
      message: "PPSR registration exists but the security agreement is unsigned.",
      recommendedNextAction: "Prioritise signature chase; registration alone does not close the evidence packet."
    });
  }
  if (record.ppsrCorrectionType === "re-register-wrong-entity") {
    findings.push({
      severity: "review",
      code: "PPSR_WRONG_ENTITY_REREGISTER",
      message: "PPSR was registered against the wrong legal entity; priority resets on re-registration.",
      recommendedNextAction: "Re-register against the correct entity and confirm priority position with counsel."
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
  if (record.emailConfidence === undefined) {
    findings.push({
      severity: "review",
      code: "DELIVERY_EMAIL_CONFIDENCE_UNKNOWN",
      message: "Delivery email confidence was not supplied.",
      recommendedNextAction: "Supply email confidence from the readiness record before treating the address as verified."
    });
  } else if (record.emailConfidence !== "verified") {
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
  if (record.collateralClauseApproved === undefined) {
    findings.push({
      severity: "review",
      code: "COLLATERAL_CLAUSE_APPROVAL_UNKNOWN",
      message: "Collateral / security clause approval status was not supplied.",
      recommendedNextAction: "Confirm the approved T&C/security package before generating customer-facing drafts."
    });
  } else if (record.collateralClauseApproved === false) {
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

function evaluateInsolvencyGate(record: ReadinessRecord): GateFinding {
  const findings: Finding[] = [];

  if (record.insolvencyRisk === undefined || record.insolvencyRisk === "unknown") {
    findings.push({
      severity: "review",
      code: "INSOLVENCY_RISK_UNKNOWN",
      message: "Insolvency or distress risk was not verified.",
      recommendedNextAction: "Complete the insolvency-risk screen before selecting coverage."
    });
  } else if (record.insolvencyRisk === "elevated") {
    findings.push({
      severity: "review",
      code: "INSOLVENCY_RISK_ELEVATED",
      message: "Insolvency or distress risk is elevated for this debtor.",
      recommendedNextAction: "Gate D+ remediation router will select clawback-mitigation path; see insolvencyRemediation on evaluated record."
    });
    if (record.coverage === "existing-only" || record.coverage === "future-and-existing") {
      findings.push({
        severity: "review",
        code: "ANTECEDENT_DEBT_CLAWBACK_RISK",
        message: "Existing or future-and-existing coverage on an elevated-insolvency debtor creates clawback exposure.",
        recommendedNextAction: "Gate D+ router selects future-supply-only or new-value-contemporaneous path unless facts force counsel-restructure."
      });
    }
  }
  if (record.relatedParty === undefined) {
    findings.push({
      severity: "review",
      code: "RELATED_PARTY_STATUS_UNKNOWN",
      message: "Related-party status was not supplied.",
      recommendedNextAction: "Confirm related-party status before applying a restricted-period analysis."
    });
  } else if (record.relatedParty === true) {
    findings.push({
      severity: "review",
      code: "RELATED_PARTY_CHARGE_RISK",
      message: "Related-party charge may be vulnerable to clawback on insolvency.",
      recommendedNextAction: "Confirm related-party status and route for human review."
    });
  }

  return gate("Gate D - Insolvency / Clawback", findings);
}

function evaluateGuaranteeGate(record: ReadinessRecord): GateFinding {
  const findings: Finding[] = [];

  if (record.hasPersonalGuarantee === undefined) {
    findings.push({
      severity: "review",
      code: "GUARANTEE_STATUS_UNKNOWN",
      message: "Personal-guarantee status was not supplied.",
      recommendedNextAction: "Confirm whether the T&C package includes a personal guarantee."
    });
  } else if (record.hasPersonalGuarantee) {
    if (!record.guarantorName?.trim() || !record.guarantorEmail?.includes("@")) {
      findings.push({
        severity: "review",
        code: "PERSONAL_GUARANTEE_REQUIRES_SEPARATE_SIGNER",
        message: "Personal guarantee requires a separate guarantor signer under PLA s 27(2).",
        recommendedNextAction: "Identify and route a separate personal guarantor signer."
      });
      findings.push({
        severity: "review",
        code: "GUARANTOR_MISSING",
        message: "Personal guarantee flagged but guarantor details are incomplete.",
        recommendedNextAction: "Record guarantor name and email for a separate guarantee signing path."
      });
    }
  }
  if (record.annualContractValueNzd === undefined) {
    findings.push({
      severity: "review",
      code: "FTA_VALUE_UNKNOWN",
      message: "The annual value of the trading relationship was not supplied.",
      recommendedNextAction: "Assess the trading relationship value when it first arose, including GST and similar contracts."
    });
  } else if (record.annualContractValueNzd < 250_000) {
    findings.push({
      severity: "review",
      code: "FTA_UNFAIR_TERMS_REVIEW",
      message: "Annual contract value is below the $250k FTA unfair-terms threshold.",
      recommendedNextAction: "Screen T&C terms for FTA unfair-contract provisions before sending."
    });
  }

  return gate("Gate E - Guarantee / FTA", findings);
}

function gate(name: GateName, findings: Finding[]): GateFinding {
  return {
    name,
    findings,
    status: findings.length === 0 ? "clear" : "flagged"
  };
}

const INSOLVENCY_ROUTED_CODES: FindingCode[] = [
  "ANTECEDENT_DEBT_CLAWBACK_RISK",
  "INSOLVENCY_RISK_ELEVATED"
];

function chooseDisposition(
  record: ReadinessRecord,
  gates: GateFinding[],
  hasGateFlag: boolean,
  remediation: InsolvencyRemediation
): Disposition {
  if (remediation.path === "credit-stop") {
    return "credit-stop-review";
  }

  if (remediation.path === "counsel-restructure" || remediation.path === "residual-risk-approved") {
    return "human-review";
  }

  const findingCodes = gates.flatMap((gate) => gate.findings.map((finding) => finding.code));

  if (hasGateFlag) {
    const nonInsolvencyFlags = findingCodes.filter(
      (code) => !INSOLVENCY_ROUTED_CODES.includes(code) && code !== "RELATED_PARTY_CHARGE_RISK"
    );
    const forceHumanReview = nonInsolvencyFlags.includes("PPSR_WRONG_ENTITY_REREGISTER");

    if (forceHumanReview || (nonInsolvencyFlags.length > 0 && record.eSignEligible)) {
      return "human-review";
    }
    if (nonInsolvencyFlags.length > 0) {
      return "wet-ink-or-counsel";
    }
  }

  const customerResponse = record.customerResponse ?? "not-sent";

  if (customerResponse === "signed") return "reported-signed";
  if (customerResponse === "negotiating") return "negotiation";
  if (customerResponse === "refused") return "credit-stop-review";
  if (customerResponse === "wet-ink") return "wet-ink-or-counsel";

  if (remediation.path === "future-supply-only" || remediation.path === "new-value-contemporaneous") {
    return "human-review";
  }

  if (remediation.path === "standard-coverage") {
    return "in-chase";
  }

  return "in-chase";
}
