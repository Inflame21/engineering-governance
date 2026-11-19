import { createHash } from "node:crypto";
import type { RepositorySnapshot } from "./types.js";

const sourceExtensions = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".py",
  ".go", ".java", ".rs", ".cs", ".rb", ".php", ".kt", ".swift", ".c", ".h", ".cc", ".cpp", ".hpp",
]);

/**
 * Files the governance tool itself writes (the assessment history and saved reports). They are outputs
 * of assessing a repository, not part of what is assessed: counting them would make the next assessment
 * of unchanged code fingerprint differently just because the last one was recorded.
 */
const GENERATED_OUTPUT_PREFIXES = [".governance/history/", ".governance/reports/"];

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
  const files = [...new Set(snapshot.files.map((file) => file.replaceAll("\\", "/")))]
    .filter((file) => !GENERATED_OUTPUT_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .sort();
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

  // Every field is length-prefixed (in UTF-8 bytes) so no file can be made to hash like another by
  // embedding a separator in its content. Content that was not ingested is marked by length -1, which a
  // real (non-negative) length can never equal.
  const field = (text: string | undefined): string =>
    text === undefined ? "-1:" : `${Buffer.byteLength(text, "utf8")}:${text}`;
  const hash = createHash("sha256");
  hash.update("engineering-governance-snapshot-v2\0");
  for (const file of files) {
    hash.update(field(file));
    hash.update(field(contents.get(file)));
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
