#!/usr/bin/env bash
# Remove apenas o projeto T0; nao toca na infraestrutura.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
delete_projects agate
