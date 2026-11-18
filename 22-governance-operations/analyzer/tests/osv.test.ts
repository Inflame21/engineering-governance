import { describe, expect, it } from "vitest";
import { runVerificationAdapters, type VerificationToolRunner } from "../src/verification.js";

// Fixtures are hand-written from the OSV-Scanner output documentation, not captured from the tool.
// The `database_specific.severity` label is an assumption about GitHub-reviewed advisories.

interface Call { tool: string; args: string[] }

function osvRunner(options: {
  available?: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  throws?: Error;
  version?: string;
} = {}): VerificationToolRunner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async isAvailable(tool) {
      return tool === "osv-scanner" ? options.available ?? true : false;
    },
    async getVersion() {
      return options.version ?? "osv-scanner version: 2.7.1";
    },
    async run(tool, args) {
      calls.push({ tool, args });
      if (options.throws) throw options.throws;
      return { exitCode: options.exitCode ?? 0, stdout: options.stdout ?? '{"results":[]}', stderr: options.stderr ?? "" };
    },
  };
}

function vuln(id: string, label?: string, extra: Record<string, unknown> = {}) {
  return { id, aliases: [], ...(label ? { database_specific: { severity: label } } : {}), ...extra };
}

function output(packages: Array<{ name: string; version: string; vulnerabilities?: unknown[]; groups?: unknown[] }>, path = "/repo/package-lock.json") {
  return JSON.stringify({
    results: [{
      source: { path, type: "lockfile" },
      packages: packages.map((pkg) => ({
        package: { name: pkg.name, version: pkg.version, ecosystem: "npm" },
        vulnerabilities: pkg.vulnerabilities ?? [],
        groups: pkg.groups ?? [],
      })),
    }],
  });
}

async function scan(files: string[], runner: VerificationToolRunner) {
  return runVerificationAdapters({ rootPath: "/repo", changedFiles: [], files }, runner);
}

const LOCK = ["package.json", "package-lock.json"];

