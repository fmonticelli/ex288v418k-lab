#!/usr/bin/env bash
# Altera as senhas do Gitea e Nexus sem recriar a infra nem sobrescrever repositorios.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_login
N="$INFRA_NS"
NEW_PASSWORD="${EX288_LAB_PASSWORD:-ex288}"
[ -n "$NEW_PASSWORD" ] || die "senha vazia"
exists "$N" secret gitea-admin || die "Secret gitea-admin nao encontrado"
exists "$N" secret nexus-admin || die "Secret nexus-admin nao encontrado"

GU="$(git_user)"
[ "$GU" = ex288 ] || die "usuario Gitea inesperado: $GU"
echo "== Atualizando senha do Gitea"
oc exec -n "$N" deploy/gitea -- gitea admin user change-password \
  --username "$GU" --password "$NEW_PASSWORD" >/dev/null \
  || die "nao foi possivel trocar a senha no Gitea"
oc create secret generic gitea-admin -n "$N" \
  --from-literal=username="$GU" --from-literal=password="$NEW_PASSWORD" \
  --dry-run=client -o yaml | oc apply -n "$N" -f - >/dev/null

echo "== Atualizando senha do Nexus"
OLD_NEXUS_PASSWORD="$(nexus_pass)"
if [ "$OLD_NEXUS_PASSWORD" != "$NEW_PASSWORD" ]; then
  CODE="$(curl_route "$(nexus_url)/service/rest/v1/security/users/admin/change-password" \
    -u "admin:$OLD_NEXUS_PASSWORD" -X PUT -H "Content-Type: text/plain" \
    --data-binary "$NEW_PASSWORD" -o /dev/null -w '%{http_code}')"
  [ "$CODE" = 204 ] || die "Nexus nao aceitou troca de senha (HTTP $CODE)"
fi
oc create secret generic nexus-admin -n "$N" \
  --from-literal=username=admin --from-literal=password="$NEW_PASSWORD" \
  --dry-run=client -o yaml | oc apply -n "$N" -f - >/dev/null

echo "== Sincronizando Secrets git-creds dos projetos existentes"
for i in {0..8}; do
  ns="ex288-v3-t$i"
  if exists "$ns" secret git-creds; then
    oc create secret generic git-creds -n "$ns" --type=kubernetes.io/basic-auth \
      --from-literal=username="$GU" --from-literal=password="$NEW_PASSWORD" \
      --dry-run=client -o yaml | oc apply -n "$ns" -f - >/dev/null
    echo "   $ns/git-creds atualizado"
  fi
done
echo "Pronto. Gitea: ex288 / senha configurada; Nexus: admin / mesma senha."
echo "Nao foi feito push nem reset nos repositorios."
