# Helper to start Ella with env from .env and explicit paths
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Resolve script directory robustly (use PSScriptRoot when available)
$repo = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Path $MyInvocation.MyCommand.Definition -Parent }
Set-Location -LiteralPath $repo
# Configure known paths
$env:PIPER_CLI_PATH = 'C:\Users\Darbe\OneDrive\Desktop\piper_windows_amd64 (1)\piper\piper.exe'
$env:PIPER_MODEL_PATH = 'C:\Users\Darbe\AppData\Local\Programs\piper\models\libtashkeel_model.ort'
$env:LLM_CLI_PATH = 'C:\Users\Darbe\AppData\Local\Programs\Ollama\ollama.exe'

# Load .env SAPI_VOICE if present
$envFile = Join-Path $repo '.env'
if (Test-Path $envFile) {
  try {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*SAPI_VOICE\s*=\s*"?(.*?)"?\s*$') {
        $env:SAPI_VOICE = $matches[1]
      }
    }
  } catch {
    # ignore
  }
}

# Start Ella
Write-Host "Starting Ella with SAPI_VOICE='$($env:SAPI_VOICE)'"
node .\ella-cli-local.mjs --tts=piper --voice-preset neutral --sapi-direct --llm-model 'llama3:8b'
