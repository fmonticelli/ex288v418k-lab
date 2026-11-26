#!/usr/bin/env bash
# limpar-03.sh - remove apenas o(s) projeto(s) da task 3 (dune*). Nao toca na infra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects dune
