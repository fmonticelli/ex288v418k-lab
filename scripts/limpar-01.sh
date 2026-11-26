#!/usr/bin/env bash
# limpar-01.sh - remove apenas o(s) projeto(s) da task 1 (birch*). Nao toca na infra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects birch
