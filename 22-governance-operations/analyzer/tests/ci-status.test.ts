import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateControl } from "../../engine/src/evaluator.js";
import { CI_REPORT_DIRECTORY, parseCiRuns, runCiStatusAdapter } from "../src/ci-status.js";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";
import type { RepositorySnapshot } from "../src/types.js";

const real = (name: string) => readFileSync(new URL(`./fixtures/real-ci-output/${name}`, import.meta.url), "utf8");
const REPORT = `${CI_REPORT_DIRECTORY}/runs.json`;
// The commits of the two real runs in the fixtures.
const SUCCESS_SHA = "f548e57e544e1ff5a4c46bf1e1b8685f8e4a348a";
const FAILURE_SHA = "fac28914a21f56cf30f63ba6e5791d01264e06c6";

function snapshot(contents: Record<string, string | undefined>, headCommit?: string, extraFiles: string[] = []): RepositorySnapshot {
  const present = Object.fromEntries(Object.entries(contents).filter(([, v]) => v !== undefined)) as Record<string, string>;
  return { rootPath: "/repo", files: [...Object.keys(contents), ...extraFiles], changedFiles: [], fileContents: present, ...(headCommit ? { headCommit } : {}) };
}

const run = (over: Record<string, unknown> = {}) => ({
  id: 1, name: "CI", workflow_id: 10, head_sha: "a".repeat(40), status: "completed", conclusion: "success",
  run_number: 1, run_attempt: 1, created_at: "2026-11-23T06:00:00Z", updated_at: "2026-11-23T06:05:00Z", html_url: "https://example.invalid/run/1", ...over,
});
const runs = (...items: unknown[]) => JSON.stringify({ total_count: items.length, workflow_runs: items });
const SHA = "a".repeat(40);

describe("CI run status collector", () => {
  it("returns nothing when the repository provides no CI files", () => {
    expect(runCiStatusAdapter(snapshot({}, SHA, ["src/a.ts", `${CI_REPORT_DIRECTORY}/notes.txt`]))).toBeUndefined();
  });

  it("passes a real successful run on the assessed commit and uses the run's update time as the evidence time", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: real("runs-success.json") }, SUCCESS_SHA))!;
    expect(out.result.status).toBe("PASS");
    expect(out.findings).toEqual([]);
    expect(out.evidence[0]).toMatchObject({
      id: "EVD-CI-RUN-STATUS", type: "E1_DIRECT_VERIFICATION", status: "VERIFIED", result_status: "PASS",
      freshness: "current", generated_at: "2026-11-22T09:35:00.000Z", supports_controls: [],
    });
    expect(out.adapterResult.supportedCapabilities).toEqual(["verification:ci-run-status"]);
    expect(out.result.summary).toContain("1 workflow(s): 0 failed");
    expect(out.result.limitations.join(" ")).toContain("commit f548e57e544e");
  });

  it("fails a real failed run on the assessed commit with a P1 finding that names the workflow, run and commit", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: real("runs-failure.json") }, FAILURE_SHA))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]).toMatchObject({ rule_id: "CI-RUN-FAILED", severity: "P1", category: "ci-cd", status: "OPEN", source_location: { file: REPORT } });
    expect(out.findings[0]!.message).toContain("Licensed run #1297 concluded failure on fac28914");
    expect(out.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
  });

  it("ignores runs on other commits, so a green run for older code cannot pass", () => {
    const old = runCiStatusAdapter(snapshot({ [REPORT]: real("runs-success.json") }, "b".repeat(40)))!;
    expect(old.result.status).toBe("UNVERIFIED");
    expect(old.result.summary).toContain("No workflow run was found for commit bbbbbbbbbbbb");
    expect(old.result.limitations.join(" ")).toContain("1 run(s) on other commits ignored");
    expect(old.adapterResult.executionStatus).toBe("PARTIAL");
    expect(old.evidence[0]).not.toHaveProperty("generated_at");
  });

  it("matches the commit case-insensitively", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ head_sha: SHA.toUpperCase() })) }, SHA))!;
    expect(out.result.status).toBe("PASS");
  });

  it("still reports a failure when the assessed commit is unknown", () => {
    expect(runCiStatusAdapter(snapshot({ [REPORT]: real("runs-failure.json") }))!.result.status).toBe("FAIL");
  });

  it("warns, never passes, when the assessed commit is unknown, even for a green run", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: real("runs-success.json") }))!;
    expect(out.result.status).toBe("WARN");
    expect(out.evidence[0]!.status).toBe("PARTIALLY_VERIFIED");
    expect(out.result.limitations.join(" ")).toContain("assessed commit is not known");
  });

  it("takes the newest run of each workflow, so a fixed pipeline passes and a re-run that failed fails", () => {
    const fixed = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ id: 1, run_number: 5, conclusion: "failure" }), run({ id: 2, run_number: 6 })) }, SHA))!;
    expect(fixed.result.status).toBe("PASS");
    const rerun = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ id: 1, run_number: 5, run_attempt: 1 }), run({ id: 1, run_number: 5, run_attempt: 2, conclusion: "failure" })) }, SHA))!;
    expect(rerun.result.status).toBe("FAIL");
  });

  it("judges each workflow separately, and keeps two workflows with the same name apart by id", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ id: 1, workflow_id: 10 }), run({ id: 2, workflow_id: 11, conclusion: "failure" })) }, SHA))!;
    expect(out.result.status).toBe("FAIL");
    expect(out.result.summary).toContain("2 workflow(s): 1 failed");
  });

  it("treats every non-success conclusion as the report says: failures fail, skipped and neutral warn, unknown is unverified", () => {
    for (const conclusion of ["failure", "timed_out", "cancelled", "startup_failure", "action_required", "stale"]) {
      expect(runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ conclusion })) }, SHA))!.result.status, conclusion).toBe("FAIL");
    }
    for (const conclusion of ["skipped", "neutral"]) {
      expect(runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ conclusion })) }, SHA))!.result.status, conclusion).toBe("WARN");
    }
    const odd = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ conclusion: "something_new" })) }, SHA))!;
    expect(odd.result.status).toBe("UNVERIFIED");
    expect(odd.result.limitations.join(" ")).toContain("something_new");
  });

  it("is UNVERIFIED while a run has not finished", () => {
    for (const over of [{ status: "in_progress", conclusion: null }, { status: "queued", conclusion: null }]) {
      const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(run(over)) }, SHA))!;
      expect(out.result.status).toBe("UNVERIFIED");
      expect(out.result.limitations.join(" ")).toContain("Not finished: CI");
    }
  });

  it("is ERROR for a file that is not workflow-run data, and FAIL still wins when a real failure is also present", () => {
    for (const text of ["not json", "{}", '{"workflow_runs":"x"}', '{"workflow_runs":[1]}', '{"workflow_runs":[{"status":"completed"}]}']) {
      const bad = runCiStatusAdapter(snapshot({ [REPORT]: text }, SHA))!;
      expect(bad.result.status, text).toBe("ERROR");
      expect(bad.adapterResult.executionStatus).toBe("FAILED");
    }
    const both = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ conclusion: "failure" })), [`${CI_REPORT_DIRECTORY}/junk.json`]: "nope" }, SHA))!;
    expect(both.result.status).toBe("FAIL");
    expect(both.result.limitations.join(" ")).toContain("junk.json");
  });

  it("is UNVERIFIED, not PASS, when one file's content was not ingested", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(run()), [`${CI_REPORT_DIRECTORY}/big.json`]: undefined }, SHA))!;
    expect(out.result.status).toBe("UNVERIFIED");
    expect(out.result.limitations.join(" ")).toContain("big.json");
  });

  it("has no generation time when a counted run has no valid update time, so a maximum-age limit rejects it", () => {
    const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(run({ updated_at: undefined })) }, SHA))!;
    expect(out.result.status).toBe("PASS");
    expect(out.evidence[0]).toMatchObject({ freshness: "unknown" });
    expect(out.evidence[0]).not.toHaveProperty("generated_at");
  });

  it("accepts a bare array of runs, and caps findings at 50", () => {
    expect(parseCiRuns(JSON.stringify([run()]))).toHaveLength(1);
    const many = Array.from({ length: 60 }, (_, i) => run({ id: i, workflow_id: i, name: `w${i}`, conclusion: "failure" }));
    const out = runCiStatusAdapter(snapshot({ [REPORT]: runs(...many) }, SHA))!;
    expect(out.findings).toHaveLength(50);
    expect(out.result.limitations.join(" ")).toContain("60 workflows failed");
  });
});

