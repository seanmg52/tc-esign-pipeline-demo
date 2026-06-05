import type {
  AuthorityEvidence,
  Coverage,
  CustomerResponse,
  DebtorType,
  EmailConfidence,
  EntityStatus,
  ExposureBand,
  InsolvencyRisk,
  PpsrCorrectionType,
  ReadinessRecord,
  RestrictedPeriodIndicator,
  SecurityAgreementStatus
} from "./pipeline";

export const READINESS_CSV_COLUMNS = [
  "customer_id",
  "trading_name",
  "legal_name",
  "nzbn",
  "ppsr_registration_number",
  "exposure_band",
  "signer_name",
  "signer_role",
  "signer_email",
  "authority_evidence",
  "template_version",
  "coverage",
  "e_sign_eligible",
  "entity_status",
  "ppsr_debtor_matches",
  "email_confidence",
  "collateral_clause_approved",
  "customer_response"
] as const;

export const OPTIONAL_READINESS_CSV_COLUMNS = [
  "debtor_type",
  "incorporation_number",
  "legal_name_verified",
  "insolvency_risk",
  "related_party",
  "legacy_balance_nzd",
  "will_extend_new_credit",
  "new_credit_limit_nzd",
  "restricted_period_indicator",
  "commercially_worth_remediating",
  "residual_risk_approved_by",
  "annual_contract_value_nzd",
  "has_personal_guarantee",
  "guarantor_name",
  "guarantor_email",
  "ppsr_correction_type",
  "security_agreement_status"
] as const;

export type ReadinessCsvColumn = (typeof READINESS_CSV_COLUMNS)[number];
export type OptionalReadinessCsvColumn = (typeof OPTIONAL_READINESS_CSV_COLUMNS)[number];

export interface CsvValidationError {
  row?: number;
  column: ReadinessCsvColumn;
  message: string;
}

export interface CsvImportResult {
  records: ReadinessRecord[];
  errors: CsvValidationError[];
}

const exposureBands = ["low", "material", "high"] as const satisfies readonly ExposureBand[];
const authorityEvidenceValues = [
  "director-record",
  "delegated-authority",
  "account-owner-confirmed",
  "customer-certificate",
  "legal-approved",
  "none"
] as const satisfies readonly AuthorityEvidence[];
const coverageValues = [
  "future-only",
  "existing-only",
  "future-and-existing",
  "counsel-review"
] as const satisfies readonly Coverage[];
const entityStatusValues = ["active", "inactive", "unknown"] as const satisfies readonly EntityStatus[];
const emailConfidenceValues = ["verified", "stale", "unknown"] as const satisfies readonly EmailConfidence[];
const customerResponseValues = [
  "not-sent",
  "sent",
  "viewed",
  "signed",
  "negotiating",
  "refused",
  "wet-ink"
] as const satisfies readonly CustomerResponse[];
const debtorTypeValues = ["company", "trust", "partnership", "sole-trader", "unknown"] as const satisfies readonly DebtorType[];
const insolvencyRiskValues = ["low", "elevated", "unknown"] as const satisfies readonly InsolvencyRisk[];
const restrictedPeriodValues = [
  "none",
  "unrelated",
  "related-party",
  "unknown"
] as const satisfies readonly RestrictedPeriodIndicator[];
const ppsrCorrectionTypeValues = [
  "none",
  "amend-typo",
  "re-register-wrong-entity",
  "counsel-review"
] as const satisfies readonly PpsrCorrectionType[];
const securityAgreementStatusValues = [
  "signed",
  "unsigned",
  "unknown"
] as const satisfies readonly SecurityAgreementStatus[];

