#!/usr/bin/env node
// Posts the governance decision and its blockers as one pull-request comment, updated in place on
// every run. Used by .github/workflows/governance-pr-comment.yml.
//
// Usage: node governance-comment.mjs <report.json>
// Environment: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER (digits), RUN_URL, GOVERNANCE_REF, DRY_RUN_FILE (optional:
// write the comment there instead of calling GitHub), GITHUB_API_URL (default https://api.github.com).
//
// The comment is a convenience, never a gate: if it cannot be posted (a fork pull request has a read-only
// token, the API is down) this prints a warning and exits 0. The job's pass/fail comes from the check.
//
// Repository text (control titles, messages) reaches the comment, so it is escaped: no mentions, no
// links or images, no HTML, no table breaks, bounded length.

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const MARKER = "<!-- governance-check:decision -->";
const DECISIONS = ["GO", "GO_WITH_CONDITIONS", "NO-GO"];
const MAX_LISTED = 15;
const MAX_TEXT = 300;

/** Make untrusted text safe to place in a Markdown comment. */
export function safeText(value, max = MAX_TEXT) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@/g, "&#64;")
    .replace(/([\\`*_{}\[\]()#+!|~-])/g, "\\$1");
  return text;
}

/** An identifier shown inside a code span: only characters that cannot end the span or form markup. */
const identifier = (value, max) => String(value ?? "").replace(/[^A-Za-z0-9:._-]/g, "_").slice(0, max);

function listing(items, describe) {
  const shown = items.slice(0, MAX_LISTED).map(describe);
  if (items.length > MAX_LISTED) shown.push(`- …and ${items.length - MAX_LISTED} more in the full report`);
  return shown;
}

/**
 * Build the comment text from a governance report.json (the CLI's JSON output). Only the decision, the
 * reason and the violations are used. `report` may be undefined when no report could be produced.
 */
export function buildComment(report, { runUrl = "", governanceRef = "" } = {}) {
  const decision = DECISIONS.includes(report?.report?.decision) ? report.report.decision : "ERROR";
  const icon = decision === "GO" ? "✅" : decision === "NO-GO" ? "⛔" : decision === "GO_WITH_CONDITIONS" ? "⚠️" : "❓";
  const lines = [MARKER, `## ${icon} Governance check: ${decision.replace(/_/g, " ")}`, ""];

  if (decision === "ERROR") {
    lines.push("The governance check could not produce a decision (invalid pack, a missing file or a tool failure). Nothing was assessed; treat this as not approved.");
  } else {
    const decisionBody = report.evaluation?.decision ?? {};
    const blockers = Array.isArray(decisionBody.blockingViolations) ? decisionBody.blockingViolations : [];
    const warnings = Array.isArray(decisionBody.warnings) ? decisionBody.warnings : [];
    if (decisionBody.reason) lines.push(`**Why:** ${safeText(decisionBody.reason, 500)}`, "");
    const row = (item) => `- \`${identifier(item.controlId, 80)}\` (${identifier(item.severity, 4)}): ${safeText(item.message)}`;
    lines.push(`### Blocking (${blockers.length})`, "", ...(blockers.length ? listing(blockers, row) : ["None."]), "");
    lines.push(`### Conditions (${warnings.length})`, "", ...(warnings.length ? listing(warnings, row) : ["None."]));
  }

  lines.push("", "---");
  const links = [runUrl ? `[Full report and job summary](${runUrl})` : "", governanceRef ? `baseline \`${identifier(governanceRef, 40)}\`` : ""].filter(Boolean);
  if (links.length) lines.push(links.join(" · "));
  return `${lines.join("\n")}\n`;
}

async function github(path, options = {}) {
  const base = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "governance-pr-comment",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${options.method ?? "GET"} ${path}`);
  return response.status === 204 ? undefined : response.json();
}

/** Create the comment, or update the one this script made earlier (found by its marker). */
export async function postComment(body, { repository, pullNumber }) {
  let existing;
  for (let page = 1; page <= 10 && !existing; page += 1) {
    const comments = await github(`/repos/${repository}/issues/${pullNumber}/comments?per_page=100&page=${page}`);
    existing = comments.find((comment) => comment.body?.startsWith(MARKER) && comment.user?.type === "Bot");
    if (comments.length < 100) break;
  }
  if (existing) await github(`/repos/${repository}/issues/comments/${existing.id}`, { method: "PATCH", body: JSON.stringify({ body }) });
  else await github(`/repos/${repository}/issues/${pullNumber}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  return existing ? "updated" : "created";
}

async function main() {
  const reportPath = process.argv[2];
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch {
    report = undefined; // no report: the comment says so rather than showing nothing
  }
  const body = buildComment(report, { runUrl: process.env.RUN_URL ?? "", governanceRef: process.env.GOVERNANCE_REF ?? "" });

  if (process.env.DRY_RUN_FILE) {
    await writeFile(process.env.DRY_RUN_FILE, body, "utf8");
    return;
  }
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const pullNumber = process.env.PR_NUMBER ?? "";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[0-9]{1,9}$/.test(pullNumber) || !process.env.GITHUB_TOKEN) {
    console.log("::warning title=Governance comment::Not posted: needs GITHUB_TOKEN, GITHUB_REPOSITORY and a pull request number.");
    return;
  }
  try {
    console.log(`Governance comment ${await postComment(body, { repository, pullNumber })}.`);
  } catch (error) {
    // A fork's read-only token cannot comment; that must not fail the check.
    console.log(`::warning title=Governance comment::Not posted (${error instanceof Error ? error.message : "unknown error"}). The decision is still in the job summary.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
