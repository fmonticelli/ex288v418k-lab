[← README](README.md) | [índice](../README.md) | [solução →](solucao.md)

# T3 — Exercícios

Preparação: `bash scripts/preparar-03.sh` (cria `dune`, o Secret `git-creds` e a aplicação defeituosa `s2i-broken`) · Validar: `bash scripts/validar-03.sh`.
Repositório: `webapp-s2i` (tem `.s2i/environment` e um `.s2i/bin/assemble` customizado).

**E1 — S2I a partir do Git interno.**
Faça o deploy de `webapp-s2i` como **`s2i1`** com o builder Node.js 20 (UBI 9) do namespace `openshift` e o Secret `git-creds`. A Route `s2i1` deve devolver `"message":"from-s2i-environment"` e o caminho `/build-info` deve mostrar `built-at=`.

**Teste com curl (E1):**
```bash
HOST=$(oc get route s2i1 -n dune -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** `"message":"from-s2i-environment"`.

**E2 — Dependências pelo mirror do Nexus.**
Crie **`s2i-nexus`** da mesma forma, mas faça o `npm install` do build usar o repositório **`npm-public`** do Nexus (variável de **build**, não de runtime). O `/build-info` deve exibir o endereço do Nexus em `registry=`.

**Teste com curl (E2):**
```bash
HOST=$(oc get route s2i-nexus -n dune -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/build-info"
```
**Retorno esperado:** `registry=` com a URL do Nexus.

**E3 — Diagnosticar e corrigir um build quebrado.**
A aplicação **`s2i-broken`** foi criada pelo script de preparação e o build está falhando. Descubra a causa pelo log do build, corrija o BuildConfig (sem recriar a aplicação), rode um novo build `Complete` e exponha a aplicação com a Route `s2i-broken`, que deve responder.

**Teste com curl (E3):**
```bash
HOST=$(oc get route s2i-broken -n dune -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** HTTP 200.

**E4 — Customizar o `assemble` no repositório.**
No repositório `webapp-s2i`, altere `.s2i/bin/assemble` para que, após o `assemble` original, também grave a linha `custom=yes` em `build-info.txt`. Faça commit e push em `main` e rebuild de `s2i1`. O `/build-info` de `s2i1` deve conter `custom=yes` (e o bit de execução do script deve ser preservado).

**Teste com curl (E4):**
```bash
HOST=$(oc get route s2i1 -n dune -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/build-info"
```
**Retorno esperado:** `custom=yes` em `/build-info`.
