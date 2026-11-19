import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHECKPOINT_DIRECTORY, createCheckpoint, formatCheckpointReport, registeredKeys, verifyCheckpoints } from "../src/checkpoints.js";
import type { AuthorityPolicy } from "../src/config.js";
import type { SignaturePort } from "../src/exceptions.js";
import { HISTORY_PATH, nodeHistoryStore, readHistory, recordAssessment, type AssessmentFacts } from "../src/history.js";
import { runCli } from "../src/index.js";

const KEY = "AAAA BBBB CCCC DDDD EEEE FFFF 0000 1111 2222 3333";
const KEY_NORMAL = KEY.replaceAll(" ", "");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

const temp = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

const policy = (fingerprint: string | undefined = KEY, extra: Partial<AuthorityPolicy> = {}): AuthorityPolicy => ({
  version: "1.0.0", policy_id: "test", policy_version: "1.0.0", description: "t", ...extra,
  roles: [{
    id: "SENIOR_ENGINEERING_AUTHORITY", title: "Senior", severities: ["P1"], source_file: "f", source_section: "s", source_text: "t",
    holders: [{ name: "Sam Senior", ...(fingerprint ? { key_fingerprint: fingerprint } : {}) }], status: "APPROVED", effective_from: "2026-11-17",
  }],
});

/** A stand-in for GnuPG: a signature is valid exactly when it was made over this payload with that key. */
const fakeGpg = (signer = KEY_NORMAL): SignaturePort => ({
  sign: async (payload, key) => `SIG|${key}|${payload}`,
  verify: async (signature, payload) => {
    const [, key, signed] = signature.split("|") as [string, string, string];
    const good = signed === payload && signature.startsWith("SIG|");
    return { good, fingerprints: good ? [key === "signer" ? signer : key.replaceAll(" ", "")] : [], detail: good ? "good signature" : "bad signature (the approval was changed after signing)" };
  },
});

const facts = (decision: AssessmentFacts["decision"], n: number): AssessmentFacts => ({
  decision, reason: `r${n}`, project: "app", change: "CHG-1", pack_sha256: "p", evidence: {}, issues: [],
});

async function repoWithHistory(count: number): Promise<string> {
  const dir = await temp("governance-checkpoint-");
  for (let n = 1; n <= count; n += 1) await recordAssessment(nodeHistoryStore, dir, facts("NO-GO", n), new Date(`2026-11-0${n}T10:00:00Z`));
  return dir;
}

