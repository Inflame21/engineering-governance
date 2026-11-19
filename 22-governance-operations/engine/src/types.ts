import type { DebtSummary } from "./debt.js";
export type Severity = "P0" | "P1" | "P2" | "P3";
export type ControlStatus = "PASS" | "FAIL" | "WARN" | "NOT_APPLICABLE" | "UNVERIFIED";
export type EvidenceStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_APPLICABLE";
export type EvidenceFreshness = "current" | "stale" | "expired" | "unknown";
/** What a verification tool or adapter reported; mapped to an EvidenceStatus by an explicit policy. */
export type ToolResultStatus = "PASS" | "WARN" | "FAIL" | "SKIPPED" | "UNSUPPORTED" | "UNVERIFIED" | "ERROR";
export type FailureDecision = "NO-GO" | "GO_WITH_CONDITIONS" | "REVIEW_REQUIRED" | "NONE";

export type GovernanceChangeType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "security"
  | "database"
  | "infrastructure"
  | "configuration"
  | "release"
  | "emergency";

export type GovernanceEvidenceType =
  | "E1_DIRECT_VERIFICATION"
  | "E2_INSPECTION"
  | "E3_AUTOMATED_ANALYSIS"
  | "E4_OPERATIONAL"
  | "E5_DOCUMENTARY"
  | "E6_ASSERTION";

export type GovernanceDecisionType = "READINESS" | "REVIEW" | "RELEASE" | "PRODUCTION";
export type GovernanceDecisionRecordStatus =
  | "READY"
  | "READY_WITH_CONDITIONS"
  | "NOT_READY"
  | "APPROVE"
  | "APPROVE_WITH_CONDITIONS"
  | "REQUEST_CHANGES"
  | "REJECT"
  | "GO"
  | "GO_WITH_CONDITIONS"
  | "NO-GO";

export interface GovernanceChange {
  id: string;
  type: GovernanceChangeType;
  title: string;
  description?: string;
  author?: string;
  risk_class: "A" | "B" | "C" | "D";
  files: string[];
}

export interface GovernanceControl {
  id: string;
  standard: string;
  title: string;
  severity: Severity;
  /** A declaration is not proof; the evaluator derives the effective status from evidence. */
  status?: ControlStatus;
  applies_when?: string | string[];
  required_evidence?: string[];
  max_evidence_age_seconds?: number;
  failure_decision?: FailureDecision;
  message?: string;
}

export interface GovernanceEvidence {
  id: string;
  type: GovernanceEvidenceType;
  status: EvidenceStatus;
  description: string;
  source: string;
  freshness: string;
  freshness_status?: EvidenceFreshness;
  supports_controls: string[];
  /** The tool's own result. When present, status may not be stronger than the policy allows for it. */
  result_status?: ToolResultStatus;
  tool_version?: string;
  generated_at?: string;
  repository_fingerprint?: string;
  duration_ms?: number;
  exit_code?: number;
  command?: string[];
}

export interface GovernanceRisk {
  id: string;
  severity: Severity;
  title: string;
  status: "OPEN" | "MITIGATED" | "ACCEPTED" | "CLOSED";
  mitigation?: string;
  owner?: string;
  accepted_by?: string;
  accepted_at?: string;
  acceptance_expires_at?: string;
  acceptance_reason?: string;
  /** The authority role under which accepted_by accepted the risk (EXC-021 section 15). */
  acceptance_role?: string;
}

export interface GovernanceStandard {
  id: string;
  title: string;
  version: string;
  source: string;
}

export interface GovernanceDecisionRecord {
  id: string;
  type: GovernanceDecisionType;
  status: GovernanceDecisionRecordStatus;
  reason?: string;
  evidence?: string[];
  owner?: string;
  timestamp?: string;
}

export interface GovernanceException {
  id: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "EXPIRED" | "CLOSED";
  control?: string;
  reason?: string;
  project_id?: string;
  change_id?: string;
  requested_by?: string;
  requested_at?: string;
  approved_by?: string;
  /** The authority role under which approved_by approved the exception (EXC-021 section 15). */
  approver_role?: string;
  approved_at?: string;
  expires_at?: string;
  /** Repository-relative path of a detached GPG signature over the approval (see the CLI's exception approve --sign). */
  approval_signature?: string;
}

/** An approved authority role: which severities it may approve and who holds it. */
export interface ApproverAuthority {
  role: string;
  /** P1 to P3 only: P0 is never approvable through the normal flow (EXC-021 section 8). */
  severities: Severity[];
  /** Names and handles of the people who hold the role. */
  holders: string[];
}

export interface GovernanceDebt {
  id: string;
  severity: Severity;
  status: "OPEN" | "PLANNED" | "IN_PROGRESS" | "ACCEPTED" | "RESOLVED";
  title?: string;
  owner?: string;
  /** Date (YYYY-MM-DD) by which the debt should be resolved or re-decided; debt past it is overdue (DEBT-020 section 14, Target). */
  target_date?: string;
  /** Date (YYYY-MM-DD) the debt, and for ACCEPTED debt the decision to accept it, was last reviewed (DEBT-020 sections 14 and 18). */
  last_reviewed?: string;
  /** Controls this debt is recorded against; the report shows their current status next to it. */
  controls?: string[];
}

