# Requirements To Make This Real

This repository is an offline, bring-your-own-data MVP. It can parse a readiness CSV, run deterministic workflow gates, and generate local synthetic artifacts. It is not the real production pipeline Joshua Wong described.

Making it real would require the components below.

## 1. Source Data Contract

The real system needs a canonical customer-readiness table, not an ad hoc spreadsheet. Each row must carry both customer facts and the provenance of those facts.

Required data:

- internal customer ID and business unit;
- trading name and contracting legal entity;
- NZBN and entity status from NZBN/Miseiri;
- addresses and contact details used for T&C delivery;
- existing PPSR financing-statement registration number, if any;
- PPSR debtor name / identifier and whether it matches the verified legal entity;
- live exposure band and account owner;
- proposed signer name, role, email, and authority evidence;
- T&C template version and security/collateral clause version;
- e-sign eligibility and any wet-ink / counsel routing reason;
- customer campaign status: not sent, sent, viewed, signed, negotiating, refused, wet-ink.

The current MVP only works correctly when this enriched readiness data is supplied by the user.

## 2. Miseiri / NZBN Enrichment

The real pipeline needs a reliable enrichment step before gates run.

Required work:

- call Miseiri or NZBN lookup for each trading name / legal name;
- store canonical legal name, NZBN, status, registered address, and match confidence;
- flag low-confidence matches, group-company ambiguity, and trading-name mismatches;
- preserve the source and timestamp of each match result;
- prevent a record from auto-clearing when entity status or match confidence is unknown.

## 3. PPSR Verification And Remediation

The real pipeline must compare the signed-terms debtor against existing PPSR data.

Required work:

- call the PPSR MCP/API or import a PPSR export;
- retrieve existing financing statement data for each customer;
- compare PPSR debtor identity against the verified legal entity;
- classify correction type: no registration, match, mismatch, stale debtor, duplicate, or counsel review;
- decide whether amendment, discharge/re-registration, new registration, or residual-risk approval is required;
- capture before/after registration evidence.

This MVP does not make PPSR changes.

## 4. Authority Verification

The real pipeline needs an authority standard, not just a signer field.

Required work:

- define authority tiers by exposure and account risk;
- determine acceptable evidence for each tier: director record, delegated authority, customer certificate, legal approval, or other proof;
- distinguish identity proof from authority proof;
- handle signer reassignment as a new authority event;
- store authority evidence with the final evidence packet.

## 5. Counsel-Approved T&C Template

The real pipeline needs a locked, counsel-approved template.

Required work:

- provide the actual standard trade-credit T&Cs outside this public repo;
- identify merge fields that are safe to prefill;
- approve the security / collateral description language;
- decide whether the template covers existing debt, future credit, or both;
- define which customer edits require legal review;
- lock the template so automation cannot alter legal terms.

The public MVP uses synthetic non-legal sample text only.

## 6. E-sign Integration

The real pipeline needs a signing provider integration, likely DocuSign or an equivalent.

Required work:

- create envelopes from the approved template and verified merge fields;
- capture electronic-transaction consent where required;
- configure signer authentication level by authority tier;
- handle bounced emails, reassignment, refusal, and negotiation requests;
- capture completed agreement plus certificate/audit trail;
- export envelope status back into the readiness table.

This MVP does not send envelopes.

## 7. Chase And Escalation Workflow

The real system needs an operating model for getting signatures back.

Required work:

- define reminder cadence;
- assign account owner and campaign owner;
- track sent, opened, viewed, signed, bounced, refused, negotiating, and wet-ink states;
- define credit-stop review triggers;
- define commercial override and residual-risk approval process;
- generate weekly status reports.

## 8. Evidence Packet Storage

The real pipeline must produce an evidence packet that can be found later.

Required packet contents:

- readiness record snapshot at send time;
- entity/NZBN evidence;
- PPSR evidence before and after remediation;
- authority evidence;
- final signed T&Cs;
- e-sign certificate/audit trail;
- customer communications and negotiation record;
- counsel approvals and residual-risk approvals;
- final disposition.

The storage location must be access-controlled and durable. This public repo does not store evidence packets.

## 9. Security, Privacy, And Governance

The real implementation needs controls before it handles customer data.

Required work:

- private repository or internal deployment for real data;
- secrets management for any API credentials;
- data retention rules for customer contact and identity data;
- audit logging for sends, approvals, and PPSR actions;
- access controls by role;
- no real customer data in public source control;
- human review checkpoints for legal sufficiency and business risk.

## 10. Production Acceptance Tests

Before production use, test the full workflow against synthetic and then approved internal test records.

Minimum acceptance tests:

- raw customer export imports correctly;
- Miseiri/NZBN enrichment flags low-confidence matches;
- PPSR mismatch cannot auto-clear;
- material account with weak authority cannot auto-send;
- e-sign ineligible record routes to wet-ink/counsel;
- clean record produces locked envelope with correct merge fields;
- signed envelope creates complete evidence packet;
- refusal triggers credit-stop review;
- no external send occurs before all gates clear.

## Bottom Line

This repository is useful as an offline architecture prototype and local artifact generator. To become the actual 230-customer remediation pipeline, it needs authenticated enrichment, PPSR verification/remediation, counsel-approved templates, e-sign integration, chase operations, evidence storage, and governance controls.
