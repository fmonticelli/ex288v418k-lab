#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/lib.sh"
require_login
exists "$INFRA_NS" route gitea || die "rode infra-up.sh"
exists "$INFRA_NS" route nexus || die "rode infra-up.sh"
for ns in jasper maple obsidian saffron raven; do new_project "$ns"; done
for ns in jasper maple; do
  oc create secret generic git-creds -n "$ns" --type=kubernetes.io/basic-auth --from-literal=username="$(git_user)" --from-literal=password="$(git_pass)" --dry-run=client -o yaml | oc apply -n "$ns" -f -
done
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
helm package "$LAB_ROOT/11-reforco-final/customer" -d "$tmp"
code="$(curl_route "$(nexus_url)/repository/helm-hosted/customer-0.1.0.tgz" -u "admin:$(nexus_pass)" --upload-file "$tmp/customer-0.1.0.tgz" -o /dev/null -w '%{http_code}')"
case "$code" in 2*) ;; *) die "upload Helm HTTP $code";; esac
if has_tekton; then
  oc apply -n raven -f "$LAB_ROOT/11-reforco-final/pipeline.yaml"
else
  echo "AVISO: R5 requer OpenShift Pipelines; repita a preparação após instalar."
fi
echo "Git: $(git_url webapp)"
echo "Nexus: $(nexus_url)"
echo "Leia 11-reforco-final/README.md"
