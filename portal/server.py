#!/usr/bin/env python3
"""EX288 portal local: usa o oc autenticado da workstation, sem tokens no browser."""
import json
import os
import re
import socket
import subprocess
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
PORTAL = Path(__file__).resolve().parent
HOST = os.environ.get("EX288_HOST", "0.0.0.0")
PORT = int(os.environ.get("EX288_PORT", "8765"))
# Nomes/IPs pelos quais o portal pode ser acessado (protege contra DNS rebinding).
def local_addresses():
    names = {"localhost", "127.0.0.1", socket.gethostname(), socket.getfqdn()}
    try:
        names |= set(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass
    try:  # todos os IPs das interfaces (Linux)
        p = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=5)
        names |= set(p.stdout.split())
    except (OSError, subprocess.TimeoutExpired):
        pass
    try:  # IP da rota padrao (nao envia pacotes)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("192.0.2.1", 80))
            names.add(s.getsockname()[0])
    except OSError:
        pass
    return {n for n in names if n and ":" not in n}  # IPv6 fora por ora

ALLOWED_HOSTS = local_addresses()
ALLOWED_HOSTS |= {h.strip() for h in os.environ.get("EX288_ALLOWED_HOSTS", "").split(",") if h.strip()}
LOCK = threading.Lock()
TASKS = {
    "0": ("Imagem pronta", "11-simulado-418/00-imagem.md", "00-imagem"),
    "1": ("Git privado", "01-deploy-from-git/exercicios.md", "01"),
    "2": ("Dockerfile", "02-deploy-from-dockerfile/exercicios.md", "02"),
    "3": ("S2I e Nexus", "03-deploy-s2i/exercicios.md", "03"),
    "4": ("ConfigMap e Secret", "04-env-configmap-secret/exercicios.md", "04"),
    "5": ("Probes", "05-probes/exercicios.md", "05"),
    "6": ("Templates", "06-templates/exercicios.md", "06"),
    "7": ("Helm", "07-helm/exercicios.md", "07"),
    "8": ("CI/CD", "08-cicd-pipelines/exercicios.md", "08"),
}
SIM_NS = {
    "R": ("jasper", "maple", "obsidian", "saffron", "raven"),
    "A": ("crimson", "quartz", "ember", "harbor", "cobalt", "willow", "falcon", "tundra"),
    "B": ("onyx", "cedar", "glacier", "copper", "violet", "lantern", "summit", "orchard", "copper-shared"),
}
def target_names(data):
    if data.get("mode") == "task" and str(data.get("task")) in TASKS:
        return [f"ex288-v3-t{data['task']}"]
    if data.get("mode") == "exam" and data.get("variant") in SIM_NS:
        return list(SIM_NS[data["variant"]])
    return None

def namespace_status(names):
    # Uma unica consulta ao cluster. O botao de limpeza so fica ativo para
    # namespaces do laboratorio (label ex288-lab=v3).
    p = subprocess.run([os.environ.get("OC", "oc"), "get", "projects", "-o", "json"],
                       capture_output=True, text=True, timeout=20, env=os.environ.copy())
    if p.returncode:
        raise RuntimeError(p.stderr.strip() or "Falha ao consultar namespaces")
    items = {item["metadata"]["name"]: item for item in json.loads(p.stdout)["items"]}
    found = []
    for name in names:
        item = items.get(name)
        if item:
            found.append({"name": name,
                          "phase": item.get("status", {}).get("phase", "Unknown"),
                          "managed": item.get("metadata", {}).get("labels", {}).get("ex288-lab") == "v3"})
    return found

def await_cleanup(names, timeout=120):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        remaining = namespace_status(names)
        if not remaining:
            return True, []
        time.sleep(3)
    return False, namespace_status(names)

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")
def sections(md):
    # Somente enunciados; nao envia solucao.md para o navegador.
    chunks = re.split(r"(?=^\*\*E\d+\s*[—-])", md, flags=re.M)
    out = []
    for chunk in chunks:
        m = re.match(r"\*\*E(\d+)\s*[—-]\s*([^*]+)\*\*", chunk)
        if m:
            out.append({"id": m.group(1), "title": m.group(2).strip().rstrip("."), "body": chunk.strip()})
    return out
def run_script(filename, args=()):
    path = ROOT / "scripts" / filename
    if filename in ("reforco-preparar.sh", "reforco-validar.sh", "reforco-limpar.sh"):
        path = ROOT / "11-reforco-final" / filename.removeprefix("reforco-")
    if not path.is_file():
        return {"ok": False, "code": 127, "output": "Script nao encontrado: " + filename}
    try:
        p = subprocess.run(["bash", str(path), *args], cwd=ROOT, capture_output=True,
                           text=True, timeout=900, env=os.environ.copy())
        output = (p.stdout + "\n" + p.stderr)[-45000:]
        return {"ok": p.returncode == 0, "code": p.returncode, "output": output}
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": 124, "output": "Tempo limite de 15 minutos excedido."}

