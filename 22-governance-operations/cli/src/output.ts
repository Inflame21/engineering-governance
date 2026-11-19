import type { DebtSummary } from "../../engine/src/debt.js";
import type { IncidentSummary } from "../../engine/src/incidents.js";
import { TOOL_RESULT_STATUSES } from "../../engine/src/evidence-policy.js";
import type { GovernanceContext, GovernanceEvaluation } from "../../engine/src/types.js";
import type { RepositoryAnalysis } from "../../analyzer/src/types.js";

function analysisLines(analysis: RepositoryAnalysis, context: GovernanceContext): string[] {
  const lines = [
    "Repository analysis:",
    `  Status: ${context.analysisStatus ?? "UNVERIFIED"}`,
    `  Languages: ${analysis.facts.languages.join(", ") || "none detected"}`,
    `  Frameworks: ${analysis.facts.frameworks.join(", ") || "none detected"}`,
    `  Package managers: ${analysis.facts.packageManagers.join(", ") || "none detected"}`,
    `  Build systems: ${analysis.facts.buildSystems.join(", ") || "none detected"}`,
    `  Infrastructure: ${analysis.facts.infrastructureSystems.join(", ") || "none detected"}`,
    `  Test systems: ${analysis.facts.testSystems.join(", ") || "none detected"}`,
    `  Analyzer adapters: ${analysis.adapterResults.length}`,
  ];

  const packages = analysis.facts.packages ?? [];
  lines.push(`  Packages/workspaces: ${packages.length}`);
  for (const projectPackage of packages) {
    lines.push(
      `    - ${projectPackage.root} | languages: ${projectPackage.languages.join(", ") || "none"} | frameworks: ${projectPackage.frameworks.join(", ") || "none"} | package managers: ${projectPackage.packageManagers.join(", ") || "none"}`,
    );
  }

  if (analysis.systemGraph) {
    const countNodes = (type: string) => analysis.systemGraph!.nodes.filter((node) => node.type === type).length;
    const countEdges = (type: string) => analysis.systemGraph!.edges.filter((edge) => edge.type === type).length;
    lines.push(
      "",
      `System relationship graph: ${analysis.systemGraph.status}`,
      `  Packages: ${countNodes("PACKAGE")}`,
      `  Services: ${countNodes("SERVICE")}`,
      `  API endpoints: ${countNodes("API_ENDPOINT")}`,
      `  Databases: ${countNodes("DATABASE")}`,
      `  Events: ${countNodes("EVENT")}`,
      `  Relationships: ${analysis.systemGraph.edges.length}`,
      `    Exposes API: ${countEdges("EXPOSES_API")}`,
      `    Uses database: ${countEdges("USES_DATABASE")}`,
      `    Publishes events: ${countEdges("PUBLISHES_EVENT")}`,
      `    Subscribes to events: ${countEdges("SUBSCRIBES_EVENT")}`,
    );
    for (const limitation of analysis.systemGraph.limitations) {
      lines.push(`  System-graph limitation: ${limitation}`);
    }
  }

  if (analysis.snapshotFingerprint) {
    lines.push(
      "",
      `Snapshot fingerprint: ${analysis.snapshotFingerprint.digest}`,
      `  Files inventoried: ${analysis.snapshotFingerprint.fileCount}`,
      `  Source content coverage: ${analysis.snapshotFingerprint.inspectedSourceFileCount}/${analysis.snapshotFingerprint.sourceFileCount} (${analysis.snapshotFingerprint.sourceContentStatus})`,
    );
    for (const limitation of analysis.snapshotFingerprint.limitations) {
      lines.push(`  Fingerprint limitation: ${limitation}`);
    }
  }

  if (analysis.changeScope) {
    lines.push(
      "",
      `Changed-file scope: ${analysis.changeScope.status}`,
      `  Base revision: ${analysis.changeScope.baseRef}`,
      `  Changed files: ${analysis.changeScope.files.length}`,
    );
    if (analysis.changeScope.headRef) lines.push(`  Head revision: ${analysis.changeScope.headRef}`);
    if (analysis.changeScope.reason) lines.push(`  Scope limitation: ${analysis.changeScope.reason}`);
  } else {
    lines.push("", "Changed-file scope: NOT REQUESTED", "  Pass --base <git-ref> to verify the declared change scope.");
  }

  const incompleteAdapters = analysis.adapterResults.filter((item) => item.executionStatus !== "SUCCESS");
  if (incompleteAdapters.length > 0) {
    lines.push("", "Analyzer limitations:");
    for (const adapter of incompleteAdapters) {
      lines.push(`  - ${adapter.adapterId}: ${adapter.executionStatus}`);
      for (const limitation of adapter.limitations) lines.push(`    ${limitation}`);
      for (const capability of adapter.unsupportedCapabilities) lines.push(`    Unsupported: ${capability}`);
    }
  }

  if (analysis.verification) {
    lines.push("", `Tool verification: ${analysis.verification.status}`);
    const counts = resultCounts(analysis.verification.results);
    if (counts) lines.push(`  Results: ${counts}`);
    for (const result of analysis.verification.results) {
      lines.push(`  [${result.status}] ${result.tool}${result.toolVersion ? ` (${result.toolVersion})` : ""}: ${result.summary}`);
      for (const limitation of result.limitations) lines.push(`    Limitation: ${limitation}`);
    }
  }

  if (analysis.architecture) {
    lines.push(
      "",
      `Architecture profile: ${analysis.architecture.profileId} (${analysis.architecture.status})`,
      `  File dependency edges: ${analysis.architecture.graph.edges.length}`,
      `  Mapped components: ${analysis.architecture.graph.components.length}`,
      `  Component dependency edges: ${analysis.architecture.graph.componentEdges.length}`,
      `  Cross-package dependency edges: ${analysis.architecture.graph.packageEdges.length}`,
      `  Boundary findings: ${analysis.architecture.findings.length}`,
    );
    const impact = analysis.architecture.graph.changeImpact;
    lines.push(
      `  Change impact: ${impact.status}`,
      `  Changed source files: ${impact.changedFiles.length}`,
      `  Changed components: ${impact.changedComponents.join(", ") || "none mapped"}`,
      `  Impacted files (including changed files): ${impact.impactedFiles.length}`,
      `  Impacted components: ${impact.impactedComponents.join(", ") || "none mapped"}`,
    );
    for (const limitation of impact.limitations) lines.push(`  Change-impact limitation: ${limitation}`);
    for (const finding of analysis.architecture.findings) {
      const location = finding.source_location
        ? ` ${finding.source_location.file}:${finding.source_location.start_line ?? 1}`
        : "";
      lines.push(`  [${finding.severity}] ${finding.rule_id}${location}: ${finding.message}`);
    }
  }

  if (context.unsupportedCapabilities?.length) {
    lines.push("", `Unsupported capabilities: ${context.unsupportedCapabilities.join(", ")}`);
  }

  return lines;
}

