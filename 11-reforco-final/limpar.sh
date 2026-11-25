#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/lib.sh"
require_login
delete_projects ex288-v3-r1 ex288-v3-r2 ex288-v3-r3 ex288-v3-r4 ex288-v3-r5
