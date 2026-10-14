import { createHash } from "node:crypto";
import type { RepositorySnapshot } from "./types.js";

const sourceExtensions = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".py",
  ".go", ".java", ".rs", ".cs", ".rb", ".php", ".kt", ".swift", ".c", ".h", ".cc", ".cpp", ".hpp",
]);

export interface RepositorySnapshotFingerprint {
  algorithm: "sha256";
  digest: string;
  fileCount: number;
  ingestedContentFileCount: number;
  sourceFileCount: number;
  inspectedSourceFileCount: number;
  sourceContentStatus: "COMPLETE" | "PARTIAL";
  limitations: string[];
}

/**
 * Creates a deterministic identifier for the repository path inventory and
 * all content ingested by the scanner. It is not a substitute for a full-tree
 * content hash; the returned coverage fields disclose when content was skipped.
 */
export function fingerprintRepositorySnapshot(
  snapshot: RepositorySnapshot,
): RepositorySnapshotFingerprint {
  const files = [...new Set(snapshot.files.map((file) => file.replaceAll("\\", "/")))].sort();
  const contents = new Map(
    Object.entries(snapshot.fileContents ?? {}).map(([file, value]) => [file.replaceAll("\\", "/"), value]),
  );
  const fileSet = new Set(files);
  const sourceFiles = files.filter((file) => sourceExtensions.has(file.slice(file.lastIndexOf(".")).toLowerCase()));
  const inspectedSourceFiles = sourceFiles.filter((file) => contents.has(file));
  const limitations = [...(snapshot.contentLimitations ?? [])];
  if (inspectedSourceFiles.length < sourceFiles.length && limitations.length === 0) {
    limitations.push("Some source files were not ingested; the fingerprint covers paths and available content only.");
  }

  const hash = createHash("sha256");
  hash.update("engineering-governance-snapshot-v1\0");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    const content = contents.get(file);
    if (content === undefined) {
      hash.update("<content-not-ingested>");
    } else {
      hash.update(content);
    }
    hash.update("\0");
  }

  return {
    algorithm: "sha256",
    digest: `sha256:${hash.digest("hex")}`,
    fileCount: files.length,
    ingestedContentFileCount: [...contents.keys()].filter((file) => fileSet.has(file)).length,
    sourceFileCount: sourceFiles.length,
    inspectedSourceFileCount: inspectedSourceFiles.length,
    sourceContentStatus: inspectedSourceFiles.length === sourceFiles.length && limitations.length === 0
      ? "COMPLETE"
      : "PARTIAL",
    limitations,
  };
}
