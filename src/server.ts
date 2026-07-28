import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { readFile, unlink } from "node:fs/promises";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import { supabase } from "@/integrations/supabase/client";
const execFile = promisify(execFileCallback);

const defaultOllamaPath = process.platform === "win32" && process.env.LOCALAPPDATA
  ? `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`
  : undefined;

function normalizeCliOutput(stdout: unknown, stderr: unknown) {
  const rawStdout = String(stdout || "").trim();
  const rawStderr = String(stderr || "").trim();

  if (rawStderr) {
    const spinnerOnly = /^[\s⠋⠙⠹⠼⠴⠦⠧⠇\u001b\[\d+m\r\n]*$/.test(rawStderr);
    if (!spinnerOnly) {
      console.error(rawStderr);
    }
  }

  if (!rawStdout) return "";

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

async function runLocalLlmCli(cli: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(cli, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      const stderrText = String(chunk).trim();
      const spinnerOnly = /^[\s⠋⠙⠹⠼⠴⠦⠧⠇\u001b\[\d+m\r\n]*$/.test(stderrText);
      if (!spinnerOnly && stderrText) {
        console.error(stderrText);
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Local LLM CLI exited with code ${code}`));
        return;
      }
      resolve(output.trim());
    });
  });
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function getLocalConfig(env: unknown) {
  const envVars = env as Record<string, string | undefined>;
  return {
    llmUrl: envVars.LLM_API_URL || (typeof process !== "undefined" ? process.env.LLM_API_URL : undefined),
    piperUrl: envVars.PIPER_API_URL || (typeof process !== "undefined" ? process.env.PIPER_API_URL : undefined),
  };
}

async function getSquareCredentials() {
  const { data, error } = await supabase.from("admin_settings").select("setting_value").eq("id", "square").maybeSingle();
  if (error) throw error;
  const settings = data?.setting_value as Record<string, any> | null;
  if (!settings || !settings.app_id || !settings.access_token || !settings.location_id) {
    throw new Error("Square is not configured. Please connect your Square credentials in the admin settings.");
  }
  return settings;
}

async function handleApi(request: Request, env: unknown) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") {
    return jsonResponse({ ok: true });
  }

  if (url.pathname === "/api/square/config") {
    if (request.method !== "GET") {
      return jsonResponse({ success: false, error: "GET required" }, 405);
    }

    try {
      const settings = await getSquareCredentials();
      return jsonResponse({
        success: true,
        connected: true,
        appId: settings.app_id,
        locationId: settings.location_id,
        sandbox: String(settings.app_id).toLowerCase().includes("sandbox"),
      });
    } catch (err: any) {
      return jsonResponse({ success: true, connected: false, error: err.message ?? String(err) });
    }
  }

  if (url.pathname === "/api/square/pay") {
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "POST required" }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const payload = body as Record<string, unknown>;
    const sourceId = String(payload.sourceId ?? "").trim();
    const amountCents = Number(payload.amountCents ?? 0);
    const customerEmail = payload.customerEmail ? String(payload.customerEmail) : undefined;
    const customerName = payload.customerName ? String(payload.customerName) : undefined;

    if (!sourceId || amountCents <= 0) {
      return jsonResponse({ success: false, error: "Missing sourceId or amountCents" }, 400);
    }

    try {
      const settings = await getSquareCredentials();
      const baseUrl = String(settings.access_token).startsWith("sandbox-")
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";
      const paymentRequest: Record<string, unknown> = {
        idempotency_key: crypto.randomUUID(),
        source_id: sourceId,
        amount_money: { amount: amountCents, currency: "USD" },
        location_id: settings.location_id,
        autocomplete: true,
      };
      if (customerEmail) paymentRequest.buyer_email_address = customerEmail;
      if (customerName) paymentRequest.note = `Order payment for ${customerName}`;

      const response = await fetch(`${baseUrl}/v2/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.access_token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(paymentRequest),
      });
      const json = await response.json();
      if (!response.ok || json.errors) {
        return jsonResponse({ success: false, error: json.errors?.[0]?.detail ?? json.errors ?? "Square payment failed" }, response.status || 400);
      }

      return jsonResponse({
        success: true,
        payment: json.payment,
        card: json.payment?.card_details?.card ?? null,
      });
    } catch (err: any) {
      return jsonResponse({ success: false, error: err.message ?? String(err) }, 500);
    }
  }

  const config = getLocalConfig(env);
  const llmUrl = config.llmUrl || (typeof process !== "undefined" ? process.env.LLM_API_URL : undefined);
  const llmModel = (typeof process !== "undefined" ? process.env.LLM_MODEL : undefined) || "llama3:8b";
  const piperUrl = config.piperUrl || (typeof process !== "undefined" ? process.env.PIPER_API_URL : undefined);
  const piperCli = (typeof process !== "undefined" ? process.env.PIPER_CLI_PATH : undefined) as string | undefined;
  const piperModel = (typeof process !== "undefined" ? process.env.PIPER_MODEL : undefined) ?? "tts_models/en/ljspeech/tacotron2-DDC";
  const piperVoice = (typeof process !== "undefined" ? process.env.PIPER_VOICE : undefined);

  if (url.pathname === "/api/command") {
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "POST required" }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const bodyPayload = body as Record<string, unknown>;
    const command = String(bodyPayload.command ?? "").trim();
    const username = String(bodyPayload.username ?? "").trim();
    if (!command) {
      return jsonResponse({ success: false, error: "Command text is required" }, 400);
    }

    const systemPrompt =
      "You are Ella, a friendly personal AI assistant built into a web app. Answer clearly and helpfully in a warm, empathetic tone, and keep responses concise when possible.";
    const prompt = `${systemPrompt}\n\n${username ? `Username: ${username}. ` : ""}Respond to the following command as Ella: ${command}`;

    if (llmUrl) {
      try {
        const response = await fetch(llmUrl.replace(/\/$/, "") + "/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, model: llmModel }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return jsonResponse({ success: false, error: "LLM server request failed", details: errText }, response.status);
        }

        const json = await response.json();
        const text = json.text || json.output || json?.choices?.[0]?.text || json?.choices?.[0]?.message?.content || "";
        const responses = text ? [String(text).trim()] : [];
        return jsonResponse({ success: true, responses });
      } catch (err) {
        return jsonResponse({ success: false, error: "LLM request error", details: String(err) }, 500);
      }
    }

    if (llmCli) {
      const cli = llmCli;
      const isOllama = /ollama/i.test(basename(cli));
      const args = isOllama
        ? ["run", llmModel, prompt, "--hidethinking", "--nowordwrap"]
        : ["--model", llmModel, "--prompt", prompt];

      if (isOllama) {
        try {
          const result = await runLocalLlmCli(cli, args);
          const out = normalizeCliOutput(result, "");
          return jsonResponse({ success: true, responses: out ? [out] : [] });
        } catch (err) {
          return jsonResponse({ success: false, error: "Local LLM CLI failed", details: String(err) }, 500);
        }
      }

      try {
        const { stdout, stderr } = await execFile(cli, args, { maxBuffer: 1024 * 1024 * 50 });
        const out = normalizeCliOutput(stdout, stderr);
        return jsonResponse({ success: true, responses: out ? [out] : [] });
      } catch (err) {
        return jsonResponse({ success: false, error: "Local LLM CLI failed", details: String(err) }, 500);
      }
    }

    return jsonResponse({ success: false, error: "No local LLM configured. Set LLM_API_URL or LLM_CLI_PATH." }, 503);
  }

  if (url.pathname === "/api/tts") {
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "POST required" }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const bodyPayload = body as Record<string, unknown>;
    const text = String(bodyPayload.text ?? "").trim();
    if (!text) {
      return jsonResponse({ success: false, error: "Text is required" }, 400);
    }

    if (piperUrl) {
      try {
        const response = await fetch(piperUrl.replace(/\/$/, "") + "/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: piperVoice, model: piperModel }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return jsonResponse({ success: false, error: "Piper TTS request failed", details: errText }, response.status);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return new Response(buffer, { status: 200, headers: { "content-type": "audio/wav" } });
      } catch (err) {
        return jsonResponse({ success: false, error: "Piper request error", details: String(err) }, 500);
      }
    }

    if (piperCli) {
      const outputFile = `ella-tts-${Date.now()}.wav`;
      const args = ["--text", text, "--output", outputFile, "--model", piperModel];
      if (piperVoice) {
        args.push("--voice", piperVoice);
      }
      try {
        await execFile(piperCli, args, { maxBuffer: 1024 * 1024 * 50 });
        const audioBuffer = await readFile(outputFile);
        await unlink(outputFile).catch(() => undefined);
        return new Response(audioBuffer, { status: 200, headers: { "content-type": "audio/wav" } });
      } catch (err) {
        await unlink(outputFile).catch(() => undefined);
        return jsonResponse({ success: false, error: "Piper CLI error", details: String(err) }, 500);
      }
    }

    return jsonResponse({ success: false, error: "TTS not configured. Set PIPER_API_URL or PIPER_CLI_PATH." }, 503);
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApi(request, env);
      if (apiResponse) {
        return apiResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

