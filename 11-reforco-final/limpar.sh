#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/lib.sh"
require_login
delete_projects jasper maple obsidian saffron raven
