import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'dist')));
}

const GLEAN_BASE = process.env.GLEAN_BASE_URL || 'https://cribl-be.glean.com';
const GLEAN_TOKEN = process.env.GLEAN_API_TOKEN || '';

async function gleanChat(message, context = []) {
  const res = await fetch(`${GLEAN_BASE}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GLEAN_TOKEN}`,
    },
    body: JSON.stringify({
      message,
      context,
      agentId: 'cd5f176f6e154c88a35bef7da4d71009',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Glean API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function queryOmniViaGlean(customerName, query) {
  const message = `For customer "${customerName}": ${query}`;
  return gleanChat(message);
}

app.post('/api/discover', async (req, res) => {
  const { customerName } = req.body;

  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  if (!GLEAN_TOKEN) {
    return res.status(500).json({ error: 'GLEAN_API_TOKEN not configured' });
  }

  try {
    const queries = [
      {
        key: 'groups',
        query: 'What worker groups and edge fleets are configured? List each group name, whether it is a fleet (edge) or stream worker group, and any description.',
      },
      {
        key: 'sources',
        query: 'What sources (inputs) are configured across all worker groups? For each source list: name, type (e.g. syslog, splunk_hec, http), which group it belongs to, whether it is active or disabled, and estimated daily volume in GB if available.',
      },
      {
        key: 'destinations',
        query: 'What destinations (outputs) are configured? For each destination list: name, type (e.g. splunk, s3, cribl_lake, elastic), which group it belongs to, whether it is active, daily volume in GB if available, and whether persistent queue is enabled.',
      },
      {
        key: 'products',
        query: 'Which Cribl products are in use — Stream, Edge, Lake, Search? For Edge, how many active nodes? For Search, how many datasets and approximate daily search count? For Lake, is data actively flowing?',
      },
      {
        key: 'routing',
        query: 'What are the main data routing patterns? List the key routes showing source -> pipeline -> destination mappings. Include any fan-out (one source to multiple destinations) patterns.',
      },
      {
        key: 'volumes',
        query: 'What is the total daily ingest volume in GB? What is the total daily outgest/egress volume? Break down volume by destination type if possible.',
      },
    ];

    const results = {};
    for (const q of queries) {
      try {
        const response = await queryOmniViaGlean(customerName, q.query);
        results[q.key] = response;
      } catch (err) {
        results[q.key] = { error: err.message };
      }
    }

    res.json({ customerName, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', gleanConfigured: !!GLEAN_TOKEN });
});

// SPA fallback — serve index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' });
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Telemetry Maturity server running on port ${PORT}`);
});
