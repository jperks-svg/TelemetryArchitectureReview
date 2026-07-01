import type { CustomerTelemetry, CustomerValue, ValueLineItem, ValueProjection } from '../types';

const DEFAULT_COST_PER_GB_DAY = 3.50;

export function calculateCustomerValue(
  customer: CustomerTelemetry,
  maturityLevel: number,
  costPerGBPerDay: number = DEFAULT_COST_PER_GB_DAY,
): CustomerValue {
  const lineItems = calculateCurrentValue(customer, maturityLevel, costPerGBPerDay);
  const projections = calculateProjectedValue(customer, maturityLevel, costPerGBPerDay);
  const currentAnnualValue = lineItems.reduce((sum, item) => sum + item.annualValue, 0);
  const projectedAnnualValue = currentAnnualValue + projections.reduce((sum, p) => sum + p.additionalAnnualValue, 0);

  return {
    costPerGBPerDay,
    currentAnnualValue,
    projectedAnnualValue,
    valueLineItems: lineItems,
    projections,
  };
}

function calculateCurrentValue(
  c: CustomerTelemetry,
  level: number,
  costPerGB: number,
): ValueLineItem[] {
  const items: ValueLineItem[] = [];
  const totalInGB = (c.streamInBytes + c.edgeInBytes) / 1073741824;
  const totalOutGB = (c.streamOutBytes + c.edgeOutBytes) / 1073741824;

  // Data reduction value — difference between what comes in and what goes to expensive destinations
  if (totalInGB > 0 && totalOutGB < totalInGB) {
    const reductionGB = totalInGB - totalOutGB;
    const reductionPercent = (reductionGB / totalInGB) * 100;
    const annualSavings = reductionGB * costPerGB * 365;

    if (reductionGB > 0.1) {
      items.push({
        id: 'data-reduction',
        category: 'cost-reduction',
        title: 'Data Volume Reduction',
        description: `Cribl is reducing ${reductionPercent.toFixed(0)}% of ingest volume before it reaches expensive destinations through filtering, sampling, and aggregation.`,
        annualValue: annualSavings,
        evidence: `${totalInGB.toFixed(1)} GB/day in → ${totalOutGB.toFixed(1)} GB/day out (${reductionGB.toFixed(1)} GB/day saved)`,
      });
    }
  }

  // Multi-destination routing value — avoided duplicate ingestion costs
  if (c.destinationCount >= 3) {
    const routingValueGB = totalInGB * (c.destinationCount - 1) * 0.3;
    const annualValue = routingValueGB * costPerGB * 365;

    items.push({
      id: 'multi-destination',
      category: 'flexibility',
      title: 'Multi-Destination Routing',
      description: `Data is routed to ${c.destinationCount} destinations from a single collection point, avoiding duplicate collection infrastructure and enabling right-tool-for-the-job delivery.`,
      annualValue,
      evidence: `${c.destinationCount} destinations served without duplicate agents or forwarders`,
    });
  }

  // Lake retention value — cost of equivalent SIEM retention
  if (c.lakeGB > 0) {
    const equivalentSIEMCost = c.lakeGB * costPerGB * 365;
    const lakeCost = c.lakeGB * 0.35 * 365;
    const annualValue = equivalentSIEMCost - lakeCost;

    items.push({
      id: 'lake-retention',
      category: 'cost-reduction',
      title: 'Low-Cost Data Retention (Lake)',
      description: `${c.lakeGB.toFixed(1)} GB retained in Cribl Lake instead of expensive SIEM hot storage. Full-fidelity data preserved at a fraction of the cost.`,
      annualValue,
      evidence: `${c.lakeGB.toFixed(1)} GB in Lake at ~$0.35/GB/day vs $${costPerGB.toFixed(2)}/GB/day in SIEM`,
    });
  }

  // Search value — avoided re-ingestion for investigations
  if (c.completedSearches > 0 && c.lakeGB > 0) {
    const avgSearchGB = 5;
    const reIngestionCost = c.completedSearches * avgSearchGB * costPerGB;
    const annualValue = reIngestionCost * 12;

    items.push({
      id: 'search-avoid-reingest',
      category: 'operational',
      title: 'Investigation Without Re-Ingestion',
      description: `${c.completedSearches} searches completed against retained data without re-ingesting into SIEM. Each investigation avoids the cost and delay of re-ingestion.`,
      annualValue,
      evidence: `${c.completedSearches} searches/month, ~${avgSearchGB} GB avg query scope`,
    });
  }

  // Edge collection value — bandwidth and agent consolidation
  if (c.edgeInBytes > 0 && c.maxEdgeNodes > 0) {
    const edgeGB = c.edgeInBytes / 1073741824;
    const bandwidthSavings = edgeGB * 0.40 * costPerGB * 365;

    items.push({
      id: 'edge-efficiency',
      category: 'cost-reduction',
      title: 'Edge-Side Collection & Filtering',
      description: `${c.maxEdgeNodes} Edge nodes processing data at source, reducing WAN bandwidth and consolidating collection agents.`,
      annualValue: bandwidthSavings,
      evidence: `${edgeGB.toFixed(1)} GB/day processed at edge across ${c.maxEdgeNodes} nodes`,
    });
  }

  // Pipeline transformation value (L2+)
  if (c.pipelines >= 5) {
    const transformValue = totalInGB * 0.15 * costPerGB * 365;
    items.push({
      id: 'pipeline-transforms',
      category: 'operational',
      title: 'Pipeline Transformations & Enrichment',
      description: `${c.pipelines} pipelines actively transforming data in-flight — field filtering, normalization, enrichment — reducing downstream processing burden.`,
      annualValue: transformValue,
      evidence: `${c.pipelines} active pipelines processing ${totalInGB.toFixed(1)} GB/day`,
    });
  }

  // Vendor flexibility value (qualitative but monetizable via switching cost avoidance)
  if (c.destinationCount >= 2 && level >= 2) {
    const vendorValue = totalInGB * 0.10 * costPerGB * 365;
    items.push({
      id: 'vendor-flexibility',
      category: 'flexibility',
      title: 'Vendor Independence & Negotiation Leverage',
      description: 'Decoupled collection from destination means switching tools requires config changes, not re-architecture. This is demonstrable leverage in vendor negotiations.',
      annualValue: vendorValue,
      evidence: `${c.sourceCount} sources decoupled from ${c.destinationCount} destinations`,
    });
  }

  return items.sort((a, b) => b.annualValue - a.annualValue);
}