export interface GovernanceProject {
  id: string;
  name: string;
  repository: string;
  environment: string;
}

export type GovernanceFindingStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "ACCEPTED"
  | "SUPPRESSED"
  | "UNVERIFIED";

export interface GovernanceFinding {
  id: string;
  rule_id: string;
  severity: Severity;
  category: string;
  message: string;
  status: GovernanceFindingStatus;
  evidence_refs: string[];
  source_location?: {
    file: string;
    start_line?: number;
    end_line?: number;
    start_column?: number;
    end_column?: number;
  };
  component_id?: string;
  confidence?: number;
  remediation?: string;
}

export interface GovernancePack {
  version: string;
  project: GovernanceProject;
  change: GovernanceChange;
  standards: GovernanceStandard[];
  controls: GovernanceControl[];
  evidence: GovernanceEvidence[];
  risks: GovernanceRisk[];
  decisions: GovernanceDecisionRecord[];
  findings?: GovernanceFinding[];
  exceptions?: GovernanceException[];
  debt?: GovernanceDebt[];
}

export type GovernanceAnalysisStatus = "COMPLETE" | "PARTIAL" | "FAILED";

export interface GovernanceContext {
  /** Normalized facts emitted by any language/framework analyzer. */
  signals: string[];
  facts?: Record<string, unknown>;
  /** Partial or failed analysis must not be treated as proof that controls do not apply. */
  analysisStatus?: GovernanceAnalysisStatus;
  /**
   * Fingerprint of the repository state being assessed. Evidence that names a different
   * repository_fingerprint was produced against other code, so it no longer proves anything about this
   * state and is not usable. Evidence that names none is unaffected.
   */
  repositoryFingerprint?: string;
  unsupportedCapabilities?: string[];
  analyzerLimitations?: string[];
  /** Findings emitted by repository analyzers; unresolved high-severity findings affect the decision. */
  findings?: GovernanceFinding[];
  /** Optional Git diff verification; UNVERIFIED scope must be surfaced in the decision. */
  changeScopeStatus?: "VERIFIED" | "UNVERIFIED";
  changeScopeReason?: string;
  changedFiles?: string[];
  /** ISO-8601 timestamp supplied by the caller so exception evaluation is reproducible. */
  evaluatedAt?: string;
  /**
   * Control ids that an exception can never waive (EXC-021 section 7), supplied by the caller, for
   * example from the control catalog. Listing a control here makes every exception for it invalid.
   */
  nonExceptionableControls?: string[];
  /**
   * The approved authority roles, supplied by the caller from a policy it trusts. When present and not
   * empty, every exception waiver and risk acceptance must come from a holder of a role that covers its
   * severity. When absent or empty, no P1 waiver or P1 acceptance can hold, and P2/P3 behave as before.
   */
  approverAuthority?: ApproverAuthority[];
  /**
   * Ids of exceptions whose approval signature the caller verified against the approver's registered
   * key. When this is present (even empty), an approved exception not listed here does not hold: the
   * claimed approver was not authenticated. When absent, approvals are taken as declared.
   */
  verifiedApprovals?: string[];
}

export type ApplicabilityStatus = "APPLICABLE" | "NOT_APPLICABLE" | "UNVERIFIED";

export interface ControlEvaluation {
  controlId: string;
  applicable: boolean;
  applicabilityStatus: ApplicabilityStatus;
  status: ControlStatus;
  severity: Severity;
  failureDecision: FailureDecision;
  missingEvidence: string[];
  missingSignals: string[];
  supportingEvidence: string[];
  reason: string;
}

export interface GovernanceViolation {
  controlId: string;
  status: ControlStatus;
  severity: Severity;
  decision: FailureDecision;
  message: string;
  missingEvidence: string[];
  missingSignals: string[];
  evidenceRefs?: string[];
}

export interface GovernanceDecision {
  status: "GO" | "GO_WITH_CONDITIONS" | "NO-GO";
  reason: string;
  blockingViolations: GovernanceViolation[];
  warnings: GovernanceViolation[];
  openRisks: GovernanceRisk[];
}

export interface GovernanceEvaluation {
  controls: ControlEvaluation[];
  violations: GovernanceViolation[];
  decision: GovernanceDecision;
  /** Present only when the pack records debt (DEBT-020, OPS-04). */
  debt?: DebtSummary;
}

export interface AnalyzerInput {
  rootPath: string;
  changedFiles: readonly string[];
}

export interface AnalyzerOutput {
  signals: string[];
  facts?: Record<string, unknown>;
  evidence?: GovernanceEvidence[];
}

export interface RepositoryAnalyzer {
  readonly id: string;
  readonly languages: readonly string[];
  readonly frameworks?: readonly string[];
  analyze(input: AnalyzerInput): Promise<AnalyzerOutput>;
}
