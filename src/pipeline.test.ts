import { describe, expect, it } from "vitest";
import { evaluateCampaign, type ReadinessRecord } from "./pipeline";

const cleanRecord: ReadinessRecord = {
  customerId: "ACME-001",
  tradingName: "Acme Supply",
  legalName: "Acme Supply Limited",
  nzbn: "9429000000001",
  ppsrRegistrationNumber: "F000001",
  entityStatus: "active",
  ppsrDebtorMatches: true,
  exposureBand: "material",
  signerName: "Mia Director",
  signerRole: "Director",
  signerEmail: "mia.director@acme.example",
  authorityEvidence: "director-record",
  emailConfidence: "verified",
  templateVersion: "tc-v4",
  collateralClauseApproved: true,
  coverage: "future-and-existing",
  eSignEligible: true,
  customerResponse: "signed"
};

describe("evaluateCampaign", () => {
  it("marks a fully verified signed record as signed and evidenced", () => {
    const result = evaluateCampaign([cleanRecord]);

    expect(result.records[0].disposition).toBe("signed-evidenced");
    expect(result.records[0].gates.every((gate) => gate.status === "clear")).toBe(true);
    expect(result.summary["signed-evidenced"]).toBe(1);
  });

  it("returns structured findings for a PPSR debtor mismatch", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "GROUP-002",
        legalName: "Acme Holdings Limited",
        ppsrDebtorMatches: false,
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate A - Entity / PPSR",
          status: "flagged",
          findings: expect.arrayContaining([
            {
              severity: "blocker",
              code: "PPSR_DEBTOR_MISMATCH",
              message: "PPSR debtor does not match the verified legal entity.",
              recommendedNextAction: "Verify the debtor record before sending standard T&Cs."
            }
          ])
        })
      ])
    );
  });

  it("flags weak authority evidence for a material account", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "AUTH-004",
        signerName: "Sam Manager",
        signerRole: "Operations Manager",
        authorityEvidence: "account-owner-confirmed",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate B - Signer Authority",
          status: "flagged",
          findings: expect.arrayContaining([
            {
              severity: "review",
              code: "AUTHORITY_WEAK_FOR_MATERIAL_ACCOUNT",
              message: "Material accounts need stronger authority evidence than account-owner confirmation.",
              recommendedNextAction: "Collect director, delegated authority, customer certificate, or legal-approved evidence."
            }
          ])
        })
      ])
    );
  });

  it("routes e-sign ineligible records to wet-ink or counsel", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "WET-005",
        eSignEligible: false,
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("wet-ink-or-counsel");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate C - T&C Package",
          status: "flagged",
          findings: expect.arrayContaining([
            {
              severity: "blocker",
              code: "ESIGN_INELIGIBLE",
              message: "Record is not eligible for the e-sign path.",
              recommendedNextAction: "Route to wet-ink signature or counsel review before proceeding."
            }
          ])
        })
      ])
    );
  });

  it("auto-sends clean records that have not yet been sent", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "SEND-006",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("in-chase");
    expect(evaluated.gates).toHaveLength(5);
    expect(evaluated.gates).toEqual([
      { name: "Gate A - Entity / PPSR", status: "clear", findings: [] },
      { name: "Gate B - Signer Authority", status: "clear", findings: [] },
      { name: "Gate C - T&C Package", status: "clear", findings: [] },
      { name: "Gate D - Insolvency / Clawback", status: "clear", findings: [] },
      { name: "Gate E - Guarantee / FTA", status: "clear", findings: [] }
    ]);
  });

  it("routes trust debtors to human review", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "TRUST-008",
        debtorType: "trust",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate A - Entity / PPSR",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "DEBTOR_TYPE_REQUIRES_HUMAN_REVIEW" })
          ])
        })
      ])
    );
  });

  it("routes elevated insolvency with existing-only coverage to future-supply-only via remediation router", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "CLAW-009",
        coverage: "existing-only",
        insolvencyRisk: "elevated",
        legacyBalanceNzd: 45_000,
        commerciallyWorthRemediating: true,
        restrictedPeriodIndicator: "unrelated",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("in-chase");
    expect(evaluated.insolvencyRemediation.path).toBe("future-supply-only");
    expect(evaluated.insolvencyRemediation.templateVariantId).toBe("tc-v4-future-supply-only");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate D - Insolvency / Clawback",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "INSOLVENCY_RISK_ELEVATED" }),
            expect.objectContaining({ code: "ANTECEDENT_DEBT_CLAWBACK_RISK" })
          ])
        })
      ])
    );
  });

  it("flags unsigned PPSR registrations that need signature chase", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "PPSR-010",
        securityAgreementStatus: "unsigned",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate A - Entity / PPSR",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "PPSR_UNSUPPORTED_REGISTRATION" })
          ])
        })
      ])
    );
  });

  it("flags wrong-entity PPSR corrections for re-registration", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "REREG-011",
        ppsrCorrectionType: "re-register-wrong-entity",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate A - Entity / PPSR",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "PPSR_WRONG_ENTITY_REREGISTER" })
          ])
        })
      ])
    );
  });

  it("flags personal guarantees missing guarantor details", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "GUAR-012",
        hasPersonalGuarantee: true,
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate E - Guarantee / FTA",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "GUARANTOR_MISSING" })
          ])
        })
      ])
    );
  });

  it("flags sub-250k contracts for FTA unfair-terms review", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        customerId: "FTA-013",
        annualContractValueNzd: 120_000,
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate E - Guarantee / FTA",
          status: "flagged",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "FTA_UNFAIR_TERMS_REVIEW" })
          ])
        })
      ])
    );
  });

  it("requires explicit gate facts rather than assuming unknown values are safe", () => {
    const result = evaluateCampaign([
      {
        customerId: "UNKNOWN-007",
        tradingName: "Unknown Supply",
        legalName: "Unknown Supply Limited",
        nzbn: "9429000000007",
        ppsrRegistrationNumber: "F000007",
        exposureBand: "material",
        signerName: "Uma Manager",
        signerRole: "Manager",
        signerEmail: "uma.manager@unknown.example",
        authorityEvidence: "delegated-authority",
        templateVersion: "tc-v4",
        coverage: "future-and-existing",
        eSignEligible: true
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Gate A - Entity / PPSR",
          findings: expect.arrayContaining([
            expect.objectContaining({ code: "ENTITY_STATUS_UNKNOWN" }),
            expect.objectContaining({ code: "PPSR_DEBTOR_MATCH_UNKNOWN" })
          ])
        }),
        expect.objectContaining({
          name: "Gate B - Signer Authority",
          findings: expect.arrayContaining([expect.objectContaining({ code: "DELIVERY_EMAIL_CONFIDENCE_UNKNOWN" })])
        }),
        expect.objectContaining({
          name: "Gate C - T&C Package",
          findings: expect.arrayContaining([expect.objectContaining({ code: "COLLATERAL_CLAUSE_APPROVAL_UNKNOWN" })])
        })
      ])
    );
  });

  it("separates refusal outcomes from clean signatures", () => {
    const result = evaluateCampaign([
      cleanRecord,
      {
        ...cleanRecord,
        customerId: "REFUSE-003",
        customerResponse: "refused",
        exposureBand: "low"
      }
    ]);

    expect(result.records.map((record) => record.disposition)).toEqual([
      "signed-evidenced",
      "credit-stop-review"
    ]);
    expect(result.summary["signed-evidenced"]).toBe(1);
    expect(result.summary["credit-stop-review"]).toBe(1);
  });
});
