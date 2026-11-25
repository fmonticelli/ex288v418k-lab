#!/usr/bin/env bash
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../scripts/lib.sh"
require_login
eq() { [ "$1" = "$2" ]; }
contains() { [[ "$1" == *"$2"* ]]; }
n=ex288-v3-r1
test_task "R1 estratégia Source" eq "$(val "$n" bc reforco-s2i '{.spec.strategy.type}')" Source
test_task "R1 branch dev" route_has "$n" reforco-s2i '"branch":"dev"'
test_task "R1 mensagem" route_has "$n" reforco-s2i '"message":"reforco-dev"'
n=ex288-v3-r2
test_task "R2 estratégia Docker" eq "$(val "$n" bc reforco-docker '{.spec.strategy.type}')" Docker
test_task "R2 argumento Nexus" eq "$(val "$n" bc reforco-docker '{.spec.strategy.dockerStrategy.buildArgs[?(@.name=="NPM_REGISTRY")].value}')" "$(nexus_url)/repository/npm-public/"
test_task "R2 tag de saída" eq "$(val "$n" bc reforco-docker '{.spec.output.to.name}')" reforco-docker:1.0
test_task "R2 build completo" build_complete "$n" reforco-docker
test_task "R2 resposta" route_has "$n" reforco-docker '"app":"webapp-docker"'
n=ex288-v3-r3
test_task "R3 fonte Binary" eq "$(val "$n" bc reforco-bin '{.spec.source.type}')" Binary
test_task "R3 build completo" build_complete "$n" reforco-bin
test_task "R3 artefato" route_has "$n" reforco-bin 'site 1.0'
test_task "R3 conteúdo Git (HTTP 200)" eq "$(http_code "http://$(route_host "$n" reforco-bin)/git/index.html")" 200
n=ex288-v3-r4
for stage in dev prod; do
  app="customer-$stage"
  test_task "R4 $stage deployment label" eq "$(val "$n" deployment "$app" '{.metadata.labels.stage}')" "$stage"
  test_task "R4 $stage pod label" eq "$(val "$n" deployment "$app" '{.spec.template.metadata.labels.stage}')" "$stage"
  test_task "R4 $stage resposta" route_has "$n" "$app" "$stage-ok"
  test_task "R4 $stage release" helm status "$app" -n "$n"
done
n=ex288-v3-r5
run="$(oc get pipelineruns -n "$n" -l tekton.dev/pipeline=reforco-ci --sort-by=.metadata.creationTimestamp -o name 2>/dev/null | tail -1)"
test_task "R5 último run succeeded" eq "$(oc get -n "$n" "$run" -o 'jsonpath={.status.conditions[?(@.type=="Succeeded")].status}' 2>/dev/null)" True
complete_validation reforco
