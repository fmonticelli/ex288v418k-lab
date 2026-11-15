#!/usr/bin/env bash
# Limpeza interativa dos namespaces do laboratorio EX288 v3.
# Preserva a infraestrutura por padrao; --infra inclui Gitea/Nexus.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login

WITH_INFRA=0
case "${1:-}" in
  "") ;;
  --infra) WITH_INFRA=1 ;;
  *) die "uso: bash scripts/limpar-tudo-v3.sh [--infra]" ;;
esac

# Descobre por label, alem dos namespaces legados conhecidos sem label.
mapfile -t CANDIDATES < <(
  { oc get projects -l ex288-lab=v3 -o name 2>/dev/null || true
    oc get projects -o name 2>/dev/null || true
  } | sed 's#.*/##' | sort -u
)
LIST=()
UNLABELED=()
for ns in "${CANDIDATES[@]}"; do
  case "$ns" in
    ex288-v3-t[0-8]|ex288-v3-sa-t[1-8]|ex288-v3-sb-t[1-8]|ex288-v3-sb-t4-shared|ex288-v3-infra|crimson|quartz|ember|harbor|cobalt|willow|falcon|tundra|onyx|cedar|glacier|copper|copper-shared|violet|lantern|summit|orchard) ;;
    *) continue ;;
  esac
  if [[ "$ns" == "$INFRA_NS" && "$WITH_INFRA" -eq 0 ]]; then continue; fi
  label="$(oc get namespace "$ns" -o jsonpath='{.metadata.labels.ex288-lab}' 2>/dev/null || true)"
  if [[ "$label" == v3 ]]; then
    LIST+=("$ns")
  elif [[ "$ns" == ex288-v3-t[0-8] || "$ns" == ex288-v3-sa-t[1-8] || "$ns" == ex288-v3-sb-t[1-8] || "$ns" == ex288-v3-sb-t4-shared || "$ns" == "$INFRA_NS" ]]; then
    LIST+=("$ns")
    UNLABELED+=("$ns")
  else
    echo "Ignorando namespace sem label do laboratorio: $ns" >&2
  fi
done

if (( ${#LIST[@]} == 0 )); then echo "Nada para remover."; exit 0; fi
echo "Projetos que serao removidos:"
printf '  - %s\n' "${LIST[@]}"
if (( WITH_INFRA == 0 )); then echo "(infra $INFRA_NS preservada; use --infra para inclui-la)"; fi
if (( ${#UNLABELED[@]} > 0 )); then
  echo
  echo "ATENCAO: estes namespaces legados NAO possuem ex288-lab=v3:"
  printf '  - %s\n' "${UNLABELED[@]}"
  echo "Confirme que pertencem ao laboratorio antes de exclui-los."
  printf 'Para incluir esses projetos SEM LABEL, digite: remover legados > '
  read -r confirm_legacy
  [[ "$confirm_legacy" == "remover legados" ]] || { echo "Cancelado."; exit 1; }
fi
printf 'Confirmar exclusao de TODOS os projetos listados? [digite sim] '
read -r ans
[[ "$ans" == sim ]] || { echo "Cancelado."; exit 1; }

# Todos os nomes sao explicitamente permitidos; nao altera labels apenas para excluir.
for ns in "${LIST[@]}"; do
  echo "removendo projeto $ns"
  oc delete project "$ns" --wait=false
done
