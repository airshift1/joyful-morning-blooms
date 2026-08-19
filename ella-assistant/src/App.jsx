import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  LayoutDashboard,
  MessageSquareText,
  Mic,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Waves,
} from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const storageKeys = {
  messages: 'ella-chat-messages',
  memory: 'ella-memory',
  logs: 'ella-debug-logs',
  shortcuts: 'ella-shortcuts',
  phone: 'ella-phone-number',
  shortcutName: 'ella-shortcut-name',
  selectedVoice: 'ella-selected-voice',
};

const defaultMessages = [
  { id: 1, role: 'assistant', text: 'Welcome back. I remember what you said, and I can help with notes, texts, and next steps.' },
  { id: 2, role: 'user', text: 'Can you help me plan my day?' },
  { id: 3, role: 'assistant', text: 'Absolutely. Start with your most important task, then keep the rest simple and calm.' },
];

const defaultShortcuts = [
  { id: 1, label: 'Check in', action: 'Can you send a quick check-in text?' },
  { id: 2, label: 'Plan day', action: 'What should I do first today?' },
  { id: 3, label: 'Note memory', action: 'Remember that my priority is my family time.' },
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// API base for production (set VITE_ELLA_API_BASE to your public tunnel URL, e.g. https://your-tunnel.example.com)
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ELLA_API_BASE)
  ? String(import.meta.env.VITE_ELLA_API_BASE).replace(/\/$/, '')
  : '';

const buildReply = (text, memory) => {
  const lower = text.toLowerCase();
  const recent = memory.slice(-3).map((item) => item.text).join(' ');

  if (lower.includes('text') || lower.includes('sms') || lower.includes('message')) {
    return 'I can draft a text for you and open your phone messaging app with the message ready.';
  }

  if (lower.includes('plan') || lower.includes('today') || lower.includes('schedule')) {
    return 'Start with your most important task, then pick one follow-up item. Keep the rest light and flexible.';
  }

  if (lower.includes('remember')) {
    return 'I will remember that and keep it in our memory for future replies.';
  }

  if (recent && (lower.includes('family') || lower.includes('work') || lower.includes('health') || lower.includes('trip'))) {
    return `I remember we were talking about ${recent}. I can help keep that in focus and guide the next step.`;
  }

  if (lower.includes('hello') || lower.includes('hi')) {
    return 'Hello. I am ready to help with short answers, texts, planning, and daily tasks.';
  }

  if (lower.includes('weather')) {
    return 'I can help you check the weather, but for live conditions I would need a weather service connected to the app.';
  }

  if (lower.includes('who are you') || lower.includes('what are you')) {
    return 'I am Ella, your local assistant. I can chat, keep context, open texts, and help you plan your day.';
  }

  return 'I understand. I can keep it simple, clear, and useful while remembering what we discussed earlier.';
};

const speakText = (text, voiceName = null, useCoqui = false) => {
  if (useCoqui && typeof navigator !== 'undefined' && navigator.online) {
    // Try Coqui TTS first (HTTP request to proxy)
    const speaker = voiceName || 'en-US';
    fetch(`${API_BASE ? API_BASE : ''}/api/coqui/tts?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(speaker)}`)
      .then((resp) => {
        if (!resp.ok) throw new Error('Coqui TTS failed');
        return resp.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch((err) => {
          console.warn('Failed to play Coqui TTS audio, falling back to browser TTS:', err);
          fallbackToSpeechSynthesis(text, voiceName);
        });
      })
      .catch((err) => {
        console.warn('Coqui TTS request failed, falling back to browser TTS:', err);
        fallbackToSpeechSynthesis(text, voiceName);
      });
  } else {
    fallbackToSpeechSynthesis(text, voiceName);
  }
};

const fallbackToSpeechSynthesis = (text, voiceName = null) => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.15;
  utterance.volume = 1;
  utterance.lang = 'en-US';

  if (voiceName) {
    const v = (window.speechSynthesis.getVoices() || []).find((x) => x.name === voiceName);
    if (v) utterance.voice = v;
  }

  window.speechSynthesis.speak(utterance);
};

