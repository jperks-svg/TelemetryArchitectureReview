import type { CustomerTelemetry } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function discoverCustomer(
  customerName: string,
  onProgress?: (message: string) => void
): Promise<CustomerTelemetry> {
  onProgress?.(`Starting discovery for: ${customerName}...`);
  onProgress?.('Querying Omni via Glean for telemetry data...');

  const res = await fetch(`${API_BASE}/api/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Discovery failed: ${res.status}`);
  }

  const data = await res.json();
  onProgress?.('Parsing telemetry response...');

  const telemetry = parseOmniResponse(customerName, data);

  onProgress?.('Discovery complete.');
  return telemetry;
}

function parseOmniResponse(customerName: string, data: Record<string, unknown>): CustomerTelemetry {
  const text = extractResponseText(data);

  return {
    customerName,
    date: new Date().toISOString().split('T')[0],

    streamInBytes: extractNumber(text, /stream[_\s]*in[_\s]*(?:bytes|gb|tb)/i, 'bytes'),
    streamOutBytes: extractNumber(text, /stream[_\s]*out[_\s]*(?:bytes|gb|tb)/i, 'bytes'),
    edgeInBytes: extractNumber(text, /edge[_\s]*in[_\s]*(?:bytes|gb|tb)/i, 'bytes'),
    edgeOutBytes: extractNumber(text, /edge[_\s]*out[_\s]*(?:bytes|gb|tb)/i, 'bytes'),

    sourceCount: extractInt(text, /(\d+)\s*(?:configured\s*)?sources?/i) || extractInt(text, /sources?[:\s]*(\d+)/i),
    destinationCount: extractInt(text, /(\d+)\s*(?:configured\s*)?destinations?/i) || extractInt(text, /destinations?[:\s]*(\d+)/i),
    workerGroups: extractInt(text, /(\d+)\s*(?:worker\s*)?groups?/i),
    maxEdgeNodes: extractInt(text, /(\d+)\s*(?:max\s*)?(?:edge\s*)?nodes?/i),
    connectedEdgeNodes: extractInt(text, /(\d+)\s*connected\s*(?:edge\s*)?nodes?/i),
    pipelines: extractInt(text, /(\d+)\s*pipelines?/i),
    routes: extractInt(text, /(\d+)\s*routes?/i),

    lakeGB: extractFloat(text, /lake[_\s]*(?:gb|storage)[:\s]*([\d,.]+)/i) || extractGBValue(text, /lake.*?([\d,.]+)\s*(?:GB|TB)/i),
    lakeDatasets: extractInt(text, /(\d+)\s*(?:lake\s*)?datasets?/i),
    lakeDatasetsParquet: extractInt(text, /(\d+)\s*parquet/i),
    lakeDatasetsJson: extractInt(text, /(\d+)\s*json/i),

    completedSearches: extractInt(text, /(\d+)\s*completed\s*searches?/i) || extractInt(text, /completed[_\s]*searches[:\s]*(\d+)/i),
    dispatchedSearches: extractInt(text, /(\d+)\s*dispatched/i),
    erroredSearches: extractInt(text, /(\d+)\s*errored/i),
    searchDatasets: extractInt(text, /(\d+)\s*search\s*datasets?/i),

    searchCreditsUsed: extractFloat(text, /search[_\s]*credits?[:\s]*([\d,.]+)/i),
    lakeCreditsUsed: extractFloat(text, /lake[_\s]*credits?[:\s]*([\d,.]+)/i),

    adoptCloudStream: /adopt.*cloud.*stream.*(?:true|yes|active)/i.test(text) || /stream.*(?:active|adopted|in use)/i.test(text),
    adoptCloudEdge: /adopt.*cloud.*edge.*(?:true|yes|active)/i.test(text) || /edge.*(?:active|adopted|in use)/i.test(text),
    adoptOnpremStream: /adopt.*onprem.*stream.*(?:true|yes|active)/i.test(text),
    adoptOnpremEdge: /adopt.*onprem.*edge.*(?:true|yes|active)/i.test(text),
    adoptLake: /adopt.*lake.*(?:true|yes|active)/i.test(text) || /lake.*(?:active|adopted|in use)/i.test(text),
    adoptSearch: /adopt.*search.*(?:true|yes|active)/i.test(text) || /search.*(?:active|adopted|in use)/i.test(text),
    productAdoptionCount: extractInt(text, /product[_\s]*adoption[_\s]*count[:\s]*(\d+)/i) || countAdoption(text),
    productAdoptionGroup: extractField(text, /product[_\s]*adoption[_\s]*group[:\s]*["']?([^"'\n,]+)/i) || 'unknown',

    rawResponse: data,
  };
}

function extractResponseText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return '';

  const obj = data as Record<string, unknown>;

  // Handle various response shapes from Glean chat API
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.answer === 'string') return obj.answer;

  // Nested results from our discovery endpoint
  if (obj.results && typeof obj.results === 'object') {
    const parts: string[] = [];
    for (const val of Object.values(obj.results as Record<string, unknown>)) {
      parts.push(extractResponseText(val));
    }
    return parts.join('\n');
  }

  // Array of messages
  if (Array.isArray(obj.messages)) {
    return obj.messages.map((m: unknown) => extractResponseText(m)).join('\n');
  }

  return JSON.stringify(data);
}

function extractNumber(text: string, pattern: RegExp, unit: 'bytes' | 'gb' = 'bytes'): number {
  const match = text.match(pattern);
  if (!match) return 0;

  // Look for a number near the match
  const context = text.slice(Math.max(0, (match.index || 0) - 50), (match.index || 0) + match[0].length + 50);
  const numMatch = context.match(/([\d,]+(?:\.\d+)?)\s*(?:GB|TB|bytes|MB)?/i);
  if (!numMatch) return 0;

  let value = parseFloat(numMatch[1].replace(/,/g, ''));

  if (unit === 'bytes') {
    if (/TB/i.test(numMatch[0])) value *= 1099511627776;
    else if (/GB/i.test(numMatch[0])) value *= 1073741824;
    else if (/MB/i.test(numMatch[0])) value *= 1048576;
  }

  return value;
}

function extractInt(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) return 0;
  const numStr = match[1] || match[0];
  return parseInt(numStr.replace(/,/g, ''), 10) || 0;
}

function extractFloat(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) return 0;
  const numStr = match[1] || match[0];
  return parseFloat(numStr.replace(/,/g, '')) || 0;
}

function extractGBValue(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) return 0;
  let value = parseFloat(match[1].replace(/,/g, ''));
  if (/TB/i.test(match[0])) value *= 1000;
  return value;
}

function extractField(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function countAdoption(text: string): number {
  let count = 0;
  if (/stream.*(?:active|adopted|in use)/i.test(text)) count++;
  if (/edge.*(?:active|adopted|in use)/i.test(text)) count++;
  if (/lake.*(?:active|adopted|in use)/i.test(text)) count++;
  if (/search.*(?:active|adopted|in use)/i.test(text)) count++;
  return count;
}
