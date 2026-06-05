import type { AuthorityEvidence, Coverage, ExposureBand, ReadinessRecord } from "./pipeline";

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
  "e_sign_eligible"
] as const;

export type ReadinessCsvColumn = (typeof READINESS_CSV_COLUMNS)[number];

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

    if (!exposureBand || !authorityEvidence || !coverage || eSignEligible === undefined) continue;
    if (READINESS_CSV_COLUMNS.some((column) => !row[column])) continue;

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
      eSignEligible
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