function calculateProjectedValue(
  c: CustomerTelemetry,
  currentLevel: number,
  costPerGB: number,
): ValueProjection[] {
  const projections: ValueProjection[] = [];
  const totalInGB = (c.streamInBytes + c.edgeInBytes) / 1073741824;

  // L2 projections
  if (currentLevel < 2) {
    if (c.destinationCount < 3) {
      const additionalValue = totalInGB * 2 * 0.3 * costPerGB * 365;
      projections.push({
        id: 'proj-multi-dest',
        targetLevel: 2,
        title: 'Multi-Destination Architecture',
        description: 'Route data to 3+ destinations (SIEM, Lake, S3) to optimize cost per data tier and eliminate single-destination lock-in.',
        additionalAnnualValue: additionalValue,
        requirement: 'Configure 2+ additional destinations with tiered routing rules',
      });
    }

    if (c.edgeInBytes === 0 && totalInGB > 100) {
      const edgeValue = totalInGB * 0.40 * costPerGB * 365;
      projections.push({
        id: 'proj-edge',
        targetLevel: 2,
        title: 'Deploy Edge Fleet',
        description: 'Process and filter data at source locations to reduce WAN bandwidth by 40-70% and improve collection resilience.',
        additionalAnnualValue: edgeValue,
        requirement: 'Deploy Edge nodes at top bandwidth-consuming sites',
      });
    }
  }

  // L3 projections
  if (currentLevel < 3) {
    if (c.lakeGB === 0) {
      const lakeValue = totalInGB * 0.50 * (costPerGB - 0.35) * 365;
      projections.push({
        id: 'proj-lake',
        targetLevel: 3,
        title: 'Cribl Lake Retention',
        description: 'Retain 50%+ of daily volume in Lake instead of SIEM — full-fidelity data at ~90% cost reduction vs hot storage.',
        additionalAnnualValue: lakeValue,
        requirement: 'Deploy Lake and route warm-tier data (50% of volume) to it',
      });
    }

    if (c.completedSearches === 0) {
      const searchValue = 20 * 5 * costPerGB * 12;
      projections.push({
        id: 'proj-search',
        targetLevel: 3,
        title: 'Federated Search Capability',
        description: 'Query across Lake, S3, and live data without re-ingestion. Estimated 20+ investigations/month that would otherwise require expensive re-ingest.',
        additionalAnnualValue: searchValue,
        requirement: 'Enable Search and create datasets pointing to Lake storage',
      });
    }
  }

  // L4 projections
  if (currentLevel < 4) {
    const composableValue = totalInGB * 0.20 * costPerGB * 365;
    projections.push({
      id: 'proj-composable',
      targetLevel: 4,
      title: 'Composable Telemetry Platform',
      description: 'Self-service data delivery for all teams — new tools onboard in hours, enrichment services integrated, operational dashboarding on data flows.',
      additionalAnnualValue: composableValue,
      requirement: 'Full product suite, enrichment pipelines, operational dashboarding',
    });
  }

  return projections.sort((a, b) => a.targetLevel - b.targetLevel || b.additionalAnnualValue - a.additionalAnnualValue);
}
