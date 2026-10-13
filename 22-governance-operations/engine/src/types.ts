export type Severity = "P0" | "P1" | "P2" | "P3";
export type ControlStatus = "PASS" | "FAIL" | "WARN" | "NOT_APPLICABLE" | "UNVERIFIED";
export type EvidenceStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_APPLICABLE";
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
  supports_controls: string[];
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
  approved_at?: string;
  expires_at?: string;
}

export interface GovernanceDebt {
  id: string;
  severity: Severity;
  status: "OPEN" | "PLANNED" | "IN_PROGRESS" | "ACCEPTED" | "RESOLVED";
  title?: string;
  owner?: string;
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
  unsupportedCapabilities?: string[];
  analyzerLimitations?: string[];
  /** Findings emitted by repository analyzers; unresolved high-severity findings affect the decision. */
  findings?: GovernanceFinding[];
  /** ISO-8601 timestamp supplied by the caller so exception evaluation is reproducible. */
  evaluatedAt?: string;
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
  severity: Severity;
  decision: FailureDecision;
  message: string;
  missingEvidence: string[];
  missingSignals: string[];
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
