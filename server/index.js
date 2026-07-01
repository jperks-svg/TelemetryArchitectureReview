import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const TOKEN_FILE = join(DATA_DIR, 'tokens.json');

const app = express();
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'dist')));
}

const GLEAN_BASE = process.env.GLEAN_BASE_URL || 'https://cribl-be.glean.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const SCOPES = 'chat search';

// --- Token persistence ---

function loadTokens() {
  if (existsSync(TOKEN_FILE)) {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  }
  return null;
}

function saveTokens(tokens) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

let tokenStore = loadTokens();

// --- Dynamic Client Registration ---

let clientConfig = null;

async function ensureClient() {
  if (clientConfig) return clientConfig;

  const res = await fetch(`${GLEAN_BASE}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Telemetry Maturity',
      redirect_uris: [`${APP_URL}/api/auth/callback`],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Client registration failed: ${res.status} ${text}`);
  }

  clientConfig = await res.json();
  return clientConfig;
}

// --- PKCE helpers ---

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// In-flight PKCE state
const pendingAuth = new Map();

// --- OAuth endpoints ---

app.get('/api/auth/status', (req, res) => {
  const connected = !!(tokenStore && tokenStore.access_token);
  res.json({ connected });
});

app.get('/api/auth/connect', async (req, res) => {
  try {
    const client = await ensureClient();
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    pendingAuth.set(state, { codeVerifier, createdAt: Date.now() });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: `${APP_URL}/api/auth/callback`,
      scope: SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.json({ url: `${GLEAN_BASE}/oauth/authorize?${params}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  const pending = pendingAuth.get(state);
  if (!pending) {
    return res.redirect('/?auth_error=invalid_state');
  }
  pendingAuth.delete(state);

  try {
    const client = await ensureClient();

    const tokenRes = await fetch(`${GLEAN_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/callback`,
        client_id: client.client_id,
        code_verifier: pending.codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token exchange failed: ${text}`);
    }

    tokenStore = await tokenRes.json();
    saveTokens(tokenStore);

    res.redirect('/?auth_success=true');
  } catch (err) {
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

app.post('/api/auth/disconnect', (req, res) => {
  tokenStore = null;
  if (existsSync(TOKEN_FILE)) {
    writeFileSync(TOKEN_FILE, '{}');
  }
  res.json({ disconnected: true });
});

// --- Token refresh ---

async function getAccessToken() {
  if (!tokenStore || !tokenStore.access_token) {
    throw new Error('Not connected to Glean. Click "Connect to Glean" to authenticate.');
  }

  // If we have a refresh token and the token might be expired, refresh it
  if (tokenStore.refresh_token && tokenStore.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= tokenStore.expires_at - 60) {
      const client = await ensureClient();
      const res = await fetch(`${GLEAN_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenStore.refresh_token,
          client_id: client.client_id,
        }),
      });

      if (res.ok) {
        tokenStore = await res.json();
        if (!tokenStore.expires_at && tokenStore.expires_in) {
          tokenStore.expires_at = Math.floor(Date.now() / 1000) + tokenStore.expires_in;
        }
        saveTokens(tokenStore);
      }
    }
  }

  return tokenStore.access_token;
}

// --- Glean API calls ---

async function gleanChat(message, queryKey) {
  const token = await getAccessToken();
  console.log(`[${queryKey}] Sending chat request to Glean...`);
  const startTime = Date.now();

  const res = await fetch(`${GLEAN_BASE}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      agentId: 'cd5f176f6e154c88a35bef7da4d71009',
    }),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${queryKey}] Glean responded: ${res.status} (${elapsed}s)`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[${queryKey}] Error response body:`, text.slice(0, 500));
    if (res.status === 401) {
      tokenStore = null;
      saveTokens({});
      throw new Error('Glean session expired. Please reconnect.');
    }
    throw new Error(`Glean API error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const rawBody = await res.text();
  console.log(`[${queryKey}] Response content-type: ${contentType}`);
  console.log(`[${queryKey}] Response body (first 500 chars):`, rawBody.slice(0, 500));

  try {
    return JSON.parse(rawBody);
  } catch (e) {
    console.error(`[${queryKey}] Failed to parse JSON:`, e.message);
    return { rawText: rawBody };
  }
}

// --- Discovery endpoint ---

app.post('/api/discover', async (req, res) => {
  const { customerName } = req.body;
  console.log(`\n=== Discovery request for: ${customerName} ===`);

  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  try {
    await getAccessToken();
    console.log('[auth] Token valid');
  } catch (err) {
    console.error('[auth] Token error:', err.message);
    return res.status(401).json({ error: err.message });
  }

  try {
    const queries = [
      {
        key: 'volumes',
        query: `Using the Cloud Telemetry Daily topic, get the latest daily metrics for customer "${customerName}". I need: stream_in_bytes, stream_out_bytes, edge_in_bytes, edge_out_bytes, sources count, destinations count, workers (worker groups), pipelines, routes. Return the numeric values.`,
      },
      {
        key: 'adoption',
        query: `Using the Adoption model, what is the product adoption status for customer "${customerName}"? I need: adopt_cloud_stream, adopt_cloud_edge, adopt_onprem_stream, adopt_onprem_edge, adopt_lake, adopt_search, product_adoption_count, product_adoption_group, max_edge_nodes. Return the values.`,
      },
      {
        key: 'lake_search',
        query: `For customer "${customerName}", what are the Lake and Search metrics? I need: lake_gb (total lake storage in GB), lake_datasets (count), lake_datasets_parquet, lake_datasets_json, completed_searches, dispatched_searches, errored_searches, search_datasets, search_credits_used, lake_credits_used. Use the Cloud Telemetry Daily topic. Return numeric values.`,
      },
    ];

    const results = {};
    for (const q of queries) {
      console.log(`[${q.key}] Starting query...`);
      try {
        const response = await gleanChat(q.query, q.key);
        results[q.key] = response;
        console.log(`[${q.key}] Complete.`);
      } catch (err) {
        console.error(`[${q.key}] Failed:`, err.message);
        results[q.key] = { error: err.message };
      }
    }

    console.log(`=== Discovery complete for: ${customerName} ===\n`);
    res.json({ customerName, results });
  } catch (err) {
    console.error('[discover] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  const connected = !!(tokenStore && tokenStore.access_token);
  res.json({ status: 'ok', gleanConnected: connected });
});

// SPA fallback
if (process.env.NODE_ENV === 'production') {
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' });
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Telemetry Maturity server running on port ${PORT}`);
  console.log(`OAuth callback: ${APP_URL}/api/auth/callback`);
});
