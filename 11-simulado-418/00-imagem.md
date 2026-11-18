# T0 — Deploy a partir de imagem pronta (aquecimento)

**Motivação:** você lembra de três tarefas iniciais de deploy, mas não tem certeza se a primeira era a partir de imagem. Esta é uma **hipótese de treino**, não uma reconstrução da questão.

**Preparação:** `bash scripts/preparar-00-imagem.sh`

**Projeto:** `ex288-v3-t0`

## Enunciado

Uma imagem já está disponível no registro público Red Hat:

`registry.access.redhat.com/ubi9/httpd-24:latest`

Sem construir uma imagem nem criar BuildConfig:

1. Implante a imagem como aplicação **`image-app`**, usando um Deployment com **2 réplicas**.
2. Garanta que o container escute na porta **8080** e que exista um Service chamado **`image-app`** apontando para essa porta.
3. Exponha o Service com uma Route HTTP chamada **`image-app`**.
4. A imagem HTTPD não fornece um `index.html` no DocumentRoot `/var/www/html/` por padrão. Crie um **ConfigMap** chamado `image-app-content` com a chave `index.html` contendo uma página HTML válida e monte essa chave como arquivo `/var/www/html/index.html` no Deployment `image-app`, sem reconstruir a imagem. A Route deve retornar **HTTP 200** e as duas réplicas devem estar prontas.
5. Não altere o namespace `ex288-v3-infra`.

**Teste HTTP e retorno esperado:**
```bash
HOST=$(oc get route image-app -n ex288-v3-t0 -o jsonpath='{.spec.host}')
curl -sS -o /dev/null -w '%{http_code}\n' "http://$HOST/"
# Esperado: 200
oc get deployment image-app -n ex288-v3-t0 -o jsonpath='{.status.readyReplicas}'; echo
# Esperado: 2
```

**Validação:** `bash scripts/validar-00-imagem.sh`

**Limpeza:** `bash scripts/limpar-00-imagem.sh`

## Armadilhas que este treino avalia

- Deploy de imagem pronta **não é** build S2I nem Dockerfile.
- `oc create deployment` não cria Service nem Route automaticamente.
- Service `port` e `targetPort` devem encaminhar à porta efetiva do container.
- A imagem HTTPD pode retornar HTTP 403 na raiz se não houver `index.html` no DocumentRoot.
- Um ConfigMap pode fornecer o arquivo HTML sem exigir uma nova imagem.
- Um HTTP 200 sozinho não garante duas réplicas prontas.