class Handler(BaseHTTPRequestHandler):
    def send(self, data, status=200, content_type="application/json; charset=utf-8"):
        if isinstance(data, bytes):
            body = data
        elif isinstance(data, str):
            body = data.encode("utf-8")
        else:
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'")
        self.end_headers()
        self.wfile.write(body)
    def host_ok(self):
        host = self.headers.get("Host", "")
        name = host.rsplit(":", 1)[0] if ":" in host else host
        return name in ALLOWED_HOSTS
    def do_GET(self):
        if not self.host_ok():
            return self.send({"error": "Host nao autorizado"}, 403)
        url = urlparse(self.path)
        if url.path in ("/", "/index.html"):
            return self.send((PORTAL / "index.html").read_bytes(), content_type="text/html; charset=utf-8")
        if url.path == "/app.js":
            return self.send((PORTAL / "app.js").read_bytes(), content_type="application/javascript; charset=utf-8")
        if url.path == "/api/status":
            query = parse_qs(url.query)
            names = target_names({k: v[0] for k, v in query.items()})
            if names is None:
                return self.send({"error": "Selecao invalida"}, 400)
            try:
                found = namespace_status(names)
                return self.send({"namespaces": found, "can_cleanup": bool(found)})
            except (RuntimeError, subprocess.TimeoutExpired, ValueError) as exc:
                return self.send({"error": str(exc)}, 503)
        if url.path == "/api/tasks":
            tasks = []
            for k, (title, path, _) in TASKS.items():
                md = read(path)
                tasks.append({"id": k, "title": title, "intro": md.split("**E1")[0],
                              "sections": sections(md) if k != "0" else [{"id": "1", "title": "Resultado esperado", "body": ""}]})
            return self.send({"tasks": tasks})
        if url.path == "/api/exam":
            variant = parse_qs(url.query).get("variant", ["A"])[0]
            if variant not in ("A", "B", "R"):
                return self.send({"error": "Variante invalida"}, 400)
            md = read("11-reforco-final/README.md") if variant == "R" else read(f"09-simulado/{variant}/enunciado.md")
            if variant == "R":
                md = re.sub(r"^## R([1-5])", r"## Questão \1", md, flags=re.M)
                md = md.split("\n## Validação")[0]
            return self.send({"variant": variant, "markdown": md})
        self.send({"error": "Nao encontrado"}, 404)
    def do_POST(self):
        # Host na lista permitida e Origin igual ao proprio Host (bloqueio cross-origin).
        if not self.host_ok():
            return self.send({"error": "Host nao autorizado"}, 403)
        origin = self.headers.get("Origin", "")
        if origin and origin != f"http://{self.headers.get('Host', '')}":
            return self.send({"error": "Origin nao autorizado"}, 403)
        url = urlparse(self.path)
        if url.path != "/api/run":
            return self.send({"error": "Nao encontrado"}, 404)
        length = int(self.headers.get("Content-Length", "0"))
        if length > 4096:
            return self.send({"error": "Requisicao muito grande"}, 413)
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self.send({"error": "JSON invalido"}, 400)
        mode = data.get("mode")
        action = data.get("action")
        if mode == "task" and str(data.get("task")) in TASKS and action in ("prepare", "validate", "cleanup"):
            key = str(data["task"])
            suffix = TASKS[key][2]
            script = f"{ {'prepare': 'preparar', 'validate': 'validar', 'cleanup': 'limpar'}[action]}-{suffix}.sh"
            args = ()
        elif mode == "exam" and data.get("variant") in ("A", "B", "R") and action in ("prepare", "validate", "cleanup"):
            v = data["variant"]
            script = f"simulado-{ {'prepare': 'preparar', 'validate': 'corrigir', 'cleanup': 'limpar'}[action]}.sh"
            args = (v,)
            if v == "R":
                script = f"reforco-{ {'prepare': 'preparar', 'validate': 'validar', 'cleanup': 'limpar'}[action]}.sh"
                args = ()
        else:
            return self.send({"error": "Operacao nao permitida"}, 400)
        if not LOCK.acquire(blocking=False):
            return self.send({"error": "Outra operacao esta em andamento"}, 409)
        try:
            result = run_script(script, args)
            if action == "cleanup" and result["ok"]:
                try:
                    completed, remaining = await_cleanup(target_names(data))
                    if completed:
                        result["output"] += "\nExclusao confirmada: namespaces ausentes do cluster."
                    else:
                        result["ok"] = False
                        result["code"] = 124
                        result["output"] += "\nTempo limite aguardando exclusao: " + ", ".join(x["name"] for x in remaining)
                except (RuntimeError, subprocess.TimeoutExpired, ValueError) as exc:
                    result["ok"] = False
                    result["output"] += "\nNao foi possivel confirmar a exclusao: " + str(exc)
            return self.send(result)
        finally:
            LOCK.release()

if __name__ == "__main__":
    print(f"EX288 portal: http://{HOST}:{PORT} (hosts aceitos: {', '.join(sorted(ALLOWED_HOSTS))})", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
