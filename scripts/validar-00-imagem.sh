#!/usr/bin/env bash
# Valida deploy direto de imagem, sem build.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
NS="${1:-agate}"
assert_v3_ns "$NS"
require_login
IMAGE='registry.access.redhat.com/ubi9/httpd-24:latest'
v_image() {
  local img
  img="$(val "$NS" deployment image-app '{.spec.template.spec.containers[0].image}')"
  # oc new-app pode resolver :latest para @sha256:<digest> no Deployment.
  # Aceita ambas as referencias do mesmo repositorio, mas nao outra imagem.
  case "$img" in
    "$IMAGE") ;;
    registry.access.redhat.com/ubi9/httpd-24@sha256:*)
      local digest="${img##*@sha256:}"
      [[ "$digest" =~ ^[[:xdigit:]]{64}$ ]] || return 1
      ;;
    *) return 1 ;;
  esac
  ! exists "$NS" bc image-app
}
v_replicas() {
  [ "$(val "$NS" deployment image-app '{.spec.replicas}')" = 2 ] &&
  [ "$(val "$NS" deployment image-app '{.status.readyReplicas}')" = 2 ]
}
v_service() {
  exists "$NS" service image-app &&
  [ "$(val "$NS" service image-app '{.spec.ports[0].targetPort}')" = 8080 ] &&
  [ "$(val "$NS" service image-app '{.spec.ports[0].port}')" = 8080 ]
}
v_route() {
  [ "$(val "$NS" route image-app '{.spec.to.name}')" = image-app ] &&
  [ -n "$(route_host "$NS" image-app)" ] &&
  [ "$(http_code "http://$(route_host "$NS" image-app)/")" = 200 ]
}
test_task 'T0 imagem pronta sem BuildConfig' v_image
test_task 'T0 duas replicas prontas' v_replicas
test_task 'T0 Service porta 8080' v_service
test_task 'T0 Route HTTP 200' v_route
complete_validation 'T0 imagem'
