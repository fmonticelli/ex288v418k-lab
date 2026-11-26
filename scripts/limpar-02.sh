#!/usr/bin/env bash
# limpar-02.sh - remove apenas o(s) projeto(s) da task 2 (coral*). Nao toca na infra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects coral
