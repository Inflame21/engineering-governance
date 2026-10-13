import { describe, expect, it } from "vitest";
import governanceSchema from "../../model/governance-model.schema.json" with { type: "json" };
import architectureProfileSchema from "../../model/architecture-profile.schema.json" with { type: "json" };
import type {
  ControlStatus,
  EvidenceStatus,
  EvidenceFreshness,
  FailureDecision,
  GovernanceChange,
  GovernanceChangeType,
  GovernanceControl,
  GovernanceDebt,
  GovernanceDecisionRecord,
  GovernanceDecisionRecordStatus,
  GovernanceDecisionType,
  GovernanceEvidence,
  GovernanceEvidenceType,
  GovernanceException,
  GovernanceFinding,
  GovernanceFindingStatus,
  GovernancePack,
  GovernanceProject,
  GovernanceRisk,
  GovernanceStandard,
  Severity,
} from "../../engine/src/types.js";
import type { ArchitectureBoundaryRule, ArchitectureProfile } from "../../analyzer/src/architecture.js";

type FieldPresence<T extends object> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? "optional" : "required";
};

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
type Assert<T extends true> = T;

// These maps are checked against the TypeScript interfaces at compile time. The
// runtime assertions below then compare them with the actual imported JSON Schema.
// Adding/removing a TS property or changing optionality requires a deliberate
// corresponding schema change (and vice versa).
const fieldPresence = {
  pack: {
    version: "required", project: "required", change: "required", standards: "required",
    controls: "required", evidence: "required", risks: "required", decisions: "required",
    findings: "optional", exceptions: "optional", debt: "optional",
  } satisfies FieldPresence<GovernancePack>,
  project: {
    id: "required", name: "required", repository: "required", environment: "required",
  } satisfies FieldPresence<GovernanceProject>,
  change: {
    id: "required", type: "required", title: "required", description: "optional",
    author: "optional", risk_class: "required", files: "required",
  } satisfies FieldPresence<GovernanceChange>,
  standard: {
    id: "required", title: "required", version: "required", source: "required",
  } satisfies FieldPresence<GovernanceStandard>,
  control: {
    id: "required", standard: "required", title: "required", severity: "required",
    status: "optional", applies_when: "optional", required_evidence: "optional",
    max_evidence_age_seconds: "optional", failure_decision: "optional", message: "optional",
  } satisfies FieldPresence<GovernanceControl>,
  evidence: {
    id: "required", type: "required", status: "required", description: "required",
    source: "required", freshness: "required", freshness_status: "optional",
    supports_controls: "required", tool_version: "optional", generated_at: "optional",
    repository_fingerprint: "optional", duration_ms: "optional", exit_code: "optional",
    command: "optional",
  } satisfies FieldPresence<GovernanceEvidence>,
  risk: {
    id: "required", severity: "required", title: "required", status: "required",
    mitigation: "optional", owner: "optional", accepted_by: "optional", accepted_at: "optional",
    acceptance_expires_at: "optional", acceptance_reason: "optional",
  } satisfies FieldPresence<GovernanceRisk>,
  decision: {
    id: "required", type: "required", status: "required", reason: "optional",
    evidence: "optional", owner: "optional", timestamp: "optional",
  } satisfies FieldPresence<GovernanceDecisionRecord>,
  exception: {
    id: "required", status: "required", control: "optional", reason: "optional",
    project_id: "optional", change_id: "optional", requested_by: "optional",
    requested_at: "optional", approved_by: "optional", approved_at: "optional",
    expires_at: "optional",
  } satisfies FieldPresence<GovernanceException>,
  debt: {
    id: "required", severity: "required", status: "required", title: "optional", owner: "optional",
  } satisfies FieldPresence<GovernanceDebt>,
  finding: {
    id: "required", rule_id: "required", severity: "required", category: "required",
    message: "required", status: "required", evidence_refs: "required",
    source_location: "optional", component_id: "optional", confidence: "optional", remediation: "optional",
  } satisfies FieldPresence<GovernanceFinding>,
  architectureProfile: {
    id: "required", version: "required", name: "required", description: "optional",
    styles: "required", boundaryRules: "required", requiredControls: "required",
    capabilities: "optional", componentMappings: "optional", metadata: "optional",
  } satisfies FieldPresence<ArchitectureProfile>,
  architectureBoundaryRule: {
    id: "required", description: "required", severity: "required", sourcePattern: "optional",
    targetPattern: "optional", allowed: "optional",
  } satisfies FieldPresence<ArchitectureBoundaryRule>,
};

