import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { daysUntil } from "../../engine/src/decision.js";
import type { GovernanceException, GovernancePack } from "../../engine/src/types.js";
import type { AuthorityPolicy } from "./config.js";
import { canonical } from "./history.js";

export const APPROVALS_DIRECTORY = ".governance/approvals";

// ---------------------------------------------------------------------------------------------
// Lifecycle: pure edits to a pack's exception list. Each returns a new pack and never mutates.
// ---------------------------------------------------------------------------------------------

function exceptionIn(pack: GovernancePack, id: string): GovernanceException {
  const found = (pack.exceptions ?? []).find((item) => item.id === id);
  if (!found) throw new Error(`No exception ${id} in the governance pack.`);
  return found;
}

function replaceException(pack: GovernancePack, next: GovernanceException): GovernancePack {
  return { ...pack, exceptions: (pack.exceptions ?? []).map((item) => (item.id === next.id ? next : item)) };
}

/** An expiry may be a date (end of that day, UTC) or a full timestamp; it must lie in the future. */
export function parseExpiry(value: string | undefined, now: Date): string {
  if (!value) throw new Error("--expires is required (a date such as 2026-12-31, or a full timestamp).");
  const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.000Z` : value;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) throw new Error(`--expires is not a valid date or timestamp: ${value}`);
  if (parsed <= now.getTime()) throw new Error(`--expires ${value} is not in the future.`);
  return new Date(parsed).toISOString();
}

export function requestException(
  pack: GovernancePack,
  input: { id: string; control: string; reason: string; requestedBy: string },
  now: Date,
): GovernancePack {
  if ((pack.exceptions ?? []).some((item) => item.id === input.id)) throw new Error(`Exception ${input.id} already exists; ids are never reused.`);
  if (!pack.controls.some((control) => control.id === input.control)) throw new Error(`Control ${input.control} is not in the governance pack.`);
  const record: GovernanceException = {
    id: input.id, status: "REQUESTED", control: input.control, reason: input.reason,
    project_id: pack.project.id, change_id: pack.change.id,
    requested_by: input.requestedBy, requested_at: now.toISOString(),
  };
  return { ...pack, exceptions: [...(pack.exceptions ?? []), record] };
}

interface ApprovalInput { by: string; role?: string; expires?: string }

function approve(pack: GovernancePack, existing: GovernanceException, input: ApprovalInput, now: Date): GovernancePack {
  if (existing.requested_by?.trim().toLowerCase() === input.by.trim().toLowerCase()) {
    throw new Error("The requester cannot approve their own exception (EXC-021 section 15).");
  }
  const expiresAt = parseExpiry(input.expires, now);
  const { approval_signature: _stale, ...rest } = existing; // an earlier signature does not cover the new terms
  const next: GovernanceException = {
    ...rest, status: "APPROVED", approved_by: input.by, approved_at: now.toISOString(), expires_at: expiresAt,
    ...(input.role ? { approver_role: input.role } : {}),
  };
  if (!input.role) delete next.approver_role;
  return replaceException(pack, next);
}

export function approveException(pack: GovernancePack, id: string, input: ApprovalInput, now: Date): GovernancePack {
  const existing = exceptionIn(pack, id);
  if (existing.status !== "REQUESTED") throw new Error(`Exception ${id} is ${existing.status}; only a REQUESTED exception can be approved (use renew for an expired one).`);
  return approve(pack, existing, input, now);
}

/** Renewal is a fresh approval with a later expiry; the earlier approval stays in git history and the assessment history. */
export function renewException(pack: GovernancePack, id: string, input: ApprovalInput, now: Date): GovernancePack {
  const existing = exceptionIn(pack, id);
  if (existing.status !== "APPROVED" && existing.status !== "EXPIRED") throw new Error(`Exception ${id} is ${existing.status}; only an APPROVED or EXPIRED exception can be renewed.`);
  const next = approve(pack, existing, input, now);
  const renewed = exceptionIn(next, id);
  if (existing.expires_at && Date.parse(renewed.expires_at!) <= Date.parse(existing.expires_at)) {
    throw new Error(`A renewal must extend the exception beyond its current expiry (${existing.expires_at}).`);
  }
  return next;
}

/** Persist expiry: every APPROVED exception whose time has passed becomes EXPIRED. */
export function expireExceptions(pack: GovernancePack, now: Date): { pack: GovernancePack; expired: string[] } {
  const expired: string[] = [];
  const exceptions = (pack.exceptions ?? []).map((item) => {
    if (item.status === "APPROVED" && item.expires_at && Date.parse(item.expires_at) <= now.getTime()) {
      expired.push(item.id);
      return { ...item, status: "EXPIRED" as const };
    }
    return item;
  });
  return { pack: { ...pack, exceptions }, expired };
}

export interface ExceptionRow {
  id: string;
  control: string;
  status: string;
  expires_at?: string;
  /** Whole days left; negative once lapsed. */
  days_left?: number;
  note: string;
  signature?: string;
}

export function exceptionRows(pack: GovernancePack, now: Date, warnDays = 14): ExceptionRow[] {
  return (pack.exceptions ?? []).map((item) => {
    const days = item.status === "APPROVED" ? daysUntil(item.expires_at, now.toISOString()) : undefined;
    const note =
      item.status === "REQUESTED" ? "awaiting approval"
      : item.status === "EXPIRED" ? "expired; renew or close"
      : days === undefined ? ""
      : days <= 0 ? "LAPSED (run exception expire)"
      : days <= warnDays ? `expiring in ${days} day${days === 1 ? "" : "s"}`
      : "";
    return { id: item.id, control: item.control ?? "", status: item.status, ...(item.expires_at ? { expires_at: item.expires_at } : {}), ...(days !== undefined ? { days_left: days } : {}), note };
  });
}

export function formatExceptionRows(rows: readonly ExceptionRow[]): string {
  if (rows.length === 0) return "No exceptions in the governance pack.";
  return [
    "| Exception | Control | Status | Expires | Note | Signature |", "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.control} | ${r.status} | ${r.expires_at?.slice(0, 10) ?? "-"} | ${r.note || "-"} | ${r.signature ?? "-"} |`),
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Signed approvals. The approval payload is signed with GPG; the CLI verifies the signature and that
// the signing key belongs to the named approver in the authority policy.
// ---------------------------------------------------------------------------------------------

