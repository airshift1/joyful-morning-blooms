#!/usr/bin/env node
// Simple test harness for a local LLM + Piper TTS.
// Usage: set LLM_API_URL or ensure `ollama` is on PATH and model is installed (default model: llama3-8b)
// Optionally set PIPER_API_URL to generate audio for each response.

import { execFile as execFileCallback, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';

const execFile = promisify(execFileCallback);

const LLM_API_URL = process.env.LLM_API_URL;
const defaultOllamaPath = process.platform === 'win32' && process.env.LOCALAPPDATA
  ? `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`
  : undefined;
const LLM_CLI = process.env.LLM_CLI_PATH || defaultOllamaPath || 'ollama';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3:8b';
const PIPER_API_URL = process.env.PIPER_API_URL;
const PIPER_CLI_PATH = process.env.PIPER_CLI_PATH;
const TEST_COUNT = Number(process.env.LLM_TEST_QUESTIONS || process.env.TEST_QUESTIONS || 0);

async function runOllamaCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(LLM_CLI, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      const rawStderr = String(chunk).trim();
      const spinnerOnly = /^[\s⠋⠙⠹⠼⠴⠦⠧⠇\u001b\[\d+m\r\n]*$/.test(rawStderr);
      if (!spinnerOnly && rawStderr) {
        console.error(rawStderr);
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`LLM CLI exited with code ${code}`));
        return;
      }
      resolve(output.trim());
    });
  });
}

const questions = [
  'What is the weather like today in simple terms?',
  'Explain photosynthesis in 2-3 sentences.',
  'Write a friendly greeting to a new user joining a chat app.',
  'What are three healthy dinner ideas?',
  'How do I reset my password on a website? Step-by-step.',
  'Summarize the plot of Romeo and Juliet in one paragraph.',
  'Give me a short motivational quote.',
  'What is the fastest land animal and why?',
  'Describe how to make a paper airplane.',
  'List five uses for a paperclip.',
  'How do I bake a basic chocolate chip cookie? Give a short recipe.',
  'What is the capital of France?',
  'Explain the difference between HTTP and HTTPS.',
  'Give a brief explanation of machine learning for beginners.',
  'What is the significance of the number pi?',
  'How can I improve my sleep hygiene?',
  'What causes rainbows to form?',
  'Explain what a blockchain is in simple terms.',
  'How do I create a small budget for monthly expenses?',
  'Give three tips for learning a new language quickly.',
  'What is the role of a product manager?',
  'Explain recursion with a short example.',
  'Name three renewable energy sources and a pro for each.',
  'How do I clean a coffee maker safely?',
  'What are the basics of version control with git?',
  'How do I make coffee with a French press? Short steps.',
  'Describe the lifecycle of a butterfly in one paragraph.',
  'Give a troubleshooting step if my Wi-Fi is slow.',
  'Write a two-line lullaby for a baby.',
  'How does photosynthesis differ from cellular respiration?'
];

async function askLLM(question) {
  if (LLM_API_URL) {
    try {
      const url = LLM_API_URL.replace(/\/$/, '') + '/generate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, model: LLM_MODEL })
      });
      if (!res.ok) {
        throw new Error(`LLM HTTP error: ${res.status} ${await res.text()}`);
      }
      const json = await res.json();
      return (json.text || json.output || json?.choices?.[0]?.text || '').trim();
    } catch (err) {
      throw new Error(`LLM API call failed: ${err.message || err}`);
    }
  }

  // Fallback to CLI (ollama run <model> <prompt>)
  try {
    const args = ['run', LLM_MODEL, question, '--hidethinking', '--nowordwrap'];
    const rawOut = await runOllamaCli(args);

    try {
      const parsed = JSON.parse(rawOut);
      return String(parsed.response || parsed.output || parsed.text || parsed.result || parsed?.choices?.[0]?.text || '').trim() || rawOut;
    } catch {
      return rawOut;
    }
  } catch (err) {
    throw new Error(`LLM CLI call failed: ${err.message || err}`);
  }
}

function humanizeSpeechText(text) {
  const cleaned = text.replace(/\s*\n+\s*/g, ' ').trim();
  return cleaned
    .replace(/,\s*/g, ', ... ')
    .replace(/;\s*/g, '; ... ')
    .replace(/:\s*/g, ': ... ')
    .replace(/\b(and|but|so|then|well|also|however|meanwhile|right|okay|actually)\b/gi, '$1... ')
    .replace(/\.\.\.\s*/g, '... ')
    .replace(/\s{2,}/g, ' ');
}