const enumValues = {
  severity: ["P0", "P1", "P2", "P3"],
  controlStatus: ["PASS", "FAIL", "WARN", "NOT_APPLICABLE", "UNVERIFIED"],
  evidenceStatus: ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "NOT_APPLICABLE"],
  evidenceFreshness: ["current", "stale", "expired", "unknown"],
  failureDecision: ["NO-GO", "GO_WITH_CONDITIONS", "REVIEW_REQUIRED", "NONE"],
  changeType: ["feature", "bugfix", "refactor", "security", "database", "infrastructure", "configuration", "release", "emergency"],
  evidenceType: ["E1_DIRECT_VERIFICATION", "E2_INSPECTION", "E3_AUTOMATED_ANALYSIS", "E4_OPERATIONAL", "E5_DOCUMENTARY", "E6_ASSERTION"],
  decisionType: ["READINESS", "REVIEW", "RELEASE", "PRODUCTION"],
  decisionStatus: ["READY", "READY_WITH_CONDITIONS", "NOT_READY", "APPROVE", "APPROVE_WITH_CONDITIONS", "REQUEST_CHANGES", "REJECT", "GO", "GO_WITH_CONDITIONS", "NO-GO"],
  riskStatus: ["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"],
  exceptionStatus: ["REQUESTED", "APPROVED", "REJECTED", "EXPIRED", "CLOSED"],
  debtStatus: ["OPEN", "PLANNED", "IN_PROGRESS", "ACCEPTED", "RESOLVED"],
  findingStatus: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "ACCEPTED", "SUPPRESSED", "UNVERIFIED"],
} as const;

type _SeverityMatches = Assert<Equal<(typeof enumValues.severity)[number], Severity>>;
type _ControlStatusMatches = Assert<Equal<(typeof enumValues.controlStatus)[number], ControlStatus>>;
type _EvidenceStatusMatches = Assert<Equal<(typeof enumValues.evidenceStatus)[number], EvidenceStatus>>;
type _EvidenceFreshnessMatches = Assert<Equal<(typeof enumValues.evidenceFreshness)[number], EvidenceFreshness>>;
type _FailureDecisionMatches = Assert<Equal<(typeof enumValues.failureDecision)[number], FailureDecision>>;
type _ChangeTypeMatches = Assert<Equal<(typeof enumValues.changeType)[number], GovernanceChangeType>>;
type _EvidenceTypeMatches = Assert<Equal<(typeof enumValues.evidenceType)[number], GovernanceEvidenceType>>;
type _DecisionTypeMatches = Assert<Equal<(typeof enumValues.decisionType)[number], GovernanceDecisionType>>;
type _DecisionStatusMatches = Assert<Equal<(typeof enumValues.decisionStatus)[number], GovernanceDecisionRecordStatus>>;
type _RiskStatusMatches = Assert<Equal<(typeof enumValues.riskStatus)[number], GovernanceRisk["status"]>>;
type _ExceptionStatusMatches = Assert<Equal<(typeof enumValues.exceptionStatus)[number], GovernanceException["status"]>>;
type _DebtStatusMatches = Assert<Equal<(typeof enumValues.debtStatus)[number], GovernanceDebt["status"]>>;
type _FindingStatusMatches = Assert<Equal<(typeof enumValues.findingStatus)[number], GovernanceFindingStatus>>;