export function parseReadinessCsv(input: string): CsvImportResult {
  const rows = parseCsv(input).filter((row) => row.some((cell) => cell.trim()));

  if (rows.length === 0) {
    return {
      records: [],
      errors: READINESS_CSV_COLUMNS.map((column) => ({
        column,
        message: `Missing required column: ${column}`
      }))
    };
  }

  const headers = rows[0].map((header) => header.trim());
  const columnIndex = new Map(headers.map((header, index) => [header, index]));
  const missingColumnErrors = READINESS_CSV_COLUMNS.flatMap((column) =>
    columnIndex.has(column) ? [] : [{ column, message: `Missing required column: ${column}` }]
  );

  if (missingColumnErrors.length > 0) {
    return { records: [], errors: missingColumnErrors };
  }

  const errors: CsvValidationError[] = [];
  const records: ReadinessRecord[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const sourceRow = rows[rowIndex];
    const rowNumber = rowIndex + 1;
    const row = Object.fromEntries(
      READINESS_CSV_COLUMNS.map((column) => [column, sourceRow[columnIndex.get(column) ?? -1]?.trim() ?? ""])
    ) as Record<ReadinessCsvColumn, string>;

    validateRequired(row, rowNumber, errors);
    const exposureBand = validateEnum(row.exposure_band, "exposure_band", exposureBands, rowNumber, errors);
    const authorityEvidence = validateEnum(
      row.authority_evidence,
      "authority_evidence",
      authorityEvidenceValues,
      rowNumber,
      errors
    );
    const coverage = validateEnum(row.coverage, "coverage", coverageValues, rowNumber, errors);
    const eSignEligible = validateBoolean(row.e_sign_eligible, rowNumber, errors);
    const entityStatus = validateEnum(row.entity_status, "entity_status", entityStatusValues, rowNumber, errors);
    const ppsrDebtorMatches = validateBoolean(row.ppsr_debtor_matches, rowNumber, errors);
    const emailConfidence = validateEnum(
      row.email_confidence,
      "email_confidence",
      emailConfidenceValues,
      rowNumber,
      errors
    );
    const collateralClauseApproved = validateBoolean(row.collateral_clause_approved, rowNumber, errors);
    const customerResponse = validateEnum(
      row.customer_response,
      "customer_response",
      customerResponseValues,
      rowNumber,
      errors
    );

    if (
      !exposureBand ||
      !authorityEvidence ||
      !coverage ||
      eSignEligible === undefined ||
      !entityStatus ||
      ppsrDebtorMatches === undefined ||
      !emailConfidence ||
      collateralClauseApproved === undefined ||
      !customerResponse
    ) {
      continue;
    }
    if (READINESS_CSV_COLUMNS.some((column) => !row[column])) continue;

    const optionalRow = Object.fromEntries(
      OPTIONAL_READINESS_CSV_COLUMNS.map((column) => [
        column,
        sourceRow[columnIndex.get(column) ?? -1]?.trim() ?? ""
      ])
    ) as Record<OptionalReadinessCsvColumn, string>;

    const debtorType = validateOptionalEnum(
      optionalRow.debtor_type,
      "debtor_type",
      debtorTypeValues,
      rowNumber,
      errors
    );
    const legalNameVerified = validateOptionalBoolean(optionalRow.legal_name_verified, "legal_name_verified", rowNumber, errors);
    const insolvencyRisk = validateOptionalEnum(
      optionalRow.insolvency_risk,
      "insolvency_risk",
      insolvencyRiskValues,
      rowNumber,
      errors
    );
    const relatedParty = validateOptionalBoolean(optionalRow.related_party, "related_party", rowNumber, errors);
    const legacyBalanceNzd = validateOptionalNumber(
      optionalRow.legacy_balance_nzd,
      "legacy_balance_nzd",
      rowNumber,
      errors
    );
    const willExtendNewCredit = validateOptionalBoolean(
      optionalRow.will_extend_new_credit,
      "will_extend_new_credit",
      rowNumber,
      errors
    );
    const newCreditLimitNzd = validateOptionalNumber(
      optionalRow.new_credit_limit_nzd,
      "new_credit_limit_nzd",
      rowNumber,
      errors
    );
    const restrictedPeriodIndicator = validateOptionalEnum(
      optionalRow.restricted_period_indicator,
      "restricted_period_indicator",
      restrictedPeriodValues,
      rowNumber,
      errors
    );
    const commerciallyWorthRemediating = validateOptionalBoolean(
      optionalRow.commercially_worth_remediating,
      "commercially_worth_remediating",
      rowNumber,
      errors
    );
    const annualContractValueNzd = validateOptionalNumber(
      optionalRow.annual_contract_value_nzd,
      "annual_contract_value_nzd",
      rowNumber,
      errors
    );
    const hasPersonalGuarantee = validateOptionalBoolean(
      optionalRow.has_personal_guarantee,
      "has_personal_guarantee",
      rowNumber,
      errors
    );
    const ppsrCorrectionType = validateOptionalEnum(
      optionalRow.ppsr_correction_type,
      "ppsr_correction_type",
      ppsrCorrectionTypeValues,
      rowNumber,
      errors
    );
    const securityAgreementStatus = validateOptionalEnum(
      optionalRow.security_agreement_status,
      "security_agreement_status",
      securityAgreementStatusValues,
      rowNumber,
      errors
    );

    if (
      debtorType === undefined ||
      legalNameVerified === undefined ||
      insolvencyRisk === undefined ||
      relatedParty === undefined ||
      legacyBalanceNzd === undefined ||
      willExtendNewCredit === undefined ||
      newCreditLimitNzd === undefined ||
      restrictedPeriodIndicator === undefined ||
      commerciallyWorthRemediating === undefined ||
      annualContractValueNzd === undefined ||
      hasPersonalGuarantee === undefined ||
      ppsrCorrectionType === undefined ||
      securityAgreementStatus === undefined
    ) {
      continue;
    }

    records.push({
      customerId: row.customer_id,
      tradingName: row.trading_name,
      legalName: row.legal_name,
      nzbn: row.nzbn,
      ppsrRegistrationNumber: row.ppsr_registration_number,
      exposureBand,
      signerName: row.signer_name,
      signerRole: row.signer_role,
      signerEmail: row.signer_email,
      authorityEvidence,
      templateVersion: row.template_version,
      coverage,
      eSignEligible,
      entityStatus,
      ppsrDebtorMatches,
      emailConfidence,
      collateralClauseApproved,
      customerResponse,
      ...(optionalRow.debtor_type ? { debtorType } : {}),
      ...(optionalRow.incorporation_number ? { incorporationNumber: optionalRow.incorporation_number } : {}),
      ...(optionalRow.legal_name_verified ? { legalNameVerified } : {}),
      ...(optionalRow.insolvency_risk ? { insolvencyRisk } : {}),
      ...(optionalRow.related_party ? { relatedParty } : {}),
      ...(optionalRow.legacy_balance_nzd ? { legacyBalanceNzd } : {}),
      ...(optionalRow.will_extend_new_credit ? { willExtendNewCredit } : {}),
      ...(optionalRow.new_credit_limit_nzd ? { newCreditLimitNzd } : {}),
      ...(optionalRow.restricted_period_indicator ? { restrictedPeriodIndicator } : {}),
      ...(optionalRow.commercially_worth_remediating ? { commerciallyWorthRemediating } : {}),
      ...(optionalRow.residual_risk_approved_by ? { residualRiskApprovedBy: optionalRow.residual_risk_approved_by } : {}),
      ...(optionalRow.annual_contract_value_nzd ? { annualContractValueNzd } : {}),
      ...(optionalRow.has_personal_guarantee ? { hasPersonalGuarantee } : {}),
      ...(optionalRow.guarantor_name ? { guarantorName: optionalRow.guarantor_name } : {}),
      ...(optionalRow.guarantor_email ? { guarantorEmail: optionalRow.guarantor_email } : {}),
      ...(optionalRow.ppsr_correction_type ? { ppsrCorrectionType } : {}),
      ...(optionalRow.security_agreement_status ? { securityAgreementStatus } : {})
    });
  }

  return errors.length > 0 ? { records: [], errors } : { records, errors: [] };
}

