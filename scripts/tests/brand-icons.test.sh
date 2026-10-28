#!/usr/bin/env bash
# Tests for scripts/brand-icons.ts (docs/sdd/BRAND.md, REQ-BRAND-026,
# REQ-BRAND-034). Run from the repository root:
#   bash scripts/tests/brand-icons.test.sh
# Each case runs the script for real with Node.js into a temporary directory
# and checks its exit code, its output files and its standard error. PNG files
# are decoded with Node.js built-in modules only. Exits 0 only if every case
# passed.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/brand-icons.ts"
PUBLIC="$REPO_ROOT/apps/web/public"
ICONS=(favicon.png favicon-16.png apple-touch-icon.png)

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASSED=0
FAILED=0
FAILED_NAMES=()
CASE_OK=1
CASE_NAME=""
OUT=""
ERR=""
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
  fi
}

# run_script <cwd> [args...]: runs the script with Node.js from <cwd>;
# sets OUT, ERR and CODE.
run_script() {
  local cwd="$1"
  shift
  local out_file="$WORK/out" err_file="$WORK/err"
  (cd "$cwd" && node "$SCRIPT" "$@") >"$out_file" 2>"$err_file"
  CODE=$?
  OUT="$(cat "$out_file")"
  ERR="$(cat "$err_file")"
}

# png_check <file> <expected size> <opaque|alpha>: prints nothing when the
# file is an 8-bit RGBA PNG of that size with only IHDR, IDAT and IEND, fully
# opaque when asked; otherwise prints the problems.
png_check() {
  node --input-type=module - "$@" <<'EOF'
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
const [file, sizeArg, mode] = process.argv.slice(2);
const size = Number(sizeArg);
const buf = readFileSync(file);
const problems = [];
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!buf.subarray(0, 8).equals(sig)) problems.push("bad PNG signature");
const types = [];
const idat = [];
let ihdr = null;
for (let o = 8; o < buf.length; ) {
  const len = buf.readUInt32BE(o);
  const type = buf.toString("ascii", o + 4, o + 8);
  const data = buf.subarray(o + 8, o + 8 + len);
  types.push(type);
  if (type === "IHDR") ihdr = data;
  if (type === "IDAT") idat.push(data);
  o += 12 + len;
}
const kinds = [...new Set(types)];
if (kinds.join(",") !== "IHDR,IDAT,IEND" || types[0] !== "IHDR" || types.at(-1) !== "IEND")
  problems.push(`chunks are ${types.join(",")}, expected only IHDR, IDAT, IEND`);
if (!ihdr) {
  problems.push("no IHDR");
} else {
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  if (w !== size || h !== size) problems.push(`size ${w}x${h}, expected ${size}x${size}`);
  if (ihdr[8] !== 8) problems.push(`bit depth ${ihdr[8]}, expected 8`);
  if (ihdr[9] !== 6) problems.push(`color type ${ihdr[9]}, expected 6 (RGBA)`);
  if (ihdr[12] !== 0) problems.push("interlaced");
}
if (mode === "opaque" && ihdr && ihdr[9] === 6 && ihdr[12] === 0) {
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  let prev = Buffer.alloc(stride);
  let transparent = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? line[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      line[i] = (line[i] + pred) & 0xff;
    }
    for (let x = 0; x < w; x++) if (line[x * 4 + 3] !== 255) transparent++;
    prev = line;
  }
  if (transparent) problems.push(`${transparent} pixels are not fully opaque`);
}
if (problems.length) console.log(problems.join("; "));
EOF
}

