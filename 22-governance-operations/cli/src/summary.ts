import { readdir } from "node:fs/promises";
import path from "node:path";
import type {
  ControlEvaluation,
  GovernanceFinding,
  GovernancePack,
  GovernanceViolation,
  Severity,
} from "../../engine/src/types.js";
import { runGovernanceCommand } from "./commands.js";
import { loadGovernancePack } from "./config.js";
import { discoverRepositories, type DiscoveredRepository } from "./discover.js";
import { loadRepositorySnapshot, nodeFileSystem } from "./filesystem.js";
import { createNewFile } from "./init.js";

/** The areas `/engineering-governance:review` covers. A test keeps this equal to review-areas.json. */
export const REVIEW_AREAS = ["security", "architecture", "api", "data", "testing", "cicd", "frontend", "observability"] as const;
export type ReviewArea = (typeof REVIEW_AREAS)[number];

/** The standard whose controls belong to each area. */
const AREA_STANDARD: Record<ReviewArea, string> = {
  security: "SEC-007",
  architecture: "ARC-002",
  api: "API-006",
  data: "DB-005",
  testing: "QA-008",
  cicd: "CICD-012",
  frontend: "FE-004",
  observability: "OBS-014",
};

const PACK_PATH = ".governance/governance-pack.json";
const REPORTS_DIRECTORY = ".governance/reports";
const severityRank: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export interface AreaSummary {
  area: ReviewArea;
  standard: string;
  controls: number;
  controlsNotPassing: number;
  lastReview?: { date: string; file: string; coverage?: string };
  openFindings: number;
  /** A repository signal that suggests the area matters, if one was found. */
  signal?: string;
  /** True when the signal is present but the pack has no control for the area. A prompt to check, not a verdict. */
  possibleGap: boolean;
}

export interface RepositorySummary {
  generatedOn: string;
  repository: { path: string; branch?: string; head?: string; uncommittedChanges?: number };
  pack?: { project: string; change: string; standards: number; controls: number; evidence: number; findings: number };
  assessment?: {
    decision: "GO" | "GO_WITH_CONDITIONS" | "NO-GO";
    analysisStatus?: string;
    blocking: Array<{ id: string; severity: Severity; message: string }>;
    conditions: Array<{ id: string; severity: Severity; message: string }>;
  };
  controls: Array<{ id: string; standard: string; severity: Severity; status: string; missingEvidence: string[] }>;
  findings: {
    bySeverity: Record<Severity, number>;
    open: Array<{ id: string; severity: Severity; status: string; location?: string; message: string }>;
    total: number;
  };
  areas: AreaSummary[];
  reviewReports: string[];
}

