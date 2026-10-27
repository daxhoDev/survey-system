#!/usr/bin/env bash
# Tests for scripts/preflight.sh (docs/sdd/ENV.md, REQ-ENV-001..005).
# Run from the repository root:
#   bash scripts/tests/preflight.test.sh
# Each case runs the preflight from a temporary fake repository root, with
# stub `node` and `pnpm` executables first on a temporary PATH that holds
# only the system tools the script needs. Exits 0 only if every case passed.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PREFLIGHT="$REPO_ROOT/scripts/preflight.sh"
BASH_BIN="$(command -v bash)"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# System tools available to the script (and the stubs), without node/pnpm.
TOOLS="$WORK/tools"
mkdir -p "$TOOLS"
for tool in bash env grep head tail tr cat pwd dirname; do
  path="$(type -P "$tool" || true)"
  [[ -n "$path" ]] && ln -s "$path" "$TOOLS/$tool"
done

PASSED=0
FAILED=0
FAILED_NAMES=()

# Per-case state, set by new_case / run_preflight.
CASE_DIR=""
FAKE_ROOT=""
STUB_BIN=""
STUB_LOG=""
OUT=""
CODE=""
CASE_OK=1
CASE_NAME=""

# new_case <name>: fresh fake repository root with a test suite, installed
# dependencies and a generated Prisma client; stub node 24.22.1 and pnpm
# 11.5.3 whose `pnpm test` exits 0.
new_case() {
  CASE_NAME="$1"
  CASE_OK=1
  CASE_DIR="$(mktemp -d "$WORK/case.XXXXXX")"
  FAKE_ROOT="$CASE_DIR/repo"
  STUB_BIN="$CASE_DIR/bin"
  STUB_LOG="$CASE_DIR/stub.log"
  mkdir -p "$FAKE_ROOT" "$STUB_BIN"
  : >"$STUB_LOG"

  printf '%s\n' 'packages:' '  - "apps/*"' '  - "packages/*"' 'allowBuilds:' '  esbuild: true' \
    >"$FAKE_ROOT/pnpm-workspace.yaml"
  printf '%s\n' '{' '  "name": "root",' '  "scripts": { "test": "pnpm -r test" }' '}' \
    >"$FAKE_ROOT/package.json"
  mkdir -p "$FAKE_ROOT/apps/api/src/generated/prisma" "$FAKE_ROOT/apps/web" \
    "$FAKE_ROOT/packages/schemas" "$FAKE_ROOT/node_modules"
  printf '%s\n' '{' '  "name": "api",' '  "scripts": {' '    "test": "vitest run"' '  }' '}' \
    >"$FAKE_ROOT/apps/api/package.json"
  printf '%s\n' '{' '  "name": "web",' '  "scripts": { "build": "vite build" }' '}' \
    >"$FAKE_ROOT/apps/web/package.json"
  printf '%s\n' '{' '  "name": "schemas",' '  "scripts": { "build": "tsc" }' '}' \
    >"$FAKE_ROOT/packages/schemas/package.json"

  stub_node "v24.22.1"
  stub_pnpm "11.5.3" 0
}

# stub_node <version printed by node --version>
stub_node() {
  cat >"$STUB_BIN/node" <<EOF
#!$BASH_BIN
echo "node \$*" >>"$STUB_LOG"
if [[ "\${1:-}" == "--version" ]]; then echo "$1"; exit 0; fi
exit 0
EOF
  chmod +x "$STUB_BIN/node"
}

# stub_pnpm <version printed by pnpm --version> <exit code of pnpm test>
stub_pnpm() {
  cat >"$STUB_BIN/pnpm" <<EOF
#!$BASH_BIN
case "\${1:-}" in
  --version)
    echo "pnpm --version cwd=\$PWD" >>"$STUB_LOG"
    echo "$1"
    exit 0
    ;;
  test)
    echo "pnpm test cwd=\$PWD TEST_DATABASE_URL=\${TEST_DATABASE_URL+set}[\${TEST_DATABASE_URL-}]" >>"$STUB_LOG"
    exit $2
    ;;
  *)
    echo "pnpm \$* cwd=\$PWD" >>"$STUB_LOG"
    exit 0
    ;;
