import { describe, expect, it } from "vitest";
import { evaluateCampaign, type ReadinessRecord } from "./pipeline";

const cleanRecord: ReadinessRecord = {
  id: "ACME-001",
  tradingName: "Acme Supply",
  legalEntity: "Acme Supply Limited",
  nzbn: "9429000000001",
  entityStatus: "active",
  ppsrDebtorMatches: true,
  exposureBand: "material",
  proposedSignatory: "Mia Director",
  signatoryRole: "Director",
  authorityEvidence: "director-record",
  deliveryEmail: "mia.director@acme.example",
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

  it("routes entity and authority problems to human review before sending", () => {
    const result = evaluateCampaign([
      {
        ...cleanRecord,
        id: "GROUP-002",
        legalEntity: "Acme Holdings Limited",
        ppsrDebtorMatches: false,
        proposedSignatory: "Sam Manager",
        signatoryRole: "Operations Manager",
        authorityEvidence: "none",
        customerResponse: "not-sent"
      }
    ]);

    const evaluated = result.records[0];

    expect(evaluated.disposition).toBe("human-review");
    expect(evaluated.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Debtor / PPSR",
          status: "flagged",
          findings: expect.arrayContaining(["PPSR debtor does not match verified legal entity"])
        }),
        expect.objectContaining({
          name: "Authority / Delivery",
          status: "flagged",
          findings: expect.arrayContaining(["No authority evidence recorded for proposed signer"])
        })
      ])
    );
  });

  it("separates refusal outcomes from clean signatures", () => {
    const result = evaluateCampaign([
      cleanRecord,
      {
        ...cleanRecord,
        id: "REFUSE-003",
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
