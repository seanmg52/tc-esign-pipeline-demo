import type { Coverage, ReadinessRecord } from "./pipeline";

export type InsolvencyRemediationPath =
  | "standard-coverage"
  | "future-supply-only"
  | "new-value-contemporaneous"
  | "credit-stop"
  | "residual-risk-approved"
  | "counsel-restructure";

export type RestrictedPeriodIndicator = "none" | "unrelated" | "related-party" | "unknown";
export type ClawbackRiskResidual = "low" | "material" | "high";

export interface InsolvencyRemediation {
  path: InsolvencyRemediationPath;
  templateVariantId: string;
  coverageEffective: Coverage;
  collateralScopeNote: string;
  evidenceChecklist: string[];
  counselRequired: boolean;
  clawbackRiskResidual: ClawbackRiskResidual;
  rationale: string;
}

const COUNSEL_RESTRUCTURE_PACKET: Pick<
  InsolvencyRemediation,
  "templateVariantId" | "coverageEffective" | "collateralScopeNote" | "evidenceChecklist" | "counselRequired" | "clawbackRiskResidual"
> = {
  templateVariantId: "counsel-review-packet",
  coverageEffective: "counsel-review",
  collateralScopeNote: "Coverage and collateral scope require counsel determination before any envelope is sent.",
  evidenceChecklist: [
    "Readiness record snapshot with all insolvency fields populated",
    "Gate D finding codes and detection rationale",
    "Legacy balance and related-party analysis",
    "Proposed remediation path options for counsel sign-off",
    "PPSR registration status and correction type"
  ],
  counselRequired: true,
  clawbackRiskResidual: "high"
};

function coverageIncludesExisting(coverage: Coverage): boolean {
  return coverage === "existing-only" || coverage === "future-and-existing";
}

function counselApprovedNewValueTemplate(record: ReadinessRecord): boolean {
  const approvedVariants = ["tc-v4-new-value-contemporaneous", "tc-v4-future-and-existing-conditioned"];
  return approvedVariants.some((variant) => record.templateVersion.includes(variant));
}

