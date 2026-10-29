#!/usr/bin/env bash
# Tests for the API's `vercel-build` package script (docs/sdd/DEV_WORKFLOW.md,
# REQ-DEVWF-012), the Vercel deployment files it ships with (REQ-DEVWF-008,
# REQ-DEVWF-011, REQ-DEVWF-013) and the git-ignored Prisma client it
# generates (docs/sdd/ARCHITECTURE.md, REQ-ARCH-008). Run from the repository root:
#   bash scripts/tests/vercel-build.test.sh
# The behaviour cases run `pnpm run vercel-build` in apps/api for real under
# the VERCEL_ENV / DIRECT_DATABASE_URL cases of the acceptance criteria. They
# delete packages/schemas/dist and apps/api/src/generated/prisma first, so
# both are backed up and put back as they were when the script exits. The
# case that needs a database (AC-DEVWF-012-3) uses TEST_DATABASE_URL from the
# environment and is skipped with a message when it is not set; it only
# applies migrations, so the test database is left empty. Hosts that do not
# answer are 127.0.0.1 ports 1 and 2. Exits 0 only if every case passed.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API="$REPO_ROOT/apps/api"
SCHEMAS_DIST="$REPO_ROOT/packages/schemas/dist"
PRISMA_OUT="$API/src/generated/prisma"
PNPM_BIN="$(command -v pnpm)"
NODE_BIN="$(command -v node)"

# Hosts that do not answer (connection refused).
DEAD_DIRECT="postgresql://spike:spike@127.0.0.1:1/dead_direct"
DEAD_POOLED="postgresql://spike:spike@127.0.0.1:2/dead_pooled"

WORK="$(mktemp -d)"
BACKUP="$WORK/backup"
mkdir -p "$BACKUP"
[[ -d "$SCHEMAS_DIST" ]] && cp -a "$SCHEMAS_DIST" "$BACKUP/schemas-dist"
[[ -d "$PRISMA_OUT" ]] && cp -a "$PRISMA_OUT" "$BACKUP/prisma"

restore() {
  rm -rf "$SCHEMAS_DIST" "$PRISMA_OUT"
  [[ -d "$BACKUP/schemas-dist" ]] && cp -a "$BACKUP/schemas-dist" "$SCHEMAS_DIST"
  [[ -d "$BACKUP/prisma" ]] && cp -a "$BACKUP/prisma" "$PRISMA_OUT"
  rm -rf "$WORK"
}
trap restore EXIT
trap 'exit 130' INT TERM

PASSED=0
FAILED=0
SKIPPED=0
FAILED_NAMES=()
CASE_OK=1
CASE_NAME=""
OUT=""
CODE=""

new_case() {
  CASE_NAME="$1"
  CASE_OK=1
}

fail() {
  CASE_OK=0
  echo "    $*"
}

end_case() {
  if [[ $CASE_OK -eq 1 ]]; then
    PASSED=$((PASSED + 1))
    echo "PASS  $CASE_NAME"
  else
    FAILED=$((FAILED + 1))
    FAILED_NAMES+=("$CASE_NAME")
    echo "FAIL  $CASE_NAME"
    if [[ -n "$OUT" ]]; then
      echo "    --- output (last 15 lines) ---"
      printf '%s\n' "$OUT" | tail -n 15 | sed 's/^/    /'
    fi
  fi
  OUT=""
}

skip_case() {
  SKIPPED=$((SKIPPED + 1))
  echo "SKIP  $1"
}

# clean_outputs: removes the build outputs that AC-DEVWF-012-1 starts without.
clean_outputs() {
  rm -rf "$SCHEMAS_DIST" "$PRISMA_OUT"
}

# run_build [VAR=value ...]: runs `pnpm run vercel-build` in apps/api with
# VERCEL_ENV, DIRECT_DATABASE_URL and DATABASE_URL removed from the
# environment, then the given assignments; sets OUT and CODE.
run_build() {
  OUT="$(cd "$API" && env -u VERCEL_ENV -u DIRECT_DATABASE_URL -u DATABASE_URL "$@" \
    timeout 300 "$PNPM_BIN" run vercel-build 2>&1)"
  CODE=$?
}

