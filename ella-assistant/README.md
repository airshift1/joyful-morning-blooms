Ella — Local voice assistant
=============================

Overview
--------
Ella is a local-first voice assistant that runs on Windows. It uses Vosk for speech recognition, local LLM glue (Ollama or other local LLMs), and Windows SAPI for speech output. This repository contains the local assistant scripts, sample Vosk model files, helper scripts, and launchers. A companion web UI (React + Vite) provides chat, memory, texting (via Apple Shortcuts), and admin controls.

What’s in this repo
-------------------
- ella-ollama-female.mjs — main assistant logic (listener, prompt sanitizer, TTS gating)
- start-ella.cmd — Windows launcher that activates the Python venv and starts the assistant
- scripts/ — helper scripts (Python and PowerShell) for diagnostics and setup
- models/ — Vosk model files (large; may be stored elsewhere)
- ella_profile.json — assistant profile and settings
- src/App.jsx, src/main.jsx, src/index.css — React + Vite web UI for chat, memory, admin
- vite.config.js — Vite dev server config with proxies for local LLMs and TTS

Prerequisites
-------------
- Windows 10/11 (recommended) with working microphone and speakers
- Python 3.11 (recommended) for Vosk/STT helpers
- Node.js 18+ (for the web UI)
- Ollama (optional, for local LLM chat responses; defaults to rule-based replies if unavailable)
- Coqui TTS server (optional, for higher-quality female voices; defaults to browser SpeechSynthesis if unavailable)

Recommended setup (Python venv)
-------------------------------
1. Open an elevated PowerShell or Command Prompt.
2. Create and activate a venv:
   python -m venv venv_coqui
   .\venv_coqui\Scripts\Activate
3. Upgrade pip and install core packages:
   python -m pip install --upgrade pip
   pip install vosk sounddevice

Web UI setup (local development)
-------------------------------
1. Ensure Node.js 18+ is installed.
2. In the ella-assistant directory, run:
   npm install
   npm run dev
3. Open http://localhost:3000 in your browser.

Optional: Coqui TTS local server
-------------------------------
For higher-quality, more natural-sounding female voices, set up Coqui TTS locally:

1. Install Coqui TTS:
   pip install TTS

2. Download a female voice model (first-time only):
   python -c "from TTS.api import TTS; tts = TTS(model_name='tts_models/en/ljspeech/tacotron2-DDC', gpu=False)"

3. Start the Coqui TTS server on port 5002:
   tts_server --model_name tts_models/en/ljspeech/tacotron2-DDC --port 5002

   (or use a faster GPU-based model if you have CUDA available)

4. In the web UI Admin tab, enable "Coqui TTS" and choose a speaker.
5. The app will now use Coqui for all TTS calls; if the server is unavailable, it falls back to browser SpeechSynthesis.

Optional: Local LLM with Ollama
-------------------------------
To connect Ella to a local LLM for smarter replies:

1. Install Ollama: https://ollama.ai
2. Start Ollama:
   ollama serve
3. In another terminal, pull a model (e.g., llama2):
   ollama pull llama2
4. The web UI will auto-detect Ollama on startup. In the Admin tab, you can select the model and test the connection.
5. Chat messages now use the local LLM; if unavailable, the app falls back to rule-based replies.

Notes about the Vosk model:
- The models/ directory can be large. It's recommended to store models in a release or use Git LFS rather than committing them to the repository if you plan to keep this repo small.
- If models are already committed and you want to move them out, create a release and delete the models/ folder from the repo (careful: removing files from history requires rewriting history).

Running Ella
-----------
- Local voice app: double-click start-ella.cmd or run it from PowerShell. The script sets up environment variables and starts the assistant using the repo's Python environment.
- Web UI: npm run dev to start the Vite dev server (http://localhost:3000).
- The assistant listens for the wake word ("Ella", "hey Ella") and will sleep after ~5 minutes of inactivity. After 1 hour of inactivity it can say a short "Welcome back" message.
- To force a specific SAPI voice, set the environment variable FORCE_SAPI_VOICE before launching (example: FORCE_SAPI_VOICE="Microsoft Zira Desktop")

Common troubleshooting
----------------------
- If Ella responds to her own voice, ensure the TTS cooldown is in place and Vosk is not listening while TTS is active (the launcher and main script implement this by default).
- If Vosk cannot start, confirm you activated the correct Python venv and installed the `vosk` and `sounddevice` packages.
- If the web UI cannot reach Ollama or Coqui, check that the services are running on http://localhost:11434 (Ollama) and http://localhost:5002 (Coqui) respectively.
- Check start-ella.cmd and the PowerShell scripts in the repo for exact python paths used by the launcher.

Deployment and Vercel notes
---------------------------
- This repo is the local voice assistant (Windows-focused) plus the web UI scaffolding. The web UI can be deployed to Vercel; note that dev-only proxies (/api/ollama, /api/coqui) are replaced with production bridges or removed.
- For production deployment of the web UI, you should:
  1. Provide a server-side proxy (Express, Netlify function, Vercel serverless) that bridges to your local Ollama/Coqui services (if you want to expose them remotely).
  2. Or remove LLM/TTS calls from the production build and rely on fallback behaviors (rule-based chat, browser SpeechSynthesis).
- The local voice assistant (ella-ollama-female.mjs, start-ella.cmd) should remain a separate repo and is not a Vercel target.

Contributing
------------
- Please open issues or PRs against this repo for improvements. For large model files, consider attaching them as GitHub Releases or using Git LFS.

License
-------
MIT — customize as needed.

Contact
-------
If you need help running or deploying Ella, add details and open an issue on the repository or contact the maintainer.