/** The exact text that is signed: every field that makes up the approval, in a stable form. */
export function approvalPayload(exception: GovernanceException): string {
  const { id, control, project_id, change_id, reason, requested_by, requested_at, approved_by, approver_role, approved_at, expires_at } = exception;
  return canonical({ id, control, project_id, change_id, reason, requested_by, requested_at, approved_by, approver_role, approved_at, expires_at });
}

export interface SignatureVerification {
  good: boolean;
  /** Signing key fingerprints (the signing subkey and its primary key), upper-case, no spaces. */
  fingerprints: string[];
  detail: string;
}

/** The signing seam: GnuPG in production, a fake in tests that do not have gpg. */
export interface SignaturePort {
  sign(payload: string, keyId: string): Promise<string>;
  verify(signature: string, payload: string): Promise<SignatureVerification>;
}

function runGpg(args: string[], input: string, timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("gpg", args, { windowsHide: true, timeout: timeoutMs });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => reject(new Error(`Could not run gpg (${error.message}). Install GnuPG to sign or verify approvals.`)));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.on("error", () => undefined);
    child.stdin.end(input);
  });
}

export const gpgSignaturePort: SignaturePort = {
  async sign(payload, keyId) {
    const result = await runGpg(["--armor", "--detach-sign", "--local-user", keyId], payload, 120_000);
    if (result.code !== 0) throw new Error(`gpg could not sign with key ${keyId}: ${result.stderr.trim()}`);
    return result.stdout;
  },
  async verify(signature, payload) {
    const directory = await mkdtemp(path.join(os.tmpdir(), "governance-sig-"));
    try {
      const file = path.join(directory, "approval.asc");
      await writeFile(file, signature, "utf8");
      const result = await runGpg(["--batch", "--no-tty", "--status-fd", "1", "--verify", file, "-"], payload, 30_000);
      const status = result.stdout.split("\n").filter((line) => line.startsWith("[GNUPG:] "));
      const has = (tag: string): boolean => status.some((line) => line.startsWith(`[GNUPG:] ${tag} `));
      // GOODSIG and VALIDSIG together; an expired or revoked key reports EXPKEYSIG/REVKEYSIG instead of GOODSIG.
      const good = result.code === 0 && has("GOODSIG") && has("VALIDSIG");
      const fingerprints = status
        .filter((line) => line.startsWith("[GNUPG:] VALIDSIG "))
        .flatMap((line) => { const f = line.split(" "); return [f[2], f[11]]; })
        .filter((value): value is string => !!value && /^[0-9A-Fa-f]{40,64}$/.test(value))
        .map((value) => value.toUpperCase());
      const detail = good ? "good signature" : has("EXPKEYSIG") ? "signing key has expired" : has("REVKEYSIG") ? "signing key was revoked" : has("ERRSIG") ? "signing key is not in the keyring" : has("BADSIG") ? "bad signature (the approval was changed after signing)" : "signature could not be verified";
      return { good, fingerprints, detail };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
};

const normalizeFingerprint = (value: string): string => value.replaceAll(" ", "").toUpperCase();

/** The fingerprints an approver may sign with: those of APPROVED-role holders matching name or handle. */
export function approverKeys(policy: AuthorityPolicy, approver: string, role: string | undefined): string[] {
  const wanted = approver.trim().toLowerCase();
  return policy.roles
    .filter((r) => r.status === "APPROVED" && (!role || r.id === role))
    .flatMap((r) => r.holders)
    .filter((h) => [h.name, h.handle].some((x) => x && x.toLowerCase() === wanted))
    .flatMap((h) => (h.key_fingerprint ? [normalizeFingerprint(h.key_fingerprint)] : []));
}

export interface ApprovalCheck { id: string; verified: boolean; detail: string }

/**
 * Verify the signature on every APPROVED exception. Verified means: a signature file exists inside the
 * repository, GPG reports a good signature over the current approval payload, and the signing key is one
 * registered for that approver in the authority policy. Anything else is unverified, with the reason.
 */
export async function verifyApprovals(
  pack: GovernancePack,
  policy: AuthorityPolicy,
  gpg: SignaturePort,
  readFileText: (relativePath: string) => Promise<string | undefined>,
): Promise<ApprovalCheck[]> {
  const checks: ApprovalCheck[] = [];
  for (const item of (pack.exceptions ?? []).filter((e) => e.status === "APPROVED")) {
    const fail = (detail: string): void => { checks.push({ id: item.id, verified: false, detail }); };
    if (!item.approval_signature) { fail("no approval_signature recorded"); continue; }
    const signature = await readFileText(item.approval_signature).catch(() => undefined);
    if (signature === undefined) { fail(`signature file ${item.approval_signature} not found`); continue; }
    const keys = approverKeys(policy, item.approved_by ?? "", item.approver_role);
    if (keys.length === 0) { fail(`no registered key for ${item.approved_by ?? "(unnamed approver)"} in the authority policy`); continue; }
    const result = await gpg.verify(signature, approvalPayload(item));
    if (!result.good) { fail(result.detail); continue; }
    if (!result.fingerprints.some((f) => keys.includes(f))) { fail("signed by a key that is not registered for the approver"); continue; }
    checks.push({ id: item.id, verified: true, detail: "good signature from the approver's registered key" });
  }
  return checks;
}

/** Sign the approval and write the detached signature under .governance/approvals/, returning its relative path. */
export async function signApproval(
  repositoryPath: string,
  exception: GovernanceException,
  keyId: string,
  gpg: SignaturePort,
): Promise<string> {
  const armored = await gpg.sign(approvalPayload(exception), keyId);
  const relative = `${APPROVALS_DIRECTORY}/${exception.id}.asc`;
  await mkdir(path.join(repositoryPath, APPROVALS_DIRECTORY), { recursive: true });
  await writeFile(path.join(repositoryPath, relative), armored, "utf8");
  return relative;
}

/** Write the pack back (2-space JSON), only inside the repository. Validation is the caller's job. */
export async function writePack(repositoryPath: string, packPath: string, pack: GovernancePack): Promise<void> {
  const root = path.resolve(repositoryPath);
  const target = path.resolve(root, packPath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Pack path escapes the repository: ${packPath}`);
  await writeFile(target, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
}
