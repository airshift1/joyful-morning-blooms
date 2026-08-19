// Vercel Serverless API that forwards requests to the user's Cloudflare Tunnel endpoint
// and injects the secret header so the tunnel proxy can validate the caller.

export default async function handler(req, res) {
  const base = process.env.VITE_ELLA_API_BASE || process.env.ELLA_API_BASE;
  const serverKey = process.env.ELLA_SERVER_KEY;
  if (!base) return res.status(500).json({ error: 'ELLA API base not configured on Vercel' });
  if (!serverKey) return res.status(500).json({ error: 'Server key not configured on Vercel' });

  const target = base.replace(/\/$/, '') + req.url.replace(/^\/api\/proxy/, '');

  try {
    const headers = { ...req.headers };
    // remove host to avoid host mismatch
    delete headers.host;
    // inject server key
    headers['x-ella-server-key'] = serverKey;

    const fetchOptions = {
      method: req.method,
      headers,
      // body for non-GET/HEAD
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    };

    const upstream = await fetch(target, fetchOptions);

    // pipe status, headers and body
    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      // avoid overriding Vercel's own headers
      if (name.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(name, value);
    });

    // Stream the response body back to client
    if (upstream.body) {
      upstream.body.pipeTo(new WritableStream({
        write(chunk) { res.write(Buffer.from(chunk)); },
        close() { res.end(); },
        abort() { res.end(); }
      })).catch(() => { res.end(); });
    } else {
      const text = await upstream.text();
      res.send(text);
    }
  } catch (err) {
    res.status(502).json({ error: 'Upstream proxy failed', details: err.message });
  }
}
