import readline from "readline";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { exec as execCallback, execFile as execFileCallback, spawn } from "node:child_process";
import { promisify } from "node:util";

function loadDotenv(filePath = '.env') {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotenv();

const exec = promisify(execCallback);
const execFile = promisify(execFileCallback);
const LLM_API_URL = process.env.LLM_API_URL;
const defaultOllamaPath = process.platform === "win32" && process.env.LOCALAPPDATA
  ? `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`
  : undefined;
const LLM_CLI_PATH = process.env.LLM_CLI_PATH || defaultOllamaPath;
const LLM_MODEL = process.env.LLM_MODEL ?? "llama3:8b";
const LLM_TEMPERATURE = process.env.LLM_TEMPERATURE;
const LLM_TOP_P = process.env.LLM_TOP_P;
const LLM_MAX_TOKENS = process.env.LLM_MAX_TOKENS;
const PIPER_API_URL = process.env.PIPER_API_URL;
const PIPER_CLI_PATH = process.env.PIPER_CLI_PATH;
const PIPER_MODEL = process.env.PIPER_MODEL;
const PIPER_MODEL_PATH = process.env.PIPER_MODEL_PATH;
const PIPER_VOICE = process.env.PIPER_VOICE;
const SAPI_VOICE = process.env.SAPI_VOICE; // optional Windows voice name

const args = process.argv.slice(2);
const options = {
  stream: true,
  printStream: true,
  saveAudio: false,
  playAudio: false,
  tts: "auto",
  voice: PIPER_VOICE,
  model: PIPER_MODEL,
  modelPath: PIPER_MODEL_PATH,
  piperUrl: PIPER_API_URL,
  help: false,
  voicePreset: 'neutral', // neutral|calm|excited
  breaths: true,
  sapiDirect: false,
  sapiVoice: SAPI_VOICE || null,
  voiceActivate: false, // if true, always-listen for wake word ("Hey Ella")
  stt: process.env.STT || 'system', // 'system' for Windows System.Speech, or 'vosk'
  voskModelPath: process.env.VOSK_MODEL_PATH || null,
  voiceActivate: false, // if true, always-listen for wake word ("Hey Ella")
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--no-stream") {
    options.stream = false;
  } else if (arg === "--save-audio") {
    options.saveAudio = true;
  } else if (arg === "--play-audio") {
    options.playAudio = true;
  } else if (arg === "--no-audio") {
    options.tts = "none";
  } else if (arg.startsWith("--tts=")) {
    options.tts = arg.split("=")[1] || "auto";
  } else if (arg === "--tts") {
    options.tts = args[++i] || "auto";
  } else if (arg.startsWith("--voice=")) {
    options.voice = arg.split("=")[1];
  } else if (arg === "--voice") {
    options.voice = args[++i];
  } else if (arg.startsWith("--piper-url=")) {
    options.piperUrl = arg.split("=")[1];
  } else if (arg === "--piper-url") {
    options.piperUrl = args[++i];
  } else if (arg.startsWith("--piper-model-path=")) {
    options.modelPath = arg.split("=")[1];
  } else if (arg === "--piper-model-path") {
    options.modelPath = args[++i];
  } else if (arg.startsWith("--piper-model=")) {
    options.model = arg.split("=")[1];
  } else if (arg === "--piper-model") {
    options.model = args[++i];
  } else if (arg.startsWith("--llm-url=")) {
    options.llmUrl = arg.split("=")[1];
  } else if (arg === "--llm-url") {
    options.llmUrl = args[++i];
  } else if (arg.startsWith("--llm-cli=")) {
    options.llmCli = arg.split("=")[1];
  } else if (arg === "--llm-cli") {
    options.llmCli = args[++i];
  } else if (arg.startsWith("--llm-model=")) {
    options.llmModel = arg.split("=")[1];
  } else if (arg === "--llm-model") {
    options.llmModel = args[++i];
  } else if (arg === "--voice-preset") {
    options.voicePreset = args[++i] || 'neutral';
  } else if (arg.startsWith("--voice-preset=")) {
    options.voicePreset = arg.split('=')[1] || 'neutral';
  } else if (arg === "--no-breaths") {
    options.breaths = false;
  } else if (arg === "--sapi-direct") {
    options.sapiDirect = true;
    options.printStream = false; // when speaking directly, avoid printing raw stream
  } else if (arg.startsWith('--sapi-voice=')) {
    options.sapiVoice = arg.split('=')[1];
  } else if (arg === '--sapi-voice') {
    options.sapiVoice = args[++i];
  } else if (arg === '--voice-activate') {
    // enable always-listen wake-word mode
    options.voiceActivate = true;
  } else if (arg.startsWith('--stt=')) {
    options.stt = arg.split('=')[1] || options.stt;
  } else if (arg === '--stt') {
    options.stt = args[++i] || options.stt;
  } else if (arg.startsWith('--vosk-model-path=')) {
    options.voskModelPath = arg.split('=')[1] || options.voskModelPath;
  } else if (arg === '--vosk-model-path') {
    options.voskModelPath = args[++i] || options.voskModelPath;
  } else if (arg.startsWith('--llm-temp=')) {
    options.llmTemp = parseFloat(arg.split('=')[1]);
  } else if (arg === '--llm-temp') {
    options.llmTemp = parseFloat(args[++i]);
  } else if (arg.startsWith('--llm-top-p=')) {
    options.llmTopP = parseFloat(arg.split('=')[1]);
  } else if (arg === '--llm-top-p') {
    options.llmTopP = parseFloat(args[++i]);
  } else if (arg.startsWith('--llm-max-tokens=')) {
    options.llmMaxTokens = parseInt(arg.split('=')[1], 10);
  } else if (arg === '--llm-max-tokens') {
    options.llmMaxTokens = parseInt(args[++i], 10);
  } else if (arg === "--help") {
    options.help = true;
  } else {
    console.error(`Unknown option: ${arg}`);
    options.help = true;
  }
}