describe("CI run status through the verification pipeline", () => {
  const noTools: VerificationToolRunner = {
    async isAvailable() { return false; },
    async run() { throw new Error("no tool should run"); },
  };

  it("adds the evidence and findings to the report without running any command", async () => {
    const report = await runVerificationAdapters(snapshot({ [REPORT]: real("runs-failure.json") }), noTools);
    expect(report.results.map((r) => r.tool)).toContain("ci-run-status");
    expect(report.evidence.map((e) => e.id)).toContain("EVD-CI-RUN-STATUS");
    expect(report.findings.some((f) => f.rule_id === "CI-RUN-FAILED")).toBe(true);
  });

  it("changes nothing for a repository without CI files", async () => {
    const report = await runVerificationAdapters(snapshot({}, SHA, ["README.md"]), noTools);
    expect(report.results.map((r) => r.tool)).not.toContain("ci-run-status");
  });

  it("does not change the repository fingerprint, so recording the commit cannot invalidate other evidence", async () => {
    const base = await runVerificationAdapters(snapshot({}), noTools);
    const withCommit = await runVerificationAdapters(snapshot({}, SHA), noTools);
    expect(withCommit.snapshotFingerprint.digest).toBe(base.snapshotFingerprint.digest);
  });

  it("can satisfy a control only once linked, and only for the commit it ran on", async () => {
    const control = { id: "CICD-GREEN", standard: "CICD-012", title: "CI is green", severity: "P1" as const, failure_decision: "NO-GO" as const, required_evidence: ["EVD-CI-RUN-STATUS"] };
    const link = (evidence: Awaited<ReturnType<typeof runVerificationAdapters>>["evidence"]) => evidence.map((e) => ({ ...e, supports_controls: ["CICD-GREEN"] }));
    const green = await runVerificationAdapters(snapshot({ [REPORT]: real("runs-success.json") }, SUCCESS_SHA), noTools);
    expect(evaluateControl(control, green.evidence, { signals: [] } as never).status).not.toBe("PASS");
    expect(evaluateControl(control, link(green.evidence), { signals: [] } as never).status).toBe("PASS");
    const stale = await runVerificationAdapters(snapshot({ [REPORT]: real("runs-success.json") }, "c".repeat(40)), noTools);
    expect(evaluateControl(control, link(stale.evidence), { signals: [] } as never).status).not.toBe("PASS");
  });
});
