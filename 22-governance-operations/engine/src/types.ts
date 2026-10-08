export type Severity = "P0" | "P1" | "P2" | "P3";
export type ControlStatus = "PASS" | "FAIL" | "WARN" | "NOT_APPLICABLE" | "UNVERIFIED";
export type EvidenceStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_APPLICABLE";
export type FailureDecision = "NO-GO" | "GO_WITH_CONDITIONS" | "REVIEW_REQUIRED" | "NONE";

export interface GovernanceChange {
  id: string;
  type: string;
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
  status?: ControlStatus;
  applies_when?: string | string[];
  required_evidence?: string[];
  failure_decision?: FailureDecision;
  message?: string;
}

export interface GovernanceEvidence {
  id: string;
  type: string;
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
}

export interface GovernanceStandard {
  id: string;
  title: string;
  version: string;
  source: string;
}

export interface GovernancePack {
  version: string;
  project: { id: string; name: string; repository: string; environment: string };
  change: GovernanceChange;
  standards: GovernanceStandard[];
  controls: GovernanceControl[];
  evidence: GovernanceEvidence[];
  risks: GovernanceRisk[];
  decisions: Array<Record<string, unknown>>;
  exceptions?: Array<Record<string, unknown>>;
  debt?: Array<Record<string, unknown>>;
}

export interface GovernanceContext {
  /** Normalized facts emitted by any language/framework analyzer. */
  signals: string[];
  facts?: Record<string, unknown>;
}

export interface ControlEvaluation {
  controlId: string;
  applicable: boolean;
  status: ControlStatus;
  severity: Severity;
  failureDecision: FailureDecision;
  missingEvidence: string[];
  supportingEvidence: string[];
  reason: string;
}

export interface GovernanceViolation {
  controlId: string;
  severity: Severity;
  decision: FailureDecision;
  message: string;
  missingEvidence: string[];
}

export interface GovernanceDecision {
  status: "GO" | "GO_WITH_CONDITIONS" | "NO-GO";
  reason: string;
  blockingViolations: GovernanceViolation[];
  warnings: GovernanceViolation[];
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
