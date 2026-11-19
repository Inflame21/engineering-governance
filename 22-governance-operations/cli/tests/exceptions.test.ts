import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GovernancePack } from "../../engine/src/types.js";
import type { AuthorityPolicy } from "../src/config.js";
import {
  approvalPayload, approveException, approverKeys, exceptionRows, expireExceptions, formatExceptionRows, renewException,
  requestException, verifyApprovals, type SignaturePort,
} from "../src/exceptions.js";
import { parseCliArguments, runCli } from "../src/index.js";

const NOW = new Date("2026-11-19T10:00:00Z");
const FP = "AAAA BBBB CCCC DDDD EEEE FFFF 0000 1111 2222 3333";

const basePack = (): GovernancePack => ({
  version: "1.0.0",
  project: { id: "app", name: "app", repository: "acme/app", environment: "development" },
  change: { id: "CHG-1", type: "configuration", title: "x", risk_class: "C", files: [] },
  standards: [{ id: "SEC-007", title: "Sec", version: "1.0.0", source: "x" }],
  controls: [{ id: "SEC-AUTH-001", standard: "SEC-007", title: "Auth", severity: "P1", required_evidence: ["EVD-AUTH-001"], failure_decision: "NO-GO" }],
  evidence: [{ id: "EVD-AUTH-001", type: "E2_INSPECTION", status: "UNVERIFIED", description: "d", source: "none", freshness: "current", supports_controls: ["SEC-AUTH-001"] }],
  risks: [], decisions: [], exceptions: [],
});

const policy = (fingerprint: string | undefined = FP): AuthorityPolicy => ({
  version: "1.0.0", policy_id: "test", policy_version: "1.0.0", description: "t",
  roles: [{
    id: "SENIOR_ENGINEERING_AUTHORITY", title: "Senior", severities: ["P1", "P2", "P3"], source_file: "f", source_section: "s", source_text: "t",
    holders: [{ name: "Sam Senior", handle: "@sam", ...(fingerprint ? { key_fingerprint: fingerprint } : {}) }], status: "APPROVED", effective_from: "2026-11-17",
  }],
});

const requested = () => requestException(basePack(), { id: "EXC-1", control: "SEC-AUTH-001", reason: "Bounded.", requestedBy: "Rita Requester" }, NOW);
const approved = () => approveException(requested(), "EXC-1", { by: "Sam Senior", role: "SENIOR_ENGINEERING_AUTHORITY", expires: "2026-12-31" }, NOW);