esac
EOF
  chmod +x "$STUB_BIN/pnpm"
}

# run_preflight [extra env assignments...]: runs the script from the fake
# root; sets OUT (stdout+stderr) and CODE.
run_preflight() {
  OUT="$(cd "$FAKE_ROOT" && env -i HOME="$CASE_DIR" PATH="$STUB_BIN:$TOOLS" "$@" \
    "$BASH_BIN" "$PREFLIGHT" 2>&1)"
  CODE=$?
}

fail() {
  CASE_OK=0
  echo "    assertion failed: $*"
}

# Summary line of check <n> (1-3), or the Result line for "result".
summary_line() {
  if [[ "$1" == result ]]; then
    grep -E '^Result: ' <<<"$OUT" | tail -n 1
  else
    grep -E "^Check $1 \\(" <<<"$OUT" | tail -n 1
  fi
}

assert_check() {
  # assert_check <n> <PASS|FAIL|SKIPPED>
  local line
  line="$(summary_line "$1")"
  [[ "$line" =~ ^Check\ $1\ \([^\)]+\):\ $2($|\ ) ]] ||
    fail "check $1 expected $2, got: '${line}'"
}

assert_check_reason_contains() {
  # assert_check_reason_contains <n> <text>
  local line
  line="$(summary_line "$1")"
  [[ "$line" == *"$2"* ]] || fail "check $1 line does not contain '$2': '${line}'"
}

assert_exit() {
  [[ "$CODE" == "$1" ]] || fail "exit code expected $1, got $CODE"
}

assert_result() {
  [[ "$(summary_line result)" == "Result: $1" ]] ||
    fail "expected 'Result: $1', got '$(summary_line result)'"
}

# AC-ENV-004-1: the output ends with checks 1-3 in order, then Result.
assert_summary_shape() {
  local last4
  mapfile -t last4 < <(tail -n 4 <<<"$OUT")
  [[ "${#last4[@]}" == 4 ]] || { fail "fewer than 4 output lines"; return; }
  [[ "${last4[0]}" =~ ^Check\ 1\ \([^\)]+\):\ (PASS|FAIL|SKIPPED)($|\ ) ]] || fail "line -4 is not check 1: '${last4[0]}'"
  [[ "${last4[1]}" =~ ^Check\ 2\ \([^\)]+\):\ (PASS|FAIL|SKIPPED)($|\ ) ]] || fail "line -3 is not check 2: '${last4[1]}'"
  [[ "${last4[2]}" =~ ^Check\ 3\ \([^\)]+\):\ (PASS|FAIL|SKIPPED)($|\ ) ]] || fail "line -2 is not check 3: '${last4[2]}'"
  [[ "${last4[3]}" =~ ^Result:\ (PASS|FAIL)$ ]] || fail "last line is not a Result line: '${last4[3]}'"
  # Every FAIL or SKIPPED line carries a short reason.
  local l
  for l in "${last4[@]:0:3}"; do
    if [[ "$l" =~ :\ (FAIL|SKIPPED)$ ]]; then fail "no reason on: '$l'"; fi
  done
}

assert_tests_not_run() {
  if grep -q '^pnpm test' "$STUB_LOG"; then fail "the test suite was run"; fi
}

assert_tests_run() {
  grep -q '^pnpm test' "$STUB_LOG" || fail "the test suite was not run"
}

# AC-ENV-003-4/5/7: nothing installed, generated or run besides the allowed calls.
assert_no_install_or_generate() {
  if grep -Eq '^pnpm (install|i|add|exec|dlx|prisma)( |$)' "$STUB_LOG"; then
    fail "the script installed or generated something: $(grep -E '^pnpm (install|i|add|exec|dlx|prisma)' "$STUB_LOG")"
  fi
}

