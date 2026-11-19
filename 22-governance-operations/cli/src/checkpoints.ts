import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuthorityPolicy } from "./config.js";
import type { SignaturePort } from "./exceptions.js";
import { canonical, type HistoryRecord } from "./history.js";

/**
 * A checkpoint is a detached GPG signature over one history record's sequence number and hash, made by a
 * key registered in the authority policy. The hash chain alone cannot show that the newest records were
 * deleted, or that the whole chain was recomputed: a checkpoint can, because the signer vouched for a
 * specific record that is no longer there, or whose hash no longer matches.
 */
export const CHECKPOINT_DIRECTORY = ".governance/history/checkpoints";

export const checkpointPayload = (record: Pick<HistoryRecord, "seq" | "hash">): string =>
  canonical({ seq: record.seq, hash: record.hash });

const normalize = (fingerprint: string): string => fingerprint.replaceAll(" ", "").toUpperCase();

/** Every key the policy registers for an APPROVED role: the people who may vouch for the history. */
export function registeredKeys(policy: AuthorityPolicy): string[] {
  return policy.roles
    .filter((role) => role.status === "APPROVED")
    .flatMap((role) => role.holders)
    .flatMap((holder) => (holder.key_fingerprint ? [normalize(holder.key_fingerprint)] : []));
}

/** Sign the newest record. A checkpoint already written for that record is never replaced. */
export async function createCheckpoint(
  repositoryPath: string,
  records: readonly HistoryRecord[],
  keyId: string,
  gpg: SignaturePort,
): Promise<{ seq: number; file: string }> {
  const last = records.at(-1);
  if (!last) throw new Error("There is no recorded assessment to checkpoint. Run `governance check --record` first.");
  const file = `${CHECKPOINT_DIRECTORY}/${last.seq}.asc`;
  const target = path.join(repositoryPath, file);
  const existing = await readFile(target, "utf8").catch(() => undefined);
  if (existing !== undefined) throw new Error(`Assessment ${last.seq} already has a checkpoint (${file}); checkpoints are never replaced.`);
  const armored = await gpg.sign(checkpointPayload(last), keyId);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, armored, { encoding: "utf8", flag: "wx" });
  return { seq: last.seq, file };
}

export interface CheckpointReport {
  /** Checkpoints whose signature verified against the record they vouch for. */
  verified: number[];
  problems: string[];
  /** Records written after the newest checkpoint: not yet vouched for. */
  uncovered: number;
}

/**
 * Check every checkpoint file against the history. A problem is reported when a checkpoint vouches for a
 * record that is missing (history truncated), when its signature does not verify over the current record
 * (history rewritten, or the checkpoint altered), or when the signing key is not registered.
 */
export async function verifyCheckpoints(
  repositoryPath: string,
  records: readonly HistoryRecord[],
  policy: AuthorityPolicy,
  gpg: SignaturePort,
): Promise<CheckpointReport> {
  const directory = path.join(repositoryPath, CHECKPOINT_DIRECTORY);
  const names = await readdir(directory).catch(() => [] as string[]);
  const seqs = names.flatMap((name) => (/^[1-9][0-9]*\.asc$/.test(name) ? [Number(name.slice(0, -4))] : [])).sort((a, b) => a - b);
  const keys = registeredKeys(policy);
  const report: CheckpointReport = { verified: [], problems: [], uncovered: 0 };

  for (const seq of seqs) {
    const record = records.find((item) => item.seq === seq);
    if (!record) {
      report.problems.push(`Checkpoint ${seq} vouches for assessment ${seq}, but the history holds only ${records.length}: records were removed.`);
      continue;
    }
    const signature = await readFile(path.join(directory, `${seq}.asc`), "utf8");
    const result = await gpg.verify(signature, checkpointPayload(record));
    if (!result.good) {
      report.problems.push(`Checkpoint ${seq} does not verify (${result.detail}): the history was rewritten or the checkpoint was altered.`);
    } else if (!result.fingerprints.some((fingerprint) => keys.includes(fingerprint))) {
      report.problems.push(`Checkpoint ${seq} is signed by a key that the authority policy does not register.`);
    } else {
      report.verified.push(seq);
    }
  }
  report.uncovered = records.length - (seqs.at(-1) ?? 0);
  return report;
}

export function formatCheckpointReport(report: CheckpointReport, recordCount: number): string {
  const lines = ["", "## Checkpoints", ""];
  lines.push(
    report.verified.length === 0 && report.problems.length === 0
      ? "None. Nothing outside the chain vouches for this history yet (`governance checkpoint <repository> --sign <key>`)."
      : `${report.verified.length} verified${report.verified.length ? ` (assessments ${report.verified.join(", ")})` : ""}.`,
  );
  if (report.uncovered > 0 && recordCount > 0 && report.verified.length > 0) lines.push(`${report.uncovered} newer assessment${report.uncovered === 1 ? " is" : "s are"} not yet vouched for.`);
  for (const problem of report.problems) lines.push(`- PROBLEM: ${problem}`);
  return lines.join("\n");
}
