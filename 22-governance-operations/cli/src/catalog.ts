import type { GovernancePack, GovernanceViolation, Severity } from "../../engine/src/types.js";
import type { ControlCatalog } from "./config.js";

const severityStrength: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const decisionStrength = { "NO-GO": 0, GO_WITH_CONDITIONS: 1, REVIEW_REQUIRED: 2, NONE: 3 } as const;

export interface CatalogAssessment {
  /** Violations of APPROVED controls: these block. */
  blocking: GovernanceViolation[];
  /** DRAFT controls are reported, not enforced: these are conditions. */
  warnings: GovernanceViolation[];
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