function validateRequired(
  row: Record<ReadinessCsvColumn, string>,
  rowNumber: number,
  errors: CsvValidationError[]
) {
  for (const column of READINESS_CSV_COLUMNS) {
    if (row[column]) continue;

    errors.push({
      row: rowNumber,
      column,
      message: column === "nzbn" ? "NZBN is required" : `${column} is required`
    });
  }
}

function validateEnum<T extends string>(
  value: string,
  column: ReadinessCsvColumn,
  allowedValues: readonly T[],
  rowNumber: number,
  errors: CsvValidationError[]
): T | undefined {
  if ((allowedValues as readonly string[]).includes(value)) return value as T;
  if (!value) return undefined;

  errors.push({
    row: rowNumber,
    column,
    message: `Invalid ${column} "${value}"; expected one of: ${allowedValues.join(", ")}`
  });
  return undefined;
}

function validateBoolean(value: string, rowNumber: number, errors: CsvValidationError[]): boolean | undefined {
  const normalized = value.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (!value) return undefined;

  errors.push({
    row: rowNumber,
    column: "e_sign_eligible",
    message: `Invalid e_sign_eligible "${value}"; expected true or false`
  });
  return undefined;
}

function validateOptionalEnum<T extends string>(
  value: string,
  column: OptionalReadinessCsvColumn,
  allowedValues: readonly T[],
  rowNumber: number,
  errors: CsvValidationError[]
): T | undefined | null {
  if (!value) return null;
  if ((allowedValues as readonly string[]).includes(value)) return value as T;

  errors.push({
    row: rowNumber,
    column: column as ReadinessCsvColumn,
    message: `Invalid ${column} "${value}"; expected one of: ${allowedValues.join(", ")}`
  });
  return undefined;
}

function validateOptionalBoolean(
  value: string,
  column: OptionalReadinessCsvColumn,
  rowNumber: number,
  errors: CsvValidationError[]
): boolean | undefined | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  errors.push({
    row: rowNumber,
    column: column as ReadinessCsvColumn,
    message: `Invalid ${column} "${value}"; expected true or false`
  });
  return undefined;
}

function validateOptionalNumber(
  value: string,
  column: OptionalReadinessCsvColumn,
  rowNumber: number,
  errors: CsvValidationError[]
): number | undefined | null {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  errors.push({
    row: rowNumber,
    column: column as ReadinessCsvColumn,
    message: `Invalid ${column} "${value}"; expected a number`
  });
  return undefined;
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
