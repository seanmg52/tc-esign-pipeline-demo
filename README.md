# T&C E-sign Pipeline Demo

A small public prototype for the Legal Quants residency T&C / e-sign challenge.

The thesis is simple: the useful answer is not a bulk sender. It is a judgment-led remediation campaign that moves every account to an owned final state: signed and evidenced, negotiated and signed, wet-ink / counsel path, credit-stop review, or residual human review.

![Pipeline diagram](docs/pipeline.svg)

## Live Demo

After GitHub Pages deploys, the demo is available at:

`https://seanmg52.github.io/tc-esign-pipeline-demo/`

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

## Core Idea

```txt
Pilot first -> readiness record -> debtor/PPSR gate -> authority gate
-> agreement/e-sign gate -> locked envelope -> chase loop
-> evidence packet / PPSR action / final disposition
```

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- GitHub Pages
