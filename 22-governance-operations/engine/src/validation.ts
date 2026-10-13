import type { GovernancePack } from "./types.js";

export type GovernanceValidationCode =
  | "DUPLICATE_ID"
  | "UNKNOWN_STANDARD"
  | "UNKNOWN_EVIDENCE"
  | "UNKNOWN_CONTROL";

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
  });

  return issues;
}
