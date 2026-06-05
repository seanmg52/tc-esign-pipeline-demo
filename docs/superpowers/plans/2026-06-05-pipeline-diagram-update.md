# Pipeline Diagram Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository accurately distinguish its implemented offline decision prototype from the proposed production remediation workflow.

**Architecture:** Correct the domain semantics first so the diagram documents truthful behavior. Define the diagram content in a small shared TypeScript model used by the React view and checked by tests, then replace the static SVG with the same two-layer structure and align the README.

**Tech Stack:** TypeScript, React, Vitest, SVG, Vite.

---

### Task 1: Correct Domain And Artifact Semantics

**Files:**
- Modify: `src/pipeline.test.ts`
- Modify: `src/importCsv.test.ts`
- Modify: `src/artifacts.test.ts`
- Modify: `src/pipeline.ts`
- Modify: `src/importCsv.ts`
- Modify: `src/artifacts.ts`

- [ ] Add tests proving missing load-bearing legal facts flag for review.
- [ ] Add a test proving `signed` is reported separately from verified evidence.
- [ ] Add a test proving Gate D+ recommendations require human approval.
- [ ] Add a test proving a complete separate guarantor path can clear Gate E.
- [ ] Add tests for correct optional boolean diagnostics and spreadsheet-formula neutralization.
- [ ] Run focused tests and confirm they fail for the intended reasons.
- [ ] Implement the minimum domain, parser, and artifact changes.
- [ ] Run focused tests and confirm they pass.

### Task 2: Add A Shared Diagram Model

**Files:**
- Create: `src/pipelineDiagram.ts`
- Create: `src/pipelineDiagram.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Add a failing test requiring implemented and proposed layers, Gates A-E, Gate D+, state distinctions, and the production evidence store.
- [ ] Run the test and confirm it fails because the model does not exist.
- [ ] Add the diagram model and render it in the React application.
- [ ] Run diagram and app tests.

### Task 3: Replace Static Diagram And Documentation

**Files:**
- Modify: `docs/pipeline.svg`
- Modify: `README.md`
- Modify: `REAL_IMPLEMENTATION_REQUIREMENTS.md`
- Modify: `.gitignore`

- [ ] Replace the SVG with the approved two-layer design.
- [ ] Update README pipeline wording, legend, state semantics, and limitations.
- [ ] Align production requirements with advisory-only Gate D+ routing.
- [ ] Ignore the local visual-companion workspace.
- [ ] Add or update tests that check diagram labels and README claims.

### Task 4: Verify End To End

**Files:**
- No production file changes expected.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run the app locally and inspect the diagram at desktop and narrow widths.
- [ ] Confirm the static SVG and React view describe the same two-layer model.