describe("exception lifecycle", () => {
  it("requests, then approves with an expiry, recording who and when", () => {
    expect(requested().exceptions![0]).toMatchObject({ status: "REQUESTED", project_id: "app", change_id: "CHG-1", requested_by: "Rita Requester" });
    expect(approved().exceptions![0]).toMatchObject({ status: "APPROVED", approved_by: "Sam Senior", expires_at: "2026-12-31T23:59:59.000Z" });
  });

  it("refuses a duplicate id, an unknown control, a self-approval and a past or invalid expiry", () => {
    expect(() => requestException(requested(), { id: "EXC-1", control: "SEC-AUTH-001", reason: "r", requestedBy: "x" }, NOW)).toThrow(/already exists/);
    expect(() => requestException(basePack(), { id: "EXC-2", control: "NOPE", reason: "r", requestedBy: "x" }, NOW)).toThrow(/not in the governance pack/);
    expect(() => approveException(requested(), "EXC-1", { by: "rita requester", expires: "2026-12-31" }, NOW)).toThrow(/cannot approve their own/);
    expect(() => approveException(requested(), "EXC-1", { by: "Sam", expires: "2026-11-01" }, NOW)).toThrow(/not in the future/);
    expect(() => approveException(requested(), "EXC-1", { by: "Sam", expires: "soon" }, NOW)).toThrow(/not a valid date/);
    expect(() => approveException(approved(), "EXC-1", { by: "Sam", expires: "2027-01-01" }, NOW)).toThrow(/only a REQUESTED/);
  });

  it("marks lapsed approvals EXPIRED and leaves the rest alone", () => {
    const { pack, expired } = expireExceptions(approved(), new Date("2027-01-02T00:00:00Z"));
    expect(expired).toEqual(["EXC-1"]);
    expect(pack.exceptions![0]!.status).toBe("EXPIRED");
    expect(expireExceptions(approved(), NOW).expired).toEqual([]);
  });

  it("renews an approved or expired exception with a later expiry and drops the old signature", () => {
    const signed = { ...approved(), exceptions: [{ ...approved().exceptions![0]!, approval_signature: ".governance/approvals/EXC-1.asc" }] };
    const renewed = renewException(signed, "EXC-1", { by: "Sam Senior", role: "SENIOR_ENGINEERING_AUTHORITY", expires: "2027-03-31" }, NOW);
    expect(renewed.exceptions![0]).toMatchObject({ status: "APPROVED", expires_at: "2027-03-31T23:59:59.000Z" });
    expect(renewed.exceptions![0]!.approval_signature).toBeUndefined();
    const lapsed = expireExceptions(approved(), new Date("2027-01-02T00:00:00Z")).pack;
    expect(renewException(lapsed, "EXC-1", { by: "Sam", expires: "2027-06-30" }, new Date("2027-01-02T00:00:00Z")).exceptions![0]!.status).toBe("APPROVED");
    expect(() => renewException(approved(), "EXC-1", { by: "Sam", expires: "2026-12-01" }, NOW)).toThrow(/beyond its current expiry/);
    expect(() => renewException(requested(), "EXC-1", { by: "Sam", expires: "2027-01-01" }, NOW)).toThrow(/only an APPROVED or EXPIRED/);
  });

  it("lists days left and flags what is expiring or lapsed", () => {
    const soon = approveException(requested(), "EXC-1", { by: "Sam", expires: "2026-11-25" }, NOW);
    expect(exceptionRows(soon, NOW)[0]).toMatchObject({ status: "APPROVED", days_left: 7, note: "expiring in 7 days" });
    expect(exceptionRows(approved(), NOW)[0]!.note).toBe("");
    expect(exceptionRows(soon, new Date("2026-12-01T00:00:00Z"))[0]!.note).toContain("LAPSED");
    expect(exceptionRows(requested(), NOW)[0]!.note).toBe("awaiting approval");
    expect(formatExceptionRows(exceptionRows(soon, NOW))).toContain("expiring in 7 days");
    expect(formatExceptionRows([])).toContain("No exceptions");
  });
});

describe("signed approval verification", () => {
  const withSignature = (): GovernancePack => ({ ...approved(), exceptions: [{ ...approved().exceptions![0]!, approval_signature: "sig.asc" }] });
  const read = async (file: string) => (file === "sig.asc" ? "ARMOR" : undefined);
  const port = (result: Awaited<ReturnType<SignaturePort["verify"]>>): SignaturePort => ({ sign: async () => "", verify: vi.fn(async () => result) });
  const good = { good: true, fingerprints: [FP.replaceAll(" ", "")], detail: "good signature" };

  it("finds the approver's keys by name or handle, ignoring case", () => {
    expect(approverKeys(policy(), "sam senior", "SENIOR_ENGINEERING_AUTHORITY")).toEqual([FP.replaceAll(" ", "")]);
    expect(approverKeys(policy(), "@SAM", undefined)).toHaveLength(1);
    expect(approverKeys(policy(), "Someone Else", undefined)).toEqual([]);
  });

  it("verifies a good signature from the registered key", async () => {
    const gpg = port(good);
    expect(await verifyApprovals(withSignature(), policy(), gpg, read)).toEqual([{ id: "EXC-1", verified: true, detail: expect.stringContaining("good signature") }]);
    expect(gpg.verify).toHaveBeenCalledWith("ARMOR", approvalPayload(withSignature().exceptions![0]!));
  });

  it.each([
    ["no signature recorded", () => approved(), good, /no approval_signature/],
    ["a missing signature file", () => ({ ...approved(), exceptions: [{ ...approved().exceptions![0]!, approval_signature: "gone.asc" }] }), good, /not found/],
    ["a bad signature", withSignature, { good: false, fingerprints: [], detail: "bad signature (the approval was changed after signing)" }, /changed after signing/],
    ["a key that is not the approver's", withSignature, { good: true, fingerprints: ["1".repeat(40)], detail: "good signature" }, /not registered for the approver/],
  ])("does not verify: %s", async (_name, make, result, reason) => {
    const [check] = await verifyApprovals(make(), policy(), port(result), read);
    expect(check).toMatchObject({ id: "EXC-1", verified: false });
    expect(check!.detail).toMatch(reason);
  });

  it("does not verify when the policy registers no key for the approver", async () => {
    const [check] = await verifyApprovals(withSignature(), { ...policy(), roles: [{ ...policy().roles[0]!, holders: [{ name: "Sam Senior" }] }] }, port(good), read);
    expect(check!.detail).toMatch(/no registered key/);
  });

  it("the signed payload changes when any approval term changes", () => {
    const original = withSignature().exceptions![0]!;
    for (const change of [{ expires_at: "2099-01-01T00:00:00.000Z" }, { approved_by: "Eve" }, { reason: "other" }, { control: "X" }]) {
      expect(approvalPayload({ ...original, ...change })).not.toBe(approvalPayload(original));
    }
    expect(approvalPayload({ ...original, approval_signature: "other.asc" })).toBe(approvalPayload(original));
  });
});

