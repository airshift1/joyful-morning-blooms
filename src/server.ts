import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

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

import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables for server-side operations.");
  return createClient(url, key, { global: { fetch } });
}

async function resolveSquareCredentials(supabase: ReturnType<typeof getServerSupabase>) {
  const envCreds = {
    access_token: process.env.SQUARE_ACCESS_TOKEN ?? null,
    app_id: process.env.SQUARE_APP_ID ?? null,
    location_id: process.env.SQUARE_LOCATION_ID ?? null,
  };

  try {
    const { data: row } = await supabase.from("admin_settings").select("setting_value").eq("id", "square").maybeSingle();
    const dbCreds = row?.setting_value ?? null;
    return {
      access_token: dbCreds?.access_token ?? envCreds.access_token ?? null,
      app_id: dbCreds?.app_id ?? envCreds.app_id ?? null,
      location_id: dbCreds?.location_id ?? envCreds.location_id ?? null,
    };
  } catch (error) {
    console.error("Unable to load Square settings from Supabase, falling back to env:", error);
    return envCreds;
  }
}

async function handleSquareApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const supabase = getServerSupabase();

  if (url.pathname === "/api/square/config") {
    try {
      const creds = await resolveSquareCredentials(supabase);
      const connected = !!(creds.access_token && creds.location_id && creds.app_id);
      const app_id = creds.app_id ?? null;
      const location_id = creds.location_id ?? null;
      return new Response(JSON.stringify({ connected, app_id, location_id }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error("Error reading square config:", e);
      return new Response(JSON.stringify({ connected: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

  if (url.pathname === "/api/square/test" && request.method.toUpperCase() === "GET") {
    try {
      const creds = await resolveSquareCredentials(supabase);
      if (!creds.access_token) {
        return new Response(JSON.stringify({ ok: false, message: "Square not configured" }), { status: 400, headers: { "content-type": "application/json" } });
      }
      const accessToken = creds.access_token;
      // lightweight check: fetch locations (production endpoint)
      const res = await fetch("https://connect.squareup.com/v2/locations", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("Square test fetch failed:", json);
        return new Response(JSON.stringify({ ok: false, status: res.status, details: json }), { status: 502, headers: { "content-type": "application/json" } });
      }
      const locations = Array.isArray(json?.locations) ? json.locations.map((l: any) => ({ id: l.id, name: l.name, status: l.status })) : [];
      return new Response(JSON.stringify({ ok: true, locations }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error("Error in /api/square/test:", e);
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

  if (url.pathname === "/api/square/test-payment" && request.method.toUpperCase() === "POST") {
    try {
      const creds = await resolveSquareCredentials(supabase);
      if (!creds.access_token || !creds.app_id) {
        return new Response(JSON.stringify({ ok: false, message: "Square not configured" }), { status: 400, headers: { "content-type": "application/json" } });
      }
      const appId = (creds.app_id || "").toString().toLowerCase();
      // Allow test-payment only for sandbox app ids
      if (!appId.includes("sandbox")) {
        return new Response(JSON.stringify({ ok: false, message: "Test payments allowed only for sandbox Square apps" }), { status: 403, headers: { "content-type": "application/json" } });
      }

      const accessToken = creds.access_token;
      // Use Square sandbox endpoint
      const sandboxUrl = "https://connect.squareupsandbox.com/v2/payments";
      // Use Square sandbox card nonce for testing
      const sourceId = "cnon:card-nonce-ok";
      const amountCents = 100; // $1.00
      const idempotencyKey = crypto.randomUUID();

      const sqBody = {
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        amount_money: { amount: Number(amountCents), currency: "USD" },
        // optionally include location_id if provided
        location_id: creds.location_id ?? undefined,
      };

      const res = await fetch(sandboxUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sqBody),
      });

      const resJson = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("Square sandbox payment error:", resJson);
        return new Response(JSON.stringify({ ok: false, status: res.status, details: resJson }), { status: 502, headers: { "content-type": "application/json" } });
      }

      return new Response(JSON.stringify({ ok: true, payment: resJson.payment ?? resJson }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error("Error in /api/square/test-payment:", e);
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

  if (url.pathname === "/api/square/pay" && request.method.toUpperCase() === "POST") {
    try {
      const body = await request.json().catch(() => null);
      if (!body) return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } });
      const { sourceId, amountCents, idempotencyKey } = body as any;
      if (!sourceId || !amountCents) return new Response(JSON.stringify({ error: "Missing sourceId or amountCents" }), { status: 400, headers: { "content-type": "application/json" } });

      const creds = await resolveSquareCredentials(supabase);
      if (!creds.access_token || !creds.location_id) {
        return new Response(JSON.stringify({ error: "Square not configured by an admin" }), { status: 400, headers: { "content-type": "application/json" } });
      }

      const accessToken = creds.access_token;
      const locationId = creds.location_id;
      const idemp = idempotencyKey ?? crypto.randomUUID();

      // Call Square create payment
      const sqBody = {
        source_id: sourceId,
        idempotency_key: idemp,
        amount_money: { amount: Number(amountCents), currency: "USD" },
        location_id: locationId,
      };

      const res = await fetch("https://connect.squareup.com/v2/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sqBody),
      });

      const resJson = await res.json();
      if (!res.ok) {
        console.error("Square payment error:", resJson);
        return new Response(JSON.stringify({ error: "Square error", details: resJson }), { status: 502, headers: { "content-type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, payment: resJson }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error("Error in /api/square/pay:", e);
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // handle lightweight API routes here to avoid loading the SSR runtime unnecessarily
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/square")) {
        const apiResp = await handleSquareApi(request);
        if (apiResp) return apiResp;
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
