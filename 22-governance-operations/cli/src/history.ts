import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { GovernanceEvaluation, GovernancePack } from "../../engine/src/types.js";

/** Where the history lives, relative to the repository root. */
export const HISTORY_PATH = ".governance/history/assessments.jsonl";
const GENESIS = "0".repeat(64);

/** The storage seam: the store is one append-only text file of JSON lines. */
export interface HistoryStorePort {
  read(repositoryPath: string): Promise<string | undefined>;
  append(repositoryPath: string, line: string): Promise<void>;
}

export const nodeHistoryStore: HistoryStorePort = {
  async read(repositoryPath) {
    try {
      return await readFile(path.join(repositoryPath, HISTORY_PATH), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  },
  async append(repositoryPath, line) {
    const file = path.join(repositoryPath, HISTORY_PATH);
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${line}\n`, "utf8");
  },
};

export interface IssueSnapshot {
  /** "violation:<controlId>" or "finding:<id>". */
  key: string;
  severity: string;
  status: string;
  message: string;
}

export interface AssessmentFacts {
  decision: "GO" | "GO_WITH_CONDITIONS" | "NO-GO";
  reason: string;
  project: string;
  change: string;
  /** SHA-256 of the governance pack file's exact bytes: the input the decision was made against. */
  pack_sha256: string;
  /** Git HEAD when recorded, so the decision can be tied to code. Absent outside a git checkout. */
  head?: string;
  issues: IssueSnapshot[];
  /** Evidence id to status: remediation shows up as UNVERIFIED/FAILED becoming VERIFIED. */
  evidence: Record<string, string>;
}

export interface HistoryRecord {
  seq: number;
  recorded_at: string;
  prev_hash: string;
  hash: string;
  assessment: AssessmentFacts;
}

/** Stable JSON: sorted keys, so the same data always hashes the same. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

function hashRecord(record: Omit<HistoryRecord, "hash">): string {
  return sha256(canonical(record));
}

export function sha256Hex(text: string): string {
  return sha256(text);
}

/** Reduce an evaluation to the facts worth keeping. Pure. */
export function assessmentFacts(
  pack: GovernancePack,
  packText: string,
  evaluation: GovernanceEvaluation,
  findings: readonly { id: string; severity: string; status: string; message: string }[],
  head?: string,
): AssessmentFacts {
  const issues: IssueSnapshot[] = [
    ...evaluation.violations.map((v) => ({ key: `violation:${v.controlId}`, severity: v.severity, status: v.status, message: v.message })),
    ...findings.map((f) => ({ key: `finding:${f.id}`, severity: f.severity, status: f.status, message: f.message })),
  ].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return {
    decision: evaluation.decision.status,
    reason: evaluation.decision.reason,
    project: pack.project.id,
    change: pack.change.id,
    pack_sha256: sha256(packText),
    ...(head ? { head } : {}),
    issues,
    evidence: Object.fromEntries(pack.evidence.map((e) => [e.id, e.status as string])),
  };
}

/**
 * Parse the store and verify the chain: every record must carry the next sequence number, point at
 * the previous record's hash and hash to its own value. Any edit, deletion or reordering throws.
 */
export function verifyHistory(text: string | undefined): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  const lines = (text ?? "").split("\n").filter((line) => line.trim() !== "");
  let previous = GENESIS;
  for (const [index, line] of lines.entries()) {
    let record: HistoryRecord;
    try {
      record = JSON.parse(line) as HistoryRecord;
    } catch {
      throw new Error(`History is corrupt: line ${index + 1} is not valid JSON.`);
    }
    const { hash, ...rest } = record;
    if (record.seq !== index + 1) throw new Error(`History is corrupt: line ${index + 1} has sequence ${record.seq}.`);
    if (record.prev_hash !== previous) throw new Error(`History chain is broken at record ${record.seq}: it does not follow the record before it.`);
    if (hash !== hashRecord(rest)) throw new Error(`History was altered: record ${record.seq} does not match its hash.`);
    records.push(record);
    previous = hash;
  }
  return records;
}

/**
 * Append one assessment. The existing chain is verified first, so a tampered history is never
 * extended. shortcut: two simultaneous writers can both claim the same seq; the next verify then
 * reports the break. Upgrade to a lock file if CI jobs record in parallel to one checkout.
 */
export async function recordAssessment(
  store: HistoryStorePort,
  repositoryPath: string,
  assessment: AssessmentFacts,
  now: Date = new Date(),
): Promise<HistoryRecord> {
  const records = verifyHistory(await store.read(repositoryPath));
  const last = records.at(-1);
  const body = {
    seq: (last?.seq ?? 0) + 1,
    recorded_at: now.toISOString(),
    prev_hash: last?.hash ?? GENESIS,
    assessment,
  };
  const record: HistoryRecord = { ...body, hash: hashRecord(body) };
  await store.append(repositoryPath, canonical(record));
  return record;
}

export async function readHistory(store: HistoryStorePort, repositoryPath: string): Promise<HistoryRecord[]> {
  return verifyHistory(await store.read(repositoryPath));
}

export interface IssueLifecycle {
  key: string;
  severity: string;
  message: string;
  first_seen: number;
  last_seen: number;
  /** OPEN while it appears in the latest assessment; otherwise RESOLVED at the first assessment without it. */
  state: "OPEN" | "RESOLVED";
  resolved_at?: number;
  /** True when it came back after being resolved. */
  reopened: boolean;
}

/** Derive each issue's lifecycle from the assessments, in order. Pure. */
export function issueLifecycles(records: readonly HistoryRecord[]): IssueLifecycle[] {
  const byKey = new Map<string, IssueLifecycle>();
  for (const record of records) {
    const present = new Set(record.assessment.issues.map((i) => i.key));
    for (const issue of record.assessment.issues) {
      const known = byKey.get(issue.key);
      if (!known) {
        byKey.set(issue.key, { key: issue.key, severity: issue.severity, message: issue.message, first_seen: record.seq, last_seen: record.seq, state: "OPEN", reopened: false });
      } else {
        if (known.state === "RESOLVED") known.reopened = true;
        Object.assign(known, { last_seen: record.seq, severity: issue.severity, message: issue.message, state: "OPEN" });
        delete known.resolved_at;
      }
    }
    for (const known of byKey.values()) {
      if (!present.has(known.key) && known.state === "OPEN") {
        known.state = "RESOLVED";
        known.resolved_at = record.seq;
      }
    }
  }
  return [...byKey.values()];
}

export interface AssessmentDiff {
  from: number;
  to: number;
  decision: { from: string; to: string };
  pack_changed: boolean;
  head: { from?: string; to?: string };
  introduced: IssueSnapshot[];
  resolved: IssueSnapshot[];
  /** Same issue in both, but its severity or status moved. */
  changed: { key: string; from: string; to: string }[];
  /** Evidence whose status moved: the remediation evidence. */
  evidence: { id: string; from: string; to: string }[];
}

export function diffAssessments(records: readonly HistoryRecord[], a: number, b: number): AssessmentDiff {
  const find = (seq: number): HistoryRecord => {
    const record = records.find((r) => r.seq === seq);
    if (!record) throw new Error(`No assessment ${seq} in the history (it holds ${records.length}).`);
    return record;
  };
  const from = find(a);
  const to = find(b);
  const before = new Map(from.assessment.issues.map((i) => [i.key, i]));
  const after = new Map(to.assessment.issues.map((i) => [i.key, i]));
  const ids = [...new Set([...Object.keys(from.assessment.evidence), ...Object.keys(to.assessment.evidence)])].sort();
  return {
    from: a,
    to: b,
    decision: { from: from.assessment.decision, to: to.assessment.decision },
    pack_changed: from.assessment.pack_sha256 !== to.assessment.pack_sha256,
    head: { ...(from.assessment.head ? { from: from.assessment.head } : {}), ...(to.assessment.head ? { to: to.assessment.head } : {}) },
    introduced: [...after.values()].filter((i) => !before.has(i.key)),
    resolved: [...before.values()].filter((i) => !after.has(i.key)),
    changed: [...after.values()].flatMap((i) => {
      const old = before.get(i.key);
      return old && `${old.severity}/${old.status}` !== `${i.severity}/${i.status}` ? [{ key: i.key, from: `${old.severity}/${old.status}`, to: `${i.severity}/${i.status}` }] : [];
    }),
    evidence: ids.flatMap((id) => {
      const x = from.assessment.evidence[id] ?? "(absent)";
      const y = to.assessment.evidence[id] ?? "(absent)";
      return x === y ? [] : [{ id, from: x, to: y }];
    }),
  };
}

export function formatHistory(records: readonly HistoryRecord[]): string {
  if (records.length === 0) return `No assessments recorded yet. Run \`governance check <repository> --record\` to start ${HISTORY_PATH}.`;
  const lines = [`# Assessment history (${records.length}, chain verified)`, "", "| # | Recorded | Decision | Issues | Head |", "|---|---|---|---|---|"];
  for (const r of records) {
    lines.push(`| ${r.seq} | ${r.recorded_at} | ${r.assessment.decision} | ${r.assessment.issues.length} | ${r.assessment.head?.slice(0, 8) ?? "-"} |`);
  }
  const lifecycles = issueLifecycles(records);
  lines.push("", "## Issue lifecycle", "");
  if (lifecycles.length === 0) lines.push("No issues have ever been recorded.");
  else {
    lines.push("| Issue | Severity | State | First seen | Last seen | Resolved at |", "|---|---|---|---|---|---|");
    for (const l of lifecycles) {
      lines.push(`| ${l.key}${l.reopened ? " (reopened)" : ""} | ${l.severity} | ${l.state} | #${l.first_seen} | #${l.last_seen} | ${l.resolved_at ? `#${l.resolved_at}` : "-"} |`);
    }
  }
  return lines.join("\n");
}

export function formatDiff(d: AssessmentDiff): string {
  const issue = (i: IssueSnapshot): string => `- ${i.key} (${i.severity}, ${i.status}): ${i.message}`;
  const section = (title: string, items: string[]): string[] => ["", `## ${title}`, "", ...(items.length ? items : ["None."])];
  return [
    `# Assessment #${d.from} to #${d.to}`,
    "",
    `Decision: ${d.decision.from} to ${d.decision.to}${d.decision.from === d.decision.to ? " (unchanged)" : ""}`,
    `Governance pack: ${d.pack_changed ? "changed" : "unchanged"}`,
    `Git head: ${d.head.from?.slice(0, 8) ?? "-"} to ${d.head.to?.slice(0, 8) ?? "-"}`,
    ...section("Resolved", d.resolved.map(issue)),
    ...section("Introduced", d.introduced.map(issue)),
    ...section("Changed", d.changed.map((c) => `- ${c.key}: ${c.from} to ${c.to}`)),
    ...section("Evidence status changes", d.evidence.map((e) => `- ${e.id}: ${e.from} to ${e.to}`)),
  ].join("\n");
}
