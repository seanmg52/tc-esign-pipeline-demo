import { useMemo, useState, type ChangeEvent } from "react";
import { generateCampaignArtifacts } from "./artifacts";
import { parseReadinessCsv, READINESS_CSV_COLUMNS, type CsvValidationError } from "./importCsv";
import { evaluateCampaign, type Disposition, type EvaluatedRecord, type ReadinessRecord } from "./pipeline";
import { sampleRecords } from "./sampleRecords";
import "./styles.css";

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

const sampleCsv = [
  READINESS_CSV_COLUMNS.join(","),
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
    "not-sent"
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
            A pre-enriched user CSV is parsed and validated into readiness records. The deterministic gates
            split clean records from exceptions, then artifact generation creates local drafts, trackers, and
            reports for review.
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
      description: "Signed synthetic records and evidence references.",
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
          eyebrow="Input"
          title="User CSV"
          body="Bundled synthetic data by default, or a locally pasted/uploaded readiness CSV."
          meta={["BYO data", "offline", "synthetic sample"]}
        />

        <Connector label="scope" />

        <PipelineNode
          tone="compute"
          eyebrow="Parse"
          title="Parse + validate"
          body="Check required columns and allowed values before any readiness gates run."
          meta={["CSV schema", "row errors", "no network"]}
        />

        <Connector label="readiness" />

        <div className="gateStack" aria-label="Pre-send verification gates">
          <PipelineNode tone="gate" eyebrow="Records" title="Readiness records" body="Validated rows become the deterministic input record for each account." />
          <PipelineNode tone="gate" eyebrow="Gates" title="Entity + authority + T&C" body="Findings identify blockers and review items before any draft is generated." />
          <PipelineNode tone="gate" eyebrow="Disposition" title="Final state" body="Each account lands in chase, signed evidence, negotiation, credit-stop, wet-ink, or review." />
        </div>

        <Connector label="exceptions" />

        <PipelineNode
          tone="router"
          eyebrow="Route"
          title="Clean / exception split"
          body="Clean records feed local draft generation; flagged or non-sendable records move to the exception queue."
          meta={["clean records", "exception queue", "human review"]}
        />

        <Connector label="campaign" />

        <div className="outputStack" aria-label="Campaign outputs">
          <PipelineNode tone="output" eyebrow="Draft" title="Prefilled drafts" body="Generate local synthetic HTML drafts for clean in-chase records." />
          <PipelineNode tone="output" eyebrow="Track" title="Chase tracker" body="Export local CSVs for chase work, exception review, and evidence manifesting." />
          <PipelineNode tone="output" eyebrow="Report" title="Exception + evidence" body="Download the exception report and evidence manifest for human review." />
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