describe("exception command line", () => {
  it("parses each action and rejects missing or misplaced options", () => {
    expect(parseCliArguments(["exception", "approve", "repo", "--id", "EXC-1", "--by", "Sam", "--expires", "2026-12-31", "--sign", "KEY"]).exception)
      .toEqual({ action: "approve", id: "EXC-1", by: "Sam", expires: "2026-12-31", sign: "KEY" });
    expect(parseCliArguments(["exception", "list"]).exception).toEqual({ action: "list" });
    expect(() => parseCliArguments(["exception", "approve", "--id", "EXC-1"])).toThrow(/requires --by/);
    expect(() => parseCliArguments(["exception", "bogus"])).toThrow(/needs an action/);
    expect(() => parseCliArguments(["exception", "request", "--id", "E", "--control", "c", "--reason", "r", "--by", "b", "--sign", "K"])).toThrow(/only supported by exception approve and renew/);
    expect(() => parseCliArguments(["check", ".", "--by", "x"])).toThrow(/only supported by the exception command/);
    expect(() => parseCliArguments(["check", ".", "--verify-signatures"])).toThrow(/requires --authority/);
    expect(parseCliArguments(["check", ".", "--verify-signatures", "--authority", "a.json"]).verifySignatures).toBe(true);
  });
});

