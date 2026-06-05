import { useMemo, useState, type ChangeEvent } from "react";
import { generateCampaignArtifacts } from "./artifacts";
import {
  OPTIONAL_READINESS_CSV_COLUMNS,
  parseReadinessCsv,
  READINESS_CSV_COLUMNS,
  type CsvValidationError
} from "./importCsv";
import { evaluateCampaign, type Disposition, type EvaluatedRecord, type ReadinessRecord } from "./pipeline";
import { pipelineDiagram, type DiagramNode } from "./pipelineDiagram";
import { sampleRecords } from "./sampleRecords";
import "./styles.css";

const dispositionLabels: Record<Disposition, string> = {
  "reported-signed": "Reported signed",
  "human-review": "Human review",
  "in-chase": "In chase loop",
  negotiation: "Negotiation",
  "credit-stop-review": "Credit-stop review",
  "wet-ink-or-counsel": "Wet-ink / counsel"
};

const dispositionNotes: Record<Disposition, string> = {
  "reported-signed": "Imported signed status; provider evidence is not verified.",
  "human-review": "A gate flagged before the envelope should move.",
  "in-chase": "Sent or viewed, but not yet assented.",
  negotiation: "Commercial or legal variance requested.",
  "credit-stop-review": "Customer refused; business must decide whether to keep supplying.",
  "wet-ink-or-counsel": "E-sign is excluded or too risky for automated flow."
};

const sampleCsv = [
  [...READINESS_CSV_COLUMNS, ...OPTIONAL_READINESS_CSV_COLUMNS].join(","),
  [
    "SYN-101",
    "Example Timber",
    "Example Timber Limited",
    "9429000001101",
    "F000101",
    "material",
    "Casey Director",
    "Director",
    "casey.director@example-timber.example",
    "director-record",
    "tc-v4",
    "future-and-existing",
    "true",
    "active",
    "true",
    "verified",
    "true",
    "not-sent",
    "company",
    "1001101",
    "true",
    "low",
    "false",
    "0",
    "false",
    "0",
    "none",
    "true",
    "",
    "300000",
    "false",
    "",
    "",
    "none",
    "signed"
  ].join(",")
].join("\n");

