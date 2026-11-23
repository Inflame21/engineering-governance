import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The reviewed rule set this repository ships at .governance/semgrep (ADR-0001). Each rules file has a
// test file in tests/ named <rules file>.<language extension>.txt, with Semgrep's `ruleid:` and `ok:`
// annotations. The extension is `.txt` so the cases are not detected as source code in this repository
// (a real .py or .go file here made the CLI report Go and Python); the real-Semgrep test copies them
// back to their real extension in a temporary directory.

const RULES = fileURLToPath(new URL("../../../.governance/semgrep", import.meta.url));
const TESTS = path.join(RULES, "tests");

interface Rule { id: string; file: string; block: string }

const ruleFiles = readdirSync(RULES).filter((name) => name.endsWith(".yml")).sort();
const rules: Rule[] = ruleFiles.flatMap((file) =>
  readFileSync(path.join(RULES, file), "utf8").replace(/\r\n/g, "\n").split(/^ {2}- id: /m).slice(1)
    .map((block) => ({ id: block.split("\n")[0]!.trim(), file, block })));
const testFiles = readdirSync(TESTS).sort();
const testText = (name: string) => readFileSync(path.join(TESTS, name), "utf8").replace(/\r\n/g, "\n");
const annotations = (kind: "ruleid" | "ok") =>
  testFiles.flatMap((name) => [...testText(name).matchAll(new RegExp(`${kind}: ([\\w-]+)`, "g"))].map((m) => m[1]!));

describe("committed Semgrep rule set", () => {
  it("exists and has rules in every language the adapter scans", () => {
    expect(rules.length).toBeGreaterThanOrEqual(15);
    expect(ruleFiles).toEqual(["go.yml", "javascript-typescript.yml", "python.yml"]);
  });

  it("gives every rule a unique gov- id, a message, a governance reference and a severity that counts", () => {
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const rule of rules) {
      expect(rule.id, rule.id).toMatch(/^gov-(js|py|go)-[a-z0-9-]+$/);
      // INFO is counted but never reported by the adapter, so an INFO rule could never raise a condition.
      expect(rule.block, rule.id).toMatch(/^ {4}severity: (ERROR|WARNING)$/m);
      expect(rule.block, rule.id).toMatch(/^ {4}message: /m);
      expect(rule.block, rule.id).toMatch(/^ {6}governance: (SEC|DB|CICD|QA)-\d{3} section \d+/m);
    }
  });

  it("keeps ERROR (a blocking P1) to rules that say what they match, and WARNING to those that call themselves heuristics", () => {
    for (const rule of rules) {
      const severity = /^ {4}severity: (\w+)$/m.exec(rule.block)![1];
      if (severity === "WARNING") expect(rule.block, rule.id).toContain("Heuristic");
      if (severity === "ERROR") expect(rule.block, rule.id).not.toContain("Heuristic");
    }
  });

  it("has a test file for every rules file and a positive and a negative example for every rule", () => {
    for (const file of ruleFiles) {
      const stem = file.replace(/\.yml$/, "");
      expect(testFiles.some((name) => name.startsWith(`${stem}.`) && name.endsWith(".txt")), `a test file for ${file}`).toBe(true);
    }
    const positives = annotations("ruleid");
    const negatives = annotations("ok");
    for (const rule of rules) {
      expect(positives, `${rule.id} needs a ruleid example`).toContain(rule.id);
      expect(negatives, `${rule.id} needs an ok example`).toContain(rule.id);
    }
  });

  it("annotates only rules that exist, so a renamed rule cannot leave a test that checks nothing", () => {
    const known = new Set(rules.map((r) => r.id));
    for (const id of [...annotations("ruleid"), ...annotations("ok")]) expect(known.has(id), id).toBe(true);
  });

  it("uses no suppression comment and no registry reference", () => {
    for (const name of [...ruleFiles, ...testFiles.map((f) => `tests/${f}`)]) {
      const text = readFileSync(path.join(RULES, name), "utf8");
      expect(text, name).not.toMatch(/nosemgrep|--config auto|(^|[\s"'=])p\/[a-z]/m);
    }
  });
});

// Needs a real Semgrep (the version ADR-0001 records was 1.186.0). Skipped, not passed, without one.
const semgrepBin = process.env.SEMGREP_BIN ?? "semgrep";
const semgrepAvailable = spawnSync(semgrepBin, ["--version"], { encoding: "utf8" }).status === 0;

describe("committed Semgrep rule set against the real tool", () => {
  it.skipIf(!semgrepAvailable)("passes semgrep --test: every ruleid line matches and no ok line does", () => {
    const work = mkdtempSync(path.join(os.tmpdir(), "governance-semgrep-"));
    try {
      const cases = path.join(work, "cases");
      mkdirSync(cases);
      for (const name of testFiles) copyFileSync(path.join(TESTS, name), path.join(cases, name.replace(/\.txt$/, "")));
      // Semgrep's parallel workers can race on their own settings file on Windows, which crashes a run
      // before any rule is checked. A fresh settings file per attempt, and one retry, keep that out.
      let output = "";
      let status: number | null = null;
      for (let attempt = 0; attempt < 2 && status !== 0; attempt += 1) {
        const run = spawnSync(
          semgrepBin,
          ["--test", "--metrics=off", "--disable-version-check", "--config", RULES, cases],
          { encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1", SEMGREP_SETTINGS_FILE: path.join(work, `settings-${attempt}.yml`), SEMGREP_LOG_FILE: path.join(work, "semgrep.log") } },
        );
        status = run.status;
        output = `${run.stdout}${run.stderr}`;
      }
      expect(output).toMatch(new RegExp(`${rules.length}/${rules.length}: .*All tests passed`));
      expect(status).toBe(0);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);
});