snapshot_tree() {
  (cd "$FAKE_ROOT" && find . -print0 | sort -z | xargs -0 ls -ld --time-style=+%s 2>/dev/null)
}

end_case() {
  if ((CASE_OK)); then
    PASSED=$((PASSED + 1))
    echo "ok   - $CASE_NAME"
  else
    FAILED=$((FAILED + 1))
    FAILED_NAMES+=("$CASE_NAME")
    echo "FAIL - $CASE_NAME"
    echo "    --- preflight output ---"
    sed 's/^/    | /' <<<"$OUT"
    echo "    --- stub log ---"
    sed 's/^/    | /' "$STUB_LOG"
  fi
}

# ---------------------------------------------------------------------------
# REQ-ENV-001 — Runtimes installed (check 1)

new_case "AC-ENV-001-1 / AC-ENV-003-1 / AC-ENV-005-1: everything in place -> all PASS, exit 0"
run_preflight
assert_check 1 PASS
assert_check 2 PASS
assert_check 3 PASS
assert_result PASS
assert_exit 0
assert_summary_shape
assert_tests_run
end_case

new_case "AC-ENV-001-2 / AC-ENV-004-2: node missing -> check 1 FAIL naming Node.js, later checks SKIPPED, exit 1"
rm "$STUB_BIN/node"
run_preflight
assert_check 1 FAIL
assert_check_reason_contains 1 "Node.js"
assert_check 2 SKIPPED
assert_check_reason_contains 2 "an earlier check failed"
assert_check 3 SKIPPED
assert_check_reason_contains 3 "an earlier check failed"
assert_result FAIL
assert_exit 1
assert_summary_shape
assert_tests_not_run
end_case

new_case "AC-ENV-001-3 / AC-ENV-004-2: pnpm missing -> check 1 FAIL naming pnpm, exit 1"
rm "$STUB_BIN/pnpm"
run_preflight
assert_check 1 FAIL
assert_check_reason_contains 1 "pnpm"
if [[ "$(summary_line 1)" == *"Node.js"* ]]; then fail "check 1 names Node.js although node is present"; fi
assert_check 2 SKIPPED
assert_check_reason_contains 2 "an earlier check failed"
assert_check 3 SKIPPED
assert_check_reason_contains 3 "an earlier check failed"
assert_result FAIL
assert_exit 1
assert_summary_shape
end_case

# ---------------------------------------------------------------------------
# REQ-ENV-002 — Runtime versions (check 2)

for v in v24.22.1 v24.22.2 v24.23.0 v24.99.99; do
  new_case "AC-ENV-002-1: node $v (minimum or above, below ceiling) -> check 2 PASS"
  stub_node "$v"
  run_preflight
  assert_check 2 PASS
  assert_exit 0
  end_case
done

for v in v24.22.0 v24.9.0 v24.0.0 v23.99.99 v22.22.1; do
  new_case "AC-ENV-002-2 / AC-ENV-004-3: node $v below minimum -> check 2 FAIL with found and required, check 3 SKIPPED, exit 1"
  stub_node "$v"
  run_preflight
  assert_check 1 PASS
  assert_check 2 FAIL
  assert_check_reason_contains 2 "${v#v}"
  assert_check_reason_contains 2 "24.22.1"
  assert_check 3 SKIPPED
  assert_check_reason_contains 3 "an earlier check failed"
  assert_result FAIL
  assert_exit 1
  assert_summary_shape
  assert_tests_not_run
  end_case
done

for v in v25.0.0 v25.1.0 v26.0.0 v100.0.0; do
  new_case "AC-ENV-002-3 / AC-ENV-004-3: node $v at or above ceiling -> check 2 FAIL with found and required, exit 1"
  stub_node "$v"
  run_preflight
  assert_check 2 FAIL
  assert_check_reason_contains 2 "${v#v}"
  assert_check_reason_contains 2 "25.0.0"
  assert_check 3 SKIPPED
  assert_check_reason_contains 3 "an earlier check failed"
  assert_result FAIL
  assert_exit 1
  assert_tests_not_run
  end_case
