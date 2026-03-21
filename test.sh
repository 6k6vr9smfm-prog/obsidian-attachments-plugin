#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Integration tests for the Attachments Manager plugin
#
# PREREQUISITE: Obsidian must be running with plugin-testing-vault open
# and the Attachments Manager plugin enabled.
#
# Populate "testing set/" with:  10+ PDFs, 1+ MOV, 1+ GIF, 1+ ZIP
# The folder is gitignored — files are never committed.
#
# Usage: ./test.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -u
shopt -s nullglob

# ── Configuration ─────────────────────────────────────────────────────────────

VAULT="plugin-testing-vault"
ATTACHMENTS="$VAULT/attachments"
TWINS="$VAULT/attachments/twins"
THUMBNAILS="$VAULT/attachments/twins/thumbnails"
SRC="testing set"
TEMPLATE="$VAULT/templates/attachment.md"
BASE="$VAULT/attachments.base"

# Every file copied into the vault gets this prefix so Obsidian always sees a
# brand-new filename (avoids stale-cache issues across runs).
RUN_ID="$(date +%s)"

WARMUP_TIMEOUT=60
DEFAULT_TIMEOUT=15
NEGATIVE_TIMEOUT=5

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

# ── Helpers ───────────────────────────────────────────────────────────────────

pass() { echo -e "  ${GREEN}PASS${NC}  $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
info() { echo -e "  ${CYAN}····${NC}  $1"; }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; }
group() { echo -e "\n${BOLD}── $1${NC}"; }

wait_for_file() {
  local f="$1" t="${2:-$DEFAULT_TIMEOUT}"
  local i=0 max=$((t * 2))
  while [ "$i" -lt "$max" ] && [ ! -f "$f" ]; do
    sleep 0.5
    i=$((i + 1))
  done
  [ -f "$f" ]
}

wait_for_no_file() {
  local f="$1" t="${2:-$DEFAULT_TIMEOUT}"
  local i=0 max=$((t * 2))
  while [ "$i" -lt "$max" ] && [ -f "$f" ]; do
    sleep 0.5
    i=$((i + 1))
  done
  [ ! -f "$f" ]
}

# Copy a test file into the attachments folder with a run-unique name.
# Prints the unique basename to stdout.
cp_attach() {
  local src="$1" tag="$2"
  local ext="${src##*.}"
  local unique="${RUN_ID}_${tag}.${ext}"
  cp "$src" "$ATTACHMENTS/$unique"
  echo "$unique"
}

