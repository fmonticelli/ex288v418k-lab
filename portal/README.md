# Portal web EX288 — execução local na workstation

Interface para ler os enunciados A/B ou T0–T8, marcar subtarefas, controlar o tempo e executar **um botão de correção final**. O backend executa os scripts existentes usando o **contexto `oc` da workstation**; portanto, funciona tanto se a solução foi criada pela CLI quanto pelo console web do CRC.

## Iniciar

Na raiz do repositório, execute:

```bash
bash starta-portal.sh
```

O script atualiza a branch atual com `git pull --ff-only`, verifica o login `oc`, configura `ROUTE_IP` automaticamente quando `crc` estiver disponível e inicia o servidor. Para iniciar sem atualizar o Git, use `bash starta-portal.sh --no-update`. Pare com `Ctrl+C`. Caso prefira iniciar manualmente, execute `python3 portal/server.py` após configurar o ambiente.

Abra **http://127.0.0.1:8765** na mesma máquina ou **http://IP-DA-MÁQUINA:8765** a partir de outra. Não precisa instalar bibliotecas Python, Node ou dependências frontend. `EX288_PORT=8766 python3 portal/server.py` troca a porta.

1. Escolha **Simulado completo** A ou B.
2. Clique **Preparar ambiente** (executa `scripts/simulado-preparar.sh A|B`).
3. Resolva as questões no OpenShift, pelo console ou `oc`.
4. Marque os checkboxes como lembretes pessoais. O tempo de 3 horas começa a contar quando a preparação termina (ou pelo botão ▶ no topo) e a faixa abaixo do cabeçalho mostra o tempo restante.
5. Clique **Validar simulado completo**. A correção usa `scripts/simulado-corrigir.sh A|B` e exibe a pontuação real.
6. Para treino individual, escolha **Tarefas** e use **Preparar ambiente** / **Validar tarefa**. Cada tarefa tem um cronômetro progressivo próprio, sem limite de tempo.

## Segurança e limites

- O servidor **escuta em todas as interfaces (`0.0.0.0`)** por padrão. Para restringir à máquina local: `EX288_HOST=127.0.0.1 python3 portal/server.py`.
- Só são aceitas requisições cujo `Host` seja `localhost`, `127.0.0.1`, o hostname ou um IP da máquina (proteção contra DNS rebinding); o POST exige `Origin` igual ao `Host` (proteção CSRF). Nomes/IPs extras (DNS, NAT, VM): `EX288_ALLOWED_HOSTS=nome.lab,10.0.0.5`.
- **Não há autenticação**: qualquer um que alcance a porta pode preparar, validar e limpar namespaces com o login `oc` desta workstation. Restrinja a porta no firewall a redes confiáveis e não publique em Route.
- Não pede nem armazena senha do OpenShift. Os subprocessos herdam o `KUBECONFIG` e `PATH` locais. A conta logada precisa de permissões adequadas para preparar e corrigir o lab.
- Não executa comandos arbitrários enviados pelo navegador: somente os scripts permitidos com parâmetros enumerados.
- Checkboxes, cronômetros e notas ficam no `localStorage` **deste navegador** e não alteram a nota. No simulado, o cronômetro é regressivo (3 h), pausa ao registrar a nota e para em 0:00:00 com um aviso, sem bloquear a validação.
- **Preparar** pode criar/alterar recursos do simulado. Use conscientemente e não reinicie a preparação no meio da prova.
- O backend só lê enunciados, nunca serve `solucao.md`.
- A validação existente pode ser mais restritiva do que equivalência funcional: este portal **não reescreve** os validadores do Pedro.
- Não foi testado contra seu CRC nesta entrega; faça primeiro um treino T0 para verificar `oc`, DNS e Route.
- Não há Deployment/Route do portal no CRC nesta versão: ele roda na workstation para aproveitar com segurança o login `oc`, sem dar permissões administrativas a um pod web.

## Diagnóstico

Se a correção falhar, execute o mesmo script diretamente no terminal. Para HTTPS/DNS no CRC, configure `ROUTE_IP="$(crc ip)"` antes de iniciar o portal.

## Reforço final

Em Simulado, selecione **Reforço final**. O portal apresenta R1–R5, prepara os cinco namespaces, inicia o cronômetro de 1h55 e valida o conjunto. O resultado é a contagem de itens PASS/FAIL, não uma nota oficial. Confira os arquivos values e os logs Tekton manualmente. A limpeza remove somente jasper, maple, obsidian, saffron, raven.

## Exercícios individuais

No menu Tarefas, expanda T0–T8 e escolha um exercício. Cada exercício tem enunciado, checklist e cronômetro próprios. Preparação, validação e limpeza continuam no nível da tarefa (namespace compartilhado), conforme os scripts existentes. A validação verifica todos os exercícios da categoria.
