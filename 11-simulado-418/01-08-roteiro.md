# Roteiro de oito blocos — EX288 4.18

Os enunciados completos e critérios automáticos já existem nas pastas T1–T8. Este roteiro define a **ordem e a prioridade** para repetir o que você lembra da prova, sem alterar a infraestrutura do Pedro.

## Bloco 1 — Git privado

`01-deploy-from-git/exercicios.md`. Prioridade: E1 (Git privado, Secret, BuildConfig, Route), depois E2 (branch e env). Valide com `scripts/validar-01.sh`. **Não confundir com deploy direto de imagem** (T0 opcional).

## Bloco 2 — Dockerfile

`02-deploy-from-dockerfile/exercicios.md`. Prioridade: E1 (estratégia Docker), E2 (build ARG e Nexus), E3 (Dockerfile incompatível com UID arbitrário). E4/E5 são variações avançadas.

## Bloco 3 — S2I + Nexus

`03-deploy-s2i/exercicios.md`. Prioridade máxima: E2, que exige a variável de **build** `npm_config_registry` apontando para `http://$(oc get route nexus -n ex288-v3-infra -o jsonpath='{.spec.host}')/repository/npm-public/`. Não basta definir variável no Deployment. Faça E3 para treinar troubleshooting de BuildConfig. E1/E4 complementam.

## Bloco 4 — ConfigMap novo + Secret preexistente

`04-env-configmap-secret/exercicios.md`. Prioridade: E1/E2. Crie ConfigMap, injete variáveis no Deployment, mapeie chaves `username/password` do Secret já existente para `DB_USER/DB_PASSWORD` via `valueFrom.secretKeyRef`. Não copie senhas para YAML. E3/E4 são variações.

## Bloco 5 — Três probes

`05-probes/exercicios.md`. Prioridade: E1 (startup + liveness + readiness), E3 (probe defeituosa), E4 (startup protege liveness). Observe eventos e reinícios. Atenção ao cálculo `failureThreshold * periodSeconds`.

## Bloco 6 — Templates

`06-templates/exercicios.md`. Prioridade: E1/E2 (processar Template com parâmetros, instanciar recursos, conferir Route). E3/E4 como aprofundamento.

## Bloco 7 — Helm

`07-helm/exercicios.md`. Prioridade: E1/E2 (install, values, upgrade, rollback), E3 (chart empacotado). E4 integra Nexus.

## Bloco 8 — CI/CD

`08-cicd-pipelines/exercicios.md`. Prioridade: E1 (PipelineRun), E2 (clone/build/deploy), E3 (corrigir pipeline quebrado). Requer Pipelines Operator no CRC; `preparar-08.sh` verifica a API.

## Verificação final

Para cada bloco, rode `bash scripts/validar-0N.sh` e registre o resultado. **Os validadores originais cobrem exercícios extras**: não considere o bloco básico incompleto só porque um exercício avançado não foi feito, mas faça todos para buscar 100% no simulado.

Fontes: Anishrana DO288/V.4.18, Sandoval ex288-cert e seu relato pessoal. As tarefas do Anishrana são **referência de assunto**, não scripts para executar diretamente: contêm caminhos de classroom e alguns erros de sintaxe.