done

for v in 11.5.2 11.5.4 11.6.0 10.5.3 11.5.30; do
  new_case "AC-ENV-002-4 / AC-ENV-004-3: pnpm $v instead of pinned -> check 2 FAIL with found and required, exit 1"
  stub_pnpm "$v" 0
  run_preflight
  assert_check 2 FAIL
  assert_check_reason_contains 2 "pnpm"
  assert_check_reason_contains 2 "$v"
  assert_check_reason_contains 2 "11.5.3"
  assert_check 3 SKIPPED
  assert_check_reason_contains 3 "an earlier check failed"
  assert_result FAIL
  assert_exit 1
  assert_tests_not_run
  end_case
done

new_case "REQ-ENV-002: pnpm --version runs from the repository root"
run_preflight
if ! grep -qx "pnpm --version cwd=$FAKE_ROOT" "$STUB_LOG"; then
  fail "pnpm --version was not run from the repository root"
fi
end_case

for v in v24.22.1 v24.100.0; do
  new_case "AC-ENV-002-5: node $v passes (numeric, not text, comparison)"
  stub_node "$v"
  run_preflight
  assert_check 2 PASS
  assert_exit 0
  end_case
done

new_case "REQ-ENV-002: node and pnpm both out of range -> check 2 names both"
stub_node "v24.22.0"
stub_pnpm "11.5.2" 0
run_preflight
assert_check 2 FAIL
assert_check_reason_contains 2 "Node.js"
assert_check_reason_contains 2 "pnpm"
assert_exit 1
end_case

# ---------------------------------------------------------------------------
# REQ-ENV-003 — Test suite (check 3)

new_case "AC-ENV-003-2 / AC-ENV-005-2: a failing test -> check 3 FAIL, exit 1"
stub_pnpm "11.5.3" 1
run_preflight
assert_check 1 PASS
assert_check 2 PASS
assert_check 3 FAIL
assert_result FAIL
assert_exit 1
assert_summary_shape
assert_tests_run
end_case

new_case "AC-ENV-003-2: test command exiting with another non-zero code -> check 3 FAIL, exit 1"
stub_pnpm "11.5.3" 2
run_preflight
assert_check 3 FAIL
assert_exit 1
end_case

new_case "AC-ENV-003-3: TEST_DATABASE_URL set in the environment -> the test command runs from the root with it set to empty"
run_preflight TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/survey_system_test"
assert_check 3 PASS
assert_exit 0
if ! grep -qx "pnpm test cwd=$FAKE_ROOT TEST_DATABASE_URL=set\[\]" "$STUB_LOG"; then
  fail "pnpm test was not run from the root with TEST_DATABASE_URL set to empty"
fi
end_case

new_case "AC-ENV-003-3: TEST_DATABASE_URL unset in the environment -> the test command still gets it set to empty"
run_preflight
if ! grep -qx "pnpm test cwd=$FAKE_ROOT TEST_DATABASE_URL=set\[\]" "$STUB_LOG"; then
  fail "pnpm test did not get TEST_DATABASE_URL set to empty"
fi
end_case

new_case "AC-ENV-003-4: root node_modules missing -> check 3 FAIL with pnpm install hint, tests not run, nothing installed"
rm -rf "$FAKE_ROOT/node_modules"
run_preflight
assert_check 1 PASS
assert_check 2 PASS
assert_check 3 FAIL
assert_check_reason_contains 3 "pnpm install"
assert_result FAIL
assert_exit 1
assert_summary_shape
assert_tests_not_run
assert_no_install_or_generate
[[ -e "$FAKE_ROOT/node_modules" ]] && fail "node_modules was created"
end_case