function App() {
  const [messages, setMessages] = useState(() => readStorage(storageKeys.messages, defaultMessages));
  const [memory, setMemory] = useState(() => readStorage(storageKeys.memory, []));
  const [shortcuts, setShortcuts] = useState(() => readStorage(storageKeys.shortcuts, defaultShortcuts));
  const [logs, setLogs] = useState(() => readStorage(storageKeys.logs, [{ id: 1, level: 'info', message: 'Ella control hub ready', timestamp: new Date().toLocaleTimeString() }]));
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState(() => readStorage(storageKeys.phone, '+15551234567'));
  const [shortcutDraft, setShortcutDraft] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Ready');
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => readStorage(storageKeys.selectedVoice, null));
  // Ollama model name persisted in localStorage (admin can change)
  const [ollamaModel, setOllamaModel] = useState(() => readStorage('ella-ollama-model', 'llama3:8b'));
  // Discovered models from local Ollama (if available)
  const [modelsList, setModelsList] = useState(() => readStorage('ella-ollama-models', []));
  const [ollamaStatus, setOllamaStatus] = useState('unknown'); // 'unknown' | 'checking' | 'ok' | 'error'
  const [ollamaStatusMsg, setOllamaStatusMsg] = useState('');
  // Coqui TTS: preferred speaker and available speakers list
  const [coquiSpeaker, setCoquiSpeaker] = useState(() => readStorage('ella-coqui-speaker', 'en-US'));
  const [coquiSpeakers, setCoquiSpeakers] = useState(() => readStorage('ella-coqui-speakers', []));
  const [coquiStatus, setCoquiStatus] = useState('unknown'); // 'unknown' | 'checking' | 'ok' | 'error'
  const [coquiStatusMsg, setCoquiStatusMsg] = useState('');
  const [useCoquiTTS, setUseCoquiTTS] = useState(() => readStorage('ella-use-coqui-tts', false));
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const terminalRef = useRef(null);
  const recognitionRef = useRef(null);

  const addLog = (message, level = 'info') => {
    const entry = {
      id: Date.now() + Math.random(),
      level,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [...prev.slice(-24), entry]);
  };

  useEffect(() => {
    localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(storageKeys.memory, JSON.stringify(memory));
  }, [memory]);

  useEffect(() => {
    localStorage.setItem(storageKeys.shortcuts, JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    localStorage.setItem(storageKeys.logs, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(storageKeys.phone, phone);
  }, [phone]);

  useEffect(() => {
    localStorage.setItem(storageKeys.selectedVoice, selectedVoice);
  }, [selectedVoice]);

  // Persist Ollama model selection
  useEffect(() => {
    localStorage.setItem('ella-ollama-model', ollamaModel);
  }, [ollamaModel]);

  // Persist Coqui settings
  useEffect(() => {
    localStorage.setItem('ella-coqui-speaker', coquiSpeaker);
  }, [coquiSpeaker]);

  useEffect(() => {
    localStorage.setItem('ella-use-coqui-tts', useCoquiTTS);
  }, [useCoquiTTS]);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices?.() || [];
      setVoices(v);
      if (!selectedVoice) {
        const female = v.find((x) => /female|zira|samantha|alloy|aria/i.test(x.name));
        if (female) setSelectedVoice(female.name);
        else if (v[0]) setSelectedVoice(v[0].name);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    addLog('System booted and chat memory loaded.', 'info');

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // On mount, check Ollama and Coqui connectivity
  useEffect(() => {
    (async () => {
      await checkOllamaConnection(3000);
      await checkCoquiConnection(3000);
    })();
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      rows: 16,
      cols: 80,
      theme: {
        background: '#0b1220',
        foreground: '#dfeafc',
        cursor: '#7dd3fc',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, monospace',
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.write('Ella terminal ready\r\n');
    term.write('$ system status\r\n');
    term.write('Voice: ready\r\n');
    term.write('Memory: ' + memory.length + ' items\r\n');
    term.write('Shortcuts: ' + shortcuts.length + ' ready\r\n');
    term.write('$ ');

    let buffer = '';
    const handleCommand = () => {
      const command = buffer.trim();
      if (!command) {
        term.write('\r\n$ ');
        buffer = '';
        return;
      }

      if (command === 'help') {
        term.write('help\r\nstatus\r\nclear\r\nshortcuts\r\n$ ');
      } else if (command === 'status') {
        term.write('Voice ready\r\nMemory loaded\r\nSMS ready\r\n$ ');
      } else if (command === 'shortcuts') {
        term.write(shortcuts.map((s) => s.label).join(', ') + '\r\n$ ');
      } else if (command === 'clear') {
        term.clear();
        term.write('$ ');
      } else {
        term.write('Command not found. Try help\r\n$ ');
      }

      buffer = '';
    };

    term.onData((data) => {
      if (data === '\r' || data === '\n') {
        handleCommand();
      } else if (data === '\u007f') {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        buffer += data;
        term.write(data);
      }
    });

    return () => {
      term.dispose();
    };
  }, [memory.length, shortcuts.length]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    setIsThinking(true);
    const userMessage = { id: Date.now(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    addLog(`User message received: ${text}`, 'info');

    const nextMemory = [...memory.slice(-6), { id: Date.now() + 1, text }];
    setMemory(nextMemory);

    // Try calling local Ollama via the dev proxy with streaming progress
    const assistantId = Date.now() + 2;
    // Insert a placeholder assistant message which will be updated progressively
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);
    let lastPartial = '';

    try {
      const finalReply = await queryOllama(text, (partial) => {
        lastPartial = partial;
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: partial } : m)));
      });

      const toSpeak = finalReply || lastPartial || '';
      // Ensure final text is set
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: toSpeak } : m)));
      addLog('Assistant responded via Ollama.', 'success');
      if (toSpeak) speakText(toSpeak, useCoquiTTS ? coquiSpeaker : selectedVoice, useCoquiTTS);
    } catch (err) {
      addLog('Ollama call failed: ' + (err.message || err), 'error');
      const reply = buildReply(text, nextMemory);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: reply } : m)));
      speakText(reply, useCoquiTTS ? coquiSpeaker : selectedVoice, useCoquiTTS);
    } finally {
      setIsThinking(false);
    }
  };

  const addShortcut = () => {
    const label = shortcutDraft.trim();
    if (!label) return;

    const newShortcut = {
      id: Date.now(),
      label: label.split(' ').slice(0, 2).join(' ') || 'New shortcut',
      action: label,
    };

    setShortcuts((prev) => [newShortcut, ...prev].slice(0, 6));
    setShortcutDraft('');
    addLog(`Shortcut added: ${newShortcut.label}`, 'info');
  };

  const launchVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog('Speech recognition is not supported in this browser.', 'warn');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognitionRef.current = recognition;
    recognition.onstart = () => {
      setIsVoiceOn(true);
      setVoiceStatus('Listening');
      addLog('Voice capture started.', 'info');
    };

    recognition.onresult = async (event) => {
      // Some browsers provide multiple results; gather the latest final transcript reliably
      let finalTranscript = '';
      try {
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          // take the most confident alternative from each result
          if (res && res[0] && res[0].transcript) {
            finalTranscript += (res[0].transcript + ' ');
          }
        }
        finalTranscript = finalTranscript.trim();
      } catch (err) {
        // fallback to the simple path
        finalTranscript = (event.results[0] && event.results[0][0] && event.results[0][0].transcript) || '';
      }

      const finalText = (finalTranscript || '').trim();
      addLog(`Raw transcript: ${JSON.stringify(finalTranscript)}`, 'info');

      if (!finalText) {
        addLog('Transcript empty, ignoring.', 'warn');
        return;
      }

      // Try to parse voice commands like: "Ella text John Smith hi" or "text +1555123 hello"
      const cmd = parseVoiceCommand(finalText);
      if (cmd && cmd.type === 'sms') {
        addLog(`Voice shortcut detected. Recipient: ${cmd.recipient} Message: ${cmd.message}`, 'info');
        // trigger the phone shortcut flow using the parsed recipient and message
        await triggerShortcutWithRecipient(cmd.recipient, cmd.message);
        // update UI with clear entries
        setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: finalText }]);
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: `Sending message to ${cmd.recipient}` }]);
        setInput('');
        return;
      }

      // default behavior: insert transcribed text into composer and send as chat
      setInput(finalText);
      addLog(`Voice transcript captured (chat): ${finalText}`, 'info');
      // small delay to allow UI update then send
      setTimeout(() => sendMessage(finalText), 200);
    };

    recognition.onerror = (event) => {
      setVoiceStatus('Ready');
      setIsVoiceOn(false);
      addLog(`Voice error: ${event.error}`, 'warn');
    };

    recognition.onend = () => {
      setVoiceStatus('Ready');
      setIsVoiceOn(false);
      addLog('Voice capture ended.', 'info');
    };

    recognition.start();
  };

  const sendText = () => {
    const target = phone.trim() || '+15551234567';
    const body = encodeURIComponent(input.trim() || 'Hi Ella, can you help me?');
    // fallback: open native SMS app with prefilled message
    window.location.href = `sms:${target}?body=${body}`;
    addLog(`Opening SMS flow for ${target}.`, 'info');
  };

  // Send via Apple Shortcuts using the clipboard as the reliable input channel
  // Many iOS versions pass the current page URL into the shortcut when opened via the run-shortcut URL.
  // To avoid the web URL being used as the message, write the intended "PHONE|MESSAGE" to the clipboard
  // then open the shortcut (which should read clipboard contents via Get Clipboard as its first action).
  const sendTextViaShortcut = async (message) => {
    const shortcutName = readStorage(storageKeys.shortcutName, 'Ella Send SMS');
    const phoneNumber = (phone || '').trim();
    if (!phoneNumber) {
      addLog('No phone number configured for shortcuts.', 'warn');
      return;
    }

    const raw = `${phoneNumber}|${message}`;
    addLog(`Preparing shortcut payload: ${raw}`, 'info');

    // Try to write to the clipboard first (requires HTTPS and user gesture)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(raw);
        addLog('Payload written to clipboard.', 'info');
      } else {
        addLog('Clipboard API not available; shortcut may receive the page URL instead.', 'warn');
      }
    } catch (err) {
      addLog('Failed to write to clipboard: ' + (err.message || err), 'warn');
    }

    // Open the shortcut by name. The shortcut should start with Get Clipboard to read the payload.
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
    addLog(`Opening Shortcuts app to run: ${shortcutName}`, 'info');

    // Attempt to open the shortcuts URL
    window.location.href = url;
  };

  const handleShortcutAction = (shortcut) => {
    // Shortcut actions send directly via phone shortcut rather than putting text into chat
    const message = shortcut.action || shortcut.label || '';
    if (!message) return;
    addLog(`Sending via phone shortcut: ${message}`, 'info');
    triggerShortcutWithRecipient(readStorage(storageKeys.phone, ''), message);
  };

  // Parse simple voice commands to extract recipient and message.
  // Supports:
  //  - "text John Smith hi"
  //  - "Ella text John Smith hi"
  //  - "text +15551234567 hi"
  const parseVoiceCommand = (text) => {
    const t = text.trim();
    // Normalize leading wakeword
    const normalized = t.replace(/^ella[,\s]*/i, '').trim();

    // Regex: text <recipient> <message>
    const m = normalized.match(/^(?:text|send (?:a )?text(?: message)?(?: to)?)[\s,]+(.+?)\s+(?:saying|that|says|:|-|,)??\s*(.+)$/i);
    if (m && m[1] && m[2]) {
      const recipient = m[1].trim();
      const message = m[2].trim();
      return { type: 'sms', recipient, message };
    }

    // Fallback: if starts with a plus and digits
    const m2 = normalized.match(/^(?:text|send text)\s+([+\d][\d\s-]+)\s+(.+)$/i);
    if (m2 && m2[1] && m2[2]) {
      return { type: 'sms', recipient: m2[1].replace(/\s+/g, ''), message: m2[2].trim() };
    }

    return null;
  };

  // Query local Ollama (dev proxy: /api/ollama) with optional streaming progress callback
  const queryOllama = async (text, onProgress) => {
    const modelName = (ollamaModel || readStorage('ella-ollama-model', 'llama3:8b')).trim();
    try {
      const resp = await fetch(`${API_BASE ? API_BASE : ''}/api/ollama/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: text }],
          stream: true,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Ollama error ${resp.status}: ${body}`);
      }

      // If server streams data, read the body as a stream and invoke onProgress with accumulated text
      if (resp.body && onProgress) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = '';

        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;

            // Try to clean common 'data: ' NDJSON prefixes
            const cleaned = accumulated.replace(/\ndata: /g, '\n');

            // Provide the raw cleaned stream to the UI for progressive updates
            try {
              onProgress(cleaned);
            } catch (e) {
              // ignore progress handler errors
            }
          }
        }

        // Attempt to extract a final textual reply from the streamed content
        const lines = accumulated.trim().split(/\r?\n/).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          try {
            const j = JSON.parse(line);
            if (j.response) return j.response;
            if (j.choices && j.choices[0]) {
              const ch = j.choices[0];
              if (ch.message && ch.message.content) return ch.message.content;
              if (ch.text) return ch.text;
            }
            if (j.text) return j.text;
          } catch (e) {
            // not JSON, continue
          }
        }

        // Fallback: return the cleaned accumulated text
        return accumulated;
      }

      // Non-streaming response path
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        if (data.response) return data.response;
        if (data.choices && data.choices[0]) {
          const ch = data.choices[0];
          if (ch.message && ch.message.content) return ch.message.content;
          if (ch.text) return ch.text;
        }
        if (data.text) return data.text;
        return JSON.stringify(data);
      } else {
        const textResp = await resp.text();
        const lines = textResp.trim().split('\n').filter(Boolean);
        try {
          const last = lines[lines.length - 1];
          const parsed = JSON.parse(last);
          if (parsed.response) return parsed.response;
        } catch {}
        return textResp;
      }
    } catch (err) {
      throw err;
    }
  };

    // Check local Ollama connectivity and discover models (best-effort)
    const checkOllamaConnection = async (timeoutMs = 3000) => {
      setOllamaStatus('checking');
      setOllamaStatusMsg('Checking Ollama...');
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        // First try to list models (common Ollama endpoint)
        let resp = await fetch(`${API_BASE ? API_BASE : ''}/api/ollama/v1/models`, { signal: controller.signal });
        clearTimeout(id);

        if (resp.ok) {
          try {
            const data = await resp.json();
            // Accept an array of model names or array of objects { name }
            let list = [];
            if (Array.isArray(data)) {
              if (data.length && typeof data[0] === 'string') list = data;
              else if (data.length && data[0].name) list = data.map((m) => m.name);
            }
            if (Array.isArray(data) && data.length && data[0] && data[0].name) {
              list = data.map((m) => m.name);
            }
            if (list.length) {
              setModelsList(list);
              localStorage.setItem('ella-ollama-models', JSON.stringify(list));
              const validModel = list.includes(ollamaModel) ? ollamaModel : list[0];
              setOllamaModel(validModel);
            }
            setOllamaStatus('ok');
            setOllamaStatusMsg('Connected (models discovered)');
            addLog('Ollama: models discovered: ' + (list.join(', ') || 'none'), 'info');
            return { ok: true, models: list };
          } catch (e) {
            // fall through to chat test
          }
        }

        // Fallback: try a lightweight chat test
        const fallbackModel = ollamaModel || 'llama3:8b';
        setOllamaStatusMsg('Attempting chat test...');
        const testResp = await fetch(`${API_BASE ? API_BASE : ''}/api/ollama/v1/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [{ role: 'user', content: 'ping' }],
            stream: false,
          }),
        });

        if (testResp.ok) {
          setOllamaStatus('ok');
          setOllamaStatusMsg('Connected');
          addLog('Ollama chat endpoint responded.', 'info');
          return { ok: true };
        }

        const body = await testResp.text().catch(() => '');
        throw new Error('Unexpected response: ' + (body || testResp.status));
      } catch (err) {
        setOllamaStatus('error');
        setOllamaStatusMsg('Not reachable');
        addLog('Ollama connection failed: ' + (err.message || err), 'warn');
        return { ok: false, error: err };
      }
    };

      // Check local Coqui TTS connectivity and discover speakers (best-effort)
      const checkCoquiConnection = async (timeoutMs = 3000) => {
        setCoquiStatus('checking');
        setCoquiStatusMsg('Checking Coqui TTS...');
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);

          // Try to get speakers list
          let resp = await fetch(`${API_BASE ? API_BASE : ''}/api/coqui/speakers`, { signal: controller.signal });
          clearTimeout(id);

          if (resp.ok) {
            try {
              const data = await resp.json();
              // Common Coqui response: { speakers: [...] } or array of speaker names
              let list = [];
              if (data.speakers && Array.isArray(data.speakers)) list = data.speakers;
              else if (Array.isArray(data)) list = data;
              else if (data.speaker_ids && Array.isArray(data.speaker_ids)) list = data.speaker_ids;

              if (list.length) {
                setCoquiSpeakers(list);
                localStorage.setItem('ella-coqui-speakers', JSON.stringify(list));
                if (!coquiSpeaker || !list.includes(coquiSpeaker)) {
                  const femaleish = list.find((s) => /female|woman|girl|f\d/i.test(s));
                  if (femaleish) setCoquiSpeaker(femaleish);
                  else setCoquiSpeaker(list[0]);
                }
              }
              setCoquiStatus('ok');
              setCoquiStatusMsg('Connected');
              addLog('Coqui TTS: speakers discovered: ' + (list.join(', ') || 'none'), 'info');
              return { ok: true, speakers: list };
            } catch (e) {
              // Try a simple TTS request as fallback test
            }
          }

          // Fallback: test a simple TTS request
          setCoquiStatusMsg('Attempting TTS test...');
          const testResp = await fetch(`${API_BASE ? API_BASE : ''}/api/coqui/tts?text=hello&speaker=${encodeURIComponent(coquiSpeaker || 'en-US')}`, {
            signal: controller.signal,
          });

          if (testResp.ok) {
            setCoquiStatus('ok');
            setCoquiStatusMsg('Connected');
            addLog('Coqui TTS endpoint responded.', 'info');
            return { ok: true };
          }

          throw new Error('Unexpected response: ' + testResp.status);
        } catch (err) {
          setCoquiStatus('error');
          setCoquiStatusMsg('Not reachable');
          addLog('Coqui TTS connection failed: ' + (err.message || err), 'warn');
          return { ok: false, error: err };
        }
      };

    // Trigger the Apple Shortcut by writing RECIPIENT|MESSAGE to clipboard then opening Shortcuts.
    const triggerShortcutWithRecipient = async (recipient, message) => {    const shortcutName = readStorage(storageKeys.shortcutName, 'Ella Send SMS');
    if (!recipient || !message) {
      addLog('Missing recipient or message for shortcut trigger.', 'warn');
      return;
    }
    const raw = `${recipient}|${message}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(raw);
        addLog('Shortcut payload written to clipboard.', 'info');
      } else {
        addLog('Clipboard API not available; shortcut may get the page URL instead.', 'warn');
      }
    } catch (err) {
      addLog('Failed to write to clipboard: ' + (err.message || err), 'warn');
    }

    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
    addLog(`Opening Shortcuts app to run: ${shortcutName}`, 'info');
    window.location.href = url;
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-icon"><Sparkles size={18} /></div>
          <div>
            <div className="eyebrow">Ella OS</div>
            <h1>Control hub</h1>
          </div>
        </div>

        <nav className="nav-stack">
          <button className={`nav-item ${selectedTab==='dashboard' ? 'active' : ''}`} onClick={()=>setSelectedTab('dashboard')}><LayoutDashboard size={16} /> Dashboard</button>
          <button className={`nav-item ${selectedTab==='chat' ? 'active' : ''}`} onClick={()=>setSelectedTab('chat')}><MessageSquareText size={16} /> Chat</button>
          <button className={`nav-item ${selectedTab==='memory' ? 'active' : ''}`} onClick={()=>setSelectedTab('memory')}><BrainCircuit size={16} /> Memory</button>
          <button className={`nav-item ${selectedTab==='admin' ? 'active' : ''}`} onClick={()=>setSelectedTab('admin')}><ShieldCheck size={16} /> Admin</button>
        </nav>

        <div className="mini-card">
          <div className="mini-label">Voice</div>
          <div className="status-line">
            <span className={`dot ${isVoiceOn ? 'on' : ''}`} />
            {voiceStatus}
          </div>
          <button className="primary-button" onClick={launchVoice}><Mic size={16} /> Start voice</button>
        </div>

        <div className="mini-card">
          <div className="mini-label">Quick actions</div>
          <div className="chip-list">
            {shortcuts.slice(0, 3).map((item) => (
              <button key={item.id} className="chip" onClick={() => setInput(item.action)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Assistant</div>
            <h2>Ella chat</h2>
          </div>
          <div className="live-pill"><Bot size={14} /> online</div>
        </header>

        {/* Connection banner: shows LLM (Ollama) and TTS (Coqui/browser) status with quick actions */}
        <div className="connection-banner" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#0f1724',color:'#e6eef8',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <span style={{display:'inline-block',width:10,height:10,borderRadius:10,background: ollamaStatus === 'ok' ? '#22c55e' : ollamaStatus === 'checking' ? '#f59e0b' : '#ef4444'}}></span>
            <strong style={{marginLeft:4}}>LLM:</strong>
            <span style={{marginLeft:6}}>{ollamaStatusMsg || (ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'checking' ? 'Checking...' : 'Not reachable')}</span>

            <span style={{width:12}} />

            <span style={{display:'inline-block',width:10,height:10,borderRadius:10,background: coquiStatus === 'ok' ? '#22c55e' : coquiStatus === 'checking' ? '#f59e0b' : '#ef4444'}}></span>
            <strong style={{marginLeft:4}}>TTS:</strong>
            <span style={{marginLeft:6}}>{coquiStatusMsg || (coquiStatus === 'ok' ? 'Connected' : coquiStatus === 'checking' ? 'Checking...' : 'Not reachable')}</span>
          </div>

          <div>
            <button className="ghost-button" onClick={async ()=>{ addLog('Rechecking Ollama & Coqui...', 'info'); await checkOllamaConnection(3000); await checkCoquiConnection(3000); }}>Recheck</button>
            <button className="secondary-button" style={{marginLeft:8}} onClick={()=>{ setSelectedTab('admin'); addLog('Opening admin tab','info'); }}>Open Admin</button>
          </div>
        </div>

        {selectedTab === 'chat' && (
          <section className="chat-card">
            <div className="message-list">
              {messages.map((message) => (
                <div key={message.id} className={`bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
                  {message.text}
                </div>
              ))}
              {isThinking && <div className="bubble assistant typing">Ella is thinking...</div>}
            </div>

            <div className="composer">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="Ask Ella anything..."
                onKeyDown={handleComposerKeyDown}
              />
              <div className="composer-actions">
                <button className="secondary-button" onClick={() => sendMessage()}><Send size={16} /> Send</button>
                <button className="ghost-button" onClick={launchVoice}><Mic size={16} /> Speech</button>
              </div>
            </div>
          </section>
        )}

        {selectedTab === 'admin' && (
          <section className="chat-card admin-full">
            <div className="admin-grid">
              <div className="admin-settings">
                <div className="panel-header"><ShieldCheck size={16} /> <span>Settings</span></div>
                <label>Default phone number</label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+1 555 123 4567" />

                <label style={{marginTop:10}}>Phone Shortcut name</label>
                <input value={readStorage(storageKeys.shortcutName,'Ella Send SMS')} onChange={(e)=>{ localStorage.setItem(storageKeys.shortcutName, e.target.value); addLog('Shortcut name set: '+e.target.value,'info'); }} placeholder="Ella Send SMS" />

                <label style={{marginTop:10}}>LLM Model</label>
                {modelsList && modelsList.length > 0 ? (
                  <select value={ollamaModel} onChange={(e)=>{ setOllamaModel(e.target.value); addLog('Ollama model set: '+e.target.value,'info'); }}>
                    {modelsList.map((m)=> <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input value={ollamaModel} onChange={(e)=>{ setOllamaModel(e.target.value); addLog('Ollama model set: '+e.target.value,'info'); }} placeholder="llama2" />
                )}

                <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                  <button className="secondary-button" onClick={async ()=>{
                    addLog('Testing Ollama connection...', 'info');
                    const testId = Date.now() + Math.random();
                    setMessages((prev)=>[...prev, { id: testId, role: 'assistant', text: 'Testing Ollama...' }]);
                    try {
                      await queryOllama('Hello from Ella. Please reply with a short confirmation message.', (partial)=>{
                        setMessages((prev)=> prev.map(m => m.id === testId ? { ...m, text: partial } : m));
                      });
                      addLog('Ollama test completed', 'success');
                    } catch (err) {
                      addLog('Ollama test failed: ' + (err.message || err), 'error');
                      setMessages((prev)=> prev.map(m => m.id === testId ? { ...m, text: 'Ollama test failed: ' + (err.message || err) } : m));
                    }
                  }}>Test Ollama</button>

                  <button className="ghost-button" onClick={async ()=>{ addLog('Rechecking Ollama...', 'info'); await checkOllamaConnection(3000); }}>{ollamaStatus === 'ok' ? 'Reconnect' : 'Reconnect'}</button>

                  <div style={{marginLeft:8}}>
                    <span style={{display:'inline-block', width:10, height:10, borderRadius:10, background: ollamaStatus === 'ok' ? '#22c55e' : ollamaStatus === 'checking' ? '#f59e0b' : '#ef4444', marginRight:8}}></span>
                    <small>{ollamaStatusMsg || (ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'checking' ? 'Checking...' : 'Not reachable')}</small>
                  </div>
                </div>

                <label style={{marginTop:10}}>TTS Engine</label>
                <div style={{display:'flex', gap:8, marginBottom:8}}>
                  <label style={{display:'flex', alignItems:'center', gap:6}}>
                    <input type="radio" name="tts-engine" checked={!useCoquiTTS} onChange={()=>setUseCoquiTTS(false)} />
                    Browser (System)
                  </label>
                  <label style={{display:'flex', alignItems:'center', gap:6}}>
                    <input type="radio" name="tts-engine" checked={useCoquiTTS} onChange={()=>setUseCoquiTTS(true)} />
                    Coqui TTS
                  </label>
                </div>

                {useCoquiTTS && (
                  <>
                    <label style={{marginTop:10}}>Coqui Speaker</label>
                    {coquiSpeakers && coquiSpeakers.length > 0 ? (
                      <select value={coquiSpeaker} onChange={(e)=>{ setCoquiSpeaker(e.target.value); addLog('Coqui speaker set: '+e.target.value,'info'); }}>
                        {coquiSpeakers.map((s)=> <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input value={coquiSpeaker} onChange={(e)=>{ setCoquiSpeaker(e.target.value); addLog('Coqui speaker set: '+e.target.value,'info'); }} placeholder="en-US" />
                    )}

                    <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                      <button className="secondary-button" onClick={async ()=>{ addLog('Rechecking Coqui...', 'info'); await checkCoquiConnection(3000); }}>Reconnect</button>
                      <div>
                        <span style={{display:'inline-block', width:10, height:10, borderRadius:10, background: coquiStatus === 'ok' ? '#22c55e' : coquiStatus === 'checking' ? '#f59e0b' : '#ef4444', marginRight:8}}></span>
                        <small>{coquiStatusMsg || (coquiStatus === 'ok' ? 'Connected' : coquiStatus === 'checking' ? 'Checking...' : 'Not reachable')}</small>
                      </div>
                    </div>
                  </>
                )}

                {!useCoquiTTS && (
                  <>
                    <label style={{marginTop:10}}>Browser Voice</label>
                    <select value={selectedVoice || ''} onChange={(e)=>setSelectedVoice(e.target.value)}>
                      {voices.map((v)=> <option key={v.name} value={v.name}>{v.name} {v.lang ? `(${v.lang})` : ''}</option>)}
                    </select>
                  </>
                )}

                <div style={{marginTop:12}}>
                  <button className="primary-button" onClick={()=>{ speakText('Hello, this is a voice test.', useCoquiTTS ? coquiSpeaker : selectedVoice, useCoquiTTS); addLog('Voice test triggered','info'); }}>Test voice</button>
                </div>
                        </div>

                        <div className="admin-terminal">
                          <div className="panel-header"><TerminalSquare size={16} /> <span>Debug terminal</span></div>
                          <div ref={terminalRef} className="terminal" />
                        </div>

                        <div className="admin-logs">
                          <div className="panel-header"><ShieldCheck size={16} /> <span>Debug log</span></div>
                          <ul className="log-list">
                            {logs.slice(-40).reverse().map((entry) => (
                              <li key={entry.id} className={entry.level}>
                                <span>{entry.timestamp}</span>
                                <strong>{entry.level}</strong>
                                <p>{entry.message}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </section>
                  )}
                </main>

                <aside className="right-rail">
                  {selectedTab !== 'admin' && (
                    <>
                      <div className="panel card">
                        <div className="panel-header">
                          <Phone size={16} />
                          <span>Texting</span>
                        </div>
                        <label>Phone number</label>
                        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" />
                        <div style={{display:'flex',gap:8,marginTop:8}}>
                          <button className="primary-button wide" onClick={sendText}>Open SMS</button>
                          <button className="secondary-button wide" onClick={() => sendTextViaShortcut(input || 'Hello Ella')} style={{padding:'10px 12px'}}>Send via Phone Shortcut</button>
                        </div>
                      </div>

                      <div className="panel card">
                        <div className="panel-header">
                          <BrainCircuit size={16} />
                          <span>Memory</span>
                        </div>
                        <ul className="memory-list">
                          {memory.slice(-4).reverse().map((item) => (
                            <li key={item.id}>{item.text}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="panel card">
                        <div className="panel-header">
                          <Waves size={16} />
                          <span>Shortcuts</span>
                        </div>
                        <div className="shortcut-row">
                          <input value={shortcutDraft} onChange={(event) => setShortcutDraft(event.target.value)} placeholder="Add shortcut" />
                          <button className="icon-button" onClick={addShortcut}><Plus size={16} /></button>
                        </div>
                        <div className="shortcut-list">
                          {shortcuts.map((shortcut) => (
                            <button key={shortcut.id} className="shortcut-pill" onClick={() => handleShortcutAction(shortcut)}>
                              {shortcut.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="panel card logs-card">
                        <div className="panel-header">
                          <ShieldCheck size={16} />
                          <span>Debug log</span>
                        </div>
                        <ul className="log-list">
                          {logs.slice(-8).reverse().map((entry) => (
                            <li key={entry.id} className={entry.level}>
                              <span>{entry.timestamp}</span>
                              <strong>{entry.level}</strong>
                              <p>{entry.message}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </aside>
    </div>
  );
}

export default App;