# Lines Prisma prints only when `prisma migrate deploy` runs.
MIGRATION_MARKERS='Datasource "|migrations? found|Applying migration|No pending migrations|P1001|P3005|P3009'

expect_no_migration() {
  if printf '%s\n' "$OUT" | grep -qE "$MIGRATION_MARKERS"; then
    fail "a migration was attempted: $(printf '%s\n' "$OUT" | grep -E "$MIGRATION_MARKERS" | head -n 1)"
  fi
}

expect_outputs() {
  [[ -f "$SCHEMAS_DIST/index.js" ]] || fail "packages/schemas/dist/index.js does not exist"
  [[ -d "$PRISMA_OUT" ]] || fail "apps/api/src/generated/prisma does not exist"
}

# json <node expression over `c` (root vercel.json)>: prints the result.
json() {
  "$NODE_BIN" -e '
    const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const r = (0, eval)("(c) => (" + process.argv[2] + ")")(c);
    console.log(typeof r === "string" ? r : JSON.stringify(r));
  ' "$REPO_ROOT/vercel.json" "$1"
}

SCRIPT_TEXT="$("$NODE_BIN" -e 'console.log(require(process.argv[1]).scripts["vercel-build"] ?? "")' "$API/package.json")"

cd "$REPO_ROOT" || exit 1

