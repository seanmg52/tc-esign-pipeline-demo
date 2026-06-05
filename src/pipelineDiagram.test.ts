import { describe, expect, it } from "vitest";
import svg from "../docs/pipeline.svg?raw";
import readme from "../README.md?raw";
import { pipelineDiagram } from "./pipelineDiagram";

describe("pipelineDiagram", () => {
  it("separates implemented behavior from the proposed production operating model", () => {
    expect(pipelineDiagram.current.label).toContain("Implemented now");
    expect(pipelineDiagram.current.disclaimer).toContain("user-supplied assertions");
    expect(pipelineDiagram.current.nodes.map((node) => node.title)).toEqual(
      expect.arrayContaining([
        "Gate A / A+",
        "Gate B",
        "Gate C",
        "Gate D",
        "Gate D+",
        "Gate E",
        "Reported signed",
        "Local synthetic outputs"
      ])
    );

    expect(pipelineDiagram.contract.items).toEqual(
      expect.arrayContaining(["recommendation", "approval status", "evidence status"])
    );
    expect(pipelineDiagram.production.label).toContain("Required for production");
    expect(pipelineDiagram.production.nodes.map((node) => node.title)).toEqual(
      expect.arrayContaining([
        "Verified enrichment",
        "Approval checkpoint",
        "E-sign lifecycle",
        "Evidence packet",
        "Access-controlled store"
      ])
    );
  });

  it("keeps the README and checked-in SVG aligned with the shared diagram vocabulary", () => {
    for (const label of ["IMPLEMENTED NOW", "Gate A / A+", "Gate D+", "Gate E", "REQUIRED FOR PRODUCTION"]) {
      expect(svg).toContain(label);
    }
    expect(readme).toContain("Reported signed");
    expect(readme).toContain("Deterministic recommendation");
    expect(readme).toContain("Proposed / not implemented");
  });

  it("wraps narrow SVG node labels inside their boxes", () => {
    for (const wrappedLine of [
      '<tspan x="12" dy="0">Systems of</tspan>',
      '<tspan x="12" dy="0">Verified</tspan>',
      '<tspan x="12" dy="0">Approval</tspan>',
      '<tspan x="12" dy="0">Locked</tspan>',
      '<tspan x="12" dy="0">E-sign</tspan>',
      '<tspan x="14" dy="0">Draft HTML, chase tracker,</tspan>'
    ]) {
      expect(svg).toContain(wrappedLine);
    }
  });
});
