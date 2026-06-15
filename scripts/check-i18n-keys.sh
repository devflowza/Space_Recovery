#!/usr/bin/env bash
# Portal-scoped i18n missing-key gate (Country Engine Phase 2, A0).
#
# Asserts every t('portal:KEY') / t("portal:KEY") call site under the portal
# surface resolves to a string in the bundled portal 'en' namespace (the
# fallbackLng). Scope is intentionally bounded to the portal (the externally
# visible non-English surface) so the gate is real but does not block on the
# ~1,684 not-yet-extracted app strings.
#
# Source of truth (environment-aware): src/locales/portal.en.json (committed in
# A3) once the portal slice is extracted. Until any portal t() call exists, the
# gate is a no-op pass — so it is green on main today.
set -euo pipefail

PORTAL_DIRS=(src/pages/portal src/components/portal)
EN_JSON="src/locales/portal.en.json"

existing=()
for d in "${PORTAL_DIRS[@]}"; do
  [ -d "$d" ] && existing+=("$d")
done
if [ ${#existing[@]} -eq 0 ]; then
  echo "OK: no portal directories present — i18n key gate is a no-op."
  exit 0
fi

keys=$(grep -rhoE "t\(\s*['\"]portal:[a-zA-Z0-9_.]+['\"]" "${existing[@]}" 2>/dev/null \
  | sed -E "s/.*portal:([a-zA-Z0-9_.]+).*/\1/" | sort -u || true)

if [ -z "$keys" ]; then
  echo "OK: no portal t('portal:…') call sites yet — i18n key gate is a no-op."
  exit 0
fi

if [ ! -f "$EN_JSON" ]; then
  echo "FAIL: portal t('portal:…') calls exist but $EN_JSON (en namespace) is missing." >&2
  exit 1
fi

printf '%s\n' "$keys" | node --input-type=commonjs -e '
  const fs = require("fs");
  const en = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const keys = fs.readFileSync(0, "utf8").trim().split("\n").filter(Boolean);
  const missing = keys.filter((k) => {
    let cur = en;
    for (const seg of k.split(".")) {
      if (cur && typeof cur === "object" && seg in cur) cur = cur[seg];
      else return true;
    }
    return typeof cur !== "string";
  });
  if (missing.length) {
    console.error("FAIL: unresolved portal i18n keys (no en value): " + missing.join(", "));
    process.exit(1);
  }
  console.log("OK: " + keys.length + " portal t() keys resolve in en.");
' "$EN_JSON"
