# Reforço final EX288 — 5 atividades (115 min)

Cenários originais de treino, não reprodução de prova. Use o CRC já configurado, logado como developer, com Gitea e Nexus disponíveis. Execute da raiz do repo: `bash 11-reforco-final/preparar.sh`. Consulte credenciais com `bash scripts/credenciais.sh --show`. A preparação usa projetos exclusivos ex288-v3-r1 a r5, sem apagar tarefas anteriores. Requer helm, git, curl e Tekton para R5. Se a API Tekton não existir, instale o operador conforme o guia existente e repita a preparação.

Não consulte soluções antigas antes de tentar. Reserve os últimos cinco minutos de cada atividade para validar. Se travar, avance.

## R1 — S2I (15 min)
No projeto ex288-v3-r1, publique a branch dev do Git interno ex288/webapp.git usando o builder openshift/nodejs:20-ubi9, estratégia Source e Secret git-creds. Nome da aplicação e Route: reforco-s2i. APP_MESSAGE deve valer reforco-dev. O endpoint / deve retornar branch dev e a mensagem solicitada.

## R2 — Dockerfile e Nexus (25 min)
No projeto ex288-v3-r2, use o Git interno ex288/webapp-docker.git, branch main, arquivo Dockerfile e Secret git-creds. Crie build Docker chamado reforco-docker, saída reforco-docker:1.0. O registry npm usado durante o build deve ser o grupo npm-public do Nexus (descubra a variável no Dockerfile). Não altere o Git. Publique Deployment, Service e Route reforco-docker usando a imagem construída. A aplicação deve responder com app webapp-docker. O argumento precisa persistir no BuildConfig.

## R3 — Artefato + Git (30 min)
No projeto ex288-v3-r3, clone a branch main do Git interno ex288/httpd-ex.git. Obtenha o arquivo ex288/site-1.0.tar.gz do Nexus raw-hosted autenticado. Use o Dockerfile fornecido em 11-reforco-final/binary/Dockerfile junto do clone e do artefato, mantendo o nome do arquivo. Crie build binário Docker reforco-bin, sem publicar o artefato no Git. Publique Deployment, Service e Route reforco-bin. A raiz da Route deve devolver site 1.0; /git/index.html deve devolver a página do Git. A imagem deve conter ambos os conteúdos.

## R4 — Helm (20 min)
No projeto ex288-v3-r4, use o chart customer versão 0.1.0 publicado pela preparação no helm-hosted autenticado do Nexus. Crie dois arquivos locais values-dev.yaml e values-prod.yaml. Instale releases customer-dev e customer-prod no mesmo namespace. Tanto Deployment quanto pods devem ter label stage correspondente (dev/prod). Configure a mensagem dev-ok e prod-ok, respectivamente. Não edite o chart nem aplique labels manualmente. Ambas as Routes devem responder a mensagem correspondente.

## R5 — Tekton (25 min)
No projeto ex288-v3-r5, existe uma Pipeline reforco-ci com duas tasks e um parâmetro MESSAGE. Execute a pipeline com MESSAGE=retake-ok e workspace shared usando PVC shared-pvc já criado. Investigue o erro de execução e corrija a definição da Pipeline, preservando os nomes das tasks e o encadeamento. Execute novamente com o mesmo parâmetro e workspace. O último PipelineRun deve terminar Succeeded=True e a task verify deve exibir retake-ok nos logs. O erro é de execução, não de admission.

## Validação
Da raiz: `bash 11-reforco-final/validar.sh`. O script verifica estado final e respostas HTTP; confira os dois arquivos values localmente e os logs Tekton manualmente. Não mede os pesos reais do exame. Para remover apenas os projetos de reforço: `bash 11-reforco-final/limpar.sh`. O chart publicado permanece no Nexus.
