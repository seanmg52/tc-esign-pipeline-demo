import { describe, expect, it } from "vitest";
import { resolveInsolvencyRemediation } from "./insolvencyRemediation";
import type { ReadinessRecord } from "./pipeline";

const baseRecord: ReadinessRecord = {
  customerId: "TEST-001",
  tradingName: "Test Co",
  legalName: "Test Co Limited",
  nzbn: "9429000000999",
  ppsrRegistrationNumber: "F999999",
  exposureBand: "material",
  signerName: "Test Director",
  signerRole: "Director",
  signerEmail: "director@test.example",
  authorityEvidence: "director-record",
  templateVersion: "tc-v4",
  coverage: "future-and-existing",
  eSignEligible: true,
  entityStatus: "active",
  ppsrDebtorMatches: true,
  emailConfidence: "verified",
  collateralClauseApproved: true,
  insolvencyRisk: "low",
  relatedParty: false
};

describe("resolveInsolvencyRemediation", () => {
  it("routes healthy company with future-and-existing to standard-coverage", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "low",
      coverage: "future-and-existing"
    });

    expect(result.path).toBe("standard-coverage");
    expect(result.counselRequired).toBe(false);
    expect(result.clawbackRiskResidual).toBe("low");
  });

  it("routes elevated + legacy balance + existing-only to future-supply-only", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      coverage: "existing-only",
      legacyBalanceNzd: 45_000,
      commerciallyWorthRemediating: true,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("future-supply-only");
    expect(result.counselRequired).toBe(false);
    expect(result.templateVariantId).toBe("tc-v4-future-supply-only");
    expect(result.coverageEffective).toBe("future-only");
    expect(result.evidenceChecklist).toContain("Dated proof of first invoice/supply after signing");
  });

  it("routes elevated + will extend new credit + limit to new-value-contemporaneous", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      coverage: "future-and-existing",
      legacyBalanceNzd: 30_000,
      willExtendNewCredit: true,
      newCreditLimitNzd: 50_000,
      templateVersion: "tc-v4-new-value-contemporaneous",
      commerciallyWorthRemediating: true,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("new-value-contemporaneous");
    expect(result.templateVariantId).toBe("tc-v4-new-value-contemporaneous");
    expect(result.collateralScopeNote).toContain("50,000");
  });

  it("routes related party to counsel-restructure regardless of other facts", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      relatedParty: true,
      insolvencyRisk: "low"
    });

    expect(result.path).toBe("counsel-restructure");
    expect(result.counselRequired).toBe(true);
  });

  it("routes elevated + not worth remediating to credit-stop", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      legacyBalanceNzd: 12_000,
      coverage: "existing-only",
      commerciallyWorthRemediating: false,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("credit-stop");
    expect(result.templateVariantId).toBe("none");
  });

  it("routes residual risk approved to residual-risk-approved", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      legacyBalanceNzd: 80_000,
      coverage: "existing-only",
      residualRiskApprovedBy: "owner-42",
      commerciallyWorthRemediating: true,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("residual-risk-approved");
    expect(result.evidenceChecklist[0]).toContain("owner-42");
    expect(result.counselRequired).toBe(false);
  });

  it("routes unknown insolvency risk + existing coverage to counsel-restructure", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "unknown",
      coverage: "existing-only",
      legacyBalanceNzd: 10_000
    });

    expect(result.path).toBe("counsel-restructure");
    expect(result.counselRequired).toBe(true);
  });

  it("routes low insolvency + related party to counsel-restructure", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "low",
      relatedParty: true
    });

    expect(result.path).toBe("counsel-restructure");
  });

  it("falls back to future-supply-only when new credit limit set but template not counsel-approved", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      coverage: "future-and-existing",
      legacyBalanceNzd: 20_000,
      willExtendNewCredit: true,
      newCreditLimitNzd: 25_000,
      templateVersion: "tc-v4",
      commerciallyWorthRemediating: true,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("future-supply-only");
  });

  it("routes to counsel-restructure when elevated with existing coverage but legacy balance unknown", () => {
    const result = resolveInsolvencyRemediation({
      ...baseRecord,
      insolvencyRisk: "elevated",
      coverage: "future-and-existing",
      commerciallyWorthRemediating: true,
      restrictedPeriodIndicator: "unrelated"
    });

    expect(result.path).toBe("counsel-restructure");
  });
});