function oneLine(value: string, limit = 140): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}…` : collapsed;
}

function cell(value: string): string {
  return oneLine(value).replaceAll("|", "\\|");
}

function areaSignal(area: ReviewArea, repository: DiscoveredRepository): string | undefined {
  switch (area) {
    case "data": return repository.directories.includes("migrations") ? "has a migrations/ directory" : undefined;
    case "api": return repository.directories.includes("contracts") ? "has a contracts/ directory" : undefined;
    case "testing":
      return repository.directories.includes("tests") || repository.directories.includes("test") || "test" in repository.scripts
        ? "has tests or a test script" : undefined;
    case "cicd": return repository.ci.length > 0 ? "has CI workflows" : undefined;
    default: return undefined;
  }
}

async function listReviewReports(repositoryPath: string): Promise<string[]> {
  try {
    return (await readdir(path.join(repositoryPath, REPORTS_DIRECTORY))).filter((name) => /^review-.+\.md$/.test(name)).sort();
  } catch {
    return [];
  }
}

function lastReviews(reports: string[], pack: GovernancePack | undefined): Map<ReviewArea, NonNullable<AreaSummary["lastReview"]>> {
  const latest = new Map<ReviewArea, NonNullable<AreaSummary["lastReview"]> & { run: number }>();
  for (const file of reports) {
    const match = /^review-([a-z]+)-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.md$/.exec(file);
    const area = REVIEW_AREAS.find((candidate) => candidate === match?.[1]);
    if (!match || !area) continue;
    const date = match[2]!;
    // A second report on the same day is named -2, -3, and so on; no suffix is the first run.
    const run = match[3] ? Number(match[3]) : 1;
    const current = latest.get(area);
    if (!current || date > current.date || (date === current.date && run > current.run)) {
      const evidenceId = `EVD-REVIEW-${area.toUpperCase()}-${date.replaceAll("-", "")}`;
      const coverage = pack?.evidence.find((item) => item.id === evidenceId)?.description;
      latest.set(area, { date, file, run, ...(coverage ? { coverage: oneLine(coverage, 160) } : {}) });
    }
  }
  return new Map([...latest].map(([area, { run: _run, ...review }]) => [area, review]));
}

function findingArea(finding: GovernanceFinding): ReviewArea | undefined {
  return REVIEW_AREAS.find((area) => finding.category === area || finding.rule_id === `REVIEW-${area.toUpperCase()}`);
}

/**
 * Facts about one repository: its decision, controls, findings and which areas have been reviewed.
 * Everything comes from the repository, its pack and its saved reports. Nothing is estimated.
 */
export async function summarizeRepository(repositoryPath: string, now: Date = new Date()): Promise<RepositorySummary> {
  const root = path.resolve(repositoryPath);
  const discovered = (await discoverRepositories(root)).repositories.find((repository) => repository.path === ".");
  if (!discovered) throw new Error(`Not a git repository root: ${repositoryPath}. Run summarize at a repository's top level.`);

  let pack: GovernancePack | undefined;
  try {
    pack = await loadGovernancePack(root, PACK_PATH, nodeFileSystem);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Governance pack not found")) throw error;
  }

  let assessment: RepositorySummary["assessment"];
  let evaluated: ControlEvaluation[] = [];
  if (pack) {
    const snapshot = await loadRepositorySnapshot(root, nodeFileSystem, []);
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, json: true });
    evaluated = result.evaluation.controls;
    const brief = (violation: GovernanceViolation) => ({ id: violation.controlId, severity: violation.severity, message: oneLine(violation.message, 200) });
    assessment = {
      decision: result.evaluation.decision.status,
      ...(result.context.analysisStatus ? { analysisStatus: result.context.analysisStatus } : {}),
      blocking: result.evaluation.decision.blockingViolations.map(brief),
      conditions: result.evaluation.decision.warnings.map(brief),
    };
  }

  const controls = (pack?.controls ?? []).map((control) => {
    const evaluation = evaluated.find((item) => item.controlId === control.id);
    return {
      id: control.id,
      standard: control.standard,
      severity: control.severity,
      status: evaluation?.status ?? "UNEVALUATED",
      missingEvidence: evaluation?.missingEvidence ?? [],
    };
  });

  const findings = pack?.findings ?? [];
  const bySeverity: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const open = findings
    .filter((finding) => finding.status !== "RESOLVED")
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));
  for (const finding of open) bySeverity[finding.severity] += 1;

  const reports = await listReviewReports(root);
  const reviews = lastReviews(reports, pack);
  const areas = REVIEW_AREAS.map((area): AreaSummary => {
    const standard = AREA_STANDARD[area];
    const areaControls = controls.filter((control) => control.standard === standard);
    const signal = areaSignal(area, discovered);
    const lastReview = reviews.get(area);
    return {
      area,
      standard,
      controls: areaControls.length,
      controlsNotPassing: areaControls.filter((control) => control.status !== "PASS").length,
      ...(lastReview ? { lastReview } : {}),
      openFindings: open.filter((finding) => findingArea(finding) === area).length,
      ...(signal ? { signal } : {}),
      possibleGap: Boolean(signal) && areaControls.length === 0,
    };
  });

  return {
    generatedOn: now.toISOString().slice(0, 10),
    repository: {
      path: path.basename(root),
      ...(discovered.git.branch ? { branch: discovered.git.branch } : {}),
      ...(discovered.git.head ? { head: discovered.git.head } : {}),
      ...(discovered.git.uncommittedChanges !== undefined ? { uncommittedChanges: discovered.git.uncommittedChanges } : {}),
    },
    ...(pack ? {
      pack: {
        project: pack.project.id,
        change: pack.change.id,
        standards: pack.standards.length,
        controls: pack.controls.length,
        evidence: pack.evidence.length,
        findings: findings.length,
      },
    } : {}),
    ...(assessment ? { assessment } : {}),
    controls,
    findings: {
      bySeverity,
      total: findings.length,
      open: open.map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        status: finding.status,
        ...(finding.source_location ? { location: `${finding.source_location.file}${finding.source_location.start_line ? `:${finding.source_location.start_line}` : ""}` } : {}),
        message: oneLine(finding.message, 200),
      })),
    },
    areas,
    reviewReports: reports,
  };
}

