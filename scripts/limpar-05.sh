#!/usr/bin/env bash
# limpar-05.sh - remove apenas o(s) projeto(s) da task 5 (frost*). Nao toca na infra.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects frost
