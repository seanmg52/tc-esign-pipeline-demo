# T&C E-sign Pipeline Demo

A small public prototype for the Legal Quants residency T&C / e-sign challenge.

The thesis is simple: the useful answer is not a bulk sender. It is a judgment-led remediation campaign that moves every account to an owned final state: signed and evidenced, negotiated and signed, wet-ink / counsel path, credit-stop review, or residual human review.

![Pipeline diagram](docs/pipeline.svg)

## Diagram And Code

The codebase is the repository. The diagram is checked in at:

`docs/pipeline.svg`

## What It Shows

- A proposed remediation pipeline for Joshua Wong's ~230 no-T&C trade-credit customers.
- Three pre-send gates: entity match, signer authority, and T&C package readiness.
- A light product-style pipeline diagram focused on the business/legal workflow.
- A public code sketch showing how records can be classified without deciding enforceability by AI.

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

## Proposed Pipeline

```txt
~230 no-T&C customers
  -> segment by exposure and enrich with Miseiri / NZBN / PPSR data
  -> Gate A: entity match
  -> Gate B: signer authority
  -> Gate C: T&C package readiness
  -> exception queue for mismatches, authority gaps, negotiation, or wet-ink cases
  -> prefilled envelopes for clean records
  -> chase loop
  -> signed evidence packet and PPSR closeout
```

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
