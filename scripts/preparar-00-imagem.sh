#!/usr/bin/env bash
# Prepara T0 (imagem pronta). Nao altera Gitea, Nexus nem repositorios Git.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
NS=agate
new_project "$NS"
echo "Projeto $NS pronto. Resolva 11-simulado-418/00-imagem.md."