describe("signed checkpoints", () => {
  it("signs the newest record, and verifies against a key the policy registers", async () => {
    const dir = await repoWithHistory(3);
    const records = await readHistory(nodeHistoryStore, dir);
    expect(await createCheckpoint(dir, records, KEY_NORMAL, fakeGpg())).toEqual({ seq: 3, file: `${CHECKPOINT_DIRECTORY}/3.asc` });
    const report = await verifyCheckpoints(dir, records, policy(), fakeGpg());
    expect(report).toEqual({ verified: [3], problems: [], uncovered: 0 });
    expect(registeredKeys(policy())).toEqual([KEY_NORMAL]);
  });

  it("refuses to checkpoint an empty history or to replace an existing checkpoint", async () => {
    const empty = await temp("governance-checkpoint-empty-");
    await expect(createCheckpoint(empty, [], KEY_NORMAL, fakeGpg())).rejects.toThrow(/no recorded assessment/);
    const dir = await repoWithHistory(2);
    const records = await readHistory(nodeHistoryStore, dir);
    await createCheckpoint(dir, records, KEY_NORMAL, fakeGpg());
    await expect(createCheckpoint(dir, records, KEY_NORMAL, fakeGpg())).rejects.toThrow(/already has a checkpoint/);
  });

  it("detects deleted newest records, which the hash chain alone cannot", async () => {
    const dir = await repoWithHistory(3);
    await createCheckpoint(dir, await readHistory(nodeHistoryStore, dir), KEY_NORMAL, fakeGpg());
    const file = path.join(dir, HISTORY_PATH);
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    await writeFile(file, `${lines.slice(0, 2).join("\n")}\n`); // drop the newest record: the chain is still valid
    const records = await readHistory(nodeHistoryStore, dir);
    expect(records).toHaveLength(2);
    const report = await verifyCheckpoints(dir, records, policy(), fakeGpg());
    expect(report.problems).toEqual([expect.stringContaining("records were removed")]);
    expect(report.verified).toEqual([]);
  });

  it("detects a chain recomputed from scratch with a record changed", async () => {
    const dir = await repoWithHistory(3);
    await createCheckpoint(dir, await readHistory(nodeHistoryStore, dir), KEY_NORMAL, fakeGpg());
    // The forger rewrites the history so that assessment 2 reads GO, recomputing every hash so the chain is valid.
    await rm(path.join(dir, HISTORY_PATH));
    await recordAssessment(nodeHistoryStore, dir, facts("NO-GO", 1), new Date("2026-11-01T10:00:00Z"));
    await recordAssessment(nodeHistoryStore, dir, facts("GO", 2), new Date("2026-11-02T10:00:00Z"));
    await recordAssessment(nodeHistoryStore, dir, facts("NO-GO", 3), new Date("2026-11-03T10:00:00Z"));
    const records = await readHistory(nodeHistoryStore, dir); // verifies: the forged chain is internally consistent
    expect(records).toHaveLength(3);
    const report = await verifyCheckpoints(dir, records, policy(), fakeGpg());
    expect(report.problems).toEqual([expect.stringContaining("does not verify")]);
  });

  it("rejects a checkpoint signed by a key the policy does not register", async () => {
    const dir = await repoWithHistory(2);
    const records = await readHistory(nodeHistoryStore, dir);
    await createCheckpoint(dir, records, "1".repeat(40), fakeGpg());
    const report = await verifyCheckpoints(dir, records, policy(), fakeGpg());
    expect(report.problems).toEqual([expect.stringContaining("does not register")]);
    const keyless = { ...policy(), roles: [{ ...policy().roles[0]!, holders: [{ name: "Sam Senior" }] }] };
    expect((await verifyCheckpoints(dir, records, keyless, fakeGpg())).problems).toHaveLength(1);
  });

  it("says how many newer assessments are not yet vouched for, and ignores files that are not checkpoints", async () => {
    const dir = await repoWithHistory(2);
    await createCheckpoint(dir, await readHistory(nodeHistoryStore, dir), KEY_NORMAL, fakeGpg());
    await recordAssessment(nodeHistoryStore, dir, facts("NO-GO", 3));
    await writeFile(path.join(dir, CHECKPOINT_DIRECTORY, "notes.txt"), "x");
    await writeFile(path.join(dir, CHECKPOINT_DIRECTORY, "0.asc"), "x");
    const records = await readHistory(nodeHistoryStore, dir);
    const report = await verifyCheckpoints(dir, records, policy(), fakeGpg());
    expect(report).toEqual({ verified: [2], problems: [], uncovered: 1 });
    expect(formatCheckpointReport(report, records.length)).toContain("1 newer assessment is not yet vouched for");
    expect(formatCheckpointReport({ verified: [], problems: [], uncovered: 3 }, 3)).toContain("Nothing outside the chain vouches");
  });
});

const gpgAvailable = ((): boolean => { try { execFileSync("gpg", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } })();

type Json = Record<string, unknown>;
const pack = (): Json => ({
  version: "1.0.0",
  project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
  change: { id: "CHG-1", type: "configuration", title: "x", risk_class: "C", files: [] },
  standards: [{ id: "SEC-007", title: "Sec", version: "1.0.0", source: "x" }],
  controls: [{ id: "SEC-AUTH-001", standard: "SEC-007", title: "Auth", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" }],
  evidence: [{ id: "EVD-AUTH-001", type: "E2_INSPECTION", status: "UNVERIFIED", description: "d", source: "none", freshness: "current", supports_controls: ["SEC-AUTH-001"] }],
  risks: [], decisions: [], exceptions: [],
});

async function project(policyExtra: Json = {}, fingerprint = KEY_NORMAL): Promise<string> {
  const root = await temp("governance-ops5-");
  await writeFile(path.join(root, "package.json"), "{\"name\":\"app\"}\n");
  await mkdir(path.join(root, ".governance"), { recursive: true });
  await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(pack()));
  await writeFile(path.join(root, ".governance", "authority.json"), JSON.stringify({
    ...policy(fingerprint),
    roles: [{ ...policy(fingerprint).roles[0], source_file: "21-exceptions/21-engineering-exception-standard.md", source_section: "15. Approval Authority", source_text: "| P1 | Senior/Staff Engineering authority |" }],
    ...policyExtra,
  }));
  return root;
}

const capture = () => {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((c: string | Uint8Array) => { out.push(String(c)); return true; });
  vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array) => { err.push(String(c)); return true; });
  return { out: () => out.join(""), err: () => err.join(""), clear: () => { out.length = 0; err.length = 0; } };
};

