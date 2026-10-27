#!/usr/bin/env bash
# Environment preflight (docs/sdd/ENV.md). Run from the repository root:
#   bash scripts/preflight.sh
# Parameters (runtimes, version ranges, test command) come from
# docs/sdd/CONVENTIONS.md, section "Environment preflight".
# The script installs, generates and writes nothing. Exit 0 only when every
# check passed (a skipped test suite still passes), 1 otherwise.

set -u

# --- Parameters (CONVENTIONS.md §Environment preflight) ---------------------
NODE_MIN="24.22.1"     # inclusive
NODE_CEILING="25.0.0"  # exclusive
PNPM_PINNED="11.5.3"   # exact

CHECK_NAMES=("Runtimes installed" "Runtime versions" "Test suite")
CHECK_STATUS=("" "" "")
CHECK_REASON=("" "" "")
EARLIER_FAILED="an earlier check failed"

set_check() {
  # set_check <index> <status> [reason]
  CHECK_STATUS[$1]="$2"
  CHECK_REASON[$1]="${3:-}"
}

# Prints "major minor patch" for a version such as "v24.22.1" or
# "24.22.1-rc.1"; returns 1 when it cannot be parsed.
parse_version() {
  local v="${1#v}"
  v="${v%%[-+]*}"
  if [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "$((10#${BASH_REMATCH[1]})) $((10#${BASH_REMATCH[2]})) $((10#${BASH_REMATCH[3]}))"
    return 0
  fi
  return 1
}

# version_cmp <a> <b>: prints -1, 0 or 1, comparing numerically by major,
# minor and patch. Both versions must be parseable.
version_cmp() {
  local a b i
  read -r -a a <<<"$(parse_version "$1")"
  read -r -a b <<<"$(parse_version "$2")"
  for i in 0 1 2; do
    if ((a[i] < b[i])); then echo -1; return; fi
    if ((a[i] > b[i])); then echo 1; return; fi
  done
  echo 0
}

# True when at least one workspace package defines a "test" script. The
# workspaces are the "packages" globs of pnpm-workspace.yaml; without that
# file, the root package.json is the only package.
has_test_suite() {
  local manifests=() pattern dir in_packages=0 line
  if [[ -f pnpm-workspace.yaml ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^packages:[[:space:]]*$ ]]; then
        in_packages=1
        continue
      fi
      if ((in_packages)); then
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*[\"\']?([^\"\']+)[\"\']?[[:space:]]*$ ]]; then
          pattern="${BASH_REMATCH[1]}"
          [[ "$pattern" == !* ]] && continue
          for dir in $pattern; do
            [[ -f "$dir/package.json" ]] && manifests+=("$dir/package.json")
          done
        elif [[ "$line" =~ ^[^[:space:]#] ]]; then
          in_packages=0
        fi
      fi
    done <pnpm-workspace.yaml
  elif [[ -f package.json ]]; then
    manifests+=("package.json")
  fi
  local manifest
  for manifest in "${manifests[@]+"${manifests[@]}"}"; do
    if grep -Eq '"test"[[:space:]]*:' "$manifest"; then
      return 0
    fi
  done
  return 1
}

# --- Check 1: runtimes installed --------------------------------------------
missing=()
command -v node >/dev/null 2>&1 || missing+=("Node.js (node)")
command -v pnpm >/dev/null 2>&1 || missing+=("pnpm")
if ((${#missing[@]} == 0)); then
  set_check 0 PASS
else
  joined="$(printf '%s, ' "${missing[@]}")"
  set_check 0 FAIL "not found: ${joined%, }"
fi

# --- Check 2: runtime versions ----------------------------------------------
if [[ "${CHECK_STATUS[0]}" == PASS ]]; then
  problems=()

  node_found="$(node --version 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  node_found="${node_found#v}"
  node_ok=0
  if parse_version "$node_found" >/dev/null; then
    if [[ "$(version_cmp "$node_found" "$NODE_MIN")" != -1 &&
      "$(version_cmp "$node_found" "$NODE_CEILING")" == -1 ]]; then
      node_ok=1
    fi
  fi
  if ((!node_ok)); then
    problems+=("Node.js ${node_found:-unknown} found, >=${NODE_MIN} <${NODE_CEILING} required")
  fi

  pnpm_found="$(pnpm --version 2>/dev/null | tail -n 1 | tr -d '[:space:]')"
  if [[ "$pnpm_found" != "$PNPM_PINNED" ]]; then
    problems+=("pnpm ${pnpm_found:-unknown} found, ${PNPM_PINNED} required")
  fi

  if ((${#problems[@]} == 0)); then
    set_check 1 PASS
  else
    joined="$(printf '%s; ' "${problems[@]}")"
    set_check 1 FAIL "${joined%; }"
  fi
else
  set_check 1 SKIPPED "$EARLIER_FAILED"
fi

# --- Check 3: test suite ----------------------------------------------------
if [[ "${CHECK_STATUS[0]}" == PASS && "${CHECK_STATUS[1]}" == PASS ]]; then
  if ! has_test_suite; then
    set_check 2 SKIPPED "no test suite: no workspace defines a test script"
  elif [[ ! -d node_modules ]]; then
    set_check 2 FAIL "dependencies not installed: run 'pnpm install' at the repository root"
  elif [[ ! -d apps/api/src/generated/prisma ]]; then
    set_check 2 FAIL "Prisma client not generated: run 'pnpm exec prisma generate' in apps/api"
  else
    # An empty TEST_DATABASE_URL disables the API db project for this run
    # (dotenv does not override a variable that is already set).
    if TEST_DATABASE_URL= pnpm test; then
      set_check 2 PASS
    else
      set_check 2 FAIL "the test suite failed (see the output above)"
    fi
  fi
else
  set_check 2 SKIPPED "$EARLIER_FAILED"
fi

# --- Check 4: status summary ------------------------------------------------
result=PASS
echo
echo "Environment preflight summary"
for i in 0 1 2; do
  line="Check $((i + 1)) (${CHECK_NAMES[i]}): ${CHECK_STATUS[i]}"
  [[ -n "${CHECK_REASON[i]}" ]] && line+=" - ${CHECK_REASON[i]}"
  echo "$line"
  [[ "${CHECK_STATUS[i]}" == FAIL ]] && result=FAIL
done
echo "Result: $result"

[[ "$result" == PASS ]] && exit 0
exit 1
