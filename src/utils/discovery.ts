import type { ArchitectureSnapshot, CriblGroup, TelemetrySource, TelemetryDestination, DataFlow } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface OmniDiscoveryResponse {
  customerName: string;
  results: Record<string, { text?: string; message?: string; error?: string }>;
}

export async function discoverArchitecture(
  customerName: string,
  onProgress?: (message: string) => void
): Promise<ArchitectureSnapshot> {
  onProgress?.(`Starting discovery for customer: ${customerName}...`);
  onProgress?.('Querying Omni via Glean for architecture data...');

  const res = await fetch(`${API_BASE}/api/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Discovery failed: ${res.status}`);
  }

  const data: OmniDiscoveryResponse = await res.json();

  onProgress?.('Parsing groups and fleets...');
  const groups = parseGroups(data.results.groups);

  onProgress?.('Parsing sources...');
  const sources = parseSources(data.results.sources, groups);

  onProgress?.('Parsing destinations...');
  const destinations = parseDestinations(data.results.destinations, groups);

  onProgress?.('Parsing routing and data flows...');
  const flows = parseFlows(data.results.routing, sources, destinations);

  onProgress?.('Parsing product adoption...');
  const products = parseProducts(data.results.products);

  onProgress?.('Parsing volume data...');
  const volumes = parseVolumes(data.results.volumes);

  const activeSources = sources.filter(s => s.status === 'active');
  const activeDestinations = destinations.filter(d => d.status === 'active');
  const uniqueDestTypes = [...new Set(activeDestinations.map(d => d.type))];

  onProgress?.('Discovery complete.');

  return {
    customerName,
    groups,
    sources,
    destinations,
    flows,
    totalDailyIngestGB: volumes.ingest || activeSources.reduce((sum, s) => sum + s.dailyVolumeGB, 0),
    totalDailyOutgestGB: volumes.outgest || activeDestinations.reduce((sum, d) => sum + d.dailyVolumeGB, 0),
    destinationCount: activeDestinations.length,
    sourceCount: activeSources.length,
    dormantSourceCount: sources.filter(s => s.status === 'dormant').length,
    dormantDestinationCount: destinations.filter(d => d.status === 'dormant').length,
    uniqueDestinationTypes: uniqueDestTypes,
    hasLake: products.hasLake || destinations.some(d => d.type === 'cribl_lake' || d.type === 'lake'),
    hasSearch: products.hasSearch,
    hasEdge: products.hasEdge,
    edgeNodeCount: products.edgeNodeCount,
    searchDatasets: products.searchDatasets,
    searchDailyAvg: products.searchDailyAvg,
    rawDiscovery: data.results,
  };
}

function getResponseText(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  const r = result as Record<string, unknown>;
  if (r.error) return '';
  if (typeof r.text === 'string') return r.text;
  if (typeof r.message === 'string') return r.message;
  return JSON.stringify(result);
}

function parseGroups(raw: unknown): CriblGroup[] {
  const text = getResponseText(raw);
  if (!text) return [];

  const groups: CriblGroup[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•]\s*/, '');
    if (!trimmed || trimmed.length < 2) continue;

    const isFleet = /fleet|edge/i.test(trimmed);
    const nameMatch = trimmed.match(/^["']?([^"':,\n]+?)["']?\s*[-–:]/);
    const name = nameMatch ? nameMatch[1].trim() : trimmed.split(/\s*[-–:(]/)[0].trim();

    if (name && name.length > 1 && name.length < 100) {
      groups.push({
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        isFleet,
        product: isFleet ? 'edge' : 'stream',
      });
    }
  }

  return groups;
}

