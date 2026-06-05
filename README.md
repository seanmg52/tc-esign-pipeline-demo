# T&C E-sign Pipeline Demo

A small public prototype for the Legal Quants residency T&C / e-sign challenge.

The thesis is simple: the useful answer is not a bulk sender. It is a judgment-led remediation campaign that moves every account to an owned final state: signed and evidenced, negotiated and signed, wet-ink / counsel path, credit-stop review, or residual human review.

![Pipeline diagram](docs/pipeline.svg)

## Live Demo

After GitHub Pages deploys, the demo is available at:

`https://seanmg52.github.io/tc-esign-pipeline-demo/`

Standalone pipeline diagram:

`https://seanmg52.github.io/tc-esign-pipeline-demo/pipeline.svg`

## What It Shows

- A deterministic readiness-record evaluator.
- Three pre-send gates: debtor / PPSR, authority / delivery, and agreement / e-sign.
- Synthetic sample records that route to different campaign dispositions.
- A pipeline diagram in the "judgment before plumbing" style.
- A public architecture where AI can assist classification and drafting, but cannot decide enforceability.

## What It Does Not Do

This prototype does not integrate with DocuSign, NZBN, the PPSR, or any customer system. It uses synthetic data only. The point is to demonstrate the architecture: own the legal judgment gates, buy the signature ceremony, and preserve the evidence packet.

Nothing here is legal advice.

## Run Locally

```bash
npm install
npm test
npm run build
npm run dev
```

## Application Pipeline

```txt
sampleRecords.ts -> evaluateCampaign(records)
  -> evaluateRecord(record)
    -> Debtor / PPSR gate
    -> Authority / Delivery gate
    -> Agreement / E-sign gate
    -> chooseDisposition(record, hasGateFlag)
  -> summary counts by disposition
  -> React renders summary cards, record cards, and pipeline SVG
  -> GitHub Actions runs tests/build and deploys dist/ to Pages
```

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- GitHub Pages
