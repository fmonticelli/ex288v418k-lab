# Simulado EX288 — foco no relato pessoal (OCP 4.18)

Este material **complementa**, sem substituir, as oito tasks e scripts já existentes no fork. Os enunciados são exercícios originais inspirados nos assuntos lembrados da prova e em materiais públicos de Anishrana e Sandoval; **não são questões oficiais nem reprodução garantida da prova**.

## Regra de segurança e compatibilidade

- Runtime-alvo: CRC / OpenShift **4.18.2**.
- Builder Node.js: **`openshift/nodejs:20-ubi9`** (não 22).
- Infra: Gitea e Nexus **já existentes** no projeto `ex288-v3-infra`.
- **Não rode `scripts/infra-up.sh` apenas para iniciar o simulado**: ele faz force-push nos cinco repositórios de treinamento e pode sobrescrever alterações suas no Gitea.
- Use `bash scripts/checar-infra.sh` para verificar a infra; `bash scripts/credenciais.sh --show` para consultar credenciais locais.
- Todos os scripts adicionais usam prefixo `ex288-v3-`; nenhum remove o projeto de infraestrutura.
- Soluções das tasks originais continuam nas pastas existentes; este diretório não entrega soluções.

## Ordem do treino

| Ordem | Tema | Preparar | Validar |
|---|---|---|---|
| 0 (aquecimento opcional) | Deploy de imagem existente | `bash scripts/preparar-00-imagem.sh` | `bash scripts/validar-00-imagem.sh` |
| 1 | Git privado, branch e Route | `bash scripts/preparar-01.sh` | `bash scripts/validar-01.sh` |
| 2 | Dockerfile / Docker strategy | `bash scripts/preparar-02.sh` | `bash scripts/validar-02.sh` |
| 3 | S2I / Nexus `npm_config_registry` | `bash scripts/preparar-03.sh` | `bash scripts/validar-03.sh` |
| 4 | ConfigMap novo / Secret existente | `bash scripts/preparar-04.sh` | `bash scripts/validar-04.sh` |
| 5 | Startup / liveness / readiness | `bash scripts/preparar-05.sh` | `bash scripts/validar-05.sh` |
| 6 | Templates | `bash scripts/preparar-06.sh` | `bash scripts/validar-06.sh` |
| 7 | Helm | `bash scripts/preparar-07.sh` | `bash scripts/validar-07.sh` |
| 8 | CI/CD / Tekton | `bash scripts/preparar-08.sh` | `bash scripts/validar-08.sh` |

Enunciados detalhados: `00-imagem.md` e `01-08-roteiro.md`. Para os critérios completos, consulte `0N-*/exercicios.md` na raiz.

## Execução sugerida

```bash
export ROUTE_IP="$(crc ip)"
bash scripts/checar-infra.sh
bash scripts/preparar-00-imagem.sh
# resolva 11-simulado-418/00-imagem.md
bash scripts/validar-00-imagem.sh
bash scripts/limpar-00-imagem.sh

bash scripts/preparar-03.sh
# resolva 03-deploy-s2i/exercicios.md, em especial E2 (Nexus)
bash scripts/validar-03.sh
```

**Não execute scripts de limpeza sem conferir o namespace alvo.** Para as tasks T1–T8, utilize os scripts `limpar-0N.sh` já existentes.

## Evidências para o dia da prova

Após cada bloco, confira recursos e eventos: `oc get all -n PROJETO`, `oc get bc,is,build -n PROJETO`, `oc describe pod -n PROJETO`, `oc logs -n PROJETO bc/NOME`, `oc get route -n PROJETO`. Para CI/CD, confira `oc get pipeline,pipelinerun,taskrun -n PROJETO` se a API Tekton estiver instalada.

## Referências públicas consultadas

- Anishrana DO288/V.4.18: https://github.com/anishrana2001/Openshift/tree/main/DO288/V.4.18
- Anishrana Task 1 S2I com Git autenticado e `npm_config_registry`: https://github.com/anishrana2001/Openshift/blob/main/DO288/V.4.18/01%3A03-task1-s2I-deployment.md
- Sandoval EX288: https://github.com/OPerezSandoval/ex288-cert
- Pedro (infraestrutura base): https://github.com/phximenes/ex288-simulado-v3

**Estado:** arquivos e scripts revisados estaticamente; execução no CRC **pendente**. Não confundir com os testes históricos do laboratório original.