export function resolveInsolvencyRemediation(record: ReadinessRecord): InsolvencyRemediation {
  const insolvencyRisk = record.insolvencyRisk ?? "low";
  const relatedParty = record.relatedParty ?? false;
  const restrictedPeriod = record.restrictedPeriodIndicator ?? (relatedParty ? "related-party" : "none");
  const legacyBalance = record.legacyBalanceNzd ?? 0;
  const commerciallyWorth = record.commerciallyWorthRemediating ?? true;

  if (relatedParty) {
    return {
      path: "counsel-restructure",
      ...COUNSEL_RESTRUCTURE_PACKET,
      rationale:
        "CA s 293(1AA) voidable charge for related-party charges in the 2-year related party period (s 293(6)); no automated clearance."
    };
  }

  if (record.residualRiskApprovedBy?.trim()) {
    return {
      path: "residual-risk-approved",
      templateVariantId: "none",
      coverageEffective: record.coverage,
      collateralScopeNote: "Continue trading unsecured; legacy and future supply remain outside perfected security.",
      evidenceChecklist: [
        `Business-owner approval by ${record.residualRiskApprovedBy}`,
        "Residual-risk register entry with exposure amount and review date",
        "Gate D findings retained in evidence packet",
        "Customer notification that no new security grant is in effect"
      ],
      counselRequired: false,
      clawbackRiskResidual: "high",
      rationale:
        "Commercial override documented; unsecured continuation accepts material clawback exposure if liquidation follows."
    };
  }

  if (insolvencyRisk === "unknown") {
    return {
      path: "counsel-restructure",
      ...COUNSEL_RESTRUCTURE_PACKET,
      rationale: "Insolvency risk unknown; fail closed to counsel with pre-built review packet."
    };
  }

  if (insolvencyRisk === "low") {
    return {
      path: "standard-coverage",
      templateVariantId: record.templateVersion || "tc-v4-standard",
      coverageEffective: record.coverage,
      collateralScopeNote: "Standard future-and-existing or future-only coverage; no clawback mitigation carve-out required.",
      evidenceChecklist: [
        "Signed T&C with approved template version",
        "DocuSign certificate and audit trail",
        "PPSR registration linked to signed agreement"
      ],
      counselRequired: false,
      clawbackRiskResidual: "low",
      rationale:
        "Low insolvency risk; CA ss 292–293 restricted-period exposure not engaged on supplied facts. PPSA enforceability path only."
    };
  }

  if (!commerciallyWorth) {
    return {
      path: "credit-stop",
      templateVariantId: "none",
      coverageEffective: record.coverage,
      collateralScopeNote: "No T&C envelope; restrict further supply. Legacy balance remains unsecured.",
      evidenceChecklist: [
        "Credit-team decision record: not worth clawback remediation effort",
        "Credit-stop notice to customer (if applicable)",
        "Account owner sign-off",
        "Gate D findings retained for audit"
      ],
      counselRequired: false,
      clawbackRiskResidual: "material",
      rationale:
        "Elevated insolvency exposure not commercially worth remediating; credit-stop avoids deepening preference/charge risk."
    };
  }

  if (restrictedPeriod === "unknown") {
    return {
      path: "counsel-restructure",
      ...COUNSEL_RESTRUCTURE_PACKET,
      rationale: "Restricted-period indicator unknown; cannot determine 6-month vs 2-year window (CA ss 292(4C), 293(5A), (6))."
    };
  }

  if (coverageIncludesExisting(record.coverage) && record.legacyBalanceNzd === undefined) {
    return {
      path: "counsel-restructure",
      ...COUNSEL_RESTRUCTURE_PACKET,
      rationale:
        "Elevated insolvency with existing-balance coverage but legacy balance unknown; cannot scope carve-out (CA s 293(1A)(a))."
    };
  }

  if (
    record.willExtendNewCredit === true &&
    record.newCreditLimitNzd !== undefined &&
    record.newCreditLimitNzd > 0 &&
    counselApprovedNewValueTemplate(record)
  ) {
    return {
      path: "new-value-contemporaneous",
      templateVariantId: "tc-v4-new-value-contemporaneous",
      coverageEffective: "future-and-existing",
      collateralScopeNote: `Security covers future supply and existing balance only to extent supported by contemporaneous new credit limit of NZD ${record.newCreditLimitNzd.toLocaleString("en-NZ")}; legacy outside limit remains unsecured.`,
      evidenceChecklist: [
        "Signed T&C with credit-limit merge field populated",
        "Credit-limit increase or new supply tranche documented in agreement",
        "Dated proof of first supply or advance after signing",
        "Payment appropriation trail per CA s 293(5) for post-signing value",
        "DocuSign certificate and PPSR linkage"
      ],
      counselRequired: false,
      clawbackRiskResidual: "material",
      rationale:
        "CA s 293(1A)(a) safe harbour for value given at or after the charge; contemporaneous credit limit documents new value. Residual risk on legacy portion above limit."
    };
  }

  if (insolvencyRisk === "elevated") {
    return {
      path: "future-supply-only",
      templateVariantId: "tc-v4-future-supply-only",
      coverageEffective: "future-only",
      collateralScopeNote:
        legacyBalance > 0
          ? `Security limited to goods/services supplied after signing; legacy balance of NZD ${legacyBalance.toLocaleString("en-NZ")} explicitly excluded from collateral and charge scope.`
          : "Security limited to goods/services supplied after signing; no legacy balance on account.",
      evidenceChecklist: [
        "Signed T&C with legacy-exclusion merge fields populated",
        "Separate acknowledgment that pre-signing balance remains unsecured (same or companion envelope)",
        "Dated proof of first invoice/supply after signing",
        "Credit policy record: continued supply after signing only",
        "DocuSign certificate and PPSR linkage"
      ],
      counselRequired: false,
      clawbackRiskResidual: legacyBalance > 0 ? "material" : "low",
      rationale:
        "CA s 293(1A)(a) protects value given at or after the charge; future-supply-only structure excludes antecedent debt from secured scope. CA s 292(4B) running-account aggregation remains a residual risk if relationship treated as single transaction."
    };
  }

  return {
    path: "counsel-restructure",
    ...COUNSEL_RESTRUCTURE_PACKET,
    rationale: "Unhandled insolvency fact pattern; fail closed to counsel."
  };
}