const schemaEntityContracts = [
  ["pack", governanceSchema.properties, fieldPresence.pack],
  ...([
    ["project", "GovernanceProject"],
    ["change", "GovernanceChange"],
    ["standard", "GovernanceStandard"],
    ["control", "GovernanceControl"],
    ["evidence", "GovernanceEvidence"],
    ["risk", "GovernanceRisk"],
    ["decision", "GovernanceDecisionRecord"],
    ["exception", "GovernanceException"],
    ["debt", "GovernanceDebt"],
    ["finding", "GovernanceFinding"],
  ] as const).map(([schemaName]) => [
    schemaName,
    governanceSchema.$defs[schemaName].properties,
    fieldPresence[schemaName],
  ] as const),
] as const;

function expectSchemaFieldsToMatch(
  schemaObject: { properties: Record<string, unknown>; required?: string[] },
  typeFields: Record<string, "required" | "optional">,
  label: string,
): void {
  const schemaFields = Object.keys(schemaObject.properties).sort();
  const typeKeys = Object.keys(typeFields).sort();
  expect({ label, schemaFields }).toEqual({ label, schemaFields: typeKeys });
  const schemaRequired = [...(schemaObject.required ?? [])].sort();
  const typeRequired = Object.keys(typeFields).filter((key) => typeFields[key] === "required").sort();
  expect({ label, schemaRequired }).toEqual({ label, schemaRequired: typeRequired });
}

function expectEnumToMatch(schemaEnum: unknown, typeEnum: readonly string[], label: string): void {
  expect({ label, values: [...(schemaEnum as string[])].sort() }).toEqual({
    label,
    values: [...typeEnum].sort(),
  });
}

describe("JSON Schema and TypeScript contract alignment", () => {
  it("keeps governance pack/entity field names and requiredness aligned", () => {
    for (const [name, properties, presence] of schemaEntityContracts) {
      expectSchemaFieldsToMatch(
        { properties: properties as Record<string, unknown>, required: name === "pack" ? governanceSchema.required : governanceSchema.$defs[name].required },
        presence as Record<string, "required" | "optional">,
        name,
      );
    }
  });

  it("keeps architecture profile and boundary-rule fields and requiredness aligned", () => {
    expectSchemaFieldsToMatch(
      architectureProfileSchema as { properties: Record<string, unknown>; required?: string[] },
      fieldPresence.architectureProfile,
      "architectureProfile",
    );
    const ruleSchema = architectureProfileSchema.properties.boundaryRules.items as {
      properties: Record<string, unknown>;
      required?: string[];
    };
    expectSchemaFieldsToMatch(ruleSchema, fieldPresence.architectureBoundaryRule, "architectureBoundaryRule");
  });

  it("keeps governance enum unions aligned with the schema enum sets", () => {
    const defs = governanceSchema.$defs;
    expectEnumToMatch(defs.control.properties.severity.enum, enumValues.severity, "severity");
    expectEnumToMatch(defs.control.properties.status.enum, enumValues.controlStatus, "controlStatus");
    expectEnumToMatch(defs.control.properties.failure_decision.enum, enumValues.failureDecision, "failureDecision");
    expectEnumToMatch(defs.evidence.properties.status.enum, enumValues.evidenceStatus, "evidenceStatus");
    expectEnumToMatch(defs.evidence.properties.freshness_status.enum, enumValues.evidenceFreshness, "evidenceFreshness");
    expectEnumToMatch(defs.change.properties.type.enum, enumValues.changeType, "changeType");
    expectEnumToMatch(defs.evidence.properties.type.enum, enumValues.evidenceType, "evidenceType");
    expectEnumToMatch(defs.decision.properties.type.enum, enumValues.decisionType, "decisionType");
    expectEnumToMatch(defs.decision.properties.status.enum, enumValues.decisionStatus, "decisionStatus");
    expectEnumToMatch(defs.risk.properties.status.enum, enumValues.riskStatus, "riskStatus");
    expectEnumToMatch(defs.exception.properties.status.enum, enumValues.exceptionStatus, "exceptionStatus");
    expectEnumToMatch(defs.debt.properties.status.enum, enumValues.debtStatus, "debtStatus");
    expectEnumToMatch(defs.finding.properties.status.enum, enumValues.findingStatus, "findingStatus");
  });

  it("documents that schema-only constraints are runtime validation, not TypeScript guarantees", () => {
    // JSON Schema remains authoritative for regexes, formats, numeric/string
    // bounds, uniqueness, additionalProperties, and status-dependent requiredness.
    expect(governanceSchema.$defs.risk.allOf).toHaveLength(1);
    expect(governanceSchema.$defs.exception.allOf).toHaveLength(2);
    expect(governanceSchema.$defs.evidence.properties.generated_at.format).toBe("date-time");
    expect(governanceSchema.$defs.finding.properties.confidence.minimum).toBe(0);
    expect(governanceSchema.$defs.finding.properties.confidence.maximum).toBe(1);
  });
});


