import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Simple authenticated proxy to expose local Ollama and Coqui to a public tunnel.
// WARNING: Exposing your local LLM to the public internet can be risky. Use a strong key
// and Cloudflare Tunnel with ACLs.

const app = express();
const PORT = process.env.ELLA_PROXY_PORT ? Number(process.env.ELLA_PROXY_PORT) : 3005;
const API_KEY = process.env.ELLA_SERVER_KEY || process.env.ELLA_API_KEY || 'change-me-please';

// Basic API key middleware
app.use((req, res, next) => {
  const key = req.get('x-ella-server-key') || req.get('x-api-key') || req.query.api_key;
  if (!key || key !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

// Proxy /api/ollama -> http://localhost:11434
app.use('/api/ollama', createProxyMiddleware({
  target: 'http://127.0.0.1:11434',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/ollama': '' },
  proxyTimeout: 120000,
  timeout: 120000,
  onProxyReq(proxyReq, req, res) {
    // pass through
  },
}));

// Proxy /api/coqui -> http://127.0.0.1:5002
app.use('/api/coqui', createProxyMiddleware({
  target: 'http://127.0.0.1:5002',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/api/coqui': '' },
  proxyTimeout: 120000,
  timeout: 120000,
}));

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Ella proxy running' });
});

app.listen(PORT, () => {
  console.log(`Ella proxy listening on http://localhost:${PORT} - remember to set ELLA_SERVER_KEY for security`);
});
