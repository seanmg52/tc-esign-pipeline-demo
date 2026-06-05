import { describe, expect, it } from "vitest";
import { READINESS_CSV_COLUMNS, parseReadinessCsv } from "./importCsv";

const validCsv = [
  READINESS_CSV_COLUMNS.join(","),
  [
    "SYN-001",
    "Kauri Supplies",
    "Kauri Supplies Limited",
    "9429000001001",
    "F123456",
    "material",
    "Aroha Director",
    "Director",
    "aroha.director@kauri.example",
    "director-record",
    "tc-v4",
    "future-and-existing",
    "true",
    "active",
    "true",
    "verified",
    "true",
    "not-sent"
  ].join(",")
].join("\n");

describe("parseReadinessCsv", () => {
  it("reports missing required columns before creating records", () => {
    const result = parseReadinessCsv("customer_id,trading_name\nSYN-001,Kauri Supplies");

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "legal_name", message: "Missing required column: legal_name" }),
        expect.objectContaining({ column: "nzbn", message: "Missing required column: nzbn" })
      ])
    );
  });

  it("reports invalid enum values at the column level", () => {
    const result = parseReadinessCsv(validCsv.replace(",material,", ",medium,"));

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        column: "exposure_band",
        message: 'Invalid exposure_band "medium"; expected one of: low, material, high'
      })
    ]);
  });

  it("reports blank NZBN as a column-level validation error", () => {
    const result = parseReadinessCsv(validCsv.replace(",9429000001001,", ",,"));

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        column: "nzbn",
        message: "NZBN is required"
      })
    ]);
  });

  it("imports valid synthetic readiness rows", () => {
    const result = parseReadinessCsv(validCsv);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      {
        customerId: "SYN-001",
        tradingName: "Kauri Supplies",
        legalName: "Kauri Supplies Limited",
        nzbn: "9429000001001",
        ppsrRegistrationNumber: "F123456",
        exposureBand: "material",
        signerName: "Aroha Director",
        signerRole: "Director",
        signerEmail: "aroha.director@kauri.example",
        authorityEvidence: "director-record",
        templateVersion: "tc-v4",
        coverage: "future-and-existing",
        eSignEligible: true,
        entityStatus: "active",
        ppsrDebtorMatches: true,
        emailConfidence: "verified",
        collateralClauseApproved: true,
        customerResponse: "not-sent"
      }
    ]);
  });

  it("requires gate fact columns instead of defaulting missing facts to safe values", () => {
    const legacyCsv = [
      "customer_id,trading_name,legal_name,nzbn,ppsr_registration_number,exposure_band,signer_name,signer_role,signer_email,authority_evidence,template_version,coverage,e_sign_eligible",
      "SYN-001,Kauri Supplies,Kauri Supplies Limited,9429000001001,F123456,material,Aroha Director,Director,aroha.director@kauri.example,director-record,tc-v4,future-and-existing,true"
    ].join("\n");

    const result = parseReadinessCsv(legacyCsv);

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "entity_status" }),
        expect.objectContaining({ column: "ppsr_debtor_matches" }),
        expect.objectContaining({ column: "email_confidence" }),
        expect.objectContaining({ column: "collateral_clause_approved" }),
        expect.objectContaining({ column: "customer_response" })
      ])
    );
  });

  it("reports the actual boolean column when a required boolean is invalid", () => {
    const result = parseReadinessCsv(validCsv.replace(",active,true,verified,", ",active,maybe,verified,"));

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        column: "ppsr_debtor_matches",
        message: 'Invalid ppsr_debtor_matches "maybe"; expected true or false'
      })
    ]);
  });
});
