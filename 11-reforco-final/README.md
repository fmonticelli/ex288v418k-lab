# Reforço final EX288 — 1h55

Cenários originais de treinamento. Prepare pelo portal ou com `bash 11-reforco-final/preparar.sh`. Credenciais: `bash scripts/credenciais.sh --show`.

## R1 — Deploy S2I (15 min)

Utilize o namespace **`jasper`** para esta atividade.

Use o repositório privado **`ex288/webapp.git`**.

1. Publique a branch **`dev`** com o builder `openshift/nodejs:20-ubi9`, estratégia Source e Secret `git-creds`.
2. Nomeie a aplicação e a Route **`reforco-s2i`**.
3. Configure em runtime **`APP_MESSAGE=reforco-dev`**.

**Retorno esperado:** a Route deve retornar `"branch":"dev"` e `"message":"reforco-dev"`.

## R2 — Dockerfile e Nexus (25 min)

Utilize o namespace **`maple`** para esta atividade.

Use a branch `main` de **`ex288/webapp-docker.git`** e o Secret `git-creds`.

1. Crie o BuildConfig **`reforco-docker`**, estratégia Docker, com saída `reforco-docker:1.0`.
2. Configure o argumento de build para utilizar o grupo **`npm-public`** do Nexus. Descubra o argumento no Dockerfile; ele deve persistir no BuildConfig. Não altere o Git.
3. Publique Deployment, Service e Route **`reforco-docker`** a partir da imagem construída.

**Retorno esperado:** build `Complete` e resposta `"app":"webapp-docker"`.

## R3 — Binary Build (30 min)

Utilize o namespace **`obsidian`** para esta atividade.

1. Clone a branch `main` de **`ex288/httpd-ex.git`**.
2. Baixe o artefato **`ex288/site-1.0.tar.gz`** do Nexus `raw-hosted` autenticado.
3. Use o Dockerfile fornecido em `11-reforco-final/binary/Dockerfile` junto do clone e do artefato. Não publique o binário no Git.
4. Crie um build binário Docker **`reforco-bin`** e publique Deployment, Service e Route com esse nome.

**Retorno esperado:** a raiz da Route contém `site 1.0`; `/git/index.html` serve a página do Git.

## R4 — Helm (20 min)

Utilize o namespace **`saffron`** para esta atividade.

O Nexus fornece o chart **`customer`**, versão `0.1.0`, no repositório autenticado `helm-hosted`.

1. Crie o arquivo **`values-dev.yaml`** e instale a release `customer-dev` com label `stage=dev` e mensagem `dev-ok`.
2. Crie o arquivo **`values-prod.yaml`** e instale a release `customer-prod` com label `stage=prod` e mensagem `prod-ok`.
3. Mantenha ambas no mesmo namespace. Os labels devem existir no Deployment e nos pods, sem editar o chart ou aplicar labels manualmente.

**Retorno esperado:** as duas Routes respondem as respectivas mensagens.

## R5 — Tekton (25 min)

Utilize o namespace **`raven`** para esta atividade.

A Pipeline **`reforco-ci`** e o PVC `shared-pvc` já existem.

1. Execute a Pipeline com parâmetro **`MESSAGE=retake-ok`** e workspace `shared` associado ao PVC.
2. Investigue a falha de execução e corrija a Pipeline, preservando os nomes das tasks e o encadeamento.
3. Execute novamente com os mesmos parâmetros e workspace.

**Retorno esperado:** último PipelineRun com `Succeeded=True`; logs da task `verify` mostram `retake-ok`.

## Validação

Execute `bash 11-reforco-final/validar.sh` ou valide pelo portal. Confira os arquivos values e logs Tekton manualmente. Limpeza: `bash 11-reforco-final/limpar.sh`.
