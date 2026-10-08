export function parsePackageJson(content: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function hasPackageDependency(
  packageJson: Record<string, unknown>,
  packageName: string,
): boolean {
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const value = packageJson[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (packageName in value) return true;
    }
  }
  return false;
}

export function hasPythonDependency(content: string | undefined, packageName: string): boolean {
  if (!content) return false;
  const escaped = packageName.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s=<>~!])${escaped}(?:[\\s=<>~!]|$)`, "im").test(content);
}
