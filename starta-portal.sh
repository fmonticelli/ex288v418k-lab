#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERRO: python3 nao encontrado." >&2
  exit 1
fi
if ! command -v oc >/dev/null 2>&1; then
  echo "ERRO: CLI oc nao encontrada no PATH." >&2
  exit 1
fi
if ! oc whoami >/dev/null 2>&1; then
  echo "ERRO: faca login no OpenShift com oc login antes de iniciar." >&2
  exit 1
fi

if [[ "${1:-}" == "--no-update" ]]; then
  echo "Atualizacao Git ignorada (--no-update)."
elif [[ $# -ne 0 ]]; then
  echo "Uso: $0 [--no-update]" >&2
  exit 2
else
  if ! command -v git >/dev/null 2>&1; then
    echo "ERRO: git nao encontrado." >&2
    exit 1
  fi
  echo "Atualizando branch atual (fast-forward apenas)..."
  git pull --ff-only || {
    echo "ERRO: git pull falhou. Resolva o Git ou execute com --no-update." >&2
    exit 1
  }
fi

if [[ -z "${ROUTE_IP:-}" ]] && command -v crc >/dev/null 2>&1; then
  ROUTE_IP="$(crc ip)" || {
    echo "ERRO: nao foi possivel obter o IP do CRC." >&2
    exit 1
  }
  export ROUTE_IP
fi

echo "OpenShift: $(oc whoami)"
echo "Portal: http://127.0.0.1:${EX288_PORT:-8765}"
echo "Para encerrar: Ctrl+C"
exec python3 portal/server.py
