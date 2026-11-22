#!/usr/bin/env bash
# Instalador para Mac (sirve también en Linux). Uso: bash instalar.sh
set -euo pipefail
cd "$(dirname "$0")"
echo "Instalando Videos verticales con 13 estilos..."

if [ -f pyproject.toml ]; then
  if ! command -v uv >/dev/null 2>&1; then
    echo "Instalando uv (gestor de Python)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
  fi
  uv sync
fi

if [ -f package.json ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "Falta Node.js: instálalo desde https://nodejs.org y vuelve a ejecutar este instalador."
    exit 1
  fi
  npm install
  node scripts/comprobar.ts --preparar || true
fi

if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  echo "Creado .env: las claves son opcionales (voz de ElevenLabs, imágenes de stock)."
fi

echo
echo "Listo. Abre esta carpeta con Claude Code (claude) o con Codex (codex) y sigue el README."