export function formatAnalysisResult(
  analysis: RepositoryAnalysis,
  context: GovernanceContext,
  json = false,
): string {
  if (json) return JSON.stringify({ analysis, context }, null, 2);
  return analysisLines(analysis, context).join("\n");
}

/** The registered project an assessment was run for, when the registry was used. */
export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  criticality: string;
  data_classification: string;
}

/** The control catalog an assessment was checked against, when one was supplied. */
export interface CatalogSummary {
  id: string;
  version: string;
  controls: number;
}

/** The approver-authority policy an assessment used, when one was supplied. */
export interface AuthoritySummary {
  id: string;
  version: string;
  roles: number;
  /** Roles that confer authority; the rest are DRAFT, retired or have no named holder. */
  approved: number;
}

/** What an assessment was scoped by, beyond the repository itself. */
export interface AssessmentScope {
  project?: ProjectSummary;
  catalog?: CatalogSummary;
  authority?: AuthoritySummary;
}

const projectLine = (project: ProjectSummary): string =>
  `${project.id} (${project.status}, criticality ${project.criticality}, data ${project.data_classification})`;
const catalogLine = (catalog: CatalogSummary): string =>
  `${catalog.id} ${catalog.version} (${catalog.controls} controls)`;
const authorityLine = (authority: AuthoritySummary): string =>
  `${authority.id} ${authority.version} (${authority.approved} of ${authority.roles} roles approved${authority.approved === 0 ? "; none enforced" : ""})`;