if (options.help) {
  console.log("Ella CLI usage:");
  console.log(
    "  npm run run:ella [--tts=auto|piper|none] [--save-audio] [--play-audio] [--no-stream] [--voice=VOICE_NAME] [--piper-url=URL] [--piper-model=MODEL] [--llm-url=URL] [--llm-cli=PATH] [--llm-model=MODEL]",
  );
  console.log("Options:");
  console.log("  --tts=auto|piper|none  Choose audio engine or disable audio.");
  console.log("  --save-audio           Save the generated audio file to disk.");
  console.log("  --play-audio           Open the generated audio file after creation.");
  console.log("  --no-stream            Disable streaming text output.");
  console.log("  --voice=VOICE_NAME     Use the specified voice name for Piper.");
  console.log("  --piper-url=URL           Use the specified Piper server URL.");
  console.log("  --piper-model=MODEL       Use the specified Piper TTS model or ONNX model path when using Piper CLI.");
  console.log("  --piper-model-path=PATH   Use the specified local Piper ONNX model file path.");
  console.log("  --sapi-voice=NAME         Use the specified Windows SAPI voice name for direct speech.");
  console.log("  --stt=system|vosk         Choose speech-to-text engine (default: system).");
  console.log("  --vosk-model-path=PATH    Use the specified local Vosk model folder.");
  console.log("  --llm-url=URL             Use the specified local LLM server URL for chat.");
  console.log("  --llm-cli=PATH         Use the specified local LLM CLI executable for chat.");
  console.log("  --llm-model=MODEL      Use the specified local LLM model name/path.");
  process.exit(0);
}

// Prefer direct SAPI speak on Windows by default for more natural, low-latency speech
if (process.platform === 'win32' && !args.includes('--sapi-direct') && options.tts !== 'none') {
  options.sapiDirect = true;
  options.printStream = false;
}

// Require a local LLM configuration (either a local LLM server URL or a CLI executable)
if (!LLM_API_URL && !LLM_CLI_PATH && !options.llmUrl && !options.llmCli) {
  console.error(
    "Error: No local LLM configured. Set LLM_API_URL (local server) or LLM_CLI_PATH (local CLI) in your environment or pass --llm-url / --llm-cli.",
  );
  console.error("Example: LLM_API_URL=http://localhost:5000 npm run run:ella");
  process.exit(1);
}

let ttsMode = options.tts;
if (ttsMode === "auto") {
  if (process.platform === "win32") {
    ttsMode = "sapi";
  } else {
    ttsMode = "none";
  }
}

if (ttsMode === "piper" && !options.piperUrl && !PIPER_CLI_PATH) {
  console.error(
    "Error: Piper is selected for TTS, but PIPER_API_URL or PIPER_CLI_PATH is not configured.",
  );
  console.error(
    "Set PIPER_API_URL to a running Piper server or PIPER_CLI_PATH to a local Piper executable.",
  );
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const promptPrefix = "Ella> ";
const systemPrompt = `You are Ella, a helpful local AI assistant. Respond in a clear, neutral, human tone suitable for spoken output. Keep phrasing natural and concise; avoid exaggerated emotion. Use normal pacing and brief pauses where appropriate.`;
const history = [{ role: "system", content: systemPrompt }];

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function humanizeSpeechText(text) {
  const cleaned = text.replace(/\s*\n+\s*/g, " ").trim();
  return cleaned
    .replace(/,\s*/g, ", ... ")
    .replace(/;\s*/g, "; ... ")
    .replace(/:\s*/g, ": ... ")
    .replace(/\b(and|but|so|then|well|also|however|meanwhile|right|okay|actually)\b/gi, "$1... ")
    .replace(/\.\.\.\s*/g, "... ")
    .replace(/\s{2,}/g, " ");
}

// Attempt to detokenize LLM streaming artifacts like "H i" or "I ' m" into natural words
function detokenizeStreamText(text) {
  if (!text) return text;
  let t = String(text);
  // collapse repeated whitespace
  t = t.replace(/\s+/g, ' ');
  // remove spaces before punctuation: "Hi !" -> "Hi!"
  t = t.replace(/\s+([,\.;!?:])/g, '$1');
  // join single-letter sequences like "H e l l o" => "Hello"
  t = t.replace(/\b(?:[A-Za-z]\s)+[A-Za-z]\b/g, (m) => m.replace(/\s+/g, ''));
  // fix contractions spaced as "I ' m" -> "I'm" and general "don ' t" -> "don't"
  t = t.replace(/(\w)\s+'\s+(\w)/g, "$1'$2");
  // trim
  t = t.trim();
  return t;
}

// Single-shot microphone-to-text helper using Windows System.Speech.Recognition
async function listenOnce() {
  if (process.platform !== 'win32') throw new Error('Listening only supported on Windows');
  const fsP = await import('node:fs/promises');
  const scriptPath = `ella-listen-${Date.now()}.ps1`;
  const ps = `Add-Type -AssemblyName System.Speech\r\n$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine\r\n$rec.SetInputToDefaultAudioDevice()\r\n$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))\r\n$result = $rec.Recognize()\r\nif ($result) { $result.Text } else { '' }`;
  await fsP.writeFile(scriptPath, ps, 'utf8');
  try {
    const { stdout } = await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], { maxBuffer: 20 * 1024 * 1024 });
    return String(stdout || '').trim();
  } finally {
    await fsP.unlink(scriptPath).catch(() => {});
  }
}

