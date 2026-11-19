import { describe, expect, it } from "vitest";
import { evaluateGovernance } from "../src/decision.js";
import type { GovernanceContext, GovernanceEvidence, GovernancePack } from "../src/types.js";

// EVD-05: staleness, tampering and reproducibility of evidence. Evidence is only worth what the engine
// will accept it as, so these tests try to make bad evidence count and assert that it does not.

const NOW = "2026-11-19T12:00:00.000Z";
const FP_A = `sha256:${"a".repeat(64)}`;
const FP_B = `sha256:${"b".repeat(64)}`;

const evidence = (overrides: Partial<GovernanceEvidence> = {}): GovernanceEvidence => ({
  id: "EVD-1", type: "E3_AUTOMATED_ANALYSIS", status: "VERIFIED", description: "Checked.", source: "test",
  freshness: "current", supports_controls: ["CTL-1"], ...overrides,
});

const pack = (items: GovernanceEvidence[] = [evidence()], maxAge?: number): GovernancePack => ({
  version: "1.0.0",
  project: { id: "p", name: "P", repository: "o/p", environment: "production" },
  change: { id: "CHG-1", type: "feature", title: "t", risk_class: "B", files: [] },
  standards: [{ id: "SEC-007", title: "Security", version: "1.0.0", source: "x" }],
  controls: [{
    id: "CTL-1", standard: "SEC-007", title: "Control", severity: "P1", applies_when: ["applicable"], required_evidence: ["EVD-1"], failure_decision: "NO-GO",
    ...(maxAge !== undefined ? { max_evidence_age_seconds: maxAge } : {}),
  }],
  evidence: items, risks: [], decisions: [],
});

const context = (extra: Partial<GovernanceContext> = {}): GovernanceContext => ({ signals: ["applicable"], analysisStatus: "COMPLETE", evaluatedAt: NOW, ...extra });
const decide = (p: GovernancePack, c: GovernanceContext = context()) => evaluateGovernance(p, c).decision.status;
const secondsAgo = (seconds: number) => new Date(Date.parse(NOW) - seconds * 1000).toISOString();

describe("evidence bound to a repository state", () => {
  it("is accepted when its fingerprint matches the state being assessed", () => {
    expect(decide(pack([evidence({ repository_fingerprint: FP_A })]), context({ repositoryFingerprint: FP_A }))).toBe("GO");
  });

  it("is rejected when the code changed since it was produced", () => {
    const result = evaluateGovernance(pack([evidence({ repository_fingerprint: FP_A })]), context({ repositoryFingerprint: FP_B }));
    expect(result.decision.status).toBe("NO-GO");
    expect(result.controls[0]).toMatchObject({ status: "UNVERIFIED", missingEvidence: ["EVD-1"] });
  });

  it("does not let other, matching evidence for the same control hide the stale one", () => {
    const p = pack([evidence({ repository_fingerprint: FP_B }), evidence({ id: "EVD-2", repository_fingerprint: FP_A })]);
    p.controls[0]!.required_evidence = ["EVD-2"];
    expect(decide(p, context({ repositoryFingerprint: FP_A }))).toBe("NO-GO");
  });

  it("leaves evidence that names no fingerprint alone, and every pack alone when none is supplied", () => {
    expect(decide(pack(), context({ repositoryFingerprint: FP_A }))).toBe("GO");
    expect(decide(pack([evidence({ repository_fingerprint: FP_A })]), context())).toBe("GO");
  });
});

describe("staleness", () => {
  const limit = 3600;

  it.each([
    ["exactly at the limit", limit, "GO"],
    ["one second inside the limit", limit - 1, "GO"],
    ["one second over the limit", limit + 1, "NO-GO"],
    ["a day old", 86_400, "NO-GO"],
  ])("a control with a maximum age: evidence %s", (_name, age, expected) => {
    expect(decide(pack([evidence({ generated_at: secondsAgo(age) })], limit))).toBe(expected);
  });

  it("rejects evidence with no timestamp, a malformed one, or one dated in the future, when an age limit applies", () => {
    expect(decide(pack([evidence()], limit))).toBe("NO-GO");
    expect(decide(pack([evidence({ generated_at: "yesterday" })], limit))).toBe("NO-GO");
    expect(decide(pack([evidence({ generated_at: secondsAgo(-60) })], limit))).toBe("NO-GO");
  });

  it("ignores the timestamp when the control sets no age limit", () => {
    expect(decide(pack([evidence({ generated_at: secondsAgo(10 ** 9) })]))).toBe("GO");
  });

  it.each(["stale", "expired", "unknown"] as const)("evidence marked %s is never usable, whatever its free-text freshness says", (state) => {
    expect(decide(pack([evidence({ freshness: "current", freshness_status: state })]))).toBe("NO-GO");
  });

  it.each(["stale", "EXPIRED", "  Unknown  "])("legacy freshness text %j is read case- and space-insensitively", (text) => {
    expect(decide(pack([evidence({ freshness: text })]))).toBe("NO-GO");
  });

  it("an explicit freshness_status of current takes precedence over legacy text", () => {
    expect(decide(pack([evidence({ freshness: "stale", freshness_status: "current" })]))).toBe("GO");
  });

  it("is judged at the supplied evaluation time, so the same pack ages out deterministically", () => {
    const p = pack([evidence({ generated_at: "2026-11-19T11:30:00.000Z" })], limit);
    expect(decide(p, context({ evaluatedAt: "2026-11-19T12:00:00.000Z" }))).toBe("GO");
    expect(decide(p, context({ evaluatedAt: "2026-11-19T12:31:00.000Z" }))).toBe("NO-GO");
  });
});