export function App() {
  const [records, setRecords] = useState<ReadinessRecord[]>(sampleRecords);
  const [csvInput, setCsvInput] = useState(sampleCsv);
  const [sourceLabel, setSourceLabel] = useState("Using bundled synthetic example data");
  const [validationErrors, setValidationErrors] = useState<CsvValidationError[]>([]);
  const evaluation = useMemo(() => evaluateCampaign(records), [records]);
  const artifacts = useMemo(() => generateCampaignArtifacts(evaluation.records), [evaluation.records]);

  function useBundledSample() {
    setRecords(sampleRecords);
    setValidationErrors([]);
    setSourceLabel("Using bundled synthetic example data");
  }

  function importCsv(input: string, label: string) {
    const result = parseReadinessCsv(input);
    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      setSourceLabel("CSV validation failed; current evaluated records are unchanged");
      return;
    }

    setRecords(result.records);
    setValidationErrors([]);
    setSourceLabel(
      `Loaded ${result.records.length} local CSV ${result.records.length === 1 ? "record" : "records"} from ${label}`
    );
    setCsvInput(input);
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      importCsv(String(reader.result ?? ""), `Uploaded ${file.name}`);
    });
    reader.readAsText(file);
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Offline BYO-data MVP</p>
        <h1>T&C e-sign remediation pipeline</h1>
        <p className="lede">
          A local-only demo for Joshua's no-signed-T&C problem. Bring your own pre-enriched readiness CSV,
          validate it in the browser, run deterministic workflow gates, and download synthetic draft artifacts
          for review.
        </p>
        <div className="heroActions">
          <a href="#data">Load CSV</a>
          <a href="#diagram">View pipeline</a>
          <a href="#records">Inspect records</a>
          <a href="#artifacts">Download artifacts</a>
        </div>
      </section>

      <section id="data" className="panel dataPanel" aria-labelledby="data-title">
        <div className="sectionHeader">
          <p className="eyebrow">Local data source</p>
          <h2 id="data-title">Paste or upload a readiness CSV</h2>
          <p>
            The app starts with bundled synthetic example data. Pasted or uploaded CSV content is parsed in
            this browser session only. The CSV must already contain the enrichment facts the gates evaluate;
            invalid rows show validation errors before any gate evaluation changes.
          </p>
        </div>
        <div className="sourceStatus">{sourceLabel}</div>
        <div className="inputGrid">
          <label className="csvBox">
            <span>CSV input</span>
            <textarea
              value={csvInput}
              onChange={(event) => setCsvInput(event.target.value)}
              spellCheck={false}
              aria-label="Readiness CSV input"
            />
          </label>
          <div className="sourceControls">
            <button type="button" onClick={() => importCsv(csvInput, "Pasted CSV")}>
              Use pasted CSV
            </button>
            <label className="uploadButton">
              Upload CSV locally
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
            </label>
            <button type="button" className="secondaryButton" onClick={useBundledSample}>
              Use bundled synthetic data
            </button>
            <p>
              Required columns: <code>{READINESS_CSV_COLUMNS.join(", ")}</code>
            </p>
          </div>
        </div>
        {validationErrors.length > 0 && <ValidationErrors errors={validationErrors} />}
      </section>

      <section id="diagram" className="panel diagramPanel" aria-labelledby="diagram-title">
        <div>
          <p className="eyebrow">Runtime pipeline</p>
          <h2 id="diagram-title">Pipeline diagram</h2>
          <p>
            The upper layer shows what this browser prototype implements. The lower layer shows the verified
            enrichment, approvals, e-sign operations, PPSR remediation, and evidence controls required for
            production.
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
          <p className="eyebrow">Gate findings and dispositions</p>
          <h2 id="records-title">What the deterministic evaluator sees</h2>
          <p>
            Each record shows its final disposition plus every gate finding. Validation errors stay above this
            section so malformed CSV never silently becomes an evaluated record.
          </p>
        </div>
        <div className="recordGrid">
          {evaluation.records.map((record) => (
            <RecordCard key={record.customerId} record={record} />
          ))}
        </div>
      </section>

      <section id="artifacts" className="panel" aria-labelledby="artifacts-title">
        <div className="sectionHeader">
          <p className="eyebrow">Phase 3 outputs</p>
          <h2 id="artifacts-title">Download generated artifacts</h2>
          <p>
            Downloads are generated from the currently evaluated records in memory. Draft text is synthetic and
            non-legal; trackers and reports are local CSV files for review.
          </p>
        </div>
        <ArtifactDownloads artifacts={artifacts} />
      </section>

      <section className="panel caveat">
        <h2>What this is, and is not</h2>
        <p>
          This demo is offline and bring-your-own-data. It is not a live sender and does not connect to
          Miseiri, PPSR, DocuSign, email, or any customer system. Bundled records and sample artifacts are
          synthetic.
        </p>
      </section>
    </main>
  );
}

