import { evaluateCampaign, type Disposition, type EvaluatedRecord } from "./pipeline";
import { sampleRecords } from "./sampleRecords";
import "./styles.css";

const evaluation = evaluateCampaign(sampleRecords);

const dispositionLabels: Record<Disposition, string> = {
  "signed-evidenced": "Signed + evidenced",
  "human-review": "Human review",
  "in-chase": "In chase loop",
  negotiation: "Negotiation",
  "credit-stop-review": "Credit-stop review",
  "wet-ink-or-counsel": "Wet-ink / counsel"
};

const dispositionNotes: Record<Disposition, string> = {
  "signed-evidenced": "Correct debtor, authority evidence, signed terms, audit packet.",
  "human-review": "A gate flagged before the envelope should move.",
  "in-chase": "Sent or viewed, but not yet assented.",
  negotiation: "Commercial or legal variance requested.",
  "credit-stop-review": "Customer refused; business must decide whether to keep supplying.",
  "wet-ink-or-counsel": "E-sign is excluded or too risky for automated flow."
};

export function App() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Legal Quants residency prototype</p>
        <h1>T&C e-sign remediation pipeline</h1>
        <p className="lede">
          A small public demo showing how the real answer is not a bulk sender. The useful system turns each
          account into a final, owned disposition: signed evidence, negotiation, wet-ink/counsel path,
          credit-stop review, or residual human review.
        </p>
        <div className="heroActions">
          <a href="#diagram">View pipeline</a>
          <a href="#records">Inspect records</a>
        </div>
      </section>

      <section id="diagram" className="panel diagramPanel" aria-labelledby="diagram-title">
        <div>
          <p className="eyebrow">Runtime pipeline</p>
          <h2 id="diagram-title">Pipeline diagram</h2>
          <p>
            This is the application pipeline: synthetic readiness records enter the deterministic evaluator,
            each gate produces findings, disposition logic classifies every account, and React renders the
            summary cards, record cards, and this diagram.
          </p>
        </div>
        <PipelineDiagram />
      </section>

      <section className="summaryGrid" aria-label="Campaign summary">
        {Object.entries(evaluation.summary).map(([disposition, count]) => (
          <article key={disposition} className={`summaryCard ${disposition}`}>
            <strong>{count}</strong>
            <span>{dispositionLabels[disposition as Disposition]}</span>
            <p>{dispositionNotes[disposition as Disposition]}</p>
          </article>
        ))}
      </section>

      <section id="records" className="panel" aria-labelledby="records-title">
        <div className="sectionHeader">
          <p className="eyebrow">Synthetic readiness records</p>
          <h2 id="records-title">What the deterministic evaluator sees</h2>
        </div>
        <div className="recordGrid">
          {evaluation.records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      </section>

      <section className="panel caveat">
        <h2>What this is, and is not</h2>
        <p>
          This demo uses synthetic records and stubbed integrations. It does not call DocuSign, NZBN, or the
          PPSR. The point is the architecture: own the legal judgment gates, buy the signing ceremony, and
          keep humans exactly where evidence and authority matter.
        </p>
      </section>
    </main>
  );
}

function RecordCard({ record }: { record: EvaluatedRecord }) {
  return (
    <article className="recordCard">
      <div className="recordTopline">
        <div>
          <h3>{record.tradingName}</h3>
          <p>{record.legalEntity}</p>
        </div>
        <span className={`badge ${record.disposition}`}>{dispositionLabels[record.disposition]}</span>
      </div>
      <dl>
        <div>
          <dt>Exposure</dt>
          <dd>{record.exposureBand}</dd>
        </div>
        <div>
          <dt>Signer</dt>
          <dd>
            {record.proposedSignatory}, {record.signatoryRole}
          </dd>
        </div>
        <div>
          <dt>Response</dt>
          <dd>{record.customerResponse}</dd>
        </div>
      </dl>
      <ul className="gateList">
        {record.gates.map((gate) => (
          <li key={gate.name} className={gate.status}>
            <span>{gate.name}</span>
            <strong>{gate.status}</strong>
            {gate.findings.length > 0 && <p>{gate.findings.join("; ")}</p>}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PipelineDiagram() {
  return (
    <div className="pipelineCanvas" role="img" aria-label="Pipeline for taking 230 no-T&C trade-credit customers through enrichment, verification, prefill, e-sign routing, chase, and evidence closeout.">
      <div className="pipelineChrome">
        <div>
          <span className="chromeDot red" />
          <span className="chromeDot yellow" />
          <span className="chromeDot green" />
        </div>
        <span className="chromeTitle">230-customer T&C signature pipeline</span>
        <span className="chromeStatus">NZ trade credit</span>
      </div>

      <div className="pipelineGrid">
        <PipelineNode
          tone="source"
          eyebrow="Starting batch"
          title="~230 customers"
          body="Existing trade-credit customers with no signed T&Cs on file after the 800-to-230 cleanup."
          meta={["lower exposure", "existing accounts", "no T&Cs"]}
        />

        <Connector label="scope" />

        <PipelineNode
          tone="compute"
          eyebrow="Prepare"
          title="Segment + enrich"
          body="Use exposure bands, Miseiri/NZBN data, contact details, and PPSR references to create a readiness record."
          meta={["Miseiri", "NZBN", "PPSR refs"]}
        />

        <Connector label="readiness" />

        <div className="gateStack" aria-label="Pre-send verification gates">
          <PipelineNode tone="gate" eyebrow="Gate A" title="Entity match" body="Canonical legal name, NZBN status, trading-name mismatch, and PPSR debtor alignment." />
          <PipelineNode tone="gate" eyebrow="Gate B" title="Signer authority" body="Named signer, role, delivery email, authority evidence, and escalation tier." />
          <PipelineNode tone="gate" eyebrow="Gate C" title="T&C package" body="Locked standard terms, approved merge fields, security clause, and e-sign eligibility." />
        </div>

        <Connector label="exceptions" />

        <PipelineNode
          tone="router"
          eyebrow="Route"
          title="Exception queue"
          body="Auto-send clean records; route mismatches, authority gaps, negotiation, or wet-ink cases to humans."
          meta={["auto-send", "human review", "wet-ink"]}
        />

        <Connector label="campaign" />

        <div className="outputStack" aria-label="Campaign outputs">
          <PipelineNode tone="output" eyebrow="Send" title="Prefilled envelopes" body="Generate standard T&Cs with verified customer details and route for online signature." />
          <PipelineNode tone="output" eyebrow="Operate" title="Chase loop" body="Track opened, signed, refused, negotiated, bounced, and non-responsive accounts." />
          <PipelineNode tone="output" eyebrow="Close" title="Evidence + PPSR" body="Store signed agreement and audit trail; link or remediate PPSR records where needed." />
        </div>
      </div>
    </div>
  );
}

function PipelineNode({
  tone,
  eyebrow,
  title,
  body,
  meta = []
}: {
  tone: "source" | "compute" | "gate" | "router" | "output";
  eyebrow: string;
  title: string;
  body: string;
  meta?: string[];
}) {
  return (
    <article className={`pipelineNode ${tone}`}>
      <span className="nodeEyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      {meta.length > 0 && (
        <div className="nodeMeta">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="connector" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
