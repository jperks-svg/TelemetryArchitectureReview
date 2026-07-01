import type { CustomerTelemetry, ExecutiveSummary, Risk, Recommendation } from '../types';
import { formatGB } from './maturity';

export function generateExecutiveSummary(
  customer: CustomerTelemetry,
  maturityLevel: number,
  maturityTitle: string,
  risks: Risk[],
  recommendations: Recommendation[]
): ExecutiveSummary {
  const highRisks = risks.filter(r => r.severity === 'high');
  const immRecs = recommendations.filter(r => r.priority === 'immediate');
  const totalInGB = (customer.streamInBytes + customer.edgeInBytes) / 1073741824;

  const currentState = buildCurrentStateNarrative(customer, maturityLevel, maturityTitle);

  const identifiedRisks = risks.map(r => `[${r.severity.toUpperCase()}] ${r.title}: ${r.description}`);
  const recommendedEvolution = recommendations.map(r => `[${r.priority}] ${r.title}: ${r.description}`);

  const positiveOutcomes = [
    highRisks.length > 0 ? 'Reduced single-destination risk through architectural diversification' : null,
    totalInGB > 200 ? 'Potential 30-60% cost reduction on primary destination through data tiering' : null,
    'Improved investigation speed with federated search across all data tiers',
    'Extended retention capability for compliance without increased primary destination costs',
    'Greater architectural flexibility to adopt new tools without re-plumbing sources',
  ].filter(Boolean) as string[];

  const nextActions = immRecs.slice(0, 3).map(r => ({
    action: r.title,
    owner: 'TBD',
    timeline: r.effort === 'low' ? '2-4 weeks' : r.effort === 'medium' ? '4-8 weeks' : '8-12 weeks',
  }));

  if (nextActions.length === 0) {
    nextActions.push(
      { action: 'Review and validate maturity findings', owner: 'TBD', timeline: '1 week' },
      { action: 'Prioritize top recommendations for pilot', owner: 'TBD', timeline: '2-4 weeks' },
    );
  }

  return {
    currentState,
    maturityLevel: `${maturityTitle} (L${maturityLevel})`,
    identifiedRisks,
    recommendedEvolution,
    positiveOutcomes,
    nextActions,
  };
}

function buildCurrentStateNarrative(c: CustomerTelemetry, level: number, title: string): string {
  const parts: string[] = [];
  const totalInGB = (c.streamInBytes + c.edgeInBytes) / 1073741824;

  parts.push(`${c.customerName} is assessed at maturity level L${level} (${title}).`);

  if (totalInGB > 0) {
    parts.push(`The environment processes approximately ${formatGB(totalInGB)} per day across ${c.sourceCount} configured source(s) and ${c.destinationCount} destination(s).`);
  }

  if (c.adoptCloudStream) parts.push('Cloud Stream is actively adopted.');
  if (c.adoptCloudEdge) parts.push(`Cloud Edge is deployed with up to ${c.maxEdgeNodes} nodes.`);
  if (c.adoptLake) parts.push(`Lake is in use with ${formatGB(c.lakeGB)} stored across ${c.lakeDatasets} dataset(s).`);
  if (c.adoptSearch) parts.push(`Search is active with ${c.completedSearches} completed searches.`);

  if (!c.adoptLake && c.lakeGB === 0) parts.push('Cribl Lake is not currently in use for long-term retention.');
  if (!c.adoptSearch && c.completedSearches === 0) parts.push('Cribl Search is not actively configured.');
  if (!c.adoptCloudEdge && c.edgeInBytes === 0) parts.push('No Edge deployment is active.');

  return parts.join(' ');
}
