import { describe, expect, it } from "vitest";
import { generateCampaignArtifacts } from "./artifacts";
import { evaluateCampaign, type ReadinessRecord } from "./pipeline";

const baseRecord: ReadinessRecord = {
  customerId: "SYN-001",
  tradingName: "Kauri Supplies",
  legalName: "Kauri Supplies Limited",
  nzbn: "9429000001001",
  ppsrRegistrationNumber: "F123456",
  entityStatus: "active",
  ppsrDebtorMatches: true,
  exposureBand: "material",
  signerName: "Aroha Director",
  signerRole: "Director",
  signerEmail: "aroha.director@kauri.example",
  authorityEvidence: "director-record",
  emailConfidence: "verified",
  templateVersion: "tc-v4",
  collateralClauseApproved: true,
  coverage: "future-and-existing",
  debtorType: "company",
  incorporationNumber: "1000001",
  legalNameVerified: true,
  insolvencyRisk: "low",
  relatedParty: false,
  restrictedPeriodIndicator: "none",
  annualContractValueNzd: 300_000,
  hasPersonalGuarantee: false,
  ppsrCorrectionType: "none",
  securityAgreementStatus: "signed",
  eSignEligible: true,
  customerResponse: "not-sent"
};

function artifactsFor(records: ReadinessRecord[]) {
  return generateCampaignArtifacts(evaluateCampaign(records).records);
}

describe("generateCampaignArtifacts", () => {
  it("generates synthetic non-legal T&C drafts only for sendable clean records", () => {
    const artifacts = artifactsFor([
      baseRecord,
      {
        ...baseRecord,
        customerId: "EXC-002",
        ppsrDebtorMatches: false
      },
      {
        ...baseRecord,
        customerId: "NEG-003",
        customerResponse: "negotiating"
      }
    ]);

    expect(artifacts.termsDrafts).toHaveLength(1);
    expect(artifacts.termsDrafts[0]).toEqual(
      expect.objectContaining({
        customerId: "SYN-001",
        filename: "SYN-001-synthetic-tc-draft.html",
        contentType: "text/html"
      })
    );
    expect(artifacts.termsDrafts[0].content).toContain("NON-LEGAL SAMPLE TEXT");
    expect(artifacts.termsDrafts[0].content).toContain("Kauri Supplies Limited");
    expect(artifacts.termsDrafts[0].content).toContain("Aroha Director");
  });

  it("generates a chase tracker CSV for sendable clean records and escapes CSV values", () => {
    const artifacts = artifactsFor([
      {
        ...baseRecord,
        tradingName: 'North, South "Demo"',
        legalName: 'North, South "Demo" Limited'
      },
      {
        ...baseRecord,
        customerId: "SIGNED-002",
        customerResponse: "signed"
      }
    ]);

    expect(artifacts.chaseTrackerCsv).toBe(
      [
        "customer_id,trading_name,legal_name,signer_name,signer_email,disposition,next_action",
        'SYN-001,"North, South ""Demo""","North, South ""Demo"" Limited",Aroha Director,aroha.director@kauri.example,in-chase,Prepare offline synthetic draft for e-sign chase'
      ].join("\n")
    );
  });

  it("generates an exception report CSV for flagged and non-sendable records", () => {
    const artifacts = artifactsFor([
      baseRecord,
      {
        ...baseRecord,
        customerId: "EXC-002",
        ppsrDebtorMatches: false
      },
      {
        ...baseRecord,
        customerId: "REF-003",
        customerResponse: "refused"
      }
    ]);

    expect(artifacts.exceptionReportCsv).toContain(
      "customer_id,trading_name,legal_name,disposition,gate,severity,code,message,recommended_next_action"
    );
    expect(artifacts.exceptionReportCsv).toContain(
      "EXC-002,Kauri Supplies,Kauri Supplies Limited,human-review,Gate A - Entity / PPSR,blocker,PPSR_DEBTOR_MISMATCH"
    );
    expect(artifacts.exceptionReportCsv).toContain(
      "REF-003,Kauri Supplies,Kauri Supplies Limited,credit-stop-review,Disposition,review,CREDIT_STOP_REVIEW"
    );
    expect(artifacts.exceptionReportCsv).not.toContain("SYN-001");
  });

  it("does not claim evidence exists for an imported signed response", () => {
    const artifacts = artifactsFor([
      baseRecord,
      {
        ...baseRecord,
        customerId: "SIGNED-002",
        customerResponse: "signed"
      }
    ]);

    expect(artifacts.evidenceManifestCsv).toBe(
      "customer_id,legal_name,template_version,signer_name,signer_email,authority_evidence,evidence_status,evidence_reference"
    );
  });

  it("neutralizes spreadsheet formulas in exported CSV cells", () => {
    const artifacts = artifactsFor([
      {
        ...baseRecord,
        tradingName: "=HYPERLINK(\"https://example.test\")",
        signerName: "+SUM(1,1)"
      }
    ]);

    expect(artifacts.chaseTrackerCsv).toContain(
      "\"'=HYPERLINK(\"\"https://example.test\"\")\""
    );
    expect(artifacts.chaseTrackerCsv).toContain("\"'+SUM(1,1)\"");
  });
});
