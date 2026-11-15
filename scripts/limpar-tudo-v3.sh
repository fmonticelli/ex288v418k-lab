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
  ex288-v3-t0 ex288-v3-t1 ex288-v3-t2 ex288-v3-t3
  ex288-v3-t4 ex288-v3-t4-shared ex288-v3-t5 ex288-v3-t6 ex288-v3-t7 ex288-v3-t8
  crimson quartz ember harbor cobalt willow falcon tundra
  onyx cedar glacier copper copper-shared violet lantern summit orchard
  # Nomes historicos dos simulados anteriores:
  ex288-v3-sa-t1 ex288-v3-sa-t2 ex288-v3-sa-t3 ex288-v3-sa-t4
  ex288-v3-sa-t5 ex288-v3-sa-t6 ex288-v3-sa-t7 ex288-v3-sa-t8
  ex288-v3-sb-t1 ex288-v3-sb-t2 ex288-v3-sb-t3 ex288-v3-sb-t4
  ex288-v3-sb-t4-shared ex288-v3-sb-t5 ex288-v3-sb-t6
  ex288-v3-sb-t7 ex288-v3-sb-t8
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