function parseSources(raw: unknown, groups: CriblGroup[]): TelemetrySource[] {
  const text = getResponseText(raw);
  if (!text) return [];

  const sources: TelemetrySource[] = [];
  const lines = text.split('\n');
  const defaultGroup = groups[0]?.id || 'default';

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•]\s*/, '');
    if (!trimmed || trimmed.length < 3) continue;

    const typeMatch = trimmed.match(/\b(syslog|splunk_hec|http|tcp|udp|kafka|kinesis|s3|azure_blob|file_monitor|windows_event_logs|crowdstrike|palo_alto|opentelemetry|datadog|elastic|prometheus|statsd)\b/i);
    if (!typeMatch) continue;

    const type = typeMatch[1].toLowerCase();
    const nameMatch = trimmed.match(/^["']?([^"':,\n]+?)["']?\s*[-–:(/]/);
    const name = nameMatch ? nameMatch[1].trim() : type;

    const volumeMatch = trimmed.match(/([\d.]+)\s*(?:GB|gb)/);
    const dailyVolumeGB = volumeMatch ? parseFloat(volumeMatch[1]) : 0;

    const isDisabled = /disabled|inactive|dormant/i.test(trimmed);
    const groupMatch = trimmed.match(/group[:\s]+["']?([^"',\n]+)/i);
    const group = groupMatch ? groupMatch[1].trim().toLowerCase().replace(/\s+/g, '_') : defaultGroup;

    const isFleetGroup = groups.find(g => g.id === group)?.isFleet ?? false;

    sources.push({
      id: `${group}:${name}`,
      name,
      type,
      group,
      product: isFleetGroup ? 'edge' : 'stream',
      dailyVolumeGB,
      eventsPerDay: 0,
      status: isDisabled ? 'dormant' : 'active',
      dataCategory: classifySourceCategory(type, name),
    });
  }

  return sources;
}

function parseDestinations(raw: unknown, groups: CriblGroup[]): TelemetryDestination[] {
  const text = getResponseText(raw);
  if (!text) return [];

  const destinations: TelemetryDestination[] = [];
  const lines = text.split('\n');
  const defaultGroup = groups[0]?.id || 'default';

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•]\s*/, '');
    if (!trimmed || trimmed.length < 3) continue;

    const typeMatch = trimmed.match(/\b(splunk|splunk_lb|elastic|s3|azure_blob|gcs|kafka|kinesis|syslog|http|newrelic|datadog|cribl_lake|lake|google_chronicle|microsoft_sentinel|sumo_logic|snowflake)\b/i);
    if (!typeMatch) continue;

    const type = typeMatch[1].toLowerCase();
    const nameMatch = trimmed.match(/^["']?([^"':,\n]+?)["']?\s*[-–:(/]/);
    const name = nameMatch ? nameMatch[1].trim() : type;

    const volumeMatch = trimmed.match(/([\d.]+)\s*(?:GB|gb)/);
    const dailyVolumeGB = volumeMatch ? parseFloat(volumeMatch[1]) : 0;

    const isDisabled = /disabled|inactive|dormant/i.test(trimmed);
    const hasPQ = /persistent.?queue|pq.?enabled|pq:\s*true/i.test(trimmed);
    const groupMatch = trimmed.match(/group[:\s]+["']?([^"',\n]+)/i);
    const group = groupMatch ? groupMatch[1].trim().toLowerCase().replace(/\s+/g, '_') : defaultGroup;

    const isFleetGroup = groups.find(g => g.id === group)?.isFleet ?? false;

    destinations.push({
      id: `${group}:${name}`,
      name,
      type,
      group,
      product: isFleetGroup ? 'edge' : 'stream',
      dailyVolumeGB,
      status: isDisabled ? 'dormant' : 'active',
      pqEnabled: hasPQ,
      hasBackpressure: false,
    });
  }

  return destinations;
}

function parseFlows(raw: unknown, sources: TelemetrySource[], destinations: TelemetryDestination[]): DataFlow[] {
  const text = getResponseText(raw);
  if (!text) return [];

  const flows: DataFlow[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const arrowMatch = line.match(/(.+?)\s*(?:->|→|-->)\s*(?:(.+?)\s*(?:->|→|-->)\s*)?(.+)/);
    if (!arrowMatch) continue;

    const sourceName = arrowMatch[1].trim().replace(/^[-*•]\s*/, '');
    const pipelineName = arrowMatch[2]?.trim();
    const destName = arrowMatch[3].trim();

    const source = sources.find(s => s.name.toLowerCase().includes(sourceName.toLowerCase()));
    const dest = destinations.find(d => d.name.toLowerCase().includes(destName.toLowerCase()));

    flows.push({
      sourceId: source?.id || sourceName,
      sourceName: source?.name || sourceName,
      sourceType: source?.type || 'unknown',
      pipelineId: pipelineName,
      pipelineName,
      destinationId: dest?.id || destName,
      destinationName: dest?.name || destName,
      destinationType: dest?.type || 'unknown',
      group: source?.group || 'default',
    });
  }

  return flows;
}

function parseProducts(raw: unknown): {
  hasLake: boolean;
  hasSearch: boolean;
  hasEdge: boolean;
  edgeNodeCount: number;
  searchDatasets: string[];
  searchDailyAvg: number;
} {
  const text = getResponseText(raw);

  const hasLake = /lake.*(active|flowing|in use|configured|yes)/i.test(text);
  const hasSearch = /search.*(active|configured|in use|yes|\d+ dataset)/i.test(text);
  const hasEdge = /edge.*(active|deployed|yes|\d+ node)/i.test(text);

  const edgeMatch = text.match(/(\d+)\s*(?:active\s*)?(?:edge\s*)?nodes?/i);
  const edgeNodeCount = edgeMatch ? parseInt(edgeMatch[1]) : 0;

  const searchDatasetsMatch = text.match(/(\d+)\s*datasets?/i);
  const searchDatasets: string[] = [];
  if (searchDatasetsMatch) {
    const count = parseInt(searchDatasetsMatch[1]);
    for (let i = 0; i < count; i++) searchDatasets.push(`dataset_${i + 1}`);
  }

  const searchAvgMatch = text.match(/([\d.]+)\s*(?:searches?\s*(?:per|\/)\s*day|daily)/i);
  const searchDailyAvg = searchAvgMatch ? parseFloat(searchAvgMatch[1]) : 0;

  return { hasLake, hasSearch, hasEdge, edgeNodeCount, searchDatasets, searchDailyAvg };
}

function parseVolumes(raw: unknown): { ingest: number; outgest: number } {
  const text = getResponseText(raw);

  const ingestMatch = text.match(/(?:ingest|ingestion|total\s*(?:daily)?\s*ingest)[:\s]*([\d,.]+)\s*(?:GB|TB)/i);
  const outgestMatch = text.match(/(?:outgest|egress|outbound)[:\s]*([\d,.]+)\s*(?:GB|TB)/i);

  let ingest = 0;
  let outgest = 0;

  if (ingestMatch) {
    ingest = parseFloat(ingestMatch[1].replace(/,/g, ''));
    if (/TB/i.test(ingestMatch[0])) ingest *= 1000;
  }

  if (outgestMatch) {
    outgest = parseFloat(outgestMatch[1].replace(/,/g, ''));
    if (/TB/i.test(outgestMatch[0])) outgest *= 1000;
  }

  return { ingest, outgest };
}

const SECURITY_TYPES = [
  'syslog', 'crowdstrike', 'palo_alto', 'fortinet', 'checkpoint',
  'cisco_asa', 'wineventlog', 'windows_event_logs', 'carbon_black',
  'sentinelone', 'microsoft_defender', 'okta', 'duo', 'aws_cloudtrail',
];

const OBSERVABILITY_TYPES = [
  'splunk_hec', 'http', 'elastic', 'prometheus', 'statsd', 'graphite',
  'opentelemetry', 'datadog', 'newrelic', 'kinesis', 'kafka',
  'cloudwatch', 'azure_monitor',
];

function classifySourceCategory(type: string, name: string): TelemetrySource['dataCategory'] {
  const combined = `${type} ${name}`.toLowerCase();
  const isSecurity = SECURITY_TYPES.some(t => combined.includes(t));
  const isObservability = OBSERVABILITY_TYPES.some(t => combined.includes(t));

  if (isSecurity && isObservability) return 'both';
  if (isSecurity) return 'security';
  if (isObservability) return 'observability';
  return 'unknown';
}
