#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/lib.sh"
require_login
ONLY="${1:-1 2 3 4 5}"
for n in $ONLY; do case "$n" in 1|2|3|4|5) ;; *) die "questao invalida: $n";; esac; done
want() { case " $ONLY " in *" $1 "*) return 0;; *) return 1;; esac; }
if want 1 || want 2 || want 3; then
  exists "$INFRA_NS" route gitea || die "rode infra-up.sh"
fi
if want 2 || want 3 || want 4; then
  exists "$INFRA_NS" route nexus || die "rode infra-up.sh"
fi
if want 5; then has_tekton || die "R5 requer OpenShift Pipelines"; fi
names=(jasper maple obsidian saffron raven)
for n in $ONLY; do new_project "${names[n-1]}"; done
for n in 1 2; do
  if want "$n"; then
    ns="${names[n-1]}"
    oc create secret generic git-creds -n "$ns" --type=kubernetes.io/basic-auth --from-literal=username="$(git_user)" --from-literal=password="$(git_pass)" --dry-run=client -o yaml | oc apply -n "$ns" -f -
  fi
done
if want 4; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  helm package "$LAB_ROOT/11-reforco-final/customer" -d "$tmp"
  code="$(curl_route "$(nexus_url)/repository/helm-hosted/customer-0.1.0.tgz" -u "admin:$(nexus_pass)" --upload-file "$tmp/customer-0.1.0.tgz" -o /dev/null -w '%{http_code}')"
  case "$code" in 2*) ;; *) die "upload Helm HTTP $code";; esac
fi
if want 5; then
  oc apply -n raven -f "$LAB_ROOT/11-reforco-final/pipeline.yaml"
fi
echo "Reforco: questoes preparadas: $ONLY"
