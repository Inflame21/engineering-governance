import { describe, expect, it } from "vitest";
import { bindEvidenceToCatalog } from "../src/catalog.js";
import { runGovernanceCommand } from "../src/commands.js";
import type { CatalogControl, ControlCatalog } from "../src/config.js";
import type { GovernanceEvidence, GovernancePack } from "../../engine/src/types.js";
import type { RepositoryAdapterResult } from "../../analyzer/src/types.js";
import type { VerificationToolRunner } from "../../analyzer/src/verification.js";

const CAP = "verification:python-syntax";

const control = (overrides: Partial<CatalogControl> = {}): CatalogControl => ({
  id: "CTL-PY",
  standard_id: "API-006",
  standard_version: "1.0.0",
  source_file: "06-api/06-api-governance-standard.md",
  source_section: "1. Example",
  source_text: "an example requirement",
  title: "Blocker: an example requirement",
  description: "Blocks when this is present: an example requirement.",
  mandatory: true,
  severity: "P1",
  failure_decision: "NO-GO",
  verification_capabilities: [CAP],
  required_evidence_classes: [],
  exception_policy: "ALLOWED",
  owner: { name: "UNASSIGNED" },
  status: "DRAFT",
  ...overrides,
});
const catalogOf = (...controls: CatalogControl[]): ControlCatalog => ({
  version: "1.0.0", catalog_id: "test-catalog", catalog_version: "0.1.0", description: "Test catalog.", controls,
});
const evidence = (id: string, overrides: Partial<GovernanceEvidence> = {}): GovernanceEvidence => ({
  id, type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "d", source: "s", freshness: "current", supports_controls: [], ...overrides,
});
const adapter = (overrides: Partial<RepositoryAdapterResult> = {}): RepositoryAdapterResult => ({
  adapterId: "python-syntax", version: "0.1.0", executionStatus: "SUCCESS", supportedCapabilities: [CAP], unsupportedCapabilities: [], evidenceRefs: ["EVD-A"], limitations: [], ...overrides,
});

describe("bindEvidenceToCatalog", () => {
  it("links evidence to a control that lists the capability its adapter completed with", () => {
    const [bound] = bindEvidenceToCatalog([evidence("EVD-A")], [adapter()], catalogOf(control()));
    expect(bound!.supports_controls).toEqual(["CTL-PY"]);
  });

  it("changes nothing when no control declares a capability, which is the committed catalog's state", () => {
    const input = [evidence("EVD-A")];
    const out = bindEvidenceToCatalog(input, [adapter()], catalogOf(control({ verification_capabilities: [] })));
    expect(out).toEqual(input);
    expect(out[0]!.supports_controls).toEqual([]);
  });

  it("does not link evidence from an adapter that did not complete with the capability", () => {
    const out = bindEvidenceToCatalog([evidence("EVD-A")], [adapter({ executionStatus: "FAILED", supportedCapabilities: [], unsupportedCapabilities: [CAP] })], catalogOf(control()));
    expect(out[0]!.supports_controls).toEqual([]);
  });

  it("does not link evidence the adapter did not produce, or an adapter with a different capability", () => {
    const out = bindEvidenceToCatalog(
      [evidence("EVD-A"), evidence("EVD-B")],
      [adapter({ supportedCapabilities: ["verification:other"], evidenceRefs: ["EVD-A"] }), adapter({ evidenceRefs: ["EVD-OTHER"] })],
      catalogOf(control()),
    );
    expect(out.map((e) => e.supports_controls)).toEqual([[], []]);
  });

  it("ignores DEPRECATED and RETIRED controls", () => {
    const retired = control({ id: "CTL-OLD", status: "RETIRED", retired_at: "2026-11-01" });
    const deprecated = control({ id: "CTL-DEP", status: "DEPRECATED" });
    expect(bindEvidenceToCatalog([evidence("EVD-A")], [adapter()], catalogOf(retired, deprecated))[0]!.supports_controls).toEqual([]);
  });

  it("links one record to every control that lists the capability, keeps links it already had, and sorts them", () => {
    const out = bindEvidenceToCatalog([evidence("EVD-A", { supports_controls: ["CTL-Z"] })], [adapter()], catalogOf(control({ id: "CTL-B" }), control({ id: "CTL-A" })));
    expect(out[0]!.supports_controls).toEqual(["CTL-A", "CTL-B", "CTL-Z"]);
  });

  it("does not mutate its inputs", () => {
    const input = evidence("EVD-A");
    bindEvidenceToCatalog([input], [adapter()], catalogOf(control()));
    expect(input.supports_controls).toEqual([]);
  });
});

