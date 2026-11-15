#!/usr/bin/env python3
"""EX288 portal local: usa o oc autenticado da workstation, sem tokens no browser."""
import json
import os
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
PORTAL = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.environ.get("EX288_PORT", "8765"))
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
        body = data.encode() if isinstance(data, str) else json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'")
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ("/", "/index.html"):
            return self.send((PORTAL / "index.html").read_bytes(), content_type="text/html; charset=utf-8")
        if url.path == "/app.js":
            return self.send((PORTAL / "app.js").read_bytes(), content_type="application/javascript; charset=utf-8")
        if url.path == "/api/tasks":
            tasks = []
            for k, (title, path, _) in TASKS.items():
                md = read(path)
                tasks.append({"id": k, "title": title, "intro": md.split("**E1")[0],
                              "sections": sections(md) if k != "0" else [{"id": "1", "title": "Resultado esperado", "body": md}]})
            return self.send({"tasks": tasks})
        if url.path == "/api/exam":
            variant = parse_qs(url.query).get("variant", ["A"])[0]
            if variant not in ("A", "B"):
                return self.send({"error": "Variante invalida"}, 400)
            md = read(f"09-simulado/{variant}/enunciado.md")
            return self.send({"variant": variant, "markdown": md})
        self.send({"error": "Nao encontrado"}, 404)
    def do_POST(self):
        # Acesso apenas loopback e bloqueio basico de requisicoes cross-origin.
        origin = self.headers.get("Origin", "")
        if origin and origin not in (f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"):
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
        if mode == "task" and str(data.get("task")) in TASKS and action in ("prepare", "validate"):
            key = str(data["task"])
            suffix = TASKS[key][2]
            script = f"{'preparar' if action == 'prepare' else 'validar'}-{suffix}.sh"
            args = ()
        elif mode == "exam" and data.get("variant") in ("A", "B") and action in ("prepare", "validate"):
            v = data["variant"]
            script = f"simulado-{'preparar' if action == 'prepare' else 'corrigir'}.sh"
            args = (v,)
        else:
            return self.send({"error": "Operacao nao permitida"}, 400)
        if not LOCK.acquire(blocking=False):
            return self.send({"error": "Outra operacao esta em andamento"}, 409)
        try:
            return self.send(run_script(script, args))
        finally:
            LOCK.release()

if __name__ == "__main__":
    print(f"EX288 portal: http://{HOST}:{PORT} (somente localhost)", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