cleanup() {
  rm -f "$ATTACHMENTS"/*.pdf "$ATTACHMENTS"/*.mov "$ATTACHMENTS"/*.mp4 \
       "$ATTACHMENTS"/*.gif "$ATTACHMENTS"/*.zip 2>/dev/null
  rm -f "$TWINS"/*.md 2>/dev/null
  rm -f "$THUMBNAILS"/*.png 2>/dev/null
  rm -f "$VAULT"/*.pdf 2>/dev/null
  sleep 1
}

count_twins() {
  find "$TWINS" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

assert_field() {
  local file="$1" field="$2" label="$3"
  if grep -q "$field" "$file" 2>/dev/null; then
    pass "$label"
  else
    fail "$label"
    show_twin "$file"
  fi
}

assert_field_re() {
  local file="$1" pattern="$2" label="$3"
  if grep -qE "$pattern" "$file" 2>/dev/null; then
    pass "$label"
  else
    fail "$label"
    show_twin "$file"
  fi
}

show_twin() {
  local f="$1"
  if [ -f "$f" ]; then
    info "── twin content ──"
    while IFS= read -r line; do info "  $line"; done < "$f"
    info "── end ──"
  else
    info "(twin file does not exist: $f)"
  fi
}

# ── Test File Discovery ──────────────────────────────────────────────────────

PDFS=("$SRC"/*.pdf)
MOVS=("$SRC"/*.mov)
GIFS=("$SRC"/*.gif)
ZIPS=("$SRC"/*.zip)

MISSING=""
[ ${#PDFS[@]} -lt 10 ] && MISSING="${MISSING}  - 10+ PDFs (found ${#PDFS[@]})\n"
[ ${#MOVS[@]} -lt 1 ]  && MISSING="${MISSING}  - 1+ MOV (found ${#MOVS[@]})\n"
[ ${#GIFS[@]} -lt 1 ]  && MISSING="${MISSING}  - 1+ GIF (found ${#GIFS[@]})\n"
[ ${#ZIPS[@]} -lt 1 ]  && MISSING="${MISSING}  - 1+ ZIP (found ${#ZIPS[@]})\n"

if [ -n "$MISSING" ]; then
  echo -e "Missing test files in '$SRC/':\n$MISSING"
  exit 1
fi

# Each group gets its own source file — never reused.
PDF_WARMUP="${PDFS[0]}"
PDF_A="${PDFS[1]}"
PDF_D="${PDFS[2]}"
PDF_E="${PDFS[3]}"
PDF_F="${PDFS[4]}"
PDF_G1a="${PDFS[5]}"
PDF_G1b="${PDFS[6]}"
PDF_G2a="${PDFS[7]}"
PDF_G2b="${PDFS[8]}"
PDF_G2c="${PDFS[9]}"
VIDEO="${MOVS[0]}"
IMAGE="${GIFS[0]}"
NONATTACH="${ZIPS[0]}"

# ── Prerequisite Checks ─────────────────────────────────────────────────────

if [ ! -d "$VAULT" ]; then
  echo "ERROR: Vault directory '$VAULT' not found."
  exit 1
fi
if [ ! -d "$ATTACHMENTS" ]; then
  echo "ERROR: '$ATTACHMENTS' not found. Create it inside Obsidian first, then re-run."
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}Attachments Manager — Integration Tests${NC}"
echo "════════════════════════════════════════════"
echo ""
info "Vault:       $VAULT"
info "Watched:     $ATTACHMENTS"
info "Twins:       $TWINS"
info "Thumbnails:  $THUMBNAILS"
info "Run ID:      $RUN_ID"
info "Test files:  ${#PDFS[@]} PDFs, ${#MOVS[@]} MOVs, ${#GIFS[@]} GIFs, ${#ZIPS[@]} ZIPs"

cleanup

# ═══════════════════════════════════════════════════════════════════════════════
# WARMUP: PDF.js Initialisation
# ═══════════════════════════════════════════════════════════════════════════════
group "WARMUP: PDF.js initialisation (up to ${WARMUP_TIMEOUT}s)"

WARMUP_BASE="$(cp_attach "$PDF_WARMUP" "warmup")"
WARMUP_TWIN="$TWINS/${WARMUP_BASE}.md"
if wait_for_file "$WARMUP_TWIN" "$WARMUP_TIMEOUT"; then
  info "PDF.js ready."
else
  echo ""
  echo "ERROR: PDF twin never appeared during warmup (${WARMUP_TIMEOUT}s)."
  echo "Check that the plugin is enabled and 'attachments' is being watched."
  exit 1
fi
cleanup
sleep 2

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP A: PDF Twin — Creation & Validation
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP A: PDF twin — creation & validation"

cleanup
A_BASE="$(cp_attach "$PDF_A" "a")"
TWIN_A="$TWINS/${A_BASE}.md"
THUMB_A="$THUMBNAILS/${A_BASE}.png"

if wait_for_file "$TWIN_A" "$DEFAULT_TIMEOUT"; then
  pass "A1:  Twin file exists"
else
  fail "A1:  Twin file does not exist after ${DEFAULT_TIMEOUT}s"
  info "Expected: $TWIN_A"
fi

# Give thumbnail generation extra time
wait_for_file "$THUMB_A" 10 || true

if [ -f "$TWIN_A" ]; then
  assert_field    "$TWIN_A" "is_twin_file: true"                      "A2:  is_twin_file: true"
  assert_field    "$TWIN_A" "type: pdf"                               "A3:  type: pdf"
  assert_field    "$TWIN_A" "extension: pdf"                          "A4:  extension: pdf"
  assert_field    "$TWIN_A" "categories"                              "A5:  categories present"
  assert_field    "$TWIN_A" "preview:"                                "A6:  preview field present"
  assert_field_re "$TWIN_A" "attachment_file:.*\[\[.*${A_BASE}.*\]\]" "A7:  attachment_file references [[filename]]"
  assert_field_re "$TWIN_A" "size: [1-9]"                             "A8:  size is a positive number"
  assert_field_re "$TWIN_A" "created: [0-9]{4}-"                      "A9:  created has a date"
  assert_field_re "$TWIN_A" "modified: [0-9]{4}-"                     "A10: modified has a date"

  # A11: body embed — appears after the closing frontmatter ---
  if awk '/^---$/{n++; next} n>=2' "$TWIN_A" | grep -q "!\[\[${A_BASE}\]\]"; then
    pass "A11: Body contains ![[filename]] embed"
  else
    fail "A11: Body missing ![[filename]] embed"
    show_twin "$TWIN_A"
  fi
else
  for n in A2 A3 A4 A5 A6 A7 A8 A9 A10 A11; do
    fail "$n:  Skipped (twin not created)"
  done
fi

# A12: Thumbnail
if [ -f "$THUMB_A" ]; then
  pass "A12: Thumbnail PNG exists"
else
  fail "A12: Thumbnail PNG not found at $THUMB_A"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP B: Video Twin (MOV with special chars)
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP B: Video twin (MOV with special chars)"

cleanup
B_BASE="$(cp_attach "$VIDEO" "b")"
TWIN_B="$TWINS/${B_BASE}.md"
THUMB_B="$THUMBNAILS/${B_BASE}.png"

if wait_for_file "$TWIN_B" "$DEFAULT_TIMEOUT"; then
  pass "B1: Video twin created"
else
  fail "B1: Video twin not created after ${DEFAULT_TIMEOUT}s"
  info "Expected: $TWIN_B"
fi

# Video thumbnails may take longer
wait_for_file "$THUMB_B" 15 || true

if [ -f "$TWIN_B" ]; then
  assert_field "$TWIN_B" "type: video"  "B2: type: video"
  assert_field "$TWIN_B" "preview:"     "B3: preview field present"
else
  fail "B2: Skipped (twin not created)"
  fail "B3: Skipped (twin not created)"
fi

if [ -f "$THUMB_B" ]; then
  pass "B4: Video thumbnail PNG exists"
else
  fail "B4: Video thumbnail PNG not found at $THUMB_B"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP C: Image Twin (GIF)
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP C: Image twin (GIF)"

cleanup
C_BASE="$(cp_attach "$IMAGE" "c")"
TWIN_C="$TWINS/${C_BASE}.md"

if wait_for_file "$TWIN_C" "$DEFAULT_TIMEOUT"; then
  pass "C1: Image twin created"
else
  fail "C1: Image twin not created after ${DEFAULT_TIMEOUT}s"
  info "Expected: $TWIN_C"
fi

if [ -f "$TWIN_C" ]; then
  assert_field "$TWIN_C" "type: image"  "C2: type: image"
else
  fail "C2: Skipped (twin not created)"
fi

# Images use themselves as preview — no thumbnail should be generated
THUMB_C="$THUMBNAILS/${C_BASE}.png"
sleep 2
if [ ! -f "$THUMB_C" ]; then
  pass "C3: No thumbnail PNG for image (uses self as preview)"
else
  fail "C3: Unexpected thumbnail PNG found for image"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP D: Ignored Files
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP D: Ignored files"

cleanup

# D1: ZIP in watched folder — not an attachment type
ZIP_EXT="${NONATTACH##*.}"
ZIP_UNIQUE="${RUN_ID}_d1.${ZIP_EXT}"
cp "$NONATTACH" "$ATTACHMENTS/$ZIP_UNIQUE"
sleep "$NEGATIVE_TIMEOUT"
ZIP_TWIN="$TWINS/${ZIP_UNIQUE}.md"
if [ ! -f "$ZIP_TWIN" ]; then
  pass "D1: ZIP in watched folder → no twin"
else
  fail "D1: ZIP in watched folder got a twin"
fi

# D2: PDF at vault root — outside watched folder
D2_UNIQUE="${RUN_ID}_d2.pdf"
cp "$PDF_D" "$VAULT/$D2_UNIQUE"
sleep "$NEGATIVE_TIMEOUT"
ROOT_TWIN_A="$TWINS/${D2_UNIQUE}.md"
ROOT_TWIN_B="$VAULT/${D2_UNIQUE}.md"
if [ ! -f "$ROOT_TWIN_A" ] && [ ! -f "$ROOT_TWIN_B" ]; then
  pass "D2: PDF at vault root → no twin"
else
  fail "D2: PDF at vault root got a twin"
fi
rm -f "$VAULT/$D2_UNIQUE"

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP E: Delete Lifecycle
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP E: Delete lifecycle"

cleanup
E_BASE="$(cp_attach "$PDF_E" "e")"
TWIN_E="$TWINS/${E_BASE}.md"
THUMB_E="$THUMBNAILS/${E_BASE}.png"

wait_for_file "$TWIN_E" "$DEFAULT_TIMEOUT" || true
wait_for_file "$THUMB_E" 10 || true

if [ ! -f "$TWIN_E" ]; then
  fail "E1: Pre-condition failed — twin never appeared"
  fail "E2: Skipped"
else
  THUMB_EXISTED=false
  [ -f "$THUMB_E" ] && THUMB_EXISTED=true

  rm "$ATTACHMENTS/$E_BASE"

  if wait_for_no_file "$TWIN_E" "$DEFAULT_TIMEOUT"; then
    pass "E1: Delete attachment → twin removed"
  else
    fail "E1: Twin still exists after deleting attachment"
  fi

  if $THUMB_EXISTED; then
    if wait_for_no_file "$THUMB_E" 5; then
      pass "E2: Delete attachment → thumbnail removed"
    else
      fail "E2: Thumbnail still exists after deleting attachment"
    fi
  else
    warn "E2: Thumbnail was not generated — verifying absence"
    if [ ! -f "$THUMB_E" ]; then
      pass "E2: No thumbnail to remove (absent before and after)"
    else
      fail "E2: Thumbnail appeared after deletion (unexpected)"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP F: Rename Lifecycle
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP F: Rename lifecycle"

cleanup
F_BASE="$(cp_attach "$PDF_F" "f")"
RENAMED_BASE="renamed_${F_BASE}"
OLD_TWIN="$TWINS/${F_BASE}.md"
NEW_TWIN="$TWINS/${RENAMED_BASE}.md"

wait_for_file "$OLD_TWIN" "$DEFAULT_TIMEOUT" || true

if [ ! -f "$OLD_TWIN" ]; then
  fail "F1: Pre-condition failed — original twin never appeared"
  fail "F2: Skipped"
else
  mv "$ATTACHMENTS/$F_BASE" "$ATTACHMENTS/$RENAMED_BASE"

  wait_for_file "$NEW_TWIN" "$DEFAULT_TIMEOUT" || true
  wait_for_no_file "$OLD_TWIN" "$DEFAULT_TIMEOUT" || true

  if [ -f "$NEW_TWIN" ] && [ ! -f "$OLD_TWIN" ]; then
    pass "F1: Old twin gone, new twin exists"
  else
    NEW_STATUS="missing"; [ -f "$NEW_TWIN" ] && NEW_STATUS="found"
    OLD_STATUS="gone";    [ -f "$OLD_TWIN" ] && OLD_STATUS="still_exists"
    fail "F1: Rename result — new=$NEW_STATUS, old=$OLD_STATUS"
  fi

  if [ -f "$NEW_TWIN" ]; then
    if grep -q "\[\[$RENAMED_BASE\]\]" "$NEW_TWIN" 2>/dev/null; then
      pass "F2: New twin references renamed filename"
    else
      fail "F2: New twin does not reference renamed filename"
      show_twin "$NEW_TWIN"
    fi
  else
    fail "F2: Skipped (new twin not found)"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP G: Concurrent Operations
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP G: Concurrent operations"

# G1: 2 files simultaneously
cleanup
G1A_BASE="${RUN_ID}_g1a.pdf"
G1B_BASE="${RUN_ID}_g1b.pdf"
cp "$PDF_G1a" "$ATTACHMENTS/$G1A_BASE" &
cp "$PDF_G1b" "$ATTACHMENTS/$G1B_BASE" &
wait
TWIN_G1A="$TWINS/${G1A_BASE}.md"
TWIN_G1B="$TWINS/${G1B_BASE}.md"
wait_for_file "$TWIN_G1A" "$DEFAULT_TIMEOUT" || true
wait_for_file "$TWIN_G1B" "$DEFAULT_TIMEOUT" || true
COUNT_G1="$(count_twins)"
if [ "$COUNT_G1" -eq 2 ] && [ -f "$TWIN_G1A" ] && [ -f "$TWIN_G1B" ]; then
  pass "G1: 2 simultaneous copies → exactly 2 twins"
else
  fail "G1: Expected 2 twins, found $COUNT_G1"
  info "Twins: $(find "$TWINS" -maxdepth 1 -name "*.md" -exec basename {} \; 2>/dev/null | tr '\n' ' ')"
fi

# G2: 3 files simultaneously
cleanup
G2A_BASE="${RUN_ID}_g2a.pdf"
G2B_BASE="${RUN_ID}_g2b.pdf"
G2C_BASE="${RUN_ID}_g2c.pdf"
cp "$PDF_G2a" "$ATTACHMENTS/$G2A_BASE" &
cp "$PDF_G2b" "$ATTACHMENTS/$G2B_BASE" &
cp "$PDF_G2c" "$ATTACHMENTS/$G2C_BASE" &
wait
TWIN_G2A="$TWINS/${G2A_BASE}.md"
TWIN_G2B="$TWINS/${G2B_BASE}.md"
TWIN_G2C="$TWINS/${G2C_BASE}.md"
wait_for_file "$TWIN_G2A" "$DEFAULT_TIMEOUT" || true
wait_for_file "$TWIN_G2B" "$DEFAULT_TIMEOUT" || true
wait_for_file "$TWIN_G2C" "$DEFAULT_TIMEOUT" || true
COUNT_G2="$(count_twins)"
if [ "$COUNT_G2" -eq 3 ] && [ -f "$TWIN_G2A" ] && [ -f "$TWIN_G2B" ] && [ -f "$TWIN_G2C" ]; then
  pass "G2: 3 simultaneous copies → exactly 3 twins"
else
  fail "G2: Expected 3 twins, found $COUNT_G2"
  info "Twins: $(find "$TWINS" -maxdepth 1 -name "*.md" -exec basename {} \; 2>/dev/null | tr '\n' ' ')"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GROUP H: Static Checks
# ═══════════════════════════════════════════════════════════════════════════════
group "GROUP H: Static checks"

# H1: Template exists and has no preview: ""
if [ ! -f "$TEMPLATE" ]; then
  fail "H1: Template file not found at $TEMPLATE"
else
  if grep -q 'preview: ""' "$TEMPLATE"; then
    fail "H1: Template contains preview: \"\""
  else
    pass "H1: Template exists, no empty preview field"
  fi
fi

# H2: Base file exists
if [ -f "$BASE" ]; then
  pass "H2: attachments.base exists"
else
  fail "H2: attachments.base not found"
fi

# H3: Base file contains is_twin_file filter
if [ -f "$BASE" ]; then
  if grep -q "is_twin_file" "$BASE"; then
    pass "H3: Base file contains is_twin_file filter"
  else
    fail "H3: Base file missing is_twin_file filter"
  fi
else
  fail "H3: Skipped (base file not found)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
cleanup

TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo "════════════════════════════════════════════"
echo -e "  ${GREEN}${PASS_COUNT} passed${NC}   ${RED}${FAIL_COUNT} failed${NC}   (${TOTAL} total)"
echo "════════════════════════════════════════════"
echo ""

[ "$FAIL_COUNT" -eq 0 ] && exit 0 || exit 1
