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
            The yellow zone is the owned workflow: data model, gates, and human exceptions. The orange path
            is where a narrow tool is allowed to do commodity work. The gray diamond is the hardening gate.
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
    <svg className="pipelineSvg" viewBox="0 0 820 900" role="img" aria-labelledby="pipeline-title pipeline-desc">
      <title id="pipeline-title">Judgment-led e-sign remediation pipeline</title>
      <desc id="pipeline-desc">
        A flow chart beginning with judgment, moving through a pilot and owned verification gates, then through
        narrow e-sign tooling, evidence packets, and hardening.
      </desc>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      <path className="flow" d="M410 96 C230 120 190 235 255 330" />
      <path className="flow" d="M410 96 C600 130 645 230 585 335" />
      <path className="flow" d="M235 430 C150 535 185 665 330 720" />
      <path className="flow" d="M590 430 C680 555 630 700 470 735" />
      <path className="flow" d="M410 775 C410 820 410 840 410 862" />
      <path className="flow thin" d="M680 78 C760 210 760 610 510 785" />

      <rect className="ownedZone" x="95" y="270" width="350" height="360" rx="8" />
      <text className="zoneLabel" x="120" y="300">owned workflow: small, portable, inspectable</text>

      <g transform="translate(410 90)">
        <polygon className="judgment" points="0,-78 90,0 0,78 -90,0" />
        <text className="nodeText light" textAnchor="middle">
          <tspan x="0" y="-16">JUDGMENT decides</tspan>
          <tspan x="0" y="4">what should be built</tspan>
          <tspan x="0" y="24">and what should not</tspan>
        </text>
      </g>

      <g transform="translate(680 70)">
        <rect className="note blue" x="-88" y="-34" width="176" height="68" rx="4" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">Start from a real problem,</tspan>
          <tspan x="0" y="12">not the plumbing</tspan>
        </text>
      </g>

      <g transform="translate(250 210)">
        <polygon className="diamond lavender" points="0,-72 82,0 0,72 -82,0" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-12">Pilot 25-40 accounts.</tspan>
          <tspan x="0" y="8">Is automation worth it?</tspan>
          <tspan x="0" y="28">Measure exception rate.</tspan>
        </text>
      </g>

      <g transform="translate(250 400)">
        <polygon className="diamond lavender" points="0,-62 75,0 0,62 -75,0" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-10">Gate A/B/C:</tspan>
          <tspan x="0" y="10">debtor, authority,</tspan>
          <tspan x="0" y="30">content + e-sign</tspan>
        </text>
      </g>

      <g transform="translate(220 555)">
        <rect className="note green" x="-102" y="-42" width="204" height="84" rx="4" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-12">Own the readiness record,</tspan>
          <tspan x="0" y="8">exceptions, and evidence.</tspan>
          <tspan x="0" y="28">Not the platform.</tspan>
        </text>
      </g>

      <g transform="translate(575 380)">
        <rect className="note orange" x="-112" y="-54" width="224" height="108" rx="4" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-18">Only now use a narrow tool:</tspan>
          <tspan x="0" y="2">locked envelope, reminders,</tspan>
          <tspan x="0" y="22">audit trail, no legal drafting</tspan>
        </text>
      </g>

      <g transform="translate(575 555)">
        <rect className="note orange" x="-116" y="-48" width="232" height="96" rx="4" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-12">Chase loop produces</tspan>
          <tspan x="0" y="8">signed, negotiated, refused,</tspan>
          <tspan x="0" y="28">or counsel-routed accounts</tspan>
        </text>
      </g>

      <g transform="translate(410 735)">
        <polygon className="diamond gray" points="0,-78 92,0 0,78 -92,0" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-14">Useful and proven?</tspan>
          <tspan x="0" y="6">Then harden.</tspan>
          <tspan x="0" y="26">Otherwise stop.</tspan>
        </text>
      </g>

      <g transform="translate(410 860)">
        <rect className="note white" x="-118" y="-34" width="236" height="68" rx="4" />
        <text className="nodeText" textAnchor="middle">
          <tspan x="0" y="-8">Ship: the lawyer owns</tspan>
          <tspan x="0" y="12">the output and evidence</tspan>
        </text>
      </g>
    </svg>
  );
}
