# Portal web EX288 — execução local na workstation

Interface para ler os enunciados A/B ou T0–T8, marcar subtarefas, controlar o tempo e executar **um botão de correção final**. O backend executa os scripts existentes usando o **contexto `oc` da workstation**; portanto, funciona tanto se a solução foi criada pela CLI quanto pelo console web do CRC.

## Iniciar

```bash
git switch feature/ex288-418-simulado
oc whoami
export ROUTE_IP="$(crc ip)"
python3 portal/server.py
```

Abra **http://127.0.0.1:8765** na mesma máquina. Não precisa instalar bibliotecas Python, Node ou dependências frontend. `EX288_PORT=8766 python3 portal/server.py` troca a porta.

1. Escolha **Simulado completo** A ou B.
2. Clique **Preparar ambiente** (executa `scripts/simulado-preparar.sh A|B`).
3. Resolva as questões no OpenShift, pelo console ou `oc`.
4. Marque os checkboxes como lembretes pessoais.
5. Clique **Validar simulado completo**. A correção usa `scripts/simulado-corrigir.sh A|B` e exibe a pontuação real.
6. Para treino individual, escolha **Treino por tarefa** e use **Preparar ambiente** / **Validar tarefa**.

## Segurança e limites

- O servidor **escuta somente em 127.0.0.1**. Não publique em Route ou `0.0.0.0` sem autenticação, RBAC e proteção CSRF apropriados.
- Não pede nem armazena senha do OpenShift. Os subprocessos herdam o `KUBECONFIG` e `PATH` locais. A conta logada precisa de permissões adequadas para preparar e corrigir o lab.
- Não executa comandos arbitrários enviados pelo navegador: somente os scripts permitidos com parâmetros enumerados.
- Checkboxes e relógio persistem em `localStorage` **deste navegador**; não alteram a nota. O cronômetro não encerra automaticamente a prova.
- **Preparar** pode criar/alterar recursos do simulado. Use conscientemente e não reinicie a preparação no meio da prova.
- O backend só lê enunciados, nunca serve `solucao.md`.
- A validação existente pode ser mais restritiva do que equivalência funcional: este portal **não reescreve** os validadores do Pedro.
- Não foi testado contra seu CRC nesta entrega; faça primeiro um treino T0 para verificar `oc`, DNS e Route.
- Não há Deployment/Route do portal no CRC nesta versão: ele roda na workstation para aproveitar com segurança o login `oc`, sem dar permissões administrativas a um pod web.

## Diagnóstico

Se a correção falhar, execute o mesmo script diretamente no terminal. Para HTTPS/DNS no CRC, configure `ROUTE_IP="$(crc ip)"` antes de iniciar o portal.