function schemaNode(root: unknown, dottedPath: string): Record<string, unknown> {
  let current: unknown = root;
  for (const segment of dottedPath.split(".")) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      throw new Error(`Cannot resolve schema path: ${dottedPath}`);
    }
  }
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new Error(`Schema path is not an object: ${dottedPath}`);
  }
  return current as Record<string, unknown>;
}

describe("JSON Schema constraint inventory", () => {
  it("keeps primitive types, formats, patterns, bounds, uniqueness, and object policies explicit", () => {
    const contracts: Array<[string, Record<string, unknown>]> = [
      ["properties.version", { type: "string", pattern: "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+$" }],
      ["$defs.project.properties.id", { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*$" }],
      ["$defs.project.properties.name", { type: "string", minLength: 1 }],
      ["$defs.change.properties.id", { type: "string", pattern: "^CHG-[0-9A-Z-]+$" }],
      ["$defs.change.properties.title", { type: "string", minLength: 1 }],
      ["$defs.standard.properties.id", { type: "string", pattern: "^[A-Z]{2,6}-\\\\d{3}$" }],
      ["$defs.control.properties.id", { type: "string", pattern: "^[A-Z0-9-]+$" }],
      ["$defs.control.properties.max_evidence_age_seconds", { type: "integer", minimum: 0 }],
      ["$defs.evidence.properties.id", { type: "string", pattern: "^EVD-[0-9A-Z-]+$" }],
      ["$defs.evidence.properties.freshness", { type: "string", minLength: 1 }],
      ["$defs.evidence.properties.tool_version", { type: "string", minLength: 1 }],
      ["$defs.evidence.properties.generated_at", { type: "string", format: "date-time" }],
      ["$defs.evidence.properties.repository_fingerprint", { type: "string", pattern: "^sha256:[0-9a-f]{64}$" }],
      ["$defs.evidence.properties.duration_ms", { type: "integer", minimum: 0 }],
      ["$defs.risk.properties.id", { type: "string", pattern: "^RSK-[0-9A-Z-]+$" }],
      ["$defs.risk.properties.accepted_by", { type: "string", minLength: 1 }],
      ["$defs.risk.properties.accepted_at", { type: "string", format: "date-time" }],
      ["$defs.risk.properties.acceptance_expires_at", { type: "string", format: "date-time" }],
      ["$defs.risk.properties.acceptance_reason", { type: "string", minLength: 1 }],
      ["$defs.decision.properties.id", { type: "string", pattern: "^DEC-[0-9A-Z-]+$" }],
      ["$defs.decision.properties.timestamp", { type: "string", format: "date-time" }],
      ["$defs.exception.properties.id", { type: "string", pattern: "^EXC-[0-9A-Z-]+$" }],
      ["$defs.exception.properties.control", { type: "string", minLength: 1 }],
      ["$defs.exception.properties.reason", { type: "string", minLength: 1 }],
      ["$defs.exception.properties.expires_at", { type: "string", format: "date-time" }],
      ["$defs.exception.properties.change_id", { type: "string", pattern: "^CHG-[0-9A-Z-]+$" }],
      ["$defs.debt.properties.id", { type: "string", pattern: "^DEBT-[0-9A-Z-]+$" }],
      ["$defs.finding.properties.id", { type: "string", minLength: 1 }],
      ["$defs.finding.properties.category", { type: "string", minLength: 1 }],
      ["$defs.finding.properties.evidence_refs", { type: "array", uniqueItems: true }],
      ["$defs.finding.properties.source_location.properties.start_line", { type: "integer", minimum: 1 }],
      ["$defs.finding.properties.source_location.properties.end_line", { type: "integer", minimum: 1 }],
      ["$defs.finding.properties.confidence", { type: "number", minimum: 0, maximum: 1 }],
    ];

    for (const [path, expected] of contracts) {
      const node = schemaNode(governanceSchema, path);
      for (const [key, value] of Object.entries(expected)) {
        expect(node[key], `${path}.${key}`).toEqual(value);
      }
    }

    const packSchema = governanceSchema as unknown as Record<string, unknown>;
    expect(packSchema["additionalProperties"], "top-level governance-pack additionalProperties remains an unresolved policy decision").toBeUndefined();
    expect(schemaNode(governanceSchema, "$defs.project").additionalProperties).toBe(false);
    expect(schemaNode(governanceSchema, "$defs.control").additionalProperties).toBe(false);
    expect(schemaNode(governanceSchema, "$defs.evidence").additionalProperties).toBe(false);
    expect(schemaNode(architectureProfileSchema, "").additionalProperties).toBe(false);
  });

  it("keeps status-dependent risk and exception requirements explicit", () => {
    const riskAccepted = schemaNode(governanceSchema, "$defs.risk.allOf.0");
    expect(schemaNode(riskAccepted, "if.properties.status").const).toBe("ACCEPTED");
    expect([...(riskAccepted.then as { required: string[] }).required].sort()).toEqual([
      "accepted_at", "accepted_by", "acceptance_expires_at", "acceptance_reason",
    ]);

    const exceptionRequested = schemaNode(governanceSchema, "$defs.exception.allOf.0");
    expect(schemaNode(exceptionRequested, "if.properties.status").const).toBe("REQUESTED");
    expect([...(exceptionRequested.then as { required: string[] }).required].sort()).toEqual([
      "change_id", "control", "project_id", "reason", "requested_at", "requested_by",
    ]);

    const exceptionApproved = schemaNode(governanceSchema, "$defs.exception.allOf.1");
    expect(schemaNode(exceptionApproved, "if.properties.status").const).toBe("APPROVED");
    expect([...(exceptionApproved.then as { required: string[] }).required].sort()).toEqual([
      "approved_at", "approved_by", "change_id", "control", "expires_at", "project_id",
      "reason", "requested_at", "requested_by",
    ]);
  });

  it("keeps architecture-profile array, pattern, and numeric constraints explicit", () => {
    const contracts: Array<[string, Record<string, unknown>]> = [
      ["properties.id", { type: "string", pattern: "^[a-z][a-z0-9-]*$" }],
      ["properties.version", { type: "string", pattern: "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+$" }],
      ["properties.styles", { type: "array", minItems: 1, uniqueItems: true }],
      ["properties.styles.items", { type: "string", minLength: 1 }],
      ["properties.boundaryRules.items.properties.id", { type: "string", minLength: 1, pattern: "^[A-Z0-9][A-Z0-9-]*$" }],
      ["properties.boundaryRules.items.properties.allowed", { type: "boolean", default: false }],
      ["properties.requiredControls", { type: "array", uniqueItems: true }],
      ["properties.capabilities", { type: "array", uniqueItems: true }],
      ["properties.componentMappings.additionalProperties", { type: "array", minItems: 1 }],
    ];
    for (const [path, expected] of contracts) {
      const node = schemaNode(architectureProfileSchema, path);
      for (const [key, value] of Object.entries(expected)) {
        expect(node[key], `architecture-profile ${path}.${key}`).toEqual(value);
      }
    }
  });
});
