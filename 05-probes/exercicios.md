[← README](README.md) | [índice](../README.md) | [solução →](solucao.md)

# T5 — Exercícios

Preparação: `bash scripts/preparar-05.sh` cria `frost` com quatro Deployments sem probes (ou com probes defeituosas), todos com uma app que **demora para subir**: `probeapp` (25 s), `probeapp2` (10 s), `probe-broken` (10 s, com liveness errada) e `probeapp3` (40 s, com liveness agressiva). A app expõe `/healthz` (sempre 200 depois de subir) e `/ready` (200 só 5 s depois). Validar: `bash scripts/validar-05.sh`.

**E1 — As três probes em HTTP.**
No Deployment **`probeapp`** configure: **startup** HTTP `/healthz` porta 8080, tolerando pelo menos 60 s de inicialização; **liveness** HTTP `/healthz` com período de 10 s, timeout de 2 s e 3 falhas; **readiness** HTTP `/ready` com período de 5 s. O pod deve ficar `1/1 Ready` com **0 reinícios**.

**Teste com curl (E1):**
```bash
HOST=$(oc get route probeapp -n frost -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** HTTP 200 em `/healthz` e `/ready` depois da inicialização.

**E2 — TCP e comando.**
No Deployment **`probeapp2`**: **startup** e **readiness** por TCP na porta 8080; **liveness** por **comando** (qualquer comando que retorne 0, por exemplo `cat /proc/1/cmdline`). O pod deve ficar `Ready`.

**Teste com curl (E2):**
```bash
HOST=$(oc get route probeapp2 -n frost -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** HTTP 200 em `/healthz` após o pod ficar Ready.

**E3 — Diagnosticar probe defeituosa.**
O Deployment **`probe-broken`** não fica estável: o container é reiniciado repetidamente. Descubra o motivo pelos eventos e corrija a probe (não mude a aplicação nem a porta dela, que é a 8080). O novo pod deve ficar `Ready` com 0 reinícios.

**Teste com curl (E3):**
```bash
HOST=$(oc get route probe-broken -n frost -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** pod Ready, sem reinícios; a app não exige Route.

**E4 — Startup × liveness (variação mais difícil).**
O Deployment **`probeapp3`** entra em `CrashLoopBackOff` porque a liveness começa a testar antes de a app (40 s para subir) estar de pé. **Sem remover a liveness**, resolva adicionando o que falta, dimensionando a tolerância de inicialização com margem (pelo menos 50 s). O pod deve ficar `Ready` com 0 reinícios.

**Teste com curl (E4):**
```bash
HOST=$(oc get route probeapp3 -n frost -o jsonpath='{.spec.host}')
curl -fsS "http://$HOST/"
```
**Retorno esperado:** pod Ready, sem reinícios; a app não exige Route.