export function formatSummaryMarkdown(summary: RepositorySummary): string {
  const { repository, pack, assessment } = summary;
  const lines: string[] = [
    `# Governance status: ${repository.path}`,
    "",
    `Generated ${summary.generatedOn} by \`governance summarize\`. Everything in this part is computed from the repository, its governance pack and its saved review reports; none of it is estimated. A "Suggestions" section after it, if present, is written by an AI and is separate.`,
    "",
    "## Snapshot",
    "",
    "| | |",
    "|---|---|",
    `| Commit | ${repository.head ? repository.head.slice(0, 7) : "unknown"} on ${repository.branch ?? "unknown branch"} |`,
    `| Uncommitted changes | ${repository.uncommittedChanges ?? "unknown"} (not counting .governance/) |`,
    `| Governance pack | ${pack ? `${pack.project}, change ${pack.change}: ${pack.controls} controls, ${pack.evidence} evidence records, ${pack.findings} findings` : "**none** (run /engineering-governance:setup)"} |`,
    `| Decision | ${assessment ? `**${assessment.decision.replace(/_/g, " ")}**` : "not assessed: no pack"} |`,
    `| Analysis status | ${assessment?.analysisStatus ?? "not run"} |`,
    "",
  ];

  if (assessment) {
    lines.push("## Decision", "");
    if (assessment.blocking.length === 0) lines.push("No blocking violations.", "");
    else lines.push(`${assessment.blocking.length} blocking:`, "", ...assessment.blocking.map((item) => `- **${item.severity}** \`${item.id}\`: ${oneLine(item.message)}`), "");
    if (assessment.conditions.length > 0) {
      lines.push(`${assessment.conditions.length} condition${assessment.conditions.length === 1 ? "" : "s"}:`, "", ...assessment.conditions.map((item) => `- **${item.severity}** \`${item.id}\`: ${oneLine(item.message)}`), "");
    }
  }

  lines.push("## Controls", "");
  if (summary.controls.length === 0) lines.push("None defined.", "");
  else {
    lines.push("| Control | Standard | Severity | Status | Missing evidence |", "|---|---|---|---|---|");
    for (const control of summary.controls) {
      lines.push(`| ${cell(control.id)} | ${cell(control.standard)} | ${control.severity} | ${control.status} | ${cell(control.missingEvidence.join(", ") || "none")} |`);
    }
    lines.push("");
  }

  const counts = summary.findings.bySeverity;
  lines.push("## Findings", "", `${summary.findings.open.length} open of ${summary.findings.total} (P0: ${counts.P0}, P1: ${counts.P1}, P2: ${counts.P2}, P3: ${counts.P3}).`, "");
  if (summary.findings.open.length > 0) {
    lines.push("| Finding | Severity | Status | Where | Summary |", "|---|---|---|---|---|");
    for (const finding of summary.findings.open) {
      lines.push(`| ${cell(finding.id)} | ${finding.severity} | ${finding.status} | ${cell(finding.location ?? "")} | ${cell(finding.message)} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Review coverage",
    "",
    "One row per review area. A control belongs to an area through its standard. A signal is something found in the repository that suggests the area matters; \"possible gap\" means that signal is present but the pack has no control for the area. It is a prompt to check, not a verdict.",
    "",
    "| Area | Standard | Controls (not passing) | Last review | Open findings | Repository signal |",
    "|---|---|---|---|---|---|",
  );
  for (const area of summary.areas) {
    const review = area.lastReview ? `${area.lastReview.date} (${cell(area.lastReview.file)})` : "**not reviewed**";
    const signal = area.signal ? `${area.signal}${area.possibleGap ? ", **possible gap: no controls**" : ""}` : "";
    lines.push(`| ${area.area} | ${area.standard} | ${area.controls} (${area.controlsNotPassing}) | ${review} | ${area.openFindings} | ${signal} |`);
  }
  lines.push("");
  const covered = summary.areas.filter((area) => area.lastReview);
  if (covered.length > 0) {
    lines.push("Coverage recorded by each review:", "", ...covered.map((area) => `- ${area.area}: ${area.lastReview!.coverage ?? "no evidence record found in the pack for this report"}`), "");
  }
  const notReviewed = summary.areas.filter((area) => !area.lastReview).map((area) => area.area);
  lines.push(
    "## Not covered",
    "",
    notReviewed.length === 0 ? "Every area has at least one review." : `Not yet reviewed: ${notReviewed.join(", ")}.`,
    "",
    "A review reads a sample of an area, one run at a time, and an AI review can be wrong or miss things. This status does not show that the software is correct, secure or production-ready.",
    "",
  );
  return lines.join("\n");
}

/** Write the Markdown summary as a new file; an existing summary for the day is never overwritten. */
export async function writeSummary(repositoryPath: string, summary: RepositorySummary): Promise<string> {
  const root = path.resolve(repositoryPath);
  const markdown = `${formatSummaryMarkdown(summary)}\n`;
  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const name = `summary-${summary.generatedOn}${attempt === 1 ? "" : `-${attempt}`}.md`;
    const relative = `${REPORTS_DIRECTORY}/${name}`;
    try {
      await createNewFile(root, relative, markdown);
      return relative;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
    }
  }
  throw new Error("Too many summaries for one day; remove old ones.");
}
