# Instalador para Windows. Uso: clic derecho > "Ejecutar con PowerShell", o en una terminal:
#   powershell -ExecutionPolicy Bypass -File .\instalar.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
Write-Host "Instalando Videos verticales con 12 estilos..."

function Tiene($comando) { return [bool](Get-Command $comando -ErrorAction SilentlyContinue) }

if (Test-Path "pyproject.toml") {
    if (-not (Tiene "uv")) {
        Write-Host "Instalando uv (gestor de Python)..."
        powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"
        $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
    }
    uv sync
}

if (Test-Path "package.json") {
    if (-not (Tiene "npm")) {
        Write-Host "Falta Node.js: instálalo con  winget install OpenJS.NodeJS.LTS  y vuelve a ejecutar este instalador."
        exit 1
    }
    npm install
    node scripts/comprobar.ts --preparar
}

if ((Test-Path ".env.example") -and -not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Creado .env: las claves son opcionales (voz de ElevenLabs, imagenes de stock)."
}

Write-Host ""
Write-Host "Listo. Abre esta carpeta con Claude Code (claude) o con Codex (codex) y sigue el README."