new_case "AC-ENV-003-5: Prisma client missing -> check 3 FAIL with prisma generate hint in apps/api, tests not run, nothing generated"
rm -rf "$FAKE_ROOT/apps/api/src/generated"
run_preflight
assert_check 3 FAIL
assert_check_reason_contains 3 "pnpm exec prisma generate"
assert_check_reason_contains 3 "apps/api"
assert_result FAIL
assert_exit 1
assert_summary_shape
assert_tests_not_run
assert_no_install_or_generate
[[ -e "$FAKE_ROOT/apps/api/src/generated" ]] && fail "the Prisma client directory was created"
end_case

new_case "AC-ENV-003-5: node_modules present, generated/ present but prisma/ missing -> check 3 FAIL"
rm -rf "$FAKE_ROOT/apps/api/src/generated/prisma"
run_preflight
assert_check 3 FAIL
assert_check_reason_contains 3 "prisma generate"
assert_tests_not_run
end_case

new_case "AC-ENV-003-6: no workspace defines a test script -> check 3 SKIPPED, exit 0"
printf '%s\n' '{' '  "name": "api",' '  "scripts": { "build": "tsc" }' '}' >"$FAKE_ROOT/apps/api/package.json"
run_preflight
assert_check 1 PASS
assert_check 2 PASS
assert_check 3 SKIPPED
assert_result PASS
assert_exit 0
assert_summary_shape
assert_tests_not_run
end_case

new_case "AC-ENV-003-6: no workspace packages at all -> check 3 SKIPPED, exit 0"
rm -rf "$FAKE_ROOT/apps" "$FAKE_ROOT/packages"
run_preflight
assert_check 3 SKIPPED
assert_result PASS
assert_exit 0
assert_tests_not_run
end_case

new_case "AC-ENV-003-6: a test script in a single workspace is enough -> tests run"
printf '%s\n' '{' '  "name": "api",' '  "scripts": { "build": "tsc" }' '}' >"$FAKE_ROOT/apps/api/package.json"
printf '%s\n' '{' '  "name": "schemas",' '  "scripts": { "test": "vitest run" }' '}' >"$FAKE_ROOT/packages/schemas/package.json"
run_preflight
assert_check 3 PASS
assert_tests_run
end_case

new_case "AC-ENV-003-7: a passing run changes and creates no file in the repository"
before="$(snapshot_tree)"
run_preflight
after="$(snapshot_tree)"
[[ "$before" == "$after" ]] || fail "the repository tree changed: $(diff <(echo "$before") <(echo "$after"))"
assert_no_install_or_generate
end_case

new_case "AC-ENV-003-7: a failing run (missing dependencies) changes and creates no file in the repository"
rm -rf "$FAKE_ROOT/node_modules"
before="$(snapshot_tree)"
run_preflight
after="$(snapshot_tree)"
[[ "$before" == "$after" ]] || fail "the repository tree changed: $(diff <(echo "$before") <(echo "$after"))"
end_case

# ---------------------------------------------------------------------------
# REQ-ENV-004 / REQ-ENV-005 — summary and exit code

new_case "AC-ENV-004-1 / AC-ENV-005-2: Result is the last line, exit code exactly 1 on failure"
stub_pnpm "11.5.3" 1
run_preflight
[[ "$(tail -n 1 <<<"$OUT")" == "Result: FAIL" ]] || fail "last line is not 'Result: FAIL'"
assert_exit 1
end_case

new_case "AC-ENV-004-1 / AC-ENV-005-1: Result is the last line, exit code exactly 0 on success"
run_preflight
[[ "$(tail -n 1 <<<"$OUT")" == "Result: PASS" ]] || fail "last line is not 'Result: PASS'"
assert_exit 0
end_case

# ---------------------------------------------------------------------------

echo
echo "preflight.test.sh: $PASSED passed, $FAILED failed, $((PASSED + FAILED)) total"
if ((FAILED > 0)); then
  printf 'failed: %s\n' "${FAILED_NAMES[@]}"
  exit 1
fi
exit 0