describe("a policy that requires signed approvals", () => {
  async function approvedUnsigned(extra: Json): Promise<string> {
    const root = await project(extra);
    capture();
    await runCli(["exception", "request", root, "--id", "EXC-1", "--control", "SEC-AUTH-001", "--reason", "Bounded", "--by", "Rita Requester"]);
    await runCli(["exception", "approve", root, "--id", "EXC-1", "--by", "Sam Senior", "--role", "SENIOR_ENGINEERING_AUTHORITY", "--expires", "2999-01-01"]);
    return root;
  }

  it("does not honour an unsigned approval, without any flag", async () => {
    const root = await approvedUnsigned({ require_signed_approvals: true });
    const io = capture();
    await runCli(["check", root, "--authority", ".governance/authority.json"]);
    expect(io.out()).toContain("no verified signature");
  });

  it("without the requirement, the same approval is taken as declared", async () => {
    const root = await approvedUnsigned({});
    const io = capture();
    await runCli(["check", root, "--authority", ".governance/authority.json"]);
    expect(io.out()).toContain("not authenticated");
    expect(io.out()).not.toContain("no verified signature");
  });
});

describe.skipIf(!gpgAvailable)("checkpoints through the CLI with real GPG", () => {
  const previousHome = process.env.GNUPGHOME;
  afterEach(() => {
    try { execFileSync("gpgconf", ["--kill", "gpg-agent"], { stdio: "ignore" }); } catch { /* no agent to stop */ }
    if (previousHome === undefined) delete process.env.GNUPGHOME; else process.env.GNUPGHOME = previousHome;
  });

  async function key(): Promise<string> {
    const home = await temp("gnupg-");
    // Git's msys gpg only understands /c/... paths, native Windows and Unix gpg the plain path: use whichever works.
    const candidates = [home, home.replace(/^([A-Za-z]):[\\/]/, (_m, d: string) => `/${d.toLowerCase()}/`).replaceAll("\\", "/")];
    for (const candidate of candidates) {
      process.env.GNUPGHOME = candidate;
      try {
        execFileSync("gpg", ["--batch", "--passphrase", "", "--quick-gen-key", "Sam Senior <sam@example.com>", "ed25519", "sign", "never"], { stdio: "ignore" });
        return execFileSync("gpg", ["--with-colons", "--list-keys", "sam@example.com"], { encoding: "utf8" }).split("\n").find((line) => line.startsWith("fpr:"))!.split(":")[9]!;
      } catch { /* try the next spelling */ }
    }
    throw new Error("gpg is installed but could not create a key in a temporary home.");
  }

  it("signs a checkpoint, verifies it, and then catches the newest record being deleted", async () => {
    const fingerprint = await key();
    const root = await project({}, fingerprint);
    const io = capture();
    const authority = ".governance/authority.json";
    expect(await runCli(["check", root, "--record"])).toBe(2);
    expect(await runCli(["check", root, "--record"])).toBe(2);

    io.clear();
    expect(await runCli(["checkpoint", root, "--sign", fingerprint])).toBe(0);
    expect(io.out()).toContain(`Signed assessment 2 in ${CHECKPOINT_DIRECTORY}/2.asc`);
    expect(await readFile(path.join(root, CHECKPOINT_DIRECTORY, "2.asc"), "utf8")).toContain("BEGIN PGP SIGNATURE");
    expect(await runCli(["checkpoint", root, "--sign", fingerprint])).toBe(3); // never replaced

    io.clear();
    expect(await runCli(["history", root, "--authority", authority])).toBe(0);
    expect(io.out()).toContain("1 verified");

    const file = path.join(root, HISTORY_PATH);
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    await writeFile(file, `${lines[0]}\n`);
    io.clear();
    expect(await runCli(["history", root, "--authority", authority])).toBe(3);
    expect(io.out()).toContain("records were removed");
    expect(io.err()).toContain("failed its integrity check");

    // Without a policy there is nothing to verify checkpoints against, so only the chain is checked.
    io.clear();
    expect(await runCli(["history", root])).toBe(0);
  }, 120_000);
});