/** One line of totals for technical debt (DEBT-020 section 30). */
export function debtTotalsLine(debt: DebtSummary): string {
  const u = debt.unresolved;
  return `${debt.unresolvedTotal} unresolved (P0: ${u.P0}, P1: ${u.P1}, P2: ${u.P2}, P3: ${u.P3}), ${debt.accepted} accepted, ${debt.overdue} overdue; an owner is named on ${debt.withOwner} of ${debt.unresolvedTotal}, a review date on ${debt.withReviewDate} of ${debt.unresolvedTotal}.`;
}

const MAX_DEBT_ROWS = 30;

/** The debt section shared by the report and the summary: totals, then one row per unresolved item. */
export function debtMarkdownLines(debt: DebtSummary): string[] {
  const lines = ["", "## Technical debt", "", debtTotalsLine(debt)];
  if (debt.items.length === 0) return lines;
  const withIncidents = debt.items.some((item) => item.incidents.length > 0);
  lines.push("", `| Debt | Severity | Status | Owner | Target | Recorded against |${withIncidents ? " Incidents |" : ""} Needs |`, `|---|---|---|---|---|---|${withIncidents ? "---|" : ""}---|`);
  for (const item of debt.items.slice(0, MAX_DEBT_ROWS)) {
    const target = item.target_date ? `${item.target_date}${item.overdue ? " (overdue)" : ""}` : "";
    const linked = item.linkedControls.map((control) => `${control.id} (${control.status})`).join(", ");
    lines.push(`| ${cell(item.id)}${item.title ? ` ${cell(item.title)}` : ""} | ${item.severity} | ${item.status} | ${cell(item.owner ?? "**none**")} | ${target} | ${cell(linked)} |${withIncidents ? ` ${cell(item.incidents.join(", "))} |` : ""} ${cell(item.reasons.length > 0 ? `${item.blocking ? "**blocks**: " : ""}${item.reasons.join("; ")}` : "")} |`);
  }
  if (debt.items.length > MAX_DEBT_ROWS) lines.push("", `…and ${debt.items.length - MAX_DEBT_ROWS} more in the JSON report.`);
  return lines;
}

/** One line of totals for incidents (INC-019 section 39). */
export function incidentTotalsLine(incidents: IncidentSummary): string {
  const s = incidents.bySeverity;
  const parts = [
    `${incidents.total} recorded (P0: ${s.P0}, P1: ${s.P1}, P2: ${s.P2}, P3: ${s.P3}), ${incidents.active} active`,
    `${incidents.materialReviewed} of ${incidents.materialResolved} resolved P0/P1 incidents have a completed review`,
    `${incidents.actionsOpen} corrective action${incidents.actionsOpen === 1 ? "" : "s"} open, ${incidents.actionsOverdue} overdue`,
    `${incidents.repeats} repeat${incidents.repeats === 1 ? "" : "s"}`,
  ];
  if (incidents.meanTimeToResolveHours !== undefined) parts.push(`mean time to resolve ${incidents.meanTimeToResolveHours} h`);
  return `${parts.join("; ")}.`;
}

