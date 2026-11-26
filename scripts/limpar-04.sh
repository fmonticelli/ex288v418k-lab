#!/usr/bin/env bash
# limpar-04.sh - remove apenas o(s) projeto(s) da task 4 (elm*). Nao toca na infra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects elm elm-shared
