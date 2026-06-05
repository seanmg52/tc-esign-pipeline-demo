export type DiagramTone = "data" | "control" | "risk" | "human" | "verified" | "proposed";
export type DiagramGroup = "input" | "controls" | "dispositions" | "outputs" | "production";

export interface DiagramNode {
  id: string;
  title: string;
  body: string;
  tone: DiagramTone;
  group: DiagramGroup;
}

export interface DiagramLayer {
  label: string;
  disclaimer: string;
  nodes: DiagramNode[];
}

export const pipelineDiagram: {
  current: DiagramLayer;
  contract: { label: string; items: string[] };
  production: DiagramLayer;
} = {
  current: {
    label: "Implemented now - offline browser decision prototype",
    disclaimer:
      "Uses user-supplied assertions. No external verification, sending, PPSR action, signature verification, or durable evidence storage.",
    nodes: [
      {
        id: "csv",
        title: "Pre-enriched CSV",
        body: "Pasted or uploaded locally; facts may be unverified.",
        tone: "data",
        group: "input"
      },
      {
        id: "validate",
        title: "Parse + validate",
        body: "Checks schema and allowed values before evaluation.",
        tone: "data",
        group: "input"
      },
      {
        id: "a",
        title: "Gate A / A+",
        body: "Entity, capacity, legal identity, and PPSR support.",
        tone: "control",
        group: "controls"
      },
      {
        id: "b",
        title: "Gate B",
        body: "Signer authority and delivery confidence.",
        tone: "control",
        group: "controls"
      },
      {
        id: "c",
        title: "Gate C",
        body: "Template, coverage, collateral clause, and e-sign eligibility.",
        tone: "control",
        group: "controls"
      },
      {
        id: "d",
        title: "Gate D",
        body: "Insolvency, antecedent debt, and related-party risk.",
        tone: "risk",
        group: "controls"
      },
      {
        id: "d-plus",
        title: "Gate D+",
        body: "Produces a remediation recommendation that requires approval.",
        tone: "risk",
        group: "controls"
      },
      {
        id: "e",
        title: "Gate E",
        body: "Guarantee formalities and FTA trading-relationship screen.",
        tone: "control",
        group: "controls"
      },
      {
        id: "reported-signed",
        title: "Reported signed",
        body: "CSV status only; evidence remains unverified.",
        tone: "human",
        group: "dispositions"
      },
      {
        id: "in-chase",
        title: "In chase",
        body: "Clean standard path eligible for a synthetic draft.",
        tone: "verified",
        group: "dispositions"
      },
      {
        id: "review",
        title: "Review paths",
        body: "Human/counsel review, negotiation, credit stop, or wet ink.",
        tone: "human",
        group: "dispositions"
      },
      {
        id: "local-output",
        title: "Local synthetic outputs",
        body: "Draft HTML, chase tracker, exception report, and evidence-status manifest.",
        tone: "data",
        group: "outputs"
      }
    ]
  },
  contract: {
    label: "Decision contract",
    items: [
      "facts + provenance",
      "findings",
      "recommendation",
      "owner",
      "approval status",
      "campaign status",
      "evidence status"
    ]
  },
  production: {
    label: "Required for production - proposed operating model",
    disclaimer: "External and proposed capabilities are not implemented in this repository.",
    nodes: [
      {
        id: "systems",
        title: "Systems of record",
        body: "CRM, ERP, customer, exposure, and credit data.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "enrichment",
        title: "Verified enrichment",
        body: "NZBN, Companies Register, PPSR, source, timestamp, and confidence.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "canonical",
        title: "Canonical readiness record",
        body: "Durable facts, provenance, findings, owners, and evidence references.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "approval",
        title: "Approval checkpoint",
        body: "Counsel, credit, and account-owner authorization.",
        tone: "human",
        group: "production"
      },
      {
        id: "templates",
        title: "Locked templates",
        body: "Counsel-approved terms, variants, and controlled merge fields.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "esign",
        title: "E-sign lifecycle",
        body: "Authentication, consent, send, delivery, reassignment, and provider events.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "chase",
        title: "Chase + escalation",
        body: "Owners, cadence, bounce, refusal, negotiation, and re-entry.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "ppsr",
        title: "PPSR remediation",
        body: "Amend, re-register, create, and capture before/after evidence.",
        tone: "proposed",
        group: "production"
      },
      {
        id: "evidence",
        title: "Evidence packet",
        body: "Agreement, certificate, hashes, approvals, communications, and PPSR proof.",
        tone: "verified",
        group: "production"
      },
      {
        id: "store",
        title: "Access-controlled store",
        body: "RBAC, audit logging, retention, and durable retrieval.",
        tone: "verified",
        group: "production"
      }
    ]
  }
};
