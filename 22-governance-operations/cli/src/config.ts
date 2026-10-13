import type { GovernancePack } from "../../engine/src/types.js";

export interface GovernanceConfig {
  governancePackPath: string;
  changedFiles?: string[];
}

export interface ConfigFileSystemPort {
  readTextFile(rootPath: string, relativePath: string): Promise<string | undefined>;
}

export async function loadGovernancePack(
  rootPath: string,
  path: string,
  fs: ConfigFileSystemPort,
): Promise<GovernancePack> {
  const content = await fs.readTextFile(rootPath, path);
  if (content === undefined) {
    throw new Error(`Governance pack not found: ${path}`);
  }

  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Governance pack must be a JSON object");
  }

  // Full schema validation is a separate mandatory hardening step.
  return parsed as GovernancePack;
}
