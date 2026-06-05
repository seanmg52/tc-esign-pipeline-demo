# Offline T&C Pipeline MVP

A local, bring-your-own-data MVP for the Legal Quants residency T&C / e-sign challenge.

The thesis is simple: the useful answer is not a bulk sender. It is a judgment-led remediation campaign that validates readiness data, runs deterministic gates, and moves every account to an owned final state: signed and evidenced, negotiation, wet-ink / counsel path, credit-stop review, chase, or residual human review.

![Pipeline diagram](docs/pipeline.svg)

## What This Is

This is an offline BYO-data MVP. It runs in the browser on local CSV content that you paste or upload. The bundled example records are synthetic and exist only to show the workflow before you bring your own readiness CSV.

The app parses and validates CSV rows before gate evaluation, shows gate findings and final dispositions, and generates downloadable local artifacts from the evaluated records:

- Prefilled synthetic T&C draft HTML files for clean in-chase records.
- A chase tracker CSV.
- An exception report CSV.
- An evidence manifest CSV.

## What This Is Not

This is not a live sender. It does not send envelopes, messages, emails, notices, or customer communications.

It does not connect to Miseiri, PPSR, DocuSign, email, NZBN, or any customer system. It makes no network calls for customer data. Sample data is synthetic and should not be treated as real customer data or legal terms.

Nothing here is legal advice, a production workflow, or a counsel-approved T&C template.

## Run Locally

```bash
npm install
npm test
npm run build
npm run dev
```

## CSV Input

The local CSV must include these columns:

`customer_id,trading_name,legal_name,nzbn,ppsr_registration_number,exposure_band,signer_name,signer_role,signer_email,authority_evidence,template_version,coverage,e_sign_eligible`

Allowed values are enforced by the parser before any gate evaluation runs.

## Pipeline

`User CSV -> parse/validate -> readiness records -> gates -> clean records / exception queue -> prefilled drafts / chase tracker / exception report / evidence manifest`

The checked-in diagram lives at `docs/pipeline.svg`.

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