const gpgAvailable = ((): boolean => { try { execFileSync("gpg", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe.skipIf(!gpgAvailable)("exceptions through the CLI with real GPG", () => {
  const roots: string[] = [];
  const previousHome = process.env.GNUPGHOME;
  afterEach(async () => {
    vi.restoreAllMocks();
    try { execFileSync("gpgconf", ["--kill", "gpg-agent"], { stdio: "ignore" }); } catch { /* no agent to stop */ }
    if (previousHome === undefined) delete process.env.GNUPGHOME; else process.env.GNUPGHOME = previousHome;
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });

  async function setup(): Promise<{ root: string; fingerprint: string }> {
    const home = await mkdtemp(path.join(os.tmpdir(), "gnupg-"));
    const root = await mkdtemp(path.join(os.tmpdir(), "governance-exc-"));
    roots.push(home, root);
    // Git's msys gpg only understands /c/... paths, native Windows and Unix gpg the plain path: use whichever works.
    const candidates = [home, home.replace(/^([A-Za-z]):[\\/]/, (_m, d: string) => `/${d.toLowerCase()}/`).replaceAll("\\", "/")];
    let generated = false;
    for (const candidate of candidates) {
      process.env.GNUPGHOME = candidate;
      try {
        execFileSync("gpg", ["--batch", "--passphrase", "", "--quick-gen-key", "Sam Senior <sam@example.com>", "ed25519", "sign", "never"], { stdio: "ignore" });
        generated = true;
        break;
      } catch { /* try the next spelling */ }
    }
    if (!generated) throw new Error("gpg is installed but could not create a key in a temporary home.");
    const fingerprint = execFileSync("gpg", ["--with-colons", "--list-keys", "sam@example.com"], { encoding: "utf8" })
      .split("\n").find((line) => line.startsWith("fpr:"))!.split(":")[9]!;
    await writeFile(path.join(root, "package.json"), "{\"name\":\"app\"}\n");
    await mkdir(path.join(root, ".governance"), { recursive: true });
    await writeFile(path.join(root, ".governance", "governance-pack.json"), JSON.stringify(basePack()));
    await writeFile(path.join(root, ".governance", "authority.json"), JSON.stringify({
      ...policy(fingerprint),
      roles: [{ ...policy(fingerprint).roles[0], source_file: "21-exceptions/21-engineering-exception-standard.md", source_section: "15. Approval Authority", source_text: "| P1 | Senior/Staff Engineering authority |" }],
    }));
    return { root, fingerprint };
  }

  const capture = () => {
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c: string | Uint8Array) => { out.push(String(c)); return true; });
    vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array) => { err.push(String(c)); return true; });
    return { out: () => out.join(""), err: () => err.join(""), clear: () => { out.length = 0; err.length = 0; } };
  };

  it("signs an approval, verifies it, and stops honouring it once it is edited", async () => {
    const { root, fingerprint } = await setup();
    const io = capture();
    const pack = path.join(root, ".governance", "governance-pack.json");
    const authority = ".governance/authority.json";

    expect(await runCli(["exception", "request", root, "--id", "EXC-1", "--control", "SEC-AUTH-001", "--reason", "Bounded", "--by", "Rita Requester"])).toBe(0);
    expect(await runCli(["exception", "approve", root, "--id", "EXC-1", "--by", "Sam Senior", "--role", "SENIOR_ENGINEERING_AUTHORITY", "--expires", "2999-01-01", "--sign", fingerprint])).toBe(0);
    expect(io.out()).toContain("signed (.governance/approvals/EXC-1.asc)");
    expect(await readFile(path.join(root, ".governance", "approvals", "EXC-1.asc"), "utf8")).toContain("BEGIN PGP SIGNATURE");

    io.clear();
    const code = await runCli(["exception", "list", root, "--authority", authority]);
    expect(io.err()).toBe("");
    expect(code).toBe(0);
    expect(io.out()).toContain("verified");
    expect(io.out()).not.toContain("NOT verified");

    io.clear();
    await runCli(["check", root, "--authority", authority, "--verify-signatures"]);
    expect(io.out()).toContain("signature was verified");

    // Change the approved expiry by hand: the signature no longer covers the terms.
    const edited = JSON.parse(await readFile(pack, "utf8")) as GovernancePack;
    edited.exceptions![0]!.expires_at = "3000-01-01T00:00:00.000Z";
    await writeFile(pack, JSON.stringify(edited));
    io.clear();
    expect(await runCli(["exception", "list", root, "--authority", authority])).toBe(0);
    expect(io.out()).toContain("NOT verified: bad signature");
    io.clear();
    expect(await runCli(["check", root, "--authority", authority, "--verify-signatures"])).toBe(2);
    expect(io.out()).toContain("no verified signature");

    // Without --verify-signatures the declared approval is still taken as declared.
    io.clear();
    await runCli(["check", root, "--authority", authority]);
    expect(io.out()).toContain("not authenticated");
  });

  it("renewal replaces the signed approval, and expire persists lapsed exceptions", async () => {
    const { root, fingerprint } = await setup();
    const io = capture();
    await runCli(["exception", "request", root, "--id", "EXC-1", "--control", "SEC-AUTH-001", "--reason", "Bounded", "--by", "Rita Requester"]);
    await runCli(["exception", "approve", root, "--id", "EXC-1", "--by", "Sam Senior", "--role", "SENIOR_ENGINEERING_AUTHORITY", "--expires", "2999-01-01", "--sign", fingerprint]);
    const first = await readFile(path.join(root, ".governance", "approvals", "EXC-1.asc"), "utf8");
    io.clear();
    expect(await runCli(["exception", "renew", root, "--id", "EXC-1", "--by", "Sam Senior", "--role", "SENIOR_ENGINEERING_AUTHORITY", "--expires", "2999-06-01", "--sign", fingerprint])).toBe(0);
    expect(io.out()).toContain("Renewed EXC-1 until 2999-06-01");
    expect(await readFile(path.join(root, ".governance", "approvals", "EXC-1.asc"), "utf8")).not.toBe(first);

    io.clear();
    expect(await runCli(["exception", "expire", root])).toBe(0);
    expect(io.out()).toContain("No approved exception has lapsed");
  });

  it("refuses to approve without a valid expiry before touching the pack", async () => {
    const { root } = await setup();
    const io = capture();
    await runCli(["exception", "request", root, "--id", "EXC-1", "--control", "SEC-AUTH-001", "--reason", "Bounded", "--by", "Rita Requester"]);
    const before = await readFile(path.join(root, ".governance", "governance-pack.json"), "utf8");
    expect(await runCli(["exception", "approve", root, "--id", "EXC-1", "--by", "Sam Senior", "--expires", "2001-01-01"])).toBe(3);
    expect(io.err()).toContain("not in the future");
    expect(await readFile(path.join(root, ".governance", "governance-pack.json"), "utf8")).toBe(before);
  });
});
