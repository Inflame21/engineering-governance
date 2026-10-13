import type { GovernancePack } from "./types.js";

export type GovernanceValidationCode =
  | "DUPLICATE_ID"
  | "UNKNOWN_STANDARD"
  | "UNKNOWN_EVIDENCE"
  | "UNKNOWN_CONTROL"
  | "INVALID_RISK_ACCEPTANCE"
  | "INVALID_EXCEPTION";

export interface GovernancePackValidationIssue {
  code: GovernanceValidationCode;
  path: string;
  message: string;
}

function duplicateIdIssues(
  collectionName: string,
  items: readonly { id: string }[],
): GovernancePackValidationIssue[] {
  const seen = new Set<string>();
  const issues: GovernancePackValidationIssue[] = [];

  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `/${collectionName}/${index}/id`,
        message: `Duplicate ID '${item.id}' in ${collectionName}.`,
      });
    }
    seen.add(item.id);
  });

  return issues;
}

/**
 * Validates cross-reference and collection invariants after JSON Schema validation.
 * It deliberately does not duplicate structural/type validation performed by the schema.
 */
export function validateGovernancePackSemantics(
  pack: GovernancePack,
  evaluatedAt?: string,
): GovernancePackValidationIssue[] {
  const issues: GovernancePackValidationIssue[] = [];

  const collections: Array<[string, readonly { id: string }[]]> = [
    ["standards", pack.standards],
    ["controls", pack.controls],
    ["evidence", pack.evidence],
    ["risks", pack.risks],
    ["decisions", pack.decisions],
    ["findings", pack.findings ?? []],
    ["exceptions", pack.exceptions ?? []],
    ["debt", pack.debt ?? []],
  ];

  for (const [name, items] of collections) {
    issues.push(...duplicateIdIssues(name, items));
  }

  const standardIds = new Set(pack.standards.map((item) => item.id));
  const controlIds = new Set(pack.controls.map((item) => item.id));
  const evidenceIds = new Set(pack.evidence.map((item) => item.id));

  pack.risks.forEach((risk, index) => {
    if (risk.status === "ACCEPTED") {
      const complete =
        Boolean(risk.accepted_by?.trim()) &&
        Boolean(risk.acceptance_reason?.trim()) &&
        Boolean(risk.accepted_at) &&
        !Number.isNaN(Date.parse(risk.accepted_at ?? ""));
      if (!complete) {
        issues.push({
          code: "INVALID_RISK_ACCEPTANCE",
          path: `/risks/${index}`,
          message: `Accepted risk '${risk.id}' must include accepted_by, accepted_at, and acceptance_reason.`,
        });
      } else if (evaluatedAt && Date.parse(risk.accepted_at!) > Date.parse(evaluatedAt)) {
        issues.push({
          code: "INVALID_RISK_ACCEPTANCE",
          path: `/risks/${index}/accepted_at`,
          message: `Risk '${risk.id}' cannot be accepted after the evaluation timestamp.`,
        });
      }
    }
  });

  pack.controls.forEach((control, index) => {
    if (!standardIds.has(control.standard)) {
      issues.push({
        code: "UNKNOWN_STANDARD",
        path: `/controls/${index}/standard`,
        message: `Control '${control.id}' references unknown standard '${control.standard}'.`,
      });
    }

    for (const evidenceId of control.required_evidence ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/controls/${index}/required_evidence`,
          message: `Control '${control.id}' requires unknown evidence '${evidenceId}'.`,
        });
      }
    }
  });

  pack.evidence.forEach((item, index) => {
    for (const controlId of item.supports_controls) {
      if (!controlIds.has(controlId)) {
        issues.push({
          code: "UNKNOWN_CONTROL",
          path: `/evidence/${index}/supports_controls`,
          message: `Evidence '${item.id}' references unknown control '${controlId}'.`,
        });
      }
    }
  });

  pack.decisions.forEach((decision, index) => {
    for (const evidenceId of decision.evidence ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/decisions/${index}/evidence`,
          message: `Decision '${decision.id}' references unknown evidence '${evidenceId}'.`,
        });
      }
    }
  });

  (pack.findings ?? []).forEach((finding, index) => {
    for (const evidenceId of finding.evidence_refs) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/findings/${index}/evidence_refs`,
          message: `Finding '${finding.id}' references unknown evidence '${evidenceId}'.`,
        });
      }
    }
  });

  (pack.exceptions ?? []).forEach((exception, index) => {
    if (exception.control && !controlIds.has(exception.control)) {
      issues.push({
        code: "UNKNOWN_CONTROL",
        path: `/exceptions/${index}/control`,
        message: `Exception '${exception.id}' references unknown control '${exception.control}'.`,
      });
    }

    if (exception.status === "REQUESTED" || exception.status === "APPROVED") {
      const hasRequestMetadata =
        Boolean(exception.control?.trim()) &&
        Boolean(exception.reason?.trim()) &&
        Boolean(exception.project_id?.trim()) &&
        Boolean(exception.change_id?.trim()) &&
        Boolean(exception.requested_by?.trim()) &&
        Boolean(exception.requested_at) &&
        !Number.isNaN(Date.parse(exception.requested_at ?? ""));
      const hasApprovalMetadata =
        exception.status !== "APPROVED" ||
        (
          Boolean(exception.approved_by?.trim()) &&
          Boolean(exception.approved_at) &&
          !Number.isNaN(Date.parse(exception.approved_at ?? "")) &&
          Boolean(exception.expires_at) &&
          !Number.isNaN(Date.parse(exception.expires_at ?? ""))
        );

      if (!hasRequestMetadata || !hasApprovalMetadata) {
        issues.push({
          code: "INVALID_EXCEPTION",
          path: `/exceptions/${index}`,
          message: `Exception '${exception.id}' is missing required request or approval metadata.`,
        });
      }

      if (
        exception.status === "APPROVED" &&
        (exception.project_id !== pack.project.id || exception.change_id !== pack.change.id)
      ) {
        issues.push({
          code: "INVALID_EXCEPTION",
          path: `/exceptions/${index}`,
          message: `Approved exception '${exception.id}' is outside the current project/change scope.`,
        });
      }

      if (exception.status === "APPROVED" && exception.approved_at && exception.expires_at) {
        const approvedAt = Date.parse(exception.approved_at);
        const expiresAt = Date.parse(exception.expires_at);
        const evaluationTime = evaluatedAt ? Date.parse(evaluatedAt) : Number.NaN;
        if (approvedAt >= expiresAt || (evaluatedAt && (Number.isNaN(evaluationTime) || expiresAt <= evaluationTime))) {
          issues.push({
            code: "INVALID_EXCEPTION",
            path: `/exceptions/${index}/expires_at`,
            message: `Approved exception '${exception.id}' has an invalid or expired time window.`,
          });
        }
      }
    }
  });

  return issues;
}