// Start a continuous PowerShell recognizer that writes one recognized phrase per line to stdout
async function startContinuousRecognizer() {
  if (process.platform !== 'win32') throw new Error('Recognizer only supported on Windows');
  const fsP = await import('node:fs/promises');
  const { spawn } = await import('node:child_process');
  const scriptPath = `ella-recognizer-${Date.now()}.ps1`;
  const ps = `Add-Type -AssemblyName System.Speech
$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$rec.SetInputToDefaultAudioDevice()
$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
while ($true) {
  $r = $rec.Recognize()
  if ($r -and $r.Text) { Write-Output $r.Text }
}`;
  await fsP.writeFile(scriptPath, ps, 'utf8');

  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.on('exit', () => {
    // attempt to remove script when recognizer exits
    fsP.unlink(scriptPath).catch(() => {});
  });
  // attach scriptPath for potential cleanup
  child._scriptPath = scriptPath;
  return child;
}

// Start a Vosk-based recognizer via bundled Python helper. Prints one recognized phrase per line to stdout.
async function startVoskRecognizer(modelPath) {
  const { spawn } = await import('node:child_process');
  const script = 'scripts\\vosk_recognizer.py';
  const args = ['-u', script];
  if (modelPath) args.push(modelPath);
  // spawn python in unbuffered mode so lines arrive promptly
  console.log('Spawning Vosk process:', 'python', args.join(' '));
  const child = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    console.log('[VOSK CHILD STDOUT]', String(chunk).trim());
  });
  child.stderr.on('data', (chunk) => {
    console.error('[VOSK CHILD STDERR]', String(chunk).trim());
  });
  child.on('exit', (code, signal) => {
    console.log('[VOSK CHILD EXIT]', code, signal);
  });
  child.on('error', (err) => {
    console.error('[VOSK CHILD ERROR]', err.message || err);
  });
  return child;
}

function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?\"']?|[^.!?]+$/g) || [text]).map((s) => s.trim()).filter(Boolean);
}

function generateSilenceWav(ms = 200, sampleRate = 22050, channels = 1, bitDepth = 16) {
  const samples = Math.max(1, Math.round((ms / 1000) * sampleRate));
  const blockAlign = (bitDepth / 8) * channels;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4); // file size - 8
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // data area is already zeros
  return buffer;
}

// A lightweight synthetic breath: shaped low-amplitude noise with a quick attack and exponential decay.
function generateBreathWav(ms = 220, sampleRate = 22050, channels = 1, bitDepth = 16) {
  const samples = Math.max(1, Math.round((ms / 1000) * sampleRate));
  const blockAlign = (bitDepth / 8) * channels;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  // data chunk header
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill PCM with low-amplitude shaped noise
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const attack = Math.min(1, t * 30);
    const decay = Math.exp(-4.5 * t);
    const amp = 0.12 * attack * decay;
    const noise = (Math.random() * 2 - 1) * amp;
    const intSample = Math.max(-1, Math.min(1, noise));
    const val = Math.round(intSample * 0x7fff);
    buffer.writeInt16LE(val, 44 + i * 2);
  }

  return buffer;
}

async function detectPiperCliOnnxStyle() {
  if (!PIPER_CLI_PATH) {
    return false;
  }

  try {
    const helpOut = await execFile(PIPER_CLI_PATH, ['--help'], { maxBuffer: 10 * 1024 * 1024 });
    const text = String(helpOut || '');
    return /(^|\s)(-m\b|--model\b)/i.test(text);
  } catch (err) {
    const output = String(err.stdout || '') + String(err.stderr || '') + String(err.message || '');
    return /(^|\s)(-m\b|--model\b)/i.test(output);
  }
}