// Build SSML from plain text with small micro-prosody variations and controlled breaks.
function textToSsml(text, opts = {}) {
  const { breath = false, style = 'neutral' } = opts;
  const cleaned = text.replace(/\s*\n+\s*/g, ' ').trim();

  // Split into sentences (keep punctuation)
  const sentences = cleaned.match(/[^.!?]+[.!?"']?|[^.!?]+$/g) || [cleaned];

  const ssmlParts = sentences.map((s, idx) => {
    const sentence = s.trim();
    if (!sentence) return '';

    // small pitch in semitones and rate multiplier
    const pitchDelta = (Math.random() * 3 - 1.5).toFixed(2) + 'st';
    const rate = (0.98 + Math.random() * 0.06).toFixed(2);

    // choose break after this sentence based on punctuation
    const endPunct = sentence.slice(-1);
    let breakMs = 500;
    if (endPunct === ',') breakMs = 260;
    else if (endPunct === ';' || endPunct === ':') breakMs = 360;
    else if (endPunct === '.' || endPunct === '!' || endPunct === '?') breakMs = 520;

    // style adjustments
    let emphasisOpen = '';
    let emphasisClose = '';
    if (style === 'excited' && idx % 3 === 0) {
      emphasisOpen = '<emphasis level="moderate">';
      emphasisClose = '</emphasis>';
    }

    let part = `<prosody pitch="${pitchDelta}" rate="${rate}">` + emphasisOpen + escapeXml(sentence) + emphasisClose + `</prosody>`;
    part += `<break time="${breakMs}ms"/>`;

    // optionally insert a breath marker (as a short break) between long sentences
    if (breath && sentence.length > 60) {
      part += '<break time="120ms"/>';
    }

    return part;
  });

  return `<speak>${ssmlParts.join('')}</speak>`;
}

function escapeXml(str) {
  return str.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c]));
}

async function ttsPiper(text, index) {
  const speechText = humanizeSpeechText(text);
  const filename = `test-llm-response-${index}.wav`;

  if (PIPER_API_URL) {
    const url = PIPER_API_URL.replace(/\/$/, '') + '/api/tts';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: speechText, model: process.env.PIPER_MODEL, voice: process.env.PIPER_VOICE })
    });
    if (!res.ok) {
      throw new Error(`Piper TTS error: ${res.status} ${await res.text()}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(filename, buf);
    return filename;
  }

  if (PIPER_CLI_PATH) {
    const args = ['--text', speechText, '--output', filename];
    if (process.env.PIPER_MODEL) args.push('--model', process.env.PIPER_MODEL);
    if (process.env.PIPER_VOICE) args.push('--voice', process.env.PIPER_VOICE);
    await execFile(PIPER_CLI_PATH, args, { maxBuffer: 1024 * 1024 * 50 });
    return filename;
  }

  throw new Error('PIPER_API_URL or PIPER_CLI_PATH is required for TTS');
}

async function runTests() {
  const testQuestions = TEST_COUNT > 0 ? questions.slice(0, TEST_COUNT) : questions;
  console.log('Starting LLM + TTS tests. Questions:', testQuestions.length);
  if (TEST_COUNT > 0) {
    console.log(`Limiting test run to first ${TEST_COUNT} questions via LLM_TEST_QUESTIONS or TEST_QUESTIONS.`);
  }
  const failures = [];
  for (let i = 0; i < testQuestions.length; i++) {
    const q = testQuestions[i];
    console.log(`\n[${i + 1}/${questions.length}] Q: ${q}`);
    try {
      const start = Date.now();
      const ans = await askLLM(q);
      const took = (Date.now() - start) / 1000;
      if (!ans) {
        console.error(' -> FAIL: empty response');
        failures.push({ index: i, question: q, error: 'empty response' });
        continue;
      }
      console.log(` -> OK (${took}s): ${ans.slice(0, 400)}`);

      // Generate SSML for inspection and optional TTS.
      try {
        const ssml = textToSsml(ans, { breath: true, style: 'neutral' });
        const ssmlFile = `test-llm-response-${i + 1}.ssml`;
        await writeFile(ssmlFile, ssml, 'utf8');
        console.log(`    SSML written: ${ssmlFile}`);
      } catch (err) {
        console.error('    SSML generation failed:', err.message || err);
        failures.push({ index: i, question: q, error: 'ssml_failed', details: String(err) });
      }

      if (PIPER_API_URL || PIPER_CLI_PATH) {
        try {
          const file = await ttsPiper(ans, i + 1);
          console.log(`    TTS saved: ${file}`);
        } catch (err) {
          console.error('    TTS FAIL:', err.message || err);
          failures.push({ index: i, question: q, error: 'tts failed', details: String(err) });
        }
      }
    } catch (err) {
      console.error(' -> ERROR:', err.message || err);
      failures.push({ index: i, question: q, error: String(err) });
    }
  }

  console.log('\nTest run complete.');
  if (failures.length === 0) {
    console.log('All questions passed.');
  } else {
    console.log(`${failures.length} failures:`);
    failures.forEach((f) => console.log(JSON.stringify(f)));
  }
}

runTests().catch((err) => {
  console.error('Test harness failed:', err);
  process.exit(1);
});
