import { spawn } from 'node:child_process';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execFile = promisify(execFileCallback);
const VOSK_SCRIPT = 'scripts\\vosk_recognizer.py';
const DEFAULT_VOSK_MODEL = 'models\\vosk-model-small-en-us-0.15';
const SAPI_VOICE = process.env.SAPI_VOICE || 'Microsoft Zira Desktop';


// NOTE: safety/content sanitization removed per user request.
function cleanText(value) {
  return String(value || '');
}

async function speakSapi(text) {
  if (process.platform !== 'win32') {
    console.log('TTS:', text);
    return;
  }
  const safe = String(text || '').replace(/[^\p{L}\p{N}\s\.,!?;:'"()\-]/gu, '');
  const b64 = Buffer.from(safe, 'utf8').toString('base64');
  const ps1 = [
    'Add-Type -AssemblyName System.Speech',
    `$bytes = [System.Convert]::FromBase64String('${b64}')`,
    '$text = [System.Text.Encoding]::UTF8.GetString($bytes)',
    '$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    '$voice.Rate = 0',
    '$voice.Volume = 100',
    '$voice.Speak($text)',
    '$voice.Dispose()'
  ].join('\r\n');

  const scriptPath = `ella-mini-speak-${Date.now()}.ps1`;
  const fsP = await import('node:fs/promises');
  await fsP.writeFile(scriptPath, ps1, 'utf8');
  try {
    await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], {
      maxBuffer: 50 * 1024 * 1024,
    });
  } finally {
    await fsP.unlink(scriptPath).catch(() => {});
  }
}

async function runOllama(prompt, model = 'llama2:13b', cli = 'ollama') {
  return new Promise((resolve, reject) => {
    const args = ['run', model, prompt, '--hidethinking', '--nowordwrap'];
    const child = spawn(cli, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Ollama exited ${code}: ${stderr}`));
      }
      // Return raw stdout (no sanitization)
      resolve(String(stdout || '').trim());
    });
  });
}

async function getReplyFromLlm(text) {
  const llmCli = process.env.LLM_CLI_PATH || 'ollama';
  const model = process.env.LLM_MODEL || 'llama2:13b';
  try {
    return await runOllama(text, model, llmCli);
  } catch (error) {
    console.error('LLM error:', error.message || error);
    return `Sorry, I couldn't generate a response.`;
  }
}

async function startVoskRecognizer(modelPath) {
  const actualModel = modelPath || DEFAULT_VOSK_MODEL;
  if (!existsSync(actualModel)) {
    console.error('Vosk model not found:', actualModel);
    return null;
  }
  const child = spawn('python', ['-u', VOSK_SCRIPT, actualModel], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  return child;
}

async function listenOnce() {
  if (process.platform !== 'win32') {
    throw new Error('Single-shot listen only supported on Windows');
  }
  const scriptPath = `ella-mini-listen-${Date.now()}.ps1`;
  const ps1 = [
    'Add-Type -AssemblyName System.Speech',
    '$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine',
    '$rec.SetInputToDefaultAudioDevice()',
    '$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))',
    '$result = $rec.Recognize()',
    'if ($result) { Write-Output $result.Text }'
  ].join('\r\n');

  const fsP = await import('node:fs/promises');
  await fsP.writeFile(scriptPath, ps1, 'utf8');
  try {
    const { stdout } = await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', scriptPath], {
      maxBuffer: 50 * 1024 * 1024,
    });
    return String(stdout || '').trim();
  } finally {
    await fsP.unlink(scriptPath).catch(() => {});
  }
}

async function main() {
  console.log('Ella starting. Press Ctrl+C to quit.');
  const args = process.argv.slice(2);
  const useVosk = args.includes('--vosk') || process.env.STT === 'vosk';
  const voskArg = args.find((arg) => arg.startsWith('--vosk-model='));
  const modelPath = voskArg ? voskArg.split('=')[1] : null;

  if (useVosk) {
    const recognizer = await startVoskRecognizer(modelPath);
    if (recognizer) {
      console.log('Vosk recognizer starting...');
      let buffer = '';
      recognizer.stdout.on('data', async (chunk) => {
        buffer += String(chunk);
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        for (const line of lines) {
          const heard = cleanText(line);
          if (!heard) continue;
          if (heard === 'VOSK_READY') {
            console.log('Vosk ready');
            continue;
          }
          console.log('Heard:', heard);
          const reply = await getReplyFromLlm(heard);
          console.log('Reply:', reply);
          await speakSapi(reply);
        }
      });
      recognizer.stderr.on('data', (chunk) => console.error('[VOSK]', cleanText(chunk)));
      recognizer.on('exit', (code) => console.log('Vosk exited', code));
      return;
    }
  }

  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const line = await new Promise((resolve) => rl.question('Type a message, /listen, or /exit: ', resolve));
    const text = String(line || '').trim();
    if (!text) continue;
    if (text.toLowerCase() === '/exit') break;
    if (text.toLowerCase() === '/listen') {
      try {
        const heard = await listenOnce();
        if (!heard) {
          console.log('No speech detected.');
          continue;
        }
        console.log('Heard:', heard);
        const reply = await getReplyFromLlm(heard);
        console.log('Reply:', reply);
        await speakSapi(reply);
      } catch (error) {
        console.error('Listen failed:', error.message || error);
      }
      continue;
    }

    const reply = await getReplyFromLlm(text);
    console.log('Reply:', reply);
    await speakSapi(reply);
  }

  rl.close();
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});