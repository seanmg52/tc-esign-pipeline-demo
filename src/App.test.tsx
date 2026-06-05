/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { READINESS_CSV_COLUMNS } from "./importCsv";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const validCsv = [
  READINESS_CSV_COLUMNS.join(","),
  [
    "SYN-900",
    "Harbour Tools",
    "Harbour Tools Limited",
    "9429000001900",
    "F900190",
    "material",
    "Rina Director",
    "Director",
    "rina.director@harbour.example",
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

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  root = undefined;
  container = undefined;
  document.body.innerHTML = "";
});

async function renderApp() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<App />);
  });

  return container;
}

function getButton(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function typeIntoTextarea(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("App", () => {
  it("uses bundled synthetic example data by default", async () => {
    const app = await renderApp();

    expect(app.textContent).toContain("Using bundled synthetic example data");
    expect(app.textContent).toContain("Acme Supply");
    expect(app.textContent).toContain("Signed + evidenced");
  });

  it("shows CSV validation errors before evaluating gates", async () => {
    const app = await renderApp();
    const textarea = app.querySelector("textarea");
    if (!textarea) throw new Error("CSV textarea not found");

    await act(async () => {
      typeIntoTextarea(textarea, "customer_id,trading_name\nBROKEN-001,Broken Import");
    });

    await act(async () => {
      getButton("Use pasted CSV").click();
    });

    expect(app.textContent).toContain("Validation errors");
    expect(app.textContent).toContain("Missing required column: legal_name");
    expect(app.querySelector("#records")?.textContent).not.toContain("BROKEN-001");
  });

  it("evaluates valid pasted CSV and exposes local artifact downloads", async () => {
    const app = await renderApp();
    const textarea = app.querySelector("textarea");
    if (!textarea) throw new Error("CSV textarea not found");

    await act(async () => {
      typeIntoTextarea(textarea, validCsv);
    });

    await act(async () => {
      getButton("Use pasted CSV").click();
    });

    expect(app.textContent).toContain("Loaded 1 local CSV record");
    expect(app.textContent).toContain("Harbour Tools");
    expect(app.textContent).toContain("In chase loop");

    const downloads = [...app.querySelectorAll("a[download]")].map((link) =>
      link.getAttribute("download")
    );
    expect(downloads).toEqual(
      expect.arrayContaining([
        "SYN-900-synthetic-tc-draft.html",
        "chase-tracker.csv",
        "exception-report.csv",
        "evidence-manifest.csv"
      ])
    );
  });
});
