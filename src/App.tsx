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
          <p className="eyebrow">Judgment before plumbing</p>
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
    <svg className="pipelineSvg" viewBox="0 0 1040 760" role="img" aria-labelledby="pipeline-title pipeline-desc">
      <title id="pipeline-title">Application pipeline for the T&C e-sign demo</title>
      <desc id="pipeline-desc">
        A flow chart showing synthetic readiness records flowing through evaluateCampaign, three gates,
        disposition classification, summary aggregation, and React rendering.
      </desc>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      <rect className="ownedZone" x="32" y="160" width="976" height="376" rx="10" />
      <text className="zoneLabel" x="56" y="194">runtime data pipeline inside this demo app</text>

      <path className="flow" d="M145 300 C205 300 220 300 270 300" />
      <path className="flow" d="M430 300 C484 300 502 250 548 250" />
      <path className="flow" d="M430 300 C484 300 502 300 548 300" />
      <path className="flow" d="M430 300 C484 300 502 350 548 350" />
      <path className="flow" d="M680 250 C720 250 730 286 760 320" />
      <path className="flow" d="M680 300 C724 300 730 308 760 330" />
      <path className="flow" d="M680 350 C720 350 730 344 760 340" />
      <path className="flow" d="M860 330 C910 330 920 270 944 240" />
      <path className="flow" d="M860 330 C920 330 930 330 944 330" />
      <path className="flow" d="M860 330 C910 330 920 390 944 422" />
      <path className="flow thin" d="M360 470 C490 620 665 620 800 470" />
      <path className="flow thin" d="M225 620 C370 690 640 690 820 620" />

      <g transform="translate(130 300)">
        <rect className="note blue" x="-108" y="-64" width="216" height="128" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-28">sampleRecords.ts</tspan>
          <tspan x="0" y="-6">synthetic readiness</tspan>
          <tspan x="0" y="14">records only</tspan>
          <tspan x="0" y="36">no live integrations</tspan>
        </text>
      </g>

      <g transform="translate(350 300)">
        <rect className="note green" x="-96" y="-58" width="192" height="116" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-22">evaluateCampaign()</tspan>
          <tspan x="0" y="0">maps each record</tspan>
          <tspan x="0" y="20">through evaluateRecord()</tspan>
          <tspan x="0" y="40">then counts summary</tspan>
        </text>
      </g>

      <g transform="translate(610 250)">
        <rect className="note white" x="-92" y="-36" width="184" height="72" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">Debtor / PPSR gate</tspan>
          <tspan x="0" y="14">entity + PPSR match</tspan>
        </text>
      </g>

      <g transform="translate(610 300)">
        <rect className="note white" x="-92" y="-36" width="184" height="72" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">Authority gate</tspan>
          <tspan x="0" y="14">signer + delivery proof</tspan>
        </text>
      </g>

      <g transform="translate(610 350)">
        <rect className="note white" x="-92" y="-36" width="184" height="72" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">Agreement gate</tspan>
          <tspan x="0" y="14">terms + e-sign path</tspan>
        </text>
      </g>

      <g transform="translate(815 330)">
        <polygon className="diamond lavender" points="0,-82 96,0 0,82 -96,0" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-28">chooseDisposition()</tspan>
          <tspan x="0" y="-6">gate flag?</tspan>
          <tspan x="0" y="14">customer response?</tspan>
          <tspan x="0" y="34">final state</tspan>
        </text>
      </g>

      <g transform="translate(945 240)">
        <rect className="note orange" x="-82" y="-38" width="164" height="76" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">summary cards</tspan>
          <tspan x="0" y="14">counts by disposition</tspan>
        </text>
      </g>

      <g transform="translate(945 330)">
        <rect className="note orange" x="-82" y="-38" width="164" height="76" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">record cards</tspan>
          <tspan x="0" y="14">gates + findings</tspan>
        </text>
      </g>

      <g transform="translate(945 422)">
        <rect className="note orange" x="-82" y="-38" width="164" height="76" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">pipeline SVG</tspan>
          <tspan x="0" y="14">this visual layer</tspan>
        </text>
      </g>

      <g transform="translate(360 470)">
        <rect className="note gray" x="-116" y="-34" width="232" height="68" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">pipeline.test.ts</tspan>
          <tspan x="0" y="12">verifies evaluator behavior</tspan>
        </text>
      </g>

      <g transform="translate(800 470)">
        <rect className="note gray" x="-116" y="-34" width="232" height="68" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">React render</tspan>
          <tspan x="0" y="12">App.tsx + styles.css</tspan>
        </text>
      </g>

      <g transform="translate(225 620)">
        <rect className="note blue" x="-116" y="-42" width="232" height="84" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-14">GitHub push</tspan>
          <tspan x="0" y="8">deploy.yml runs npm ci,</tspan>
          <tspan x="0" y="30">tests, build</tspan>
        </text>
      </g>

      <g transform="translate(820 620)">
        <rect className="note green" x="-116" y="-42" width="232" height="84" rx="8" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-14">GitHub Pages</tspan>
          <tspan x="0" y="8">serves dist/ at the</tspan>
          <tspan x="0" y="30">public demo URL</tspan>
        </text>
      </g>
    </svg>
  );
}