/** The incidents section shared by the report and the summary: totals, then one row per incident. */
export function incidentMarkdownLines(incidents: IncidentSummary): string[] {
  const lines = ["", "## Incidents", "", incidentTotalsLine(incidents)];
  if (incidents.items.length === 0) return lines;
  lines.push("", "| Incident | Severity | Status | Owner | Review | Actions open (overdue) | Recorded against | Needs |", "|---|---|---|---|---|---|---|---|");
  for (const item of incidents.items.slice(0, MAX_DEBT_ROWS)) {
    const open = item.actions.filter((action) => action.status === "OPEN" || action.status === "IN_PROGRESS");
    const linked = [...item.linkedControls.map((control) => `${control.id} (${control.status})`), ...item.linkedDebt].join(", ");
    lines.push(`| ${cell(item.id)} ${cell(item.title)}${item.repeatOf.length > 0 ? " (repeat)" : ""} | ${item.severity} | ${item.status} | ${cell(item.owner ?? "**none**")} | ${item.review?.status ?? "none"} | ${open.length} (${open.filter((action) => action.overdue).length}) | ${cell(linked)} | ${cell(item.reasons.join("; "))} |`);
  }
  if (incidents.items.length > MAX_DEBT_ROWS) lines.push("", `…and ${incidents.items.length - MAX_DEBT_ROWS} more in the JSON report.`);
  return lines;
}

export function formatHumanResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
  context: GovernanceContext,
  scope?: AssessmentScope,
): string {
  const lines = [
    `Decision: ${evaluation.decision.status}`,
    ...(scope?.project ? [`Project: ${projectLine(scope.project)}`] : []),
    ...(scope?.catalog ? [`Catalog: ${catalogLine(scope.catalog)}`] : []),
    ...(scope?.authority ? [`Authority: ${authorityLine(scope.authority)}`] : []),
    "",
    ...analysisLines(analysis, context),
    "",
    `Controls evaluated: ${evaluation.controls.length}`,
    `Blocking violations: ${evaluation.decision.blockingViolations.length}`,
    `Warnings: ${evaluation.decision.warnings.length}`,
    `Open risks: ${evaluation.decision.openRisks.length}`,
    ...(evaluation.debt ? [`Technical debt: ${debtTotalsLine(evaluation.debt)}`] : []),
    ...(evaluation.incidents ? [`Incidents: ${incidentTotalsLine(evaluation.incidents)}`] : []),
  ];

  if (evaluation.decision.reason) lines.push("", `Reason: ${evaluation.decision.reason}`);

  const decisionItems = [...evaluation.decision.blockingViolations, ...evaluation.decision.warnings];
  if (decisionItems.length > 0) lines.push("", "Decision findings:");
  for (const item of decisionItems) {
    lines.push(`  [${item.severity}] ${item.controlId}: ${item.message}`);
    if (item.missingEvidence.length > 0) lines.push(`    Missing evidence: ${item.missingEvidence.join(", ")}`);
    if (item.missingSignals.length > 0) lines.push(`    Missing signals/capabilities: ${item.missingSignals.join(", ")}`);
    if (item.evidenceRefs?.length) lines.push(`    Evidence: ${item.evidenceRefs.join(", ")}`);
  }

  for (const control of evaluation.controls) {
    if (control.status === "PASS" || control.status === "NOT_APPLICABLE") continue;
    lines.push("", `[${control.status}] ${control.controlId}: ${control.reason}`);
  }

  return lines.join("\n");
}

