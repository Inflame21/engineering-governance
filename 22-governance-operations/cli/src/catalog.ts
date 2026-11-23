import type { GovernanceEvidence, GovernancePack, GovernanceViolation, Severity } from "../../engine/src/types.js";
import type { RepositoryAdapterResult } from "../../analyzer/src/types.js";
import type { ControlCatalog } from "./config.js";

const severityStrength: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const decisionStrength = { "NO-GO": 0, GO_WITH_CONDITIONS: 1, REVIEW_REQUIRED: 2, NONE: 3 } as const;

export interface CatalogAssessment {
  /** Violations of APPROVED controls: these block. */
  blocking: GovernanceViolation[];
  /** DRAFT controls are reported, not enforced: these are conditions. */
  warnings: GovernanceViolation[];
}

/**
 * Ids of the catalog controls whose exception_policy is NON_EXCEPTIONABLE. DRAFT controls count:
 * the rule comes from EXC-021 section 7, not from the control's approval. DEPRECATED and RETIRED
 * controls no longer apply.
 */
export function nonExceptionableCatalogControls(catalog: ControlCatalog): string[] {
  return catalog.controls
    .filter((control) => control.exception_policy === "NON_EXCEPTIONABLE" && (control.status === "DRAFT" || control.status === "APPROVED"))
    .map((control) => control.id)
    .sort();
}

/**
 * Link generated evidence to the catalog controls it is declared able to verify. A control names the
 * capabilities that can verify it (`verification_capabilities`); evidence produced by an adapter that
 * completed with one of those capabilities then supports that control. Without this link generated
 * evidence supports no control, so a passing scan could never pass one.
 *
 * Only support is granted, never a pass: the engine still requires the evidence to be VERIFIED, current
 * and bound to this repository state, and any linked record that is not usable blocks the control (a
 * failed scan stays a failure). Any one listed capability may verify a control; a control that lists
 * none is not linked. Only DRAFT and APPROVED controls are linked. Evidence a pack declares itself is
 * never touched, and neither is evidence from an adapter that did not complete, because such an adapter
 * does not list the capability as supported.
 */
export function bindEvidenceToCatalog(
  evidence: readonly GovernanceEvidence[],
  adapterResults: readonly RepositoryAdapterResult[],
  catalog: ControlCatalog,
): GovernanceEvidence[] {
  const controlsByCapability = new Map<string, string[]>();
  for (const control of catalog.controls) {
    if (control.status !== "DRAFT" && control.status !== "APPROVED") continue;
    for (const capability of control.verification_capabilities) {
      controlsByCapability.set(capability, [...(controlsByCapability.get(capability) ?? []), control.id]);
    }
  }
  if (controlsByCapability.size === 0) return [...evidence];

  const linked = new Map<string, Set<string>>();
  for (const adapter of adapterResults) {
    const controlIds = adapter.supportedCapabilities.flatMap((capability) => controlsByCapability.get(capability) ?? []);
    for (const evidenceId of adapter.evidenceRefs) {
      const set = linked.get(evidenceId) ?? new Set<string>();
      for (const controlId of controlIds) set.add(controlId);
      linked.set(evidenceId, set);
    }
  }
  return evidence.map((item) => {
    const extra = linked.get(item.id);
    if (!extra || extra.size === 0) return item;
    return { ...item, supports_controls: [...new Set([...item.supports_controls, ...extra])].sort() };
  });
}

const preview = (ids: string[]): string =>
  ids.length <= 6 ? ids.join(", ") : `${ids.slice(0, 6).join(", ")} and ${ids.length - 6} more`;

/**
 * Compare a governance pack against the catalog. A pack must define every mandatory catalog control
 * under the catalog's id and may not weaken it (lower severity, softer failure decision, different
 * standard). Only APPROVED controls are enforced; DRAFT controls surface as one aggregate condition
 * each, because enforcing unapproved policy would be arbitrary.
 */
export function assessPackAgainstCatalog(pack: GovernancePack, catalog: ControlCatalog): CatalogAssessment {
  const blocking: GovernanceViolation[] = [];
  const draftMissing: string[] = [];
  const draftWeakened: string[] = [];
  const packControls = new Map(pack.controls.map((control) => [control.id, control]));

  for (const entry of catalog.controls) {
    if (!entry.mandatory || (entry.status !== "APPROVED" && entry.status !== "DRAFT")) continue;
    const enforced = entry.status === "APPROVED";
    const packControl = packControls.get(entry.id);

    if (!packControl) {
      if (enforced) {
        blocking.push({
          controlId: `CATALOG:${entry.id}:NOT-DEFINED`,
          status: "FAIL",
          severity: entry.severity,
          decision: "NO-GO",
          message: `Catalog control ${entry.id} (${entry.standard_id}, ${entry.source_section}: ${entry.source_text}) is APPROVED and mandatory, but the governance pack does not define it.`,
          missingEvidence: [],
          missingSignals: [],
        });
      } else {
        draftMissing.push(entry.id);
      }
      continue;
    }

    const weakened: string[] = [];
    if (severityStrength[packControl.severity] > severityStrength[entry.severity]) {
      weakened.push(`severity ${packControl.severity} is below the catalog's ${entry.severity}`);
    }
    const packDecision = decisionStrength[packControl.failure_decision ?? "NONE"];
    if (packDecision > decisionStrength[entry.failure_decision]) {
      weakened.push(`failure decision ${packControl.failure_decision ?? "NONE"} is softer than the catalog's ${entry.failure_decision}`);
    }
    if (packControl.standard !== entry.standard_id) {
      weakened.push(`it cites standard ${packControl.standard} instead of ${entry.standard_id}`);
    }
    if (weakened.length === 0) continue;

    if (enforced) {
      blocking.push({
        controlId: `CATALOG:${entry.id}:WEAKENED`,
        status: "FAIL",
        severity: entry.severity,
        decision: "NO-GO",
        message: `The governance pack weakens APPROVED catalog control ${entry.id}: ${weakened.join("; ")}.`,
        missingEvidence: [],
        missingSignals: [],
      });
    } else {
      draftWeakened.push(entry.id);
    }
  }

  const warnings: GovernanceViolation[] = [];
  const draftCondition = (suffix: string, ids: string[], what: string): void => {
    if (ids.length === 0) return;
    warnings.push({
      controlId: `CATALOG:${catalog.catalog_id}:${suffix}`,
      status: "WARN",
      severity: "P2",
      decision: "GO_WITH_CONDITIONS",
      message: `${ids.length} mandatory DRAFT control(s) in catalog ${catalog.catalog_id} ${catalog.catalog_version} ${what}. DRAFT controls are not enforced until approved: ${preview(ids)}.`,
      missingEvidence: [],
      missingSignals: [],
    });
  };
  draftCondition("DRAFT-CONTROLS-NOT-DEFINED", draftMissing, "are not defined in the governance pack");
  draftCondition("DRAFT-CONTROLS-WEAKENED", draftWeakened, "are weakened by the governance pack");

  return { blocking, warnings };
}