function ValidationErrors({ errors }: { errors: CsvValidationError[] }) {
  return (
    <div className="validationBox" role="alert">
      <h3>Validation errors</h3>
      <ul>
        {errors.map((error, index) => (
          <li key={`${error.row ?? "header"}-${error.column}-${index}`}>
            {error.row ? `Row ${error.row}, ` : ""}
            {error.column}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordCard({ record }: { record: EvaluatedRecord }) {
  return (
    <article className="recordCard">
      <div className="recordTopline">
        <div>
          <h3>{record.tradingName}</h3>
          <p>{record.legalName}</p>
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
            {record.signerName}, {record.signerRole}
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
            {gate.findings.length > 0 && (
              <p>
                {gate.findings
                  .map((finding) => `${finding.message} Next: ${finding.recommendedNextAction}`)
                  .join(" ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

function ArtifactDownloads({ artifacts }: { artifacts: ReturnType<typeof generateCampaignArtifacts> }) {
  const csvDownloads = [
    {
      filename: "chase-tracker.csv",
      label: "Chase tracker",
      description: "Clean in-chase records ready for offline review.",
      content: artifacts.chaseTrackerCsv
    },
    {
      filename: "exception-report.csv",
      label: "Exception report",
      description: "Gate findings and non-sendable dispositions.",
      content: artifacts.exceptionReportCsv
    },
    {
      filename: "evidence-manifest.csv",
      label: "Evidence manifest",
      description: "Evidence-status rows only when evidence is independently complete.",
      content: artifacts.evidenceManifestCsv
    }
  ];

  return (
    <div className="artifactGrid">
      <article className="artifactCard">
        <h3>Prefilled drafts</h3>
        <p>{artifacts.termsDrafts.length} clean draft{artifacts.termsDrafts.length === 1 ? "" : "s"} generated.</p>
        <div className="downloadList">
          {artifacts.termsDrafts.length === 0 ? (
            <span>No clean in-chase records in the current evaluation.</span>
          ) : (
            artifacts.termsDrafts.map((draft) => (
              <a
                key={draft.filename}
                href={downloadHref(draft.content, draft.contentType)}
                download={draft.filename}
              >
                {draft.filename}
              </a>
            ))
          )}
        </div>
      </article>
      {csvDownloads.map((download) => (
        <article key={download.filename} className="artifactCard">
          <h3>{download.label}</h3>
          <p>{download.description}</p>
          <a href={downloadHref(download.content, "text/csv")} download={download.filename}>
            {download.filename}
          </a>
        </article>
      ))}
    </div>
  );
}

function downloadHref(content: string, contentType: string): string {
  return `data:${contentType};charset=utf-8,${encodeURIComponent(content)}`;
}

function PipelineDiagram() {
  const currentInputs = pipelineDiagram.current.nodes.filter((node) => node.group === "input");
  const controls = pipelineDiagram.current.nodes.filter((node) => node.group === "controls");
  const dispositions = pipelineDiagram.current.nodes.filter((node) => node.group === "dispositions");
  const outputs = pipelineDiagram.current.nodes.filter((node) => node.group === "outputs");

  return (
    <div
      className="pipelineCanvas twoLayerDiagram"
      role="img"
      aria-label="Two-layer pipeline diagram separating the implemented offline decision prototype from the proposed production remediation operating model."
    >
      <div className="pipelineChrome">
        <div>
          <span className="chromeDot red" />
          <span className="chromeDot yellow" />
          <span className="chromeDot green" />
        </div>
        <span className="chromeTitle">T&C remediation decision architecture</span>
        <span className="chromeStatus">current + target</span>
      </div>

      <section className="diagramLayer currentLayer">
        <div className="diagramLayerHeader">
          <span>Implemented</span>
          <h3>{pipelineDiagram.current.label}</h3>
          <p>{pipelineDiagram.current.disclaimer}</p>
        </div>
        <DiagramRow label="User-asserted input" nodes={currentInputs} />
        <DiagramRow label="Deterministic controls" nodes={controls} />
        <DiagramRow label="Owned dispositions" nodes={dispositions} />
        <DiagramRow label="Local output" nodes={outputs} />
      </section>

      <div className="decisionContract">
        <strong>{pipelineDiagram.contract.label}</strong>
        <div>
          {pipelineDiagram.contract.items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <section className="diagramLayer productionLayer">
        <div className="diagramLayerHeader">
          <span>Proposed</span>
          <h3>{pipelineDiagram.production.label}</h3>
          <p>{pipelineDiagram.production.disclaimer}</p>
        </div>
        <DiagramRow label="Verified operating model" nodes={pipelineDiagram.production.nodes} />
        <p className="loopNote">Exceptions loop back through assigned owners and approval before any customer-facing action.</p>
      </section>

      <div className="diagramLegend" aria-label="Diagram legend">
        <span><i className="legendSwatch data" /> Data / automation</span>
        <span><i className="legendSwatch control" /> Deterministic control</span>
        <span><i className="legendSwatch risk" /> Legal / risk branch</span>
        <span><i className="legendSwatch human" /> Human checkpoint</span>
        <span><i className="legendSwatch verified" /> Externally verified completion</span>
        <span><i className="legendSwatch proposed" /> Proposed capability</span>
      </div>
    </div>
  );
}

function DiagramRow({ label, nodes }: { label: string; nodes: DiagramNode[] }) {
  return (
    <div className="diagramRow">
      <span className="diagramRowLabel">{label}</span>
      <div className="diagramNodeGrid">
        {nodes.map((node, index) => (
          <div className="diagramNodeWithArrow" key={node.id}>
            <article className={`diagramNode ${node.tone}`}>
              <strong>{node.title}</strong>
              <p>{node.body}</p>
            </article>
            {index < nodes.length - 1 && <span className="diagramArrow" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