async function concatWavFiles(files, outPath) {
  if (files.length === 0) throw new Error('No files to concat');
  // Read all files, ensure same format, strip headers, concatenate data, write single header
  const bufs = await Promise.all(files.map((f) => import('node:fs/promises').then(({readFile}) => readFile(f))));
  // parse first header
  const first = bufs[0];
  const channels = first.readUInt16LE(22);
  const sampleRate = first.readUInt32LE(24);
  const bitDepth = first.readUInt16LE(34);
  const blockAlign = (bitDepth / 8) * channels;

  const datas = bufs.map((b) => {
    const dataLen = b.readUInt32LE(40);
    return b.slice(44, 44 + dataLen);
  });
  const totalDataLen = datas.reduce((s, d) => s + d.length, 0);
  const out = Buffer.alloc(44 + totalDataLen);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + totalDataLen, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(channels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * blockAlign, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(bitDepth, 34);
  out.write('data', 36);
  out.writeUInt32LE(totalDataLen, 40);

  let offset = 44;
  for (const d of datas) {
    d.copy(out, offset);
    offset += d.length;
  }

  await import('node:fs/promises').then(({writeFile}) => writeFile(outPath, out));
}

function isOllamaCli(cli) {
  return /ollama/i.test(cli);
}

function cleanStreamText(s) {
  if (!s) return '';
  let t = String(s);
  // remove braille/spinner characters (e.g., ⠋⠙⠹⠼⠴⠦⠧⠇)
  t = t.replace(/[\u2800-\u28FF]/g, '');
  // strip ANSI color codes
  t = t.replace(/\x1b\[[0-9;]*m/g, '');
  // strip leftover carriage returns used by spinners
  t = t.replace(/\r+/g, '\n');
  // collapse repeated whitespace
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function normalizeCliOutput(stdout, stderr) {
  const rawStdout = String(stdout || "").trim();
  const rawStderr = String(stderr || "").trim();

  if (rawStderr) {
    const welcomeOnly = /^[\s⠋⠙⠹⠼⠴⠦⠧⠇\u001b\[\d+m\r\n]*$/.test(rawStderr);
    if (!welcomeOnly) {
      console.error(rawStderr);
    }
  }

  if (!rawStdout) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawStdout);
    return (
      String(parsed.response || parsed.output || parsed.text || parsed.result || parsed?.choices?.[0]?.text || "").trim() ||
      rawStdout
    );
  } catch {
    return rawStdout;
  }
}

async function generatePiperAudio(text) {
  const speechText = humanizeSpeechText(text);
  const outputFile = `ella-response-${Date.now()}-piper.wav`;

  // If Piper server is available, POST SSML if possible (server may accept ssml or plain text)
  if (options.piperUrl) {
    const ssml = textToSsml ? textToSsml(text, { breath: options.breaths, style: options.voicePreset }) : undefined;
    const url = options.piperUrl.replace(/\/$/, "") + "/api/tts";
    const body = ssml ? { ssml, model: options.model, voice: options.voice } : { text: speechText, model: options.model, voice: options.voice };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Piper server TTS failed: ${response.status} ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputFile, buffer);
    return outputFile;
  }

  // If Piper CLI is available, synthesize per-sentence and concatenate with optional breaths
  if (PIPER_CLI_PATH) {
    const sentences = splitSentences(text);
    const tmpFiles = [];

    // Prefer user-supplied breath samples in assets/breaths/*.wav; otherwise generate a synthetic breath.
    const fsP = await import('node:fs/promises');
    let breathPath = null;
    let generatedBreathTemp = null;
    try {
      const breathDir = 'assets\\breaths';
      const candidates = await fsP.readdir(breathDir).catch(() => []);
      const wavs = candidates.filter((f) => /\.wav$/i.test(f));
      if (wavs.length > 0) {
        // pick the first available breath sample
        breathPath = `${breathDir}\\${wavs[0]}`;
      }
    } catch (e) {
      // ignore
    }

    if (!breathPath) {
      // generate a short synthetic breath WAV as a fallback
      const breathBuf = generateBreathWav(180);
      generatedBreathTemp = `ella-breath-${Date.now()}.wav`;
      await writeFile(generatedBreathTemp, breathBuf);
      breathPath = generatedBreathTemp;
    }

    const onnxStyle = await detectPiperCliOnnxStyle();

    try {
      if (onnxStyle) {
        // Piper CLI expects a local ONNX model file. Use PIPER_MODEL_PATH or options.model to locate it.
        const modelPath = options.modelPath || options.model || process.env.PIPER_MODEL_PATH || process.env.PIPER_MODEL;
        if (!modelPath) {
          throw new Error('Piper CLI requires a local ONNX model file. Set PIPER_MODEL_PATH or pass --piper-model to point to the model ONNX file.');
        }

        for (let i = 0; i < sentences.length; i++) {
          const s = sentences[i];
          const tmp = `ella-piper-chunk-${Date.now()}-${i}.wav`;
          // Use stdin for text and -m <model> -f <output_file>
          await new Promise((res, rej) => {
            const child = spawn(PIPER_CLI_PATH, ['-m', modelPath, '-f', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
            child.on('error', (err) => rej(err));
            child.on('close', (code) => {
              if (code !== 0) return rej(new Error(`Piper exited with code ${code}`));
              res();
            });
            // Write the sentence text to stdin (plain text expected)
            child.stdin.write(humanizeSpeechText(s));
            child.stdin.end();
          });

          tmpFiles.push(tmp);
          // insert breath file between chunks if breaths enabled
          if (options.breaths && i < sentences.length - 1) {
            tmpFiles.push(breathPath);
          }
        }
      } else {
        // Older or alternate Piper CLI that accepts --text/--output flags: try previous invocation style
        for (let i = 0; i < sentences.length; i++) {
          const s = sentences[i];
          const tmp = `ella-piper-chunk-${Date.now()}-${i}.wav`;
          const args = ['--text', humanizeSpeechText(s), '--output', tmp];
          if (options.voice) args.push('--voice', options.voice);
          if (options.model) args.push('--model', options.model);
          await execFile(PIPER_CLI_PATH, args, { maxBuffer: 1024 * 1024 * 50 });
          tmpFiles.push(tmp);
          // insert breath file between chunks if breaths enabled
          if (options.breaths && i < sentences.length - 1) {
            tmpFiles.push(breathPath);
          }
        }
      }

      await concatWavFiles(tmpFiles, outputFile);
      return outputFile;
    } finally {
      // cleanup tmp chunks
      try { for (const f of tmpFiles) await import('node:fs/promises').then(({unlink})=>unlink(f)).catch(()=>{}); } catch {}
      if (generatedBreathTemp) {
        await import('node:fs/promises').then(({unlink})=>unlink(generatedBreathTemp)).catch(()=>{});
      }
    }
  }

  throw new Error("Piper server or CLI not configured for TTS");
}

async function saveAudioFile(buffer) {
  const fileName = `ella-response-${Date.now()}.mp3`;
  await writeFile(fileName, buffer);
  return fileName;
}

async function playAudioFile(path) {
  try {
    if (process.platform === "win32") {
      await exec(`start "" "${path}"`);
    } else if (process.platform === "darwin") {
      await exec(`open "${path}"`);
    } else {
      await exec(`xdg-open "${path}"`);
    }
  } catch {
    console.warn(`Could not automatically open audio file at ${path}.`);
  }
}

async function runLocalLlmCli(cli, args, onChunk) {
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";

    child.stdout.on("data", (chunk) => {
      const raw = String(chunk);
          const cleaned = cleanStreamText(raw);
          if (!cleaned) return;
          const text = detokenizeStreamText(cleaned);
          if (onChunk && typeof onChunk === 'function') {
            try { onChunk(text); } catch (e) { /* ignore callback errors */ }
          }
          if (options.stream && options.printStream) {
            process.stdout.write(text);
          }
          output += text;
        });

    child.stderr.on("data", (chunk) => {
      const stderrText = String(chunk).trim();
      const spinnerOnly = /^[\s⠋⠙⠹⠼⠴⠦⠧⠇\u001b\[\d+m\r\n]*$/.test(stderrText);
      if (!spinnerOnly && stderrText) {
        process.stderr.write(stderrText + "\n");
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Local LLM CLI exited with code ${code}`));
        return;
      }
      if (options.stream) {
        process.stdout.write("\n");
      }
      resolve(output.trim());
    });
  });
}

async function createChatCompletion(messages) {
  // Build a simple text prompt from the message history for local LLMs.
  const prompt = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n") + "\n\nASSISTANT:";

  const model = options.llmModel || LLM_MODEL || "llama3:8b";
  const llmUrl = options.llmUrl || LLM_API_URL;
  const llmCli = options.llmCli || LLM_CLI_PATH;
  // Resolve sampling params (CLI flags take precedence, then envs)
  const temperature = options.llmTemp ?? (LLM_TEMPERATURE ? parseFloat(LLM_TEMPERATURE) : undefined);
  const top_p = options.llmTopP ?? (LLM_TOP_P ? parseFloat(LLM_TOP_P) : undefined);
  const max_tokens = options.llmMaxTokens ?? (LLM_MAX_TOKENS ? parseInt(LLM_MAX_TOKENS, 10) : undefined);

  if (llmUrl) {
    // Call a local LLM HTTP API. Expecting a simple POST /generate or similar that returns { text }.
    const url = llmUrl.replace(/\/$/, "") + "/generate";
    const body = { prompt, model, stream: !!options.stream };
    if (typeof temperature !== 'undefined') body.temperature = temperature;
    if (typeof top_p !== 'undefined') body.top_p = top_p;
    if (typeof max_tokens !== 'undefined') body.max_tokens = max_tokens;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM server request failed: ${response.status} ${errorText}`);
    }

    if (!options.stream) {
      const json = await response.json();
      return (json.text || json.output || json?.choices?.[0]?.text || json?.choices?.[0]?.message?.content || "").trim();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      process.stdout.write(chunk);
      result += chunk;
    }

    process.stdout.write("\n");
    return result;
  }

  if (llmCli) {
    const cli = llmCli;
    const isOllama = isOllamaCli(cli);
    const args = [];

    if (isOllama) {
      args.push("run", model, prompt, "--hidethinking", "--nowordwrap");
      // Append sampling flags if provided
      if (typeof temperature !== 'undefined') args.push('--temperature', String(temperature));
      if (typeof top_p !== 'undefined') args.push('--top_p', String(top_p));
      if (typeof max_tokens !== 'undefined') args.push('--max_tokens', String(max_tokens));

      // Stream tokens as they arrive and speak completed sentences immediately (speak-as-you-go)
      let buffer = "";
      const flushSentences = async (force = false) => {
        // Extract full sentences (ending with .!? or line breaks). Leave remainder in buffer.
        const sentences = (buffer.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || []).map(s => s.trim()).filter(Boolean);
        // If not forced, only speak sentences that end with punctuation
        const speakable = force ? sentences : sentences.filter(s => /[.!?]$/.test(s));
        if (speakable.length === 0) return;
        // Remove spoken sentences from buffer
        const spokenLen = speakable.reduce((acc, s) => acc + s.length, 0);
        buffer = buffer.slice(spokenLen).trimStart();

        for (const s of speakable) {
          // Prefer SAPI direct speak for immediate streaming on Windows
          if (process.platform === 'win32') {
            // Fire-and-forget so streaming doesn't block
            generateSapiSpeak(s).catch((e) => console.error('Streaming speak error:', e.message || e));
          }
        }
      };

      const onChunk = (chunk) => {
        // Detokenize incoming chunk before buffering to avoid single-letter spacing artifacts
        const clean = detokenizeStreamText(String(chunk));
        buffer += clean;
        // Try to flush sentences when we see sentence-ending punctuation or newline
        if (/[.!?]\s*$/.test(buffer) || /\n/.test(buffer) || /[,;]\s*$/.test(buffer)) {
          flushSentences().catch(() => {});
        }
      };

      // Run the CLI with onChunk handler
      const result = await runLocalLlmCli(cli, args, onChunk);
      // After completion, speak any remaining buffer
      await flushSentences(true);
      return result;
    }

    if (model) {
      args.push("--model", model);
    }
    args.push("--prompt", prompt);

    try {
      const { stdout, stderr } = await execFile(cli, args, { maxBuffer: 1024 * 1024 * 50 });
      const output = normalizeCliOutput(stdout, stderr);
      if (options.stream) {
        process.stdout.write(output + "\n");
      }
      return output;
    } catch (err) {
      throw new Error(`Local LLM CLI failed: ${err.message || err}`);
    }
  }

  throw new Error("No local LLM configured. Set LLM_API_URL or LLM_CLI_PATH.");
}

async function sanitizeReply(text){
  if (!text) return text;
  let t = String(text);
  // remove starred actions like *laugh*, *smile*
  t = t.replace(/\*[^*]+\*/g, '');
  // remove bracketed actions [laugh], (laugh)
  t = t.replace(/\[[^\]]+\]/g, '');
  t = t.replace(/\([^\)]+\)/g, '');
  // remove common stage words like laugh, cough, 'cof' and other vocalizations when isolated
  t = t.replace(/\b(cof+|coff+|coughs?|cough|laughs?|laugh|sighs?|sniffles?|sniff)\b/gi, '');
  // collapse whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

async function askElla(userInput) {
  history.push({ role: "user", content: userInput });
  const rawReply = await createChatCompletion(history);
  const reply = await sanitizeReply(rawReply);
  history.push({ role: "assistant", content: reply });
  return reply;
}


// SAPI speak queue to serialize speech and avoid overlapping/garbled audio
const _sapiQueue = [];
let _sapiProcessing = false;

async function _doSapiSpeakNow(text) {
  if (process.platform !== 'win32') {
    throw new Error('SAPI speak only supported on Windows');
  }
  const fsP = await import('node:fs/promises');
  const scriptPath = `ella-sapi-speak-${Date.now()}.ps1`;

  // Choose voice: CLI option overrides env
  const voiceName = options.sapiVoice || SAPI_VOICE || null;
  // Decide whether to apply humanization or keep neutral
  const speakText = options.voicePreset === 'neutral' ? String(text).replace(/\s+/g, ' ').trim() : humanizeSpeechText(text);
  const plainText = String(speakText).replace(/[^\p{L}\p{N}\s.,!?;:'"()-]/gu, '');
  console.log(`[SAPI] speaking ${plainText.length} chars with voice=${voiceName || 'default'}`);

  // Encode as base64 to avoid any quoting issues in PowerShell
  const b64 = Buffer.from(plainText, 'utf8').toString('base64');

  let ps = [
    'Add-Type -AssemblyName System.Speech',
    `$bytes = [System.Convert]::FromBase64String('${b64}')`,
    '$text = [System.Text.Encoding]::UTF8.GetString($bytes)',
    '$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer',
  ].join('\r\n') + '\r\n';

  if (voiceName) {
    ps += `$voice.SelectVoice(${JSON.stringify(voiceName)})\r\n`;
  }
  ps += `$voice.Rate = 0\r\n$voice.Volume = 100\r\n$voice.Speak($text)\r\n$voice.Dispose()\r\n`;

  await fsP.writeFile(scriptPath, ps, 'utf8');
  try {
    await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], { maxBuffer: 20 * 1024 * 1024 });
  } finally {
    await fsP.unlink(scriptPath).catch(() => {});
  }

  return null;
}

async function processSapiQueue() {
  if (_sapiProcessing) return;
  _sapiProcessing = true;
  while (_sapiQueue.length) {
    const item = _sapiQueue.shift();
    try {
      await _doSapiSpeakNow(item.text);
      item.resolve();
    } catch (err) {
      item.reject(err);
    }
  }
  _sapiProcessing = false;
}

async function generateSapiSpeak(text) {
  return new Promise((resolve, reject) => {
    _sapiQueue.push({ text: String(text), resolve, reject });
    processSapiQueue().catch((e) => {
      // If processSapiQueue throws unexpectedly, reject queued items
      try {
        while (_sapiQueue.length) {
          const it = _sapiQueue.shift();
          it.reject(e);
        }
      } catch (_) {}
    });
  });
}

async function generateSapiAudio(text) {
  // Backward-compatible: write a WAV file via SAPI then return its path
  const out = `ella-sapi-${Date.now()}.wav`;
  if (process.platform !== 'win32') {
    throw new Error('SAPI fallback only supported on Windows');
  }

  const psScript = `Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SetOutputToWaveFile(${JSON.stringify(out)})
$voice.Rate = 0
$voice.Volume = 100
$voice.Speak(${JSON.stringify(text)})
$voice.Dispose()`;

  const fsP = await import('node:fs/promises');
  const scriptPath = `ella-sapi-${Date.now()}.ps1`;
  await fsP.writeFile(scriptPath, psScript, 'utf8');

  try {
    await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], { maxBuffer: 50 * 1024 * 1024 });
  } finally {
    await fsP.unlink(scriptPath).catch(() => {});
  }

  return out;
}

async function maybeGenerateAudio(replyText) {
  if (options.tts === "none") {
    return null;
  }

  try {
    let filePath;
    console.log(`Audio mode: ttsMode=${ttsMode}, options.tts=${options.tts}, options.sapiDirect=${options.sapiDirect}, options.sapiVoice=${options.sapiVoice || SAPI_VOICE || 'default'}`);

    if (ttsMode === "piper") {
      try {
        filePath = await generatePiperAudio(replyText);
      } catch (pErr) {
        console.error('Piper TTS failed:', pErr.message || pErr);
        // Fallback to Windows SAPI if available — prefer direct Speak (no file)
        if (process.platform === 'win32') {
          console.log('Falling back to Windows SAPI Speak (direct, no files)...');
          try {
            await generateSapiSpeak(replyText);
            filePath = null; // spoken directly
          } catch (sErr) {
            console.error('SAPI speak failed:', sErr.message || sErr);
            // as a last resort, try writing a WAV then playing it
            try {
              filePath = await generateSapiAudio(replyText);
            } catch (sErr2) {
              console.error('SAPI file fallback failed:', sErr2.message || sErr2);
              throw pErr; // rethrow original Piper error
            }
          }
        } else {
          throw pErr;
        }
      }
    } else if (ttsMode === 'sapi' || (process.platform === 'win32' && options.tts === 'auto')) {
      if (options.sapiDirect) {
        await generateSapiSpeak(replyText);
        filePath = null;
      } else {
        filePath = await generateSapiAudio(replyText);
      }
    } else {
      console.warn("No TTS engine selected — skipping audio generation.");
      return null;
    }

    console.log(`Audio written to ${filePath}`);

    if (options.playAudio) {
      await playAudioFile(filePath);
    }

    return filePath;
  } catch (error) {
    console.error("Audio generation failed:", error.message || error);
    return null;
  }
}

async function main() {
  console.log("Ella is ready on your PC. Say 'Hey Ella' or type your message. Press Ctrl+C to quit.");
  console.log("Commands: /exit, /reset, /help, /listen\n");

  // If voice-activated mode is enabled, run a continuous recognizer that listens for a wake-word and commands
  if (options.voiceActivate) {
    console.log("Voice-activate mode: say 'Hey Ella' to wake the assistant.");
    let recognizer;
    try {
      if (options.stt === 'vosk' || options.voskModelPath || process.env.VOSK_MODEL_PATH) {
        console.log('Starting Vosk recognizer...');
        const modelPath = options.voskModelPath || process.env.VOSK_MODEL_PATH || 'models\\vosk-model-small-en-us-0.15';
        recognizer = await startVoskRecognizer(modelPath);
      } else {
        recognizer = await startContinuousRecognizer();
      }
    } catch (e) {
      console.error('Failed to start recognizer:', e.message || e);
      return;
    }

    recognizer.stdout.setEncoding('utf8');
    let buf = '';
    let waitingForCommand = false;
    const wakePatterns = ['hey ella', 'hello ella', 'ok ella', 'ella'];

    let stopResolve;
    const stopPromise = new Promise((res) => { stopResolve = res; });

    const handleCommand = async (command) => {
      if (!command || !command.trim()) return;
      const lc = command.toLowerCase().trim();
      if (lc === 'exit' || lc === 'quit' || lc === 'goodbye' || lc === 'bye') {
        console.log('Exiting on voice command. Goodbye.');
        try { recognizer.kill(); } catch (_) {}
        stopResolve();
        return;
      }
      if (lc === 'reset' || lc === 'clear') {
        history.length = 0;
        history.push({ role: 'system', content: systemPrompt });
        console.log('Conversation reset.');
        return;
      }

      try {
        if (options.stream) process.stdout.write('Ella: ');
        else process.stdout.write('Ella is thinking...\r');

        const reply = await askElla(command);
        if (!options.stream) {
          process.stdout.write(''.padEnd(80, ' ') + '\r');
          console.log(`Ella: ${reply}\n`);
        } else {
          console.log('\n');
        }

        if (options.saveAudio || options.playAudio || ttsMode !== 'none') {
          await maybeGenerateAudio(reply);
        }
      } catch (err) {
        console.error('Error handling command:', err.message || err);
      }
    };

    recognizer.stdout.on('data', (chunk) => {
      buf += String(chunk);
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        const detected = (line || '').trim();
        if (!detected) continue;
        const low = detected.toLowerCase();

        if (waitingForCommand) {
          waitingForCommand = false;
          handleCommand(detected).catch((e) => console.error('Command handling error:', e));
          continue;
        }

        // check for wake word inside detected phrase
        let matched = null;
        let post = '';
        for (const p of wakePatterns) {
          const idx = low.indexOf(p);
          if (idx !== -1) {
            matched = p;
            post = detected.slice(idx + p.length).trim();
            break;
          }
        }
        if (!matched) {
          // no wake word - ignore
          continue;
        }

        if (post) {
          // detected wake + command in same phrase
          handleCommand(post).catch((e) => console.error('Command handling error:', e));
        } else {
          // only wake word detected - listen for next phrase as command
          waitingForCommand = true;
          console.log('Wake word detected — listening for command...');
        }
      }
    });

    recognizer.stderr.on('data', (d) => {
      // log but don't crash
      console.error('Recognizer stderr:', String(d).trim());
    });

    recognizer.on('exit', (code, sig) => {
      console.log('Recognizer stopped', code, sig);
      stopResolve();
    });

    // wait until stopResolve called (exit command or recognizer exit)
    await stopPromise;

    try {
      if (recognizer && !recognizer.killed) recognizer.kill();
    } catch (_) {}
    rl.close();
    console.log('Voice-activate session ended.');
    return;
  }

  // Fallback to typed input mode
  while (true) {
    let input = (await question(promptPrefix)).trim();
    if (!input) {
      continue;
    }
    if (input === '/exit') {
      break;
    }
    if (input === '/reset') {
      history.length = 0;
      history.push({ role: 'system', content: systemPrompt });
      console.log('Conversation reset. Ella is ready for a fresh start.\n');
      continue;
    }
    if (input === '/help') {
      console.log('Commands:');
      console.log('  /exit  - Quit Ella');
      console.log('  /reset - Clear the conversation history');
      console.log('  /help  - Show this help message');
      console.log('  /listen - Use microphone to speak instead of typing');
      console.log('  Flags can be passed when starting Ella: --tts, --save-audio, --play-audio, --no-stream, --voice\n');
      continue;
    }

    // Microphone listen command
    if (input === '/listen') {
      try {
        console.log('Listening... Please speak now.');
        const spoken = await listenOnce();
        if (spoken) {
          console.log(`Heard: ${spoken}`);
          input = spoken;
        } else {
          console.log('No speech detected.');
          continue;
        }
      } catch (e) {
        console.error('Listening failed:', e.message || e);
        continue;
      }
    }

    try {
      if (options.stream) {
        process.stdout.write('Ella: ');
      } else {
        process.stdout.write('Ella is thinking...\r');
      }

      const reply = await askElla(input);
      if (!options.stream) {
        process.stdout.write(''.padEnd(80, ' ') + '\r');
        console.log(`Ella: ${reply}\n`);
      } else {
        console.log('\n');
      }

      if (options.saveAudio || options.playAudio || ttsMode !== 'none') {
        await maybeGenerateAudio(reply);
      }
    } catch (error) {
      console.error('Error:', error.message || error);
      console.log('Try again or use /help for commands.\n');
    }
  }

  rl.close();
  console.log('Goodbye from Ella.');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
