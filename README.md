# EX288 — Laboratório prático para OpenShift 4.18

Laboratório prático de preparação para a certificação Red Hat EX288, com foco no OpenShift 4.18. Inclui infraestrutura de apoio com Git privado e Nexus, exercícios de build e deploy, configuração de aplicações, probes, Templates, Helm e pipelines, além de simulados com validação automatizada. Pode ser utilizado com OpenShift Local (CRC) a partir de uma workstation Linux.

> [!IMPORTANT]
> **Estado real (2026-11-01):** com o CRC **ampliado** (6 CPUs / 16 GiB / 64 GiB) T1–T8 (incluindo o **E5 da T2**, com `podman` no seu WSL) e os simulados A e B foram **executados e validados de verdade** no cluster (Gitea privado, Nexus, builds, Helm, Pipelines Operator 1.24.3). O seu WSL está pronto (`checar-ambiente.sh`: 32 PASS / 0 WARN / 0 FAIL). **Não validado:** uma execução única e cronometrada dos simulados com as 8 tasks juntas (a pontuação 100/100 do corretor veio de rodadas separadas). Com o CRC padrão (32 GB de disco) o nó entra em `DiskPressure` e o lab completo não roda ([passo 13](00-guia/preparar-wsl-rhel.md#13-capacidade-do-crc-feito-por-você-em-2026-10-31-verificado)). Detalhes em [_meta/RELATORIO-FINAL.md](_meta/RELATORIO-FINAL.md).

## Trilha

1. [Pré-requisitos da workstation e do CRC](00-guia/preparar-wsl-rhel.md) → `bash scripts/checar-ambiente.sh` · [Cookbook da infraestrutura: CRC zerado → Pipelines, GitOps, Gitea e Nexus](00-guia/cookbook-infra.md) → `bash scripts/checar-infra.sh`
2. [Mapa das 8 tasks](00-guia/mapa-8-tasks.md) · [Git interno e Nexus](00-nexus-e-git-interno/README.md)
3. Tasks, na ordem: [T1 Git](01-deploy-from-git/README.md) · [T2 Dockerfile](02-deploy-from-dockerfile/README.md) · [T3 S2I](03-deploy-s2i/README.md) · [T4 ConfigMap+Secret](04-env-configmap-secret/README.md) · [T5 probes](05-probes/README.md) · [T6 templates](06-templates/README.md) · [T7 Helm](07-helm/README.md) · [T8 CI/CD](08-cicd-pipelines/README.md)
4. [Simulado A e B](09-simulado/README.md) (2 h, 8 tasks, correção automática)
5. [Estratégia de prova](00-guia/estrategia-de-prova.md) · [Dia da prova](00-guia/dia-da-prova.md) (do PDF oficial V13) · [Cheatsheet](00-guia/cheatsheet.md)
6. [Anexo: objetivos fora das 8 tasks](10-outros-objetivos/README.md)
7. Material de referência e histórico: [fontes](90-fontes/) · [documentação complementar](00-guia/)

## Como usar cada task

Cada pasta tem `README.md` (o que a task pede, caminho mais rápido, variações, armadilhas, onde achar na doc), `exercicios.md` (resultado esperado, sem passo a passo) e `solucao.md`. Scripts em [scripts/](scripts/): `preparar-0N.sh`, `validar-0N.sh` (PASS/FAIL por exercício; sai ≠ 0 se algo falhar) e `limpar-0N.sh`.

```bash
bash scripts/infra-up.sh         # uma vez, COMO developer (Git privado + Nexus; aceitar o EULA do Nexus: NEXUS_ACCEPT_EULA=yes, passo 14)
bash scripts/preparar-04.sh      # cria o(s) projeto(s) elm*  (T1-T3, T8 exigem a infra)
# ... resolva os exercicios de 04-env-configmap-secret/exercicios.md ...
bash scripts/validar-04.sh
bash scripts/limpar-04.sh
bash scripts/limpar-tudo-v3.sh   # lista, pede confirmacao e remove todos os projetos do lab (a infra so com --infra)
```

Use `bash scripts/x.sh` (o bit de execução pode não persistir em `/mnt/d`). Todos os projetos têm o prefixo `ex288-v3-` (os scripts recusam outros nomes). Variáveis úteis: `OC=/caminho/oc`, `OC_AS=developer` (impersonação, só para testes com kubeconfig admin), `ROUTE_IP` (padrão `127.0.0.1`, para `curl --resolve`).

## Convenções

- Texto em pt-BR; comandos e YAML em inglês. Os exercícios são autorais e voltados à prática em OpenShift.
- Status de validação por task: `VALIDADO NO CLUSTER` · `VALIDADO SÓ SINTAXE` · `NÃO VALIDADO`.
- Nenhuma senha, token ou kubeconfig no material: as credenciais do Git/Nexus são geradas no cluster e lidas com `scripts/credenciais.sh --show`.
- Conteúdo educacional baseado em tecnologias e objetivos públicos do EX288 4.18. Não é material oficial da Red Hat nem contém questões oficiais de exame.
