#!/usr/bin/env bash
set -euo pipefail

ENGINE_PKG=$(nix build nixpkgs#prisma-engines --no-link --print-out-paths)
export PRISMA_SCHEMA_ENGINE_BINARY="$ENGINE_PKG/bin/schema-engine"

exec bunx prisma "$@"