describe("tampering with a pack", () => {
  it("a declared control status of PASS does not substitute for evidence", () => {
    const p = pack([evidence({ status: "UNVERIFIED" })]);
    (p.controls[0] as { status?: string }).status = "PASS";
    expect(decide(p)).toBe("NO-GO");
  });

  it("evidence that declares support for a different control is a mislink, not proof", () => {
    const p = pack([evidence({ supports_controls: ["CTL-2"] })]);
    p.controls.push({ ...p.controls[0]!, id: "CTL-2", required_evidence: [] });
    const result = evaluateGovernance(p, context());
    expect(result.controls.find((item) => item.controlId === "CTL-1")).toMatchObject({ status: "UNVERIFIED", missingEvidence: ["EVD-1"] });
    expect(result.decision.status).toBe("NO-GO");
  });

  it("evidence that names a control the pack does not define is rejected", () => {
    expect(() => evaluateGovernance(pack([evidence({ supports_controls: ["NOT-A-CONTROL"] })]), context())).toThrow(/unknown control/);
  });

  it("evidence may not claim more than its tool result allows", () => {
    for (const result of ["FAIL", "SKIPPED", "UNSUPPORTED", "UNVERIFIED", "ERROR"] as const) {
      expect(() => evaluateGovernance(pack([evidence({ status: "VERIFIED", result_status: result })]), context()), result).toThrow(/supports at most/);
    }
  });

  it("a partial result cannot be upgraded to verified", () => {
    expect(() => evaluateGovernance(pack([evidence({ status: "VERIFIED", result_status: "WARN" })]), context())).toThrow(/supports at most PARTIALLY_VERIFIED/);
  });

  it("two records with one id are rejected rather than letting the later one win", () => {
    expect(() => evaluateGovernance(pack([evidence({ status: "UNVERIFIED" }), evidence({ status: "VERIFIED" })]), context())).toThrow(/Duplicate|duplicate/);
  });

  it("evidence a control requires but the pack does not contain is rejected", () => {
    const p = pack();
    p.controls[0]!.required_evidence = ["EVD-DOES-NOT-EXIST"];
    expect(() => evaluateGovernance(p, context())).toThrow(/EVD-DOES-NOT-EXIST/);
  });

  it("a PARTIALLY_VERIFIED record never satisfies a control", () => {
    expect(decide(pack([evidence({ status: "PARTIALLY_VERIFIED", result_status: "WARN" })]))).toBe("NO-GO");
  });
});

describe("reproducibility", () => {
  const strip = (value: unknown): string => JSON.stringify(value);

  it("the same pack and context always give the identical evaluation", () => {
    const p = pack([evidence({ generated_at: secondsAgo(60), repository_fingerprint: FP_A })], 3600);
    const c = context({ repositoryFingerprint: FP_A });
    const first = strip(evaluateGovernance(structuredClone(p), structuredClone(c)));
    for (let run = 0; run < 5; run += 1) expect(strip(evaluateGovernance(structuredClone(p), structuredClone(c)))).toBe(first);
  });

  it("does not depend on the order evidence or controls are listed", () => {
    const a = evidence({ id: "EVD-1" });
    const b = evidence({ id: "EVD-2" });
    const forward = pack([a, b]);
    forward.controls[0]!.required_evidence = ["EVD-1", "EVD-2"];
    const backward = structuredClone(forward);
    backward.evidence.reverse();
    backward.controls[0]!.required_evidence!.reverse();
    expect(strip(evaluateGovernance(forward, context()).decision)).toBe(strip(evaluateGovernance(backward, context()).decision));
  });

  it("does not mutate the pack it is given", () => {
    const p = pack([evidence({ generated_at: secondsAgo(1) })], 3600);
    const before = strip(p);
    evaluateGovernance(p, context());
    expect(strip(p)).toBe(before);
  });
});
