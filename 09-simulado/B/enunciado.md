[← simulado](../README.md) | [solução B →](solucao.md)

# Simulado B — enunciado (2 horas, 8 tasks independentes)

Prepare com `bash scripts/simulado-preparar.sh B`. Cada task tem seu **projeto próprio** (`onyx`, `cedar`, `glacier`, `copper`, `violet`, `lantern`, `summit`, `orchard`; a T4 usa também `copper-shared`). Git interno: URL e usuário via `bash scripts/credenciais.sh`; o Secret `git-creds` existe nos projetos T1, T2, T3 e T8. Todos os nomes são exatos.

## Task 1 — Deploy a partir do Git, repositório com dois componentes (`onyx`)
O repositório **`monorepo`** tem os diretórios `api/` (Node.js) e `site/` (estático).
1. Faça o deploy de `api` como **`gateway`** (S2I Node.js 22, Secret `git-creds`).
2. Faça o deploy de `site` como **`static`** com o builder **httpd**.
3. `gateway` recebe **`APP_MESSAGE=sim-b`** (runtime) e o rótulo **`tier=edge`** nos recursos criados e é exposto pela Route `gateway`; crie também a Route **`static-tls`** (edge, redirecionando HTTP para HTTPS) para `static`.

**Teste HTTP da task:**
```bash
HOST=$(oc get route gateway -n onyx -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** `"message":"sim-b"` e conteúdo da API do monorepo.

## Task 2 — Dockerfile (`cedar`)
1. A aplicação **`legacy`** usa o arquivo **`Dockerfile.root`** de `webapp-docker`. Crie o BuildConfig, deixe o pod `Running` (corrija o Dockerfile no repositório se necessário) e exponha com a Route `legacy`.
2. No BuildConfig `legacy`, passe o `ARG` **`NPM_REGISTRY`** apontando para o repositório **`npm-public`** do Nexus.
3. Baixe do Nexus (`raw-hosted`, `ex288/site-1.0.tar.gz`) o site estático e faça um **build binário** chamado **`ledger`** (Dockerfile com `ubi9/httpd-24`); Route `ledger` mostrando `site 1.0`.

**Teste HTTP da task:**
```bash
HOST=$(oc get route legacy -n cedar -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** `"app":"webapp-docker"` (teste também `ledger`, esperado `site 1.0`).

## Task 3 — S2I (`glacier`)
A aplicação **`reports`** (monorepo, diretório `api`) foi criada e o build está falhando.
1. Descubra a causa e corrija a **variável de build** para usar o **Nexus** (`npm-public`).
2. O novo build deve terminar `Complete` e o pod ficar `Ready`.
3. Defina **`APP_MESSAGE=reports-b`** em runtime e exponha a Route `reports` (a resposta contém `monorepo-api` e `reports-b`).

**Teste HTTP da task:**
```bash
HOST=$(oc get route reports -n glacier -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** `monorepo-api` e `reports-b`.

## Task 4 — ConfigMap, Secret existente e Secret de outro projeto (`copper`)
`cfgapp` já está implantada. O Secret **`shop-db`** (chaves `u` e `p`) já existe. No projeto `copper-shared` existe o Secret **`shop-token`** (chave `value`).
1. ConfigMap **`shop-cfg`** com `GREETING=SimB` e `LANG_CODE=en-US`, injetado por completo em `cfgapp`.
2. **`DB_USER`** (chave `u`) e **`DB_PASSWORD`** (chave `p`) vindos de `shop-db`, sem valores literais.
3. Recrie `shop-token` neste projeto (mesma chave e mesmo valor) e disponibilize **`API_TOKEN`** a `cfgapp` por `secretKeyRef`.

**Teste HTTP da task:**
```bash
HOST=$(oc get route cfgapp -n copper -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** `"greeting":"SimB"` e `"lang":"en-US"`.

## Task 5 — Probes (`violet`)
`slowapp` e `slowbad` demoram ~20 s para subir (`/healthz` e `/ready`, porta 8080).
1. `slowapp`: **startup** e **readiness** por **TCP** 8080 (startup tolerando ≥ 30 s).
2. `slowapp`: **liveness por comando** (qualquer comando que retorne 0); pod `Ready`, sem reinícios.
3. `slowbad` reinicia continuamente por causa da liveness: **mantenha a liveness** e acrescente o que falta (tolerância de partida ≥ 40 s); `Ready`, sem reinícios.

**Teste HTTP da task:**
```bash
HOST=$(oc get route slowapp -n violet -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** HTTP 200 em `/healthz` após a inicialização.

## Task 6 — Templates (`lantern`)
1. Crie o template **`stack`** com Secret, Deployment, Service e Route; parâmetros **`NAME`** (obrigatório), **`MESSAGE`** (valor padrão) e **`TOKEN`** (gerado, 12 caracteres alfanuméricos), com o token na chave **`token`** do Secret `${NAME}-token`. A aplicação responde `${MESSAGE}` (imagem `registry.access.redhat.com/ubi9/nodejs-20-minimal:latest`).
2. Instancie **`stack-a`** e **`stack-b`** (com `MESSAGE` diferente).
3. Os tokens têm 12 caracteres e as Routes respondem.

**Teste HTTP da task:**
```bash
HOST=$(oc get route stack-a -n lantern -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** valor de `MESSAGE` escolhido na instanciação (teste também `stack-b`).

## Task 7 — Helm (`summit`)
Chart local: `apps/helm/ex288-hello`.
1. Gere o pacote `.tgz` e instale-o como release **`inventory`**.
2. Com um arquivo de valores: `replicaCount: 2` e `message: prod-b`.
3. Faça um **upgrade** (qualquer mudança) e um **rollback** para a revisão 1: a release termina com **3 revisões**.

**Teste HTTP da task:**
```bash
HOST=$(oc get route inventory-hello -n summit -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** mensagem da revisão 1 após rollback.

## Task 8 — CI/CD (`orchard`) — 16 pontos
1. (6) O arquivo **`apps/pipeline/pipeline-broken.yaml`** define o Pipeline **`broken-ci`**, que tem defeitos: corrija-o, aplique-o neste projeto e obtenha um PipelineRun `Succeeded` (o pipeline **não** vem aplicado no projeto).
2. (6) Pipeline **`sim-ci`** com 2 tasks encadeadas (taskSpec embutido); PipelineRun `Succeeded`.
3. (4) BuildConfig **`native`** (S2I Node.js, repositório `webapp`, source secret) com triggers **Generic** e **ImageChange** e **post-commit hook** `npm test`.

**Verificação esperada:** PipelineRuns `Succeeded` e BuildConfig `native` configurado; nenhuma Route é exigida nesta task.

Ao terminar: `bash scripts/simulado-corrigir.sh B`.