# --- AC-DEVWF-012-1 ----------------------------------------------------------
for vercel_env in "" preview; do
  label="${vercel_env:-unset}"
  new_case "AC-DEVWF-012-1: VERCEL_ENV $label, no build outputs, DIRECT_DATABASE_URL not answering → exit 0, outputs built, no migration"
  clean_outputs
  if [[ -n "$vercel_env" ]]; then
    run_build VERCEL_ENV="$vercel_env" DIRECT_DATABASE_URL="$DEAD_DIRECT"
  else
    run_build DIRECT_DATABASE_URL="$DEAD_DIRECT"
  fi
  [[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0"
  expect_outputs
  expect_no_migration
  end_case
done

# --- REQ-DEVWF-012: step 3 only when VERCEL_ENV is exactly "production" ------
for vercel_env in development Production; do
  new_case "REQ-DEVWF-012: VERCEL_ENV=$vercel_env skips the migration and exits 0"
  run_build VERCEL_ENV="$vercel_env" DIRECT_DATABASE_URL="$DEAD_DIRECT" DATABASE_URL="$DEAD_POOLED"
  [[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0"
  expect_outputs
  expect_no_migration
  end_case
done

# --- AC-DEVWF-012-2 ----------------------------------------------------------
new_case "AC-DEVWF-012-2: VERCEL_ENV=production, DIRECT_DATABASE_URL unset → exit non-zero after the schemas build and prisma generate"
clean_outputs
run_build VERCEL_ENV=production DATABASE_URL="$DEAD_POOLED"
[[ "$CODE" -ne 0 ]] || fail "exit code 0, expected non-zero"
printf '%s\n' "$OUT" | grep -q 'DIRECT_DATABASE_URL' || fail "the failure does not name DIRECT_DATABASE_URL"
expect_outputs
expect_no_migration
end_case

new_case "AC-DEVWF-012-2: VERCEL_ENV=production, DIRECT_DATABASE_URL not answering → exit non-zero, migrate deploy went to DIRECT_DATABASE_URL"
clean_outputs
run_build VERCEL_ENV=production DIRECT_DATABASE_URL="$DEAD_DIRECT" DATABASE_URL="$DEAD_POOLED"
[[ "$CODE" -ne 0 ]] || fail "exit code 0, expected non-zero"
expect_outputs
printf '%s\n' "$OUT" | grep -q '127.0.0.1:1' || fail "migrate deploy did not target the DIRECT_DATABASE_URL host (127.0.0.1:1)"
if printf '%s\n' "$OUT" | grep -q '127.0.0.1:2'; then
  fail "migrate deploy targeted the DATABASE_URL host (127.0.0.1:2)"
fi
end_case

# --- REQ-DEVWF-012: stops at the first failing step --------------------------
new_case "REQ-DEVWF-012: a failing schemas build stops the script before prisma generate and the migration"
STUB_BIN="$WORK/stub-bin"
mkdir -p "$STUB_BIN"
cat >"$STUB_BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
echo "stub pnpm: schemas build fails" >&2
exit 7
EOF
chmod +x "$STUB_BIN/pnpm"
clean_outputs
run_build PATH="$STUB_BIN:$PATH" VERCEL_ENV=production DIRECT_DATABASE_URL="$DEAD_DIRECT" DATABASE_URL="$DEAD_POOLED"
[[ "$CODE" -ne 0 ]] || fail "exit code 0, expected non-zero"
printf '%s\n' "$OUT" | grep -q 'stub pnpm: schemas build fails' || fail "the schemas build step did not run through pnpm"
[[ ! -d "$PRISMA_OUT" ]] || fail "prisma generate ran after the failing schemas build"
expect_no_migration
end_case

# --- AC-DEVWF-012-3 ----------------------------------------------------------
if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
  skip_case "AC-DEVWF-012-3: TEST_DATABASE_URL is not set in the environment"
else
  new_case "AC-DEVWF-012-3: VERCEL_ENV=production, DATABASE_URL not answering, DIRECT_DATABASE_URL = test database → exit 0, every migration recorded"
  db_name="${TEST_DATABASE_URL##*/}"
  db_name="${db_name%%\?*}"
  if [[ "$db_name" != *test* ]]; then
    fail "refusing to run: the TEST_DATABASE_URL database name '$db_name' does not contain 'test'"
  else
    run_build VERCEL_ENV=production DIRECT_DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL="$DEAD_POOLED"
    [[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0"
    expected="$(cd "$API/prisma/migrations" && find . -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)"
    recorded="$(cd "$API" && "$NODE_BIN" -e '
      const { Client } = require("pg");
      const c = new Client({ connectionString: process.argv[1] });
      c.connect()
        .then(() => c.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name"))
        .then((r) => { for (const row of r.rows) console.log(row.migration_name); return c.end(); })
        .catch((e) => { console.error(e.message); process.exit(1); });
    ' "$TEST_DATABASE_URL" 2>&1 | sort -u)"
    missing="$(comm -23 <(printf '%s\n' "$expected") <(printf '%s\n' "$recorded"))"
    [[ -z "$missing" ]] || fail "migrations not recorded in _prisma_migrations: $(echo "$missing" | tr '\n' ' ')"
  fi
  end_case
fi

# --- AC-DEVWF-012-4 and REQ-DEVWF-012 (script text) --------------------------
new_case "AC-DEVWF-012-4: schemas build, then prisma generate, then (last) prisma migrate deploy, chained with &&"
[[ -n "$SCRIPT_TEXT" ]] || fail "apps/api/package.json has no vercel-build script"
"$NODE_BIN" -e '
  const s = process.argv[1];
  const iBuild = s.indexOf("pnpm --filter @survey-system/schemas build");
  const iGen = s.indexOf("prisma generate");
  const iMig = s.indexOf("prisma migrate deploy");
  const problems = [];
  if (iBuild !== 0) problems.push("the script does not start with the schemas build");
  if (!(iBuild < iGen && iGen < iMig)) problems.push("the steps are not in the order build, generate, migrate");
  if (s.split("prisma migrate deploy").length !== 2) problems.push("prisma migrate deploy does not appear exactly once");
  if (!/schemas build\s*&&\s*prisma generate\s*&&\s*if /.test(s)) problems.push("the steps are not chained with &&");
  if (!/prisma migrate deploy\s*;?\s*fi\s*$/.test(s)) problems.push("prisma migrate deploy is not the last command");
  if (problems.length) { console.log(problems.join("; ")); process.exit(1); }
' "$SCRIPT_TEXT" || fail "script text: $SCRIPT_TEXT"
end_case

new_case "REQ-DEVWF-012: migrate deploy runs only for VERCEL_ENV = production, with DATABASE_URL from DIRECT_DATABASE_URL for that command only"
printf '%s' "$SCRIPT_TEXT" | grep -qE 'if \[ "\$VERCEL_ENV" = "?production"? \]; then DATABASE_URL="\$\{DIRECT_DATABASE_URL:\?[^}]*\}" prisma migrate deploy' ||
  fail "unexpected step 3: $SCRIPT_TEXT"
if printf '%s' "$SCRIPT_TEXT" | grep -qE '\bexport\b'; then
  fail "the script exports a variable"
fi
end_case

new_case "REQ-DEVWF-012: the script does not compile the API with tsc"
if printf '%s' "$SCRIPT_TEXT" | grep -qE '\btsc\b|(^|&&\s*)pnpm (run )?build'; then
  fail "the script compiles the API: $SCRIPT_TEXT"
fi
end_case

new_case "REQ-DEVWF-012 / REQ-CFG-008: prisma.config.ts reads DATABASE_URL from process.env and no runtime code reads DIRECT_DATABASE_URL"
grep -q 'process.env\["DATABASE_URL"\]' "$API/prisma.config.ts" || fail "prisma.config.ts does not read process.env[\"DATABASE_URL\"]"
if grep -qE 'config/env|DIRECT_DATABASE_URL' "$API/prisma.config.ts"; then
  fail "prisma.config.ts imports the runtime config or reads DIRECT_DATABASE_URL"
fi
if grep -rlq 'DIRECT_DATABASE_URL' "$API/src" --exclude-dir=generated 2>/dev/null; then
  fail "apps/api/src reads DIRECT_DATABASE_URL: $(grep -rl 'DIRECT_DATABASE_URL' "$API/src" --exclude-dir=generated)"
fi
end_case

# --- AC-DEVWF-011-1 ----------------------------------------------------------
new_case "AC-DEVWF-011-1: vercel.json declares exactly the services api and web with their roots and builds"
[[ "$(json 'c["$schema"]')" == "https://openapi.vercel.sh/vercel.json" ]] || fail "\$schema is $(json 'c["$schema"]')"
[[ "$(json 'Object.keys(c.services ?? {}).sort().join(",")')" == "api,web" ]] ||
  fail "services are $(json 'Object.keys(c.services ?? {})')"
[[ "$(json 'c.services?.api?.root')" == "apps/api" ]] || fail "api root is $(json 'c.services?.api?.root')"
api_build="$(json 'c.services?.api?.buildCommand ?? ""')"
[[ "$api_build" =~ ^pnpm\ (run\ )?vercel-build$ ]] || fail "api build command is '$api_build'"
[[ "$(json 'c.services?.web?.root')" == "apps/web" ]] || fail "web root is $(json 'c.services?.web?.root')"
[[ "$(json 'c.services?.web?.buildCommand')" == "pnpm build" ]] || fail "web build command is $(json 'c.services?.web?.buildCommand')"
[[ "$(json 'c.services?.web?.outputDirectory')" == "dist" ]] || fail "web output directory is $(json 'c.services?.web?.outputDirectory')"
end_case

# --- AC-DEVWF-011-2 ----------------------------------------------------------
new_case "AC-DEVWF-011-2: top-level rewrites are /api/(.*) → api (path kept), then /(.*) → web"
[[ "$(json '(c.rewrites ?? []).length')" == "2" ]] || fail "there are $(json '(c.rewrites ?? []).length') top-level rewrites, expected 2"
[[ "$(json 'c.rewrites?.[0]?.source')" == "/api/(.*)" ]] || fail "first rewrite source is $(json 'c.rewrites?.[0]?.source')"
[[ "$(json 'c.rewrites?.[0]?.destination')" == '{"service":"api"}' ]] ||
  fail "first rewrite destination is $(json 'c.rewrites?.[0]?.destination') (expected the service api with no path override)"
[[ "$(json 'c.rewrites?.[1]?.source')" == "/(.*)" ]] || fail "second rewrite source is $(json 'c.rewrites?.[1]?.source')"
[[ "$(json 'c.rewrites?.[1]?.destination')" == '{"service":"web"}' ]] ||
  fail "second rewrite destination is $(json 'c.rewrites?.[1]?.destination')"
end_case

# --- AC-DEVWF-011-3 ----------------------------------------------------------
new_case "AC-DEVWF-011-3: the web service falls back to index.html and the region is iad1"
[[ "$(json '(c.services?.web?.rewrites ?? []).filter((r) => r.source === "/(.*)" && r.destination === "/index.html").length')" == "1" ]] ||
  fail "the web service has no /(.*) → /index.html fallback: $(json 'c.services?.web?.rewrites')"
regions="$(json '[c.regions, c.services?.api?.regions, c.services?.api?.functions].filter((x) => x !== undefined)')"
[[ "$regions" == '[["iad1"]]' ]] || fail "region settings found: $regions (expected only regions [\"iad1\"])"
end_case

new_case "REQ-DEVWF-011: vercel.json holds nothing else (no Git rules, firewall rules or headers)"
[[ "$(json 'Object.keys(c).sort().join(",")')" == '$schema,regions,rewrites,services' ]] ||
  fail "top-level keys are $(json 'Object.keys(c)')"
[[ "$(json 'Object.keys(c.services?.api ?? {}).sort().join(",")')" == "buildCommand,root" ]] ||
  fail "api service keys are $(json 'Object.keys(c.services?.api ?? {})')"
[[ "$(json 'Object.keys(c.services?.web ?? {}).sort().join(",")')" == "buildCommand,outputDirectory,rewrites,root" ]] ||
  fail "web service keys are $(json 'Object.keys(c.services?.web ?? {})')"
end_case

# --- AC-DEVWF-011-4 ----------------------------------------------------------
new_case "AC-DEVWF-011-4: apps/api has no Vercel entry file other than src/server.ts, which keeps the import order of AC-ARCH-003-1"
for entry in index app server; do
  for ext in js cjs mjs ts cts mts; do
    [[ ! -e "$API/$entry.$ext" ]] || fail "apps/api/$entry.$ext exists"
  done
done
for ext in js cjs mjs ts cts mts; do
  [[ ! -e "$API/src/index.$ext" ]] || fail "apps/api/src/index.$ext exists"
done
[[ ! -e "$API/api" ]] || fail "apps/api/api/ exists"
imports="$(grep -E '^import ' "$API/src/server.ts" | head -n 3 | sed -E 's/.*"([^"]+)".*/\1/' | tr '\n' ' ')"
[[ "$imports" == "./config/env.js ./lib/zod-setup.js ./app.js " ]] || fail "server.ts first imports are: $imports"
end_case

# --- AC-DEVWF-008-1 ----------------------------------------------------------
# The Render host is assembled so that this file does not contain it.
RENDER_HOST="onrender"".com"
new_case "AC-DEVWF-008-1: the only vercel.json is at the root and no file outside docs/ contains the Render host"
found="$(git -C "$REPO_ROOT" ls-files --cached --others --exclude-standard | grep -E '(^|/)vercel\.json$' |
  while read -r f; do [[ -e "$REPO_ROOT/$f" ]] && echo "$f"; done | sort -u | tr '\n' ' ')"
[[ "$found" == "vercel.json " ]] || fail "vercel.json files: $found"
[[ ! -e "$REPO_ROOT/apps/web/vercel.json" ]] || fail "apps/web/vercel.json exists"
render="$(git -C "$REPO_ROOT" ls-files --cached --others --exclude-standard -- ':!docs/' |
  while read -r f; do [[ -f "$REPO_ROOT/$f" ]] && grep -lF "$RENDER_HOST" "$REPO_ROOT/$f"; done)"
[[ -z "$render" ]] || fail "files containing $RENDER_HOST: $render"
end_case

# --- AC-DEVWF-013-1 ----------------------------------------------------------
# .vercelignore uses the .gitignore syntax; its rules are checked with
# `git check-ignore` in an empty repository whose only ignore file is it.
new_case "AC-DEVWF-013-1: .vercelignore excludes env files (not .env.example), build/tool folders, apps/api/src/generated and the Impeccable files, and keeps apps/web/src/lib/api"
IGN="$WORK/ignore-repo"
mkdir -p "$IGN"
git -C "$IGN" init -q
cp "$REPO_ROOT/.vercelignore" "$IGN/.gitignore"
ignored_paths=(
  .env .env.local .env.production apps/api/.env apps/web/.env apps/web/.env.local packages/schemas/.env.test
  node_modules/x/index.js apps/api/node_modules/x/index.js apps/web/node_modules/.vite/x
  dist/index.js packages/schemas/dist/index.js apps/web/dist/index.html apps/api/dist/server.js
  coverage/index.html apps/api/coverage/index.html logs/app.log apps/api/logs/app.log
  .vercel/project.json apps/web/.vercel/project.json
  .impeccable/state.json apps/web/.impeccable/design.json apps/web/PRODUCT.md apps/web/DESIGN.md
  apps/api/src/generated/prisma/client.ts apps/api/src/generated/prisma/models/users.ts
)
kept_paths=(
  .env.example apps/api/.env.example apps/web/.env.example vercel.json package.json pnpm-lock.yaml
  pnpm-workspace.yaml apps/api/package.json apps/api/src/server.ts apps/api/prisma/schema.prisma
  apps/api/prisma.config.ts apps/web/index.html apps/web/public/favicon.png packages/schemas/src/index.ts
  apps/api/src/app.ts apps/web/src/lib/api/sondixAPI.schemas.ts apps/web/src/lib/api/answers/answers.ts
  apps/web/src/lib/api/mutator/customInstance.ts
)
for p in "${ignored_paths[@]}"; do
  git -C "$IGN" check-ignore -q --no-index "$p" || fail "$p is not excluded"
done
for p in "${kept_paths[@]}"; do
  if git -C "$IGN" check-ignore -q --no-index "$p"; then fail "$p is excluded"; fi
done
end_case

# --- AC-DEVWF-013-2 ----------------------------------------------------------
new_case "AC-DEVWF-013-2: .gitignore lists .vercel"
grep -qxE '/?\.vercel/?' "$REPO_ROOT/.gitignore" || fail ".gitignore has no .vercel line"
git -C "$REPO_ROOT" check-ignore -q --no-index .vercel/project.json || fail ".vercel/project.json is not git-ignored"
end_case

# --- AC-ARCH-008-1 -----------------------------------------------------------
new_case "AC-ARCH-008-1: git ls-files apps/api/src/generated lists nothing"
tracked="$(git -C "$REPO_ROOT" ls-files apps/api/src/generated)"
[[ -z "$tracked" ]] || fail "tracked files: $(printf '%s\n' "$tracked" | head -n 3 | tr '\n' ' ')"
end_case

# --- AC-ARCH-008-2 -----------------------------------------------------------
# Runs right after a real `prisma generate` (the vercel-build step 2). Index
# deletions still staged from untracking the client ("D ") are neither
# untracked nor modified, so they are accepted.
new_case "AC-ARCH-008-2: after prisma generate, apps/api/src/generated is reported as ignored, not untracked or modified"
OUT="$(cd "$API" && "$PNPM_BIN" exec prisma generate 2>&1)"
CODE=$?
[[ "$CODE" -eq 0 ]] || fail "prisma generate exited $CODE"
[[ -d "$PRISMA_OUT" ]] || fail "apps/api/src/generated/prisma does not exist after prisma generate"
status="$(git -C "$REPO_ROOT" status --porcelain --ignored apps/api/src/generated)"
printf '%s\n' "$status" | grep -qx '!! apps/api/src/generated/' || fail "apps/api/src/generated/ is not reported as ignored (!!)"
bad="$(printf '%s\n' "$status" | grep -vE '^(!! |D  )' | grep -v '^$' || true)"
[[ -z "$bad" ]] || fail "reported as untracked or modified: $(printf '%s\n' "$bad" | head -n 3 | tr '\n' ' ')"
end_case

echo
echo "vercel-build tests: $PASSED passed, $FAILED failed, $SKIPPED skipped"
if [[ $FAILED -gt 0 ]]; then
  printf '  failed: %s\n' "${FAILED_NAMES[@]}"
  exit 1
fi
exit 0