describe("evidence binding through the check flow", () => {
  const pack = (controlOverrides: Record<string, unknown> = {}): GovernancePack => ({
    version: "1.0.0",
    project: { id: "demo", name: "Demo", repository: "demo/repo", environment: "production" },
    change: { id: "CHG-1", type: "feature", title: "Change", risk_class: "B", files: [] },
    standards: [{ id: "API-006", title: "API Governance", version: "1.0.0", source: "06-api/06-api-governance-standard.md" }],
    controls: [{ id: "CTL-PY", standard: "API-006", title: "Python parses", severity: "P1", failure_decision: "NO-GO", ...controlOverrides }],
    evidence: [],
    risks: [],
    decisions: [],
  });
  const snapshot = (source: string) => ({
    rootPath: "/repo", changedFiles: [], files: ["main.py"], fileContents: { "main.py": source },
  });
  const runner = (exitCode: number, errors: unknown[] = [], available = true): VerificationToolRunner => ({
    async isAvailable(tool) { return available && tool === "python3"; },
    async run() { return { exitCode, stdout: JSON.stringify({ errors }), stderr: "" }; },
  });
  const statusOf = (result: Awaited<ReturnType<typeof runGovernanceCommand>>) => result.evaluation.controls.find((c) => c.controlId === "CTL-PY")!;

  it("passes a control with no hand-written evidence link when the declared check passes", async () => {
    const result = await runGovernanceCommand({ snapshot: snapshot("print('ok')"), governancePack: pack(), controlCatalog: catalogOf(control()), verificationRunner: runner(0) });
    expect(statusOf(result)).toMatchObject({ status: "PASS", supportingEvidence: ["EVD-PYTHON-SYNTAX"] });
  });

  it("still leaves the control without evidence when the catalog declares no capability", async () => {
    const result = await runGovernanceCommand({ snapshot: snapshot("print('ok')"), governancePack: pack(), controlCatalog: catalogOf(control({ verification_capabilities: [] })), verificationRunner: runner(0) });
    expect(statusOf(result).status).not.toBe("PASS");
    expect(statusOf(result).missingEvidence).toEqual(["EVIDENCE_REQUIRED:CTL-PY"]);
  });

  it("does not link anything without a catalog", async () => {
    const result = await runGovernanceCommand({ snapshot: snapshot("print('ok')"), governancePack: pack(), verificationRunner: runner(0) });
    expect(statusOf(result).status).not.toBe("PASS");
  });

  it("does not pass the control when the check fails, and the failure blocks", async () => {
    const result = await runGovernanceCommand({ snapshot: snapshot("if True print('x')"), governancePack: pack(), controlCatalog: catalogOf(control()), verificationRunner: runner(1, [{ file: "main.py", line: 1, message: "invalid syntax" }]) });
    expect(statusOf(result).status).not.toBe("PASS");
    expect(result.evaluation.decision.status).toBe("NO-GO");
  });

  it("does not pass the control when the tool is unavailable: no check ran, so nothing supports it", async () => {
    const result = await runGovernanceCommand({ snapshot: snapshot("print('ok')"), governancePack: pack(), controlCatalog: catalogOf(control()), verificationRunner: runner(0, [], false) });
    expect(statusOf(result).status).not.toBe("PASS");
  });

  it("cannot widen a pack's own evidence: a pack that supplies a same-id record keeps it and gets a collision finding", async () => {
    const own = evidence("EVD-PYTHON-SYNTAX", { supports_controls: [] });
    const result = await runGovernanceCommand({ snapshot: snapshot("print('ok')"), governancePack: { ...pack(), evidence: [own] }, controlCatalog: catalogOf(control()), verificationRunner: runner(0) });
    expect(result.analysis.findings.some((f) => f.rule_id === "EVIDENCE-ID-COLLISION")).toBe(true);
    expect(statusOf(result).status).not.toBe("PASS");
  });
});
