export interface ArchitectureBoundaryRule {
  id: string;
  description: string;
  severity: "P0" | "P1" | "P2" | "P3";
  sourcePattern?: string;
  targetPattern?: string;
  allowed?: boolean;
}

export interface ArchitectureProfile {
  id: string;
  version: string;
  name: string;
  styles: string[];
  boundaryRules: ArchitectureBoundaryRule[];
  requiredControls: string[];
  capabilities?: string[];
}

export interface ArchitectureProfileValidation {
  valid: boolean;
  errors: string[];
}

export function validateArchitectureProfile(
  value: unknown,
): ArchitectureProfileValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Profile must be an object."] };
  }

  const profile = value as Record<string, unknown>;
  for (const field of ["id", "version", "name"]) {
    if (typeof profile[field] !== "string" || profile[field].trim() === "") {
      errors.push(`'${field}' must be a non-empty string.`);
    }
  }

  if (!Array.isArray(profile.styles) || profile.styles.length === 0 ||
      !profile.styles.every((item) => typeof item === "string" && item.trim() !== "")) {
    errors.push("'styles' must be a non-empty array of strings.");
  }

  if (!Array.isArray(profile.requiredControls) ||
      !profile.requiredControls.every((item) => typeof item === "string")) {
    errors.push("'requiredControls' must be an array of strings.");
  }

  if (!Array.isArray(profile.boundaryRules)) {
    errors.push("'boundaryRules' must be an array.");
  } else {
    profile.boundaryRules.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`boundaryRules[${index}] must be an object.`);
        return;
      }
      const rule = item as Record<string, unknown>;
      if (typeof rule.id !== "string" || rule.id.trim() === "") {
        errors.push(`boundaryRules[${index}].id must be a non-empty string.`);
      }
      if (typeof rule.description !== "string" || rule.description.trim() === "") {
        errors.push(`boundaryRules[${index}].description must be a non-empty string.`);
      }
      if (!["P0", "P1", "P2", "P3"].includes(String(rule.severity))) {
        errors.push(`boundaryRules[${index}].severity must be P0, P1, P2, or P3.`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function architectureSignals(profile: ArchitectureProfile): string[] {
  return [
    ...new Set([
      ...profile.styles.map((style) => `architecture:${style}`),
      `architecture-profile:${profile.id}`,
    ]),
  ].sort();
}
