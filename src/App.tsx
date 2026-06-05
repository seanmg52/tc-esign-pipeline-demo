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
    <div className="pipelineCanvas" role="img" aria-label="Application pipeline from sample data through deterministic evaluator, rendered UI, tests, build, and GitHub Pages deploy.">
      <div className="pipelineChrome">
        <div>
          <span className="chromeDot red" />
          <span className="chromeDot yellow" />
          <span className="chromeDot green" />
        </div>
        <span className="chromeTitle">tc-esign-pipeline-demo / runtime graph</span>
        <span className="chromeStatus">5 synthetic records</span>
      </div>

      <div className="pipelineGrid">
        <PipelineNode
          tone="source"
          eyebrow="Input"
          title="sampleRecords.ts"
          body="Synthetic readiness records. No DocuSign, NZBN, PPSR, customer data, or PII."
          meta={["ReadinessRecord[]", "fake .example emails", "5 demo accounts"]}
        />

        <Connector label="records" />

        <PipelineNode
          tone="compute"
          eyebrow="Evaluator"
          title="Campaign evaluator"
          body="Maps each account through deterministic gates, then aggregates disposition counts."
          meta={["evaluateRecord()", "summary reducer", "pure TypeScript"]}
        />

        <Connector label="fan out" />

        <div className="gateStack" aria-label="Three deterministic gates">
          <PipelineNode tone="gate" eyebrow="Gate A" title="Debtor / PPSR" body="Checks entity status, NZBN presence, and PPSR debtor match." />
          <PipelineNode tone="gate" eyebrow="Gate B" title="Authority / Delivery" body="Checks signer, authority evidence, delivery email, and exposure-sensitive proof." />
          <PipelineNode tone="gate" eyebrow="Gate C" title="Agreement / E-sign" body="Checks template version, collateral clause, coverage, and e-sign eligibility." />
        </div>

        <Connector label="findings" />

        <PipelineNode
          tone="router"
          eyebrow="Router"
          title="Disposition router"
          body="Combines gate status with customer response to classify the account."
          meta={["signed", "human review", "negotiation", "credit-stop", "wet-ink"]}
        />

        <Connector label="view model" />

        <div className="outputStack" aria-label="Rendered outputs">
          <PipelineNode tone="output" eyebrow="UI output" title="Summary cards" body="Counts every disposition and shows campaign shape at a glance." />
          <PipelineNode tone="output" eyebrow="UI output" title="Record cards" body="Shows each account, gate status, findings, and final disposition." />
        </div>
      </div>

      <div className="deployRail">
        <PipelineNode tone="test" eyebrow="Verification" title="Vitest + build" body="pipeline.test.ts proves evaluator behavior; Vite builds the static app." />
        <div className="railLine" />
        <PipelineNode tone="deploy" eyebrow="Publish" title="GitHub Pages" body="deploy.yml runs npm ci, tests, build, then serves dist/ at the public URL." />
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
  tone: "source" | "compute" | "gate" | "router" | "output" | "test" | "deploy";
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
