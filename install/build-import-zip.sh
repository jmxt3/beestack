#!/usr/bin/env bash
# Wrapper: gera install/dist/beestack-openbot-import.zip a partir das fontes do repo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/install/build-import-zip.py"