describe("OSV dependency scan adapter", () => {
  it("does nothing when the repository has no dependency manifests", async () => {
    const runner = osvRunner();
    const report = await scan(["README.md", "src/main.ts"], runner);
    expect(report.results.find((result) => result.tool === "osv-scanner")).toBeUndefined();
    expect(runner.calls).toEqual([]);
  });

  it("is UNSUPPORTED, not a pass, when a manifest has no lockfile", async () => {
    const runner = osvRunner();
    const report = await scan(["package.json"], runner);
    const result = report.results.find((item) => item.tool === "osv-scanner");
    expect(result?.status).toBe("UNSUPPORTED");
    expect(report.evidence).toEqual([]);
    expect(runner.calls).toEqual([]);
    expect(report.status).toBe("PARTIAL");
  });

  it("is UNSUPPORTED when osv-scanner is not installed", async () => {
    const runner = osvRunner({ available: false });
    const report = await scan(LOCK, runner);
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("UNSUPPORTED");
    expect(report.evidence).toEqual([]);
    expect(runner.calls).toEqual([]);
  });

  it("is SKIPPED over the lockfile safety limit", async () => {
    const files = Array.from({ length: 51 }, (_, index) => `pkg${index}/package-lock.json`);
    const runner = osvRunner();
    const report = await scan(files, runner);
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("SKIPPED");
    expect(runner.calls).toEqual([]);
  });

  it("passes only when the scan ran and found nothing, and records verified evidence", async () => {
    const report = await scan(LOCK, osvRunner({ stdout: output([{ name: "left-pad", version: "1.3.0" }]) }));
    const result = report.results.find((item) => item.tool === "osv-scanner");
    expect(result).toMatchObject({ status: "PASS", exitCode: 0, evidenceId: "EVD-OSV-DEPENDENCIES", toolVersion: "osv-scanner version: 2.7.1" });
    expect(report.evidence[0]).toMatchObject({ status: "VERIFIED", result_status: "PASS", supports_controls: [], exit_code: 0 });
    expect(report.evidence[0]?.repository_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(report.findings).toEqual([]);
    expect(report.adapterResults.find((item) => item.adapterId === "osv-dependency-scan")?.executionStatus).toBe("SUCCESS");
  });

  it("produces WARN with P2 findings and only partial evidence when no advisory is P1", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "minimist", version: "1.2.0", vulnerabilities: [vuln("GHSA-aaaa-bbbb-cccc", "MODERATE", { summary: "Prototype pollution" })] }]),
    }));
    const result = report.results.find((item) => item.tool === "osv-scanner");
    expect(result?.status).toBe("WARN");
    expect(report.evidence[0]).toMatchObject({ status: "PARTIALLY_VERIFIED", result_status: "WARN" });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      rule_id: "OSV-ADVISORY",
      severity: "P2",
      category: "dependency-vulnerability",
      status: "OPEN",
      evidence_refs: ["EVD-OSV-DEPENDENCIES"],
      source_location: { file: "package-lock.json" },
    });
    expect(report.findings[0]?.message).toContain("minimist@1.2.0");
    expect(report.findings[0]?.message).toContain("Prototype pollution");
  });

  it("maps a LOW advisory to P3", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "a", version: "1.0.0", vulnerabilities: [vuln("GHSA-low", "low")] }]),
    }));
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("WARN");
    expect(report.findings[0]?.severity).toBe("P3");
  });

  it.each(["CRITICAL", "HIGH"])("fails with a blocking P1 finding for a %s advisory", async (label) => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "lodash", version: "4.17.15", vulnerabilities: [vuln("GHSA-high", label)] }]),
    }));
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("FAIL");
    expect(report.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "FAIL" });
    expect(report.findings[0]?.severity).toBe("P1");
  });

  it("fails closed: an advisory with no severity label is P1, not a warning", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "x", version: "1.0.0", vulnerabilities: [vuln("GHSA-unscored")] }]),
    }));
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("FAIL");
    expect(report.findings[0]?.severity).toBe("P1");
    expect(report.findings[0]?.message).toContain("could not be established");
  });

  it("treats an unrecognised severity label as unestablished", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "x", version: "1.0.0", vulnerabilities: [vuln("GHSA-odd", "SEVERE-ISH")] }]),
    }));
    expect(report.findings[0]?.severity).toBe("P1");
  });

  it("reports one finding per alias group, at the worst known severity", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{
        name: "regex",
        version: "1.5.1",
        vulnerabilities: [vuln("GHSA-m5pq", "HIGH"), vuln("RUSTSEC-2022-0013"), vuln("GHSA-other", "LOW")],
        groups: [{ ids: ["GHSA-m5pq", "RUSTSEC-2022-0013"] }],
      }]),
    }));
    expect(report.findings.map((finding) => finding.severity)).toEqual(["P1", "P3"]);
    expect(report.findings[0]?.message).toContain("GHSA-m5pq, RUSTSEC-2022-0013");
  });

  it("takes the severity from any alias in the group that has a label", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{
        name: "a",
        version: "1.0.0",
        vulnerabilities: [vuln("GO-2021-1"), vuln("GHSA-1", "MODERATE")],
        groups: [{ ids: ["GO-2021-1", "GHSA-1"] }],
      }]),
    }));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.severity).toBe("P2");
  });

  it("keeps lower-severity findings visible alongside a blocking one", async () => {
    const report = await scan(LOCK, osvRunner({
      exitCode: 1,
      stdout: output([{ name: "a", version: "1.0.0", vulnerabilities: [vuln("GHSA-h", "HIGH"), vuln("GHSA-l", "LOW")] }]),
    }));
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("FAIL");
    expect(report.findings.map((finding) => finding.severity)).toEqual(["P1", "P3"]);
  });

  it("is UNVERIFIED when a clean scan leaves a manifest uncovered by any lockfile", async () => {
    const report = await scan(["package.json", "package-lock.json", "tools/package.json", "tools/requirements.txt", "svc/pyproject.toml"], osvRunner());
    const result = report.results.find((item) => item.tool === "osv-scanner");
    // tools/package.json has no Node lockfile in tools/ or an ancestor except the root lockfile, which covers it.
    expect(result?.status).toBe("UNVERIFIED");
    expect(result?.limitations.join(" ")).toContain("svc/pyproject.toml");
    expect(result?.limitations.join(" ")).not.toContain("tools/package.json");
    expect(report.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "UNVERIFIED" });
  });

  it("lets a workspace-root lockfile cover nested package manifests", async () => {
    const report = await scan(["package-lock.json", "packages/a/package.json", "packages/b/package.json"], osvRunner());
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("PASS");
  });

  it("does not count manifests under node_modules", async () => {
    const report = await scan(["package-lock.json", "node_modules/dep/package.json"], osvRunner());
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("PASS");
  });

  it("is UNVERIFIED, not a pass, when osv-scanner found no packages (exit 128)", async () => {
    const report = await scan(LOCK, osvRunner({ exitCode: 128, stdout: "", stderr: "no packages found" }));
    expect(report.results.find((item) => item.tool === "osv-scanner")?.status).toBe("UNVERIFIED");
    expect(report.evidence[0]?.status).toBe("UNVERIFIED");
  });

  it.each([
    ["a general error exit code", { exitCode: 127, stdout: "", stderr: "boom" }],
    ["an unlisted exit code", { exitCode: 200, stdout: "{}", stderr: "" }],
    ["invalid JSON", { exitCode: 0, stdout: "not json", stderr: "" }],
    ["a missing results array", { exitCode: 0, stdout: "{}", stderr: "" }],
    ["a package without a version", { exitCode: 0, stdout: JSON.stringify({ results: [{ packages: [{ package: { name: "a", ecosystem: "npm" } }] }] }), stderr: "" }],
    ["a vulnerability without an id", { exitCode: 1, stdout: output([{ name: "a", version: "1", vulnerabilities: [{ aliases: [] }] }]), stderr: "" }],
    ["exit 0 with advisories present", { exitCode: 0, stdout: output([{ name: "a", version: "1", vulnerabilities: [vuln("GHSA-x", "HIGH")] }]), stderr: "" }],
    ["exit 1 with no advisories", { exitCode: 1, stdout: output([{ name: "a", version: "1" }]), stderr: "" }],
  ])("is ERROR and never PASS for %s", async (_name, options) => {
    const report = await scan(LOCK, osvRunner(options));
    const result = report.results.find((item) => item.tool === "osv-scanner");
    expect(result?.status).toBe("ERROR");
    expect(report.evidence[0]).toMatchObject({ status: "UNVERIFIED", result_status: "ERROR" });
    expect(report.findings).toEqual([]);
    expect(report.status).toBe("PARTIAL");
  });

  it("is ERROR with no evidence when the runner throws, for example on timeout or oversized output", async () => {
    const report = await scan(LOCK, osvRunner({ throws: new Error("maxBuffer exceeded") }));
    const result = report.results.find((item) => item.tool === "osv-scanner");
    expect(result?.status).toBe("ERROR");
    expect(result?.summary).toContain("maxBuffer exceeded");
    expect(report.evidence).toEqual([]);
  });

  it("passes lockfile paths as --lockfile= arguments so a path starting with '-' cannot become a flag", async () => {
    const runner = osvRunner();
    await scan(["-evil/package-lock.json", "package-lock.json", "package.json"], runner);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]?.tool).toBe("osv-scanner");
    expect(runner.calls[0]?.args.slice(0, 4)).toEqual(["scan", "source", "--format", "json"]);
    expect(runner.calls[0]?.args.slice(4)).toEqual(["--lockfile=-evil/package-lock.json", "--lockfile=package-lock.json"]);
  });

  it("reports advisory source paths relative to the repository root", async () => {
    const report = await scan(["svc/poetry.lock"], osvRunner({
      exitCode: 1,
      stdout: output([{ name: "django", version: "2.2.0", vulnerabilities: [vuln("GHSA-dj", "HIGH")] }], "/repo/svc/poetry.lock"),
    }));
    expect(report.findings[0]?.source_location?.file).toBe("svc/poetry.lock");
  });

  it("gives identical advisories identical finding ids", async () => {
    const stdout = output([{ name: "a", version: "1.0.0", vulnerabilities: [vuln("GHSA-h", "HIGH")] }]);
    const first = await scan(LOCK, osvRunner({ exitCode: 1, stdout }));
    const second = await scan(LOCK, osvRunner({ exitCode: 1, stdout }));
    expect(first.findings[0]?.id).toBe(second.findings[0]?.id);
    expect(first.findings[0]?.id).toMatch(/^FND-OSV-[0-9A-F]{8}$/);
  });
});
