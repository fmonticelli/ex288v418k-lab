#!/usr/bin/env bash
# Limpeza interativa dos projetos conhecidos do laboratorio EX288 v3.
# Preserva Gitea/Nexus por padrao; --infra exige confirmacao adicional.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login

WITH_INFRA=0
case "${1:-}" in
  "") ;;
  --infra) WITH_INFRA=1 ;;
  *) die "uso: bash scripts/limpar-tudo-v3.sh [--infra]" ;;
esac

# Nomes EXATOS. Nao descobre namespaces por label nem por prefixo.
KNOWN=(
  agate birch coral dune
  elm elm-shared frost granite heather indigo
  crimson quartz ember harbor cobalt willow falcon tundra
  onyx cedar glacier copper copper-shared violet lantern summit orchard
  jasper maple obsidian saffron raven
)
if (( WITH_INFRA )); then KNOWN+=("$INFRA_NS"); fi

LIST=()
for ns in "${KNOWN[@]}"; do
  if oc get project "$ns" >/dev/null 2>&1; then LIST+=("$ns"); fi
done
if (( ${#LIST[@]} == 0 )); then echo "Nada para remover."; exit 0; fi

echo "Projetos que serao removidos:"
printf '  - %s\n' "${LIST[@]}"
if (( ! WITH_INFRA )); then echo "(infra $INFRA_NS preservada; use --infra para inclui-la)"; fi
printf 'Confirmar exclusao de TODOS os projetos listados? [digite sim] '
read -r ans
[[ "$ans" == sim ]] || { echo "Cancelado."; exit 1; }

if (( WITH_INFRA )); then
  printf 'ATENCAO: Gitea/Nexus e seus dados serao removidos. Digite o nome exato %s: ' "$INFRA_NS"
  read -r confirm_infra
  [[ "$confirm_infra" == "$INFRA_NS" ]] || { echo "Cancelado."; exit 1; }
fi

for ns in "${LIST[@]}"; do
  echo "removendo projeto $ns"
  oc delete project "$ns" --wait=false
done