/** "1 PASS, 2 SKIPPED": how many tool results ended in each state, in the blueprint's order. */
function resultCounts(results: ReadonlyArray<{ status: string }>): string {
  return TOOL_RESULT_STATUSES
    .map((status) => ({ status, count: results.filter((result) => result.status === status).length }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${entry.status}`)
    .join(", ");
}

/** Escapes text for a Markdown table cell. */
const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function formatMarkdownResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
  context: GovernanceContext,
  scope?: AssessmentScope,
): string {
  const { decision } = evaluation;
  const list = (items: string[]) => (items.length ? items.join(", ") : "none detected");
  const lines = [
    "# Governance report",
    "",
    `**Decision:** ${decision.status}`,
    ...(scope?.project ? ["", `**Project:** ${projectLine(scope.project)}`] : []),
    ...(scope?.catalog ? ["", `**Catalog:** ${catalogLine(scope.catalog)}`] : []),
    ...(scope?.authority ? ["", `**Authority:** ${authorityLine(scope.authority)}`] : []),
    ...(decision.reason ? ["", `**Reason:** ${decision.reason}`] : []),
    "",
    "## Repository analysis",
    "",
    "| | |",
    "|---|---|",
    `| Analysis status | ${context.analysisStatus ?? "UNVERIFIED"} |`,
    `| Languages | ${cell(list(analysis.facts.languages))} |`,
    `| Frameworks | ${cell(list(analysis.facts.frameworks))} |`,
    `| Package managers | ${cell(list(analysis.facts.packageManagers))} |`,
    `| Build systems | ${cell(list(analysis.facts.buildSystems))} |`,
    `| Infrastructure | ${cell(list(analysis.facts.infrastructureSystems))} |`,
    `| Test systems | ${cell(list(analysis.facts.testSystems))} |`,
    "",
    "## Decision summary",
    "",
    `- Controls evaluated: ${evaluation.controls.length}`,
    `- Blocking violations: ${decision.blockingViolations.length}`,
    `- Warnings: ${decision.warnings.length}`,
    `- Open risks: ${decision.openRisks.length}`,
  ];

  const section = (title: string, items: typeof decision.warnings) => {
    if (items.length === 0) return;
    lines.push("", `## ${title}`, "");
    for (const item of items) {
      lines.push(`- **[${item.severity}] ${item.controlId}**: ${item.message}`);
      if (item.missingEvidence.length > 0) lines.push(`  - Missing evidence: ${item.missingEvidence.join(", ")}`);
      if (item.missingSignals.length > 0) lines.push(`  - Missing signals/capabilities: ${item.missingSignals.join(", ")}`);
      if (item.evidenceRefs?.length) lines.push(`  - Evidence: ${item.evidenceRefs.join(", ")}`);
    }
  };
  if (analysis.verification && analysis.verification.results.length > 0) {
    lines.push(
      "",
      "## Tool verification",
      "",
      `Overall: ${analysis.verification.status}. Results: ${resultCounts(analysis.verification.results)}.`,
      "",
      "| Tool | Result | Summary |",
      "|---|---|---|",
    );
    for (const result of analysis.verification.results) lines.push(`| ${cell(result.tool)} | ${result.status} | ${cell(result.summary)} |`);
  }

  section("Blocking violations", decision.blockingViolations);
  section("Warnings", decision.warnings);
  if (evaluation.debt && (evaluation.debt.unresolvedTotal > 0 || evaluation.debt.resolved > 0)) lines.push(...debtMarkdownLines(evaluation.debt));
  if (evaluation.incidents) lines.push(...incidentMarkdownLines(evaluation.incidents));

  const attention = evaluation.controls.filter((c) => c.status !== "PASS" && c.status !== "NOT_APPLICABLE");
  if (attention.length > 0) {
    lines.push("", "## Controls needing attention", "", "| Control | Status | Reason |", "|---|---|---|");
    for (const control of attention) lines.push(`| ${cell(control.controlId)} | ${control.status} | ${cell(control.reason)} |`);
  }

  return lines.join("\n");
}

export function formatJsonResult(
  analysis: RepositoryAnalysis,
  evaluation: GovernanceEvaluation,
  context: GovernanceContext,
  scope?: AssessmentScope,
): string {
  const generatedAt = new Date().toISOString();
  const fingerprint = analysis.snapshotFingerprint?.digest ?? null;
  const timestampKey = generatedAt.replace(/\D/g, "").slice(0, 17);
  const fingerprintKey = fingerprint?.replace(/^sha256:/, "").slice(0, 12).toUpperCase() ?? "NO-FINGERPRINT";
  const assessmentId = `ASM-${timestampKey}-${fingerprintKey}`;

  return JSON.stringify({
    report: {
      schemaVersion: "1.0.0",
      assessmentId,
      generatedAt,
      repositoryFingerprint: fingerprint,
      changeScope: analysis.changeScope ?? null,
      decision: evaluation.decision.status,
      ...(scope?.project ? { project: scope.project } : {}),
      ...(scope?.catalog ? { catalog: scope.catalog } : {}),
      ...(scope?.authority ? { authority: scope.authority } : {}),
    },
    analysis,
    context,
    evaluation,
  }, null, 2);
}
