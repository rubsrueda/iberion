#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-}"
HEAD_REF="${2:-HEAD}"

if [[ -z "$BASE_REF" ]]; then
  if [[ -n "${GITHUB_BASE_REF:-}" ]]; then
    BASE_REF="origin/${GITHUB_BASE_REF}"
  else
    BASE_REF="HEAD~1"
  fi
fi

echo "[baseline-guard] base_ref=$BASE_REF head_ref=$HEAD_REF"

CHANGED_FILES="$(git --no-pager diff --name-only "$BASE_REF"..."$HEAD_REF" || true)"
if [[ -z "$CHANGED_FILES" ]]; then
  echo "[baseline-guard] No changed files detected."
  exit 0
fi

echo "[baseline-guard] Changed files:"
echo "$CHANGED_FILES"

# Archivos sensibles de la capa corredor/gusano.
if echo "$CHANGED_FILES" | grep -Eq '^(ia_archipielago/IA_ARCHIPIELAGO.js|unit_Actions.js|index.html)$'; then
  echo "[baseline-guard] Sensitive corridor files changed. Checking traceability requirements..."

  # Si cambia la logica sensible, exigimos trazabilidad en baseline/changelog/version.
  if echo "$CHANGED_FILES" | grep -Eq '^(BASELINE_OCUPACION_CORREDOR.md|CHANGELOG.md|version.js)$'; then
    echo "[baseline-guard] Traceability files updated. Guard passed."
    exit 0
  fi

  echo "[baseline-guard] ERROR: Se modifico la logica sensible de corredor sin actualizar trazabilidad."
  echo "[baseline-guard] Debes incluir al menos uno de estos archivos en el mismo cambio:"
  echo "  - BASELINE_OCUPACION_CORREDOR.md"
  echo "  - CHANGELOG.md"
  echo "  - version.js"
  exit 1
fi

echo "[baseline-guard] Sensitive corridor files not changed. Guard passed."