# png_pixel <file> <x> <y>: prints the pixel as RRGGBBAA (hex, upper case).
png_pixel() {
  node --input-type=module - "$@" <<'EOF'
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
const [file, xs, ys] = process.argv.slice(2);
const buf = readFileSync(file);
let w = 0;
const idat = [];
for (let o = 8; o < buf.length; ) {
  const len = buf.readUInt32BE(o);
  const type = buf.toString("ascii", o + 4, o + 8);
  if (type === "IHDR") w = buf.readUInt32BE(o + 8);
  if (type === "IDAT") idat.push(buf.subarray(o + 8, o + 8 + len));
  o += 12 + len;
}
const raw = inflateSync(Buffer.concat(idat));
const stride = w * 4;
let prev = Buffer.alloc(stride);
let line = prev;
for (let y = 0; y <= Number(ys); y++) {
  const f = raw[y * (stride + 1)];
  line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
  for (let i = 0; i < stride; i++) {
    const a = i >= 4 ? line[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
    line[i] = (line[i] + pred) & 0xff;
  }
  prev = line;
}
const i = Number(xs) * 4;
console.log([...line.subarray(i, i + 4)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase());
EOF
}

# expect_pixel <file> <x> <y> <RRGGBB|transparent>: opaque color within ±2
# per channel, or alpha 0.
expect_pixel() {
  local file="$1" x="$2" y="$3" want="$4" got
  got="$(png_pixel "$file" "$x" "$y")"
  if [[ "$want" == "transparent" ]]; then
    [[ "${got:6:2}" == "00" ]] || fail "$(basename "$file") ($x, $y) is $got, expected fully transparent"
    return
  fi
  if [[ "${got:6:2}" != "FF" ]]; then
    fail "$(basename "$file") ($x, $y) is $got, expected opaque #$want"
    return
  fi
  local k g w
  for k in 0 2 4; do
    g=$((16#${got:$k:2}))
    w=$((16#${want:$k:2}))
    if ((g - w > 2 || w - g > 2)); then
      fail "$(basename "$file") ($x, $y) is #${got:0:6}, expected #$want (± 2)"
      return
    fi
  done
}

# check_pixels <dir>: the samples of AC-BRAND-026-5.
check_pixels() {
  local d="$1"
  expect_pixel "$d/favicon.png" 2 16 141414
  expect_pixel "$d/favicon.png" 12 21 0E6E6E
  expect_pixel "$d/favicon.png" 22 21 E4E7EA
  expect_pixel "$d/favicon.png" 16 8 transparent
  expect_pixel "$d/favicon-16.png" 0 8 141414
  expect_pixel "$d/favicon-16.png" 6 9 0E6E6E
  expect_pixel "$d/favicon-16.png" 12 9 transparent
  expect_pixel "$d/apple-touch-icon.png" 0 0 FFFFFF
  expect_pixel "$d/apple-touch-icon.png" 70 65 141414
  expect_pixel "$d/apple-touch-icon.png" 70 110 0E6E6E
  expect_pixel "$d/apple-touch-icon.png" 112 110 E4E7EA
}

# check_headers <dir>: AC-BRAND-026-2 and the output format of REQ-BRAND-034.
check_headers() {
  local d="$1" msg
  msg="$(png_check "$d/favicon.png" 32 alpha)"
  [[ -z "$msg" ]] || fail "favicon.png: $msg"
  msg="$(png_check "$d/favicon-16.png" 16 alpha)"
  [[ -z "$msg" ]] || fail "favicon-16.png: $msg"
  msg="$(png_check "$d/apple-touch-icon.png" 180 opaque)"
  [[ -z "$msg" ]] || fail "apple-touch-icon.png: $msg"
}

cd "$REPO_ROOT" || exit 1

# --- AC-BRAND-034-1 ----------------------------------------------------------
new_case "AC-BRAND-034-1: writes exactly the three PNG files into an empty directory and exits 0"
OUT_DIR="$WORK/out-1"
mkdir -p "$OUT_DIR"
run_script "$REPO_ROOT" "$OUT_DIR"
[[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0 (stderr: $ERR)"
[[ -z "$ERR" ]] || fail "unexpected stderr: $ERR"
listing="$(cd "$OUT_DIR" && ls -A | sort | tr '\n' ' ')"
[[ "$listing" == "apple-touch-icon.png favicon-16.png favicon.png " ]] ||
  fail "directory holds '$listing', expected the three PNG files only"
end_case

new_case "AC-BRAND-034-1 / AC-BRAND-026-2: generated PNGs are 8-bit RGBA 32, 16 and 180 px, IHDR/IDAT/IEND only, apple-touch icon opaque"
check_headers "$OUT_DIR"
end_case

new_case "AC-BRAND-034-1 / AC-BRAND-026-5: generated PNGs match the sampled pixels"
check_pixels "$OUT_DIR"
end_case

# --- AC-BRAND-034-2 ----------------------------------------------------------
new_case "AC-BRAND-034-2: generated files are byte-for-byte identical to the committed ones"
for f in "${ICONS[@]}"; do
  cmp -s "$OUT_DIR/$f" "$PUBLIC/$f" || fail "$f differs from apps/web/public/$f"
done
end_case

new_case "REQ-BRAND-034: a second run gives the same bytes (deterministic output)"
OUT_DIR_2="$WORK/out-2"
mkdir -p "$OUT_DIR_2"
run_script "$REPO_ROOT" "$OUT_DIR_2"
[[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0"
for f in "${ICONS[@]}"; do
  cmp -s "$OUT_DIR/$f" "$OUT_DIR_2/$f" || fail "$f differs between two runs"
done
end_case

# --- AC-BRAND-026-2 / 026-5 on the committed files ---------------------------
new_case "AC-BRAND-026-2: committed PNGs are 32, 16 and 180 px RGBA, apple-touch icon opaque"
check_headers "$PUBLIC"
end_case

new_case "AC-BRAND-026-5: committed PNGs match the sampled pixels"
check_pixels "$PUBLIC"
end_case

# --- REQ-BRAND-034 run rules -------------------------------------------------
new_case "REQ-BRAND-034: without an argument it writes to apps/web/public under the current directory"
FAKE_ROOT="$WORK/fake-root"
mkdir -p "$FAKE_ROOT/apps/web/public"
run_script "$FAKE_ROOT"
[[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0 (stderr: $ERR)"
for f in "${ICONS[@]}"; do
  cmp -s "$FAKE_ROOT/apps/web/public/$f" "$PUBLIC/$f" || fail "default run did not write $f as committed"
done
listing="$(cd "$FAKE_ROOT" && find . -type f | sort | tr '\n' ' ')"
[[ "$listing" == "./apps/web/public/apple-touch-icon.png ./apps/web/public/favicon-16.png ./apps/web/public/favicon.png " ]] ||
  fail "default run wrote '$listing'"
end_case

new_case "REQ-BRAND-034: overwrites the three files and changes nothing else in the directory"
OUT_DIR_3="$WORK/out-3"
mkdir -p "$OUT_DIR_3"
for f in "${ICONS[@]}"; do echo "stale" >"$OUT_DIR_3/$f"; done
echo "keep" >"$OUT_DIR_3/other.txt"
run_script "$REPO_ROOT" "$OUT_DIR_3"
[[ "$CODE" -eq 0 ]] || fail "exit code $CODE, expected 0"
for f in "${ICONS[@]}"; do
  cmp -s "$OUT_DIR_3/$f" "$PUBLIC/$f" || fail "$f was not overwritten"
done
[[ "$(cat "$OUT_DIR_3/other.txt")" == "keep" ]] || fail "other.txt was changed"
listing="$(cd "$OUT_DIR_3" && ls -A | sort | tr '\n' ' ')"
[[ "$listing" == "apple-touch-icon.png favicon-16.png favicon.png other.txt " ]] ||
  fail "directory holds '$listing'"
end_case

# --- AC-BRAND-034-3 ----------------------------------------------------------
new_case "AC-BRAND-034-3: an output directory below a regular file exits non-zero with an error on stderr"
echo "file" >"$WORK/regular-file"
run_script "$REPO_ROOT" "$WORK/regular-file/icons"
[[ "$CODE" -ne 0 ]] || fail "exit code 0, expected non-zero"
[[ -n "$ERR" ]] || fail "nothing printed on stderr"
[[ -z "$OUT" ]] || fail "unexpected stdout: $OUT"
[[ "$(cat "$WORK/regular-file")" == "file" ]] || fail "the regular file was changed"
end_case

# --- AC-BRAND-034-4 ----------------------------------------------------------
new_case "AC-BRAND-034-4: the script imports only node: built-in modules"
imports="$(grep -E '^\s*import\b|\brequire\(|\bimport\(' "$SCRIPT")"
[[ -n "$imports" ]] || fail "no imports found"
bad="$(printf '%s\n' "$imports" | grep -vE "from \"node:[a-z/]+\";?\s*$" || true)"
[[ -z "$bad" ]] || fail "non-built-in imports: $bad"
end_case

new_case "AC-BRAND-034-4: no package.json mentions the script or holds a PNG/image dependency"
for pkg in package.json apps/web/package.json apps/api/package.json packages/schemas/package.json; do
  if grep -qiE 'brand-icons|"(pngjs|sharp|canvas|jimp|upng-js|@resvg/[a-z-]+|svg2png)"' "$pkg"; then
    fail "$pkg mentions the script or an image dependency"
  fi
done
end_case

echo
echo "brand-icons tests: $PASSED passed, $FAILED failed"
if [[ $FAILED -gt 0 ]]; then
  printf '  failed: %s\n' "${FAILED_NAMES[@]}"
  exit 1
fi
exit 0
