#!/usr/bin/env bash
# Runs the governance CLI for the reusable workflow and applies the pipeline's policy for conditional results.
#
# Everything arrives through environment variables, never through the command line, so a workflow input
# can never be interpreted as shell code. Every value is validated before it is used.
#
# Required: GOVERNANCE_CLI (built CLI entry point), TARGET_DIR (repository to assess), OUT_DIR, CONDITIONS (pass|fail).
# Optional: RECORD_HISTORY (true|false; append the assessment to .governance/history/ in TARGET_DIR), PACK_PATH, REGISTRY_PATH, PROJECT_ID, PROFILE_PATH, CATALOG_PATH, AUTHORITY_PATH, BASE_REF, RUN_TOOLS (true|false),
#           GOVERNANCE_REF (recorded in the summary), SUMMARY_FILE and OUTPUT_FILE (default to the runner's
#           GITHUB_STEP_SUMMARY and GITHUB_OUTPUT).
#
# Exit codes: 0 the pipeline passes, 1 it fails, 2 invalid input to this script.
set -euo pipefail

input_error() {
  echo "governance-check: invalid input: $*" >&2
  exit 2
}

require() {
  local name="$1"
  [[ -n "${!name:-}" ]] || input_error "$name is required"
}

# A repository-relative path: safe characters only, not absolute, not an option, no '..' segment.
relative_path() {
  local name="$1" value="${!1:-}"
  [[ -z "$value" ]] && return 0
  [[ "$value" =~ ^[A-Za-z0-9._@+/-]+$ ]] || input_error "$name contains characters other than letters, digits and ._@+/-"
  [[ "$value" != /* && "$value" != -* ]] || input_error "$name must be a relative path that does not start with '-'"
  [[ ! "$value" =~ (^|/)\.\.(/|$) ]] || input_error "$name must not contain '..'"
}

require GOVERNANCE_CLI
require TARGET_DIR
require OUT_DIR
require CONDITIONS
[[ "$CONDITIONS" == "pass" || "$CONDITIONS" == "fail" ]] || input_error "CONDITIONS must be 'pass' or 'fail'"
RUN_TOOLS="${RUN_TOOLS:-false}"
[[ "$RUN_TOOLS" == "true" || "$RUN_TOOLS" == "false" ]] || input_error "RUN_TOOLS must be 'true' or 'false'"
RECORD_HISTORY="${RECORD_HISTORY:-false}"
[[ "$RECORD_HISTORY" == "true" || "$RECORD_HISTORY" == "false" ]] || input_error "RECORD_HISTORY must be 'true' or 'false'"
[[ -f "$GOVERNANCE_CLI" ]] || input_error "GOVERNANCE_CLI does not exist: $GOVERNANCE_CLI"
[[ -d "$TARGET_DIR" ]] || input_error "TARGET_DIR is not a directory: $TARGET_DIR"

PACK_PATH="${PACK_PATH:-}"
REGISTRY_PATH="${REGISTRY_PATH:-}"
PROFILE_PATH="${PROFILE_PATH:-}"
CATALOG_PATH="${CATALOG_PATH:-}"
AUTHORITY_PATH="${AUTHORITY_PATH:-}"
PROJECT_ID="${PROJECT_ID:-}"
BASE_REF="${BASE_REF:-}"
relative_path PACK_PATH
relative_path REGISTRY_PATH
relative_path PROFILE_PATH
relative_path CATALOG_PATH
relative_path AUTHORITY_PATH
if [[ -n "$PROJECT_ID" ]]; then
  [[ "$PROJECT_ID" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || input_error "PROJECT_ID must be lowercase letters, digits and ._-"
  [[ -n "$REGISTRY_PATH" ]] || input_error "PROJECT_ID requires REGISTRY_PATH"
fi
if [[ -n "$BASE_REF" ]]; then
  [[ "$BASE_REF" =~ ^[A-Za-z0-9._/-]+$ && "$BASE_REF" != -* ]] || input_error "BASE_REF contains characters other than letters, digits and ._/-"
fi

# Only flags the caller set are passed. In particular --pack is omitted unless named, so a registered
# project's own governance_pack applies.
args=(report "$TARGET_DIR")
[[ -n "$PACK_PATH" ]] && args+=(--pack "$PACK_PATH")
[[ -n "$REGISTRY_PATH" ]] && args+=(--registry "$REGISTRY_PATH")
[[ -n "$PROJECT_ID" ]] && args+=(--project "$PROJECT_ID")
[[ -n "$PROFILE_PATH" ]] && args+=(--profile "$PROFILE_PATH")
[[ -n "$CATALOG_PATH" ]] && args+=(--catalog "$CATALOG_PATH")
[[ -n "$AUTHORITY_PATH" ]] && args+=(--authority "$AUTHORITY_PATH")
[[ -n "$BASE_REF" ]] && args+=(--base "$BASE_REF")
[[ "$RUN_TOOLS" == "true" ]] && args+=(--run-tools)

SUMMARY_FILE="${SUMMARY_FILE:-${GITHUB_STEP_SUMMARY:-}}"
OUTPUT_FILE="${OUTPUT_FILE:-${GITHUB_OUTPUT:-}}"

mkdir -p "$OUT_DIR"
: > "$OUT_DIR/stderr.txt"

# The report is run twice: Markdown for people and JSON for machines. Both give the same exit code.
# (With RUN_TOOLS=true the local checks run twice; that is a known cost, not a bug.)
set +e
# The assessment is recorded on this first run only, so one check appends one record, not two.
record_args=()
[[ "$RECORD_HISTORY" == "true" ]] && record_args+=(--record)
node "$GOVERNANCE_CLI" "${args[@]}" "${record_args[@]}" --format markdown > "$OUT_DIR/report.md" 2>> "$OUT_DIR/stderr.txt"
cli_exit=$?
node "$GOVERNANCE_CLI" "${args[@]}" --format json > "$OUT_DIR/report.json" 2> /dev/null
set -e

# The decision comes from the JSON report and is limited to known values, so nothing written from it
# can carry repository-controlled text.
decision="ERROR"
if [[ "$cli_exit" -le 2 && -s "$OUT_DIR/report.json" ]]; then
  parsed="$(node -e '
    const fs = require("fs");
    try {
      const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).report.decision;
      process.stdout.write(["GO", "GO_WITH_CONDITIONS", "NO-GO"].includes(d) ? d : "ERROR");
    } catch { process.stdout.write("ERROR"); }
  ' "$OUT_DIR/report.json")"
  decision="$parsed"
fi

# Pipeline policy. Exit 1 is GO WITH CONDITIONS: whether that passes is the caller's explicit choice.
case "$cli_exit" in
  0) final=0 ;;
  1) if [[ "$CONDITIONS" == "pass" ]]; then final=0; else final=1; fi ;;
  *) final=1 ;;
esac

# Markdown summary for the job page. Untrusted repository text is fenced with a longer fence than
# any it can contain at the start of a line; GitHub sanitizes HTML in summaries.
if [[ -n "${SUMMARY_FILE:-}" ]]; then
  {
    echo "## Governance check: ${decision}"
    echo
    echo "- Result: exit code ${cli_exit}; conditional results ${CONDITIONS} this pipeline"
    echo "- Pipeline outcome: $([[ "$final" -eq 0 ]] && echo passed || echo failed)"
    [[ -n "${GOVERNANCE_REF:-}" ]] && echo "- Governance baseline: \`${GOVERNANCE_REF}\`"
    echo
    if [[ "$cli_exit" -le 2 && -s "$OUT_DIR/report.md" ]]; then
      cat "$OUT_DIR/report.md"
    else
      echo "The governance check could not produce a report."
      echo
      echo '~~~~~~~~'
      head -c 4000 "$OUT_DIR/stderr.txt"
      echo
      echo '~~~~~~~~'
    fi
  } >> "$SUMMARY_FILE"
fi

if [[ -n "${OUTPUT_FILE:-}" ]]; then
  {
    echo "decision=${decision}"
    echo "exit_code=${cli_exit}"
  } >> "$OUTPUT_FILE"
fi

# Log output. Repository-controlled text could contain workflow commands, so command processing is
# stopped with a random token while it is printed.
token="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
echo "::stop-commands::${token}"
if [[ "$cli_exit" -le 2 && -s "$OUT_DIR/report.md" ]]; then
  cat "$OUT_DIR/report.md"
else
  cat "$OUT_DIR/stderr.txt"
fi
echo "::${token}::"

if [[ "$final" -ne 0 ]]; then
  echo "::error title=Governance check::Decision ${decision} (exit code ${cli_exit}); the pipeline fails."
fi
exit "$final"
