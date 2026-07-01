import type { CustomerTelemetry, MaturitySnapshot, MaturitySignal, MaturityLevelDef, ArtOfThePossible, VolumeSummary } from '../types';

export const MATURITY_LEVELS: MaturityLevelDef[] = [
  {
    level: 0,
    label: 'L0',
    title: 'Prospect',
    description: 'Pre-deployment or early onboarding. No active telemetry routing through Cribl yet.',
    characteristics: [
      'Prospect or customer expansion',
      'Onboarding in progress',
      'No active data flows',
    ],
    capabilities: [],
  },
  {
    level: 1,
    label: 'L1',
    title: 'Control Data in Motion',
    description: 'Single use case deployed — typically tool migration, cost control, or cost reduction. Simple, non-strategic application of Cribl products.',
    characteristics: [
      'Single primary use case (migration, cost control, or reduction)',
      'One or two destinations',
      'Basic pipeline usage (passthrough or simple transforms)',
      'Limited to Stream or Edge, not both',
    ],
    capabilities: [
      'Data routing between source and destination',
      'Basic field manipulation and filtering',
      'Simple cost reduction through volume management',
    ],
  },
  {
    level: 2,
    label: 'L2',
    title: 'Establish Flexible Telemetry Infrastructure',
    description: 'Expanding control of data with multiple sources and destinations. Beginning to see the strategic value of choice, flexibility, and control.',
    characteristics: [
      'Multiple sources and destinations configured',
      'Using cheap storage (S3, GCS) as a destination',
      'Data routing to 2+ destination types',
      'Replay capability established',
      'Multiple worker groups or beginning Edge deployment',
    ],
    capabilities: [
      'Multi-destination routing',
      'Cost-optimized storage tiers',
      'Data replay from object store',
      'Routing decisions based on data content',
      'Beginning to decouple collection from analysis',
    ],
  },
  {
    level: 3,
    label: 'L3',
    title: 'Optimize & Analyze Full Fidelity Data',
    description: 'Strategically using data in cost-effective storage. Fully leveraging the multi-product portfolio including Lake and Search for investigations.',
    characteristics: [
      'Cribl Lake actively used for retention',
      'Cribl Search used for investigations and hunting',
      'Data tiering strategy implemented (hot/warm/cold)',
      'Full-fidelity data preserved independent of SIEM',
      'Multi-product usage (Stream + Lake + Search, or Stream + Edge + Lake)',
    ],
    capabilities: [
      'Federated search across live and historical data',
      'SIEM-agnostic long-term retention',
      'On-demand investigations without re-ingestion',
      'Compliance retention at fraction of SIEM cost',
      'Archive search and forensic capability',
      'Full decoupling of collection from analysis destinations',
    ],
  },
  {
    level: 4,
    label: 'L4',
    title: 'Compose Your Telemetry Cloud Services',
    description: 'Full leverage of choice, flexibility, and control of data. Advanced and robust infrastructure with dashboarding, alerting, and enrichment services.',
    characteristics: [
      'Full product suite deployed (Stream, Edge, Lake, Search)',
      'Advanced pipeline logic with enrichment services',
      'Custom dashboarding and alerting on telemetry operations',
      'Robust, multi-region or multi-environment infrastructure',
      'Telemetry as a composable platform, not just a pipeline',
    ],
    capabilities: [
      'Composable telemetry cloud services',
      'Operational dashboarding on data flows',
      'Alerting on telemetry health and anomalies',
      'Enrichment services integrated into pipelines',
      'Full organizational self-service for data consumers',
      'Telemetry platform treated as critical infrastructure',
    ],
  },
];

export function assessMaturity(customer: CustomerTelemetry): MaturitySnapshot {
  const signals: MaturitySignal[] = [];

  // L1 signals: basic deployment with active data flow
  const hasStreamVolume = customer.streamInBytes > 0;
  const hasSources = customer.sourceCount > 0;
  const hasDestinations = customer.destinationCount > 0;
  const hasRoutes = customer.routes > 0;

  signals.push({ indicator: 'Active Stream volume flowing', present: hasStreamVolume, levelImplication: 1 });
  signals.push({ indicator: 'Sources configured', present: hasSources, levelImplication: 1, detail: `${customer.sourceCount} source(s)` });
  signals.push({ indicator: 'Destinations configured', present: hasDestinations, levelImplication: 1, detail: `${customer.destinationCount} destination(s)` });
  signals.push({ indicator: 'Routes configured', present: hasRoutes, levelImplication: 1, detail: `${customer.routes} route(s)` });

  // L2 signals: multiple destinations, edge, worker groups, pipelines
  const hasMultipleDestinations = customer.destinationCount >= 3;
  const hasEdge = customer.adoptCloudEdge || customer.edgeInBytes > 0;
  const hasMultipleWorkerGroups = customer.workerGroups >= 2;
  const hasPipelines = customer.pipelines >= 5;
  const hasEdgeAtScale = customer.maxEdgeNodes >= 10;

  signals.push({ indicator: 'Multiple destinations (3+)', present: hasMultipleDestinations, levelImplication: 2, detail: `${customer.destinationCount} destinations` });
  signals.push({ indicator: 'Edge deployment active', present: hasEdge, levelImplication: 2, detail: hasEdge ? `${customer.maxEdgeNodes} max nodes` : undefined });
  signals.push({ indicator: 'Multiple worker groups (2+)', present: hasMultipleWorkerGroups, levelImplication: 2, detail: `${customer.workerGroups} groups` });
  signals.push({ indicator: 'Pipeline complexity (5+ pipelines)', present: hasPipelines, levelImplication: 2, detail: `${customer.pipelines} pipelines` });
  signals.push({ indicator: 'Edge fleet at scale (10+ nodes)', present: hasEdgeAtScale, levelImplication: 2, detail: `${customer.maxEdgeNodes} max nodes` });

  // L3 signals: Lake + Search adoption, multi-product
  const hasLake = customer.adoptLake || customer.lakeGB > 0;
  const hasSearch = customer.adoptSearch || customer.completedSearches > 0;
  const hasLakeStorage = customer.lakeGB > 10;
  const hasSearchActivity = customer.completedSearches >= 10;
  const hasLakeDatasets = customer.lakeDatasets >= 3;
  const multiProductCount = [customer.adoptCloudStream, hasEdge, hasLake, hasSearch].filter(Boolean).length;
  const hasMultiProduct = multiProductCount >= 3;

  signals.push({ indicator: 'Cribl Lake adopted', present: hasLake, levelImplication: 3, detail: hasLake ? `${customer.lakeGB.toFixed(1)} GB stored` : undefined });
  signals.push({ indicator: 'Lake storage >10 GB', present: hasLakeStorage, levelImplication: 3, detail: `${customer.lakeGB.toFixed(1)} GB` });
  signals.push({ indicator: 'Cribl Search actively used', present: hasSearchActivity, levelImplication: 3, detail: `${customer.completedSearches} completed searches` });
  signals.push({ indicator: 'Lake datasets (3+)', present: hasLakeDatasets, levelImplication: 3, detail: `${customer.lakeDatasets} datasets` });
  signals.push({ indicator: 'Multi-product deployment (3+ products)', present: hasMultiProduct, levelImplication: 3, detail: `${multiProductCount} products adopted` });

  // L4 signals: full suite, advanced infrastructure
  const hasFullSuite = multiProductCount === 4;
  const hasHighPipelineComplexity = customer.pipelines >= 20;
  const hasManyDestinations = customer.destinationCount >= 6;
  const hasHighEdgeScale = customer.maxEdgeNodes >= 100;

  signals.push({ indicator: 'Full product suite (Stream + Edge + Lake + Search)', present: hasFullSuite, levelImplication: 4 });
  signals.push({ indicator: 'Advanced pipeline complexity (20+)', present: hasHighPipelineComplexity, levelImplication: 4, detail: `${customer.pipelines} pipelines` });
  signals.push({ indicator: 'Destination diversity (6+ destinations)', present: hasManyDestinations, levelImplication: 4, detail: `${customer.destinationCount} destinations` });
  signals.push({ indicator: 'Edge at enterprise scale (100+ nodes)', present: hasHighEdgeScale, levelImplication: 4, detail: `${customer.maxEdgeNodes} nodes` });

  // Calculate level
  let currentLevel = 0;
  if (hasStreamVolume && (hasSources || hasDestinations)) currentLevel = 1;

  const l2Signals = signals.filter(s => s.levelImplication === 2 && s.present).length;
  if (currentLevel >= 1 && l2Signals >= 2) currentLevel = 2;

  const l3Signals = signals.filter(s => s.levelImplication === 3 && s.present).length;
  if (currentLevel >= 2 && l3Signals >= 2) currentLevel = 3;

  const l4Signals = signals.filter(s => s.levelImplication === 4 && s.present).length;
  if (currentLevel >= 3 && l4Signals >= 2) currentLevel = 4;

  const levelDef = MATURITY_LEVELS[currentLevel];
  const nextLevel = currentLevel < 4 ? MATURITY_LEVELS[currentLevel + 1] : null;

  // Gaps to next level
  const gapsToNext: string[] = [];
  if (nextLevel) {
    const nextLevelSignals = signals.filter(s => s.levelImplication === nextLevel.level && !s.present);
    gapsToNext.push(...nextLevelSignals.map(s => s.indicator));
  }

  const volumeSummary = buildVolumeSummary(customer);
  const risks = identifyRisks(customer, currentLevel);
  const recommendations = generateRecommendations(customer, currentLevel);
  const quickWins = identifyQuickWins(customer, currentLevel);
  const artOfThePossible = generateArtOfThePossible(currentLevel, customer);

  return {
    customer,
    maturityLevel: currentLevel,
    maturityLabel: levelDef.label,
    maturityTitle: levelDef.title,
    signals,
    risks,
    recommendations,
    quickWins,
    nextLevel,
    gapsToNext,
    artOfThePossible,
    volumeSummary,
  };
}

function buildVolumeSummary(c: CustomerTelemetry): VolumeSummary {
  const toGB = (bytes: number) => bytes / 1073741824;
  return {
    totalDailyIngestGB: toGB(c.streamInBytes + c.edgeInBytes),
    totalDailyOutgestGB: toGB(c.streamOutBytes + c.edgeOutBytes),
    streamInGB: toGB(c.streamInBytes),
    streamOutGB: toGB(c.streamOutBytes),
    edgeInGB: toGB(c.edgeInBytes),
    edgeOutGB: toGB(c.edgeOutBytes),
    lakeStorageGB: c.lakeGB,
    searchesPerDay: c.completedSearches,
  };
}

import type { Risk, Recommendation, QuickWin } from '../types';

function identifyRisks(c: CustomerTelemetry, level: number): Risk[] {
  const risks: Risk[] = [];

  if (c.destinationCount <= 1 && c.sourceCount > 0) {
    risks.push({
      id: 'single-dest',
      title: 'Single Destination Dependency',
      description: 'All telemetry routes to a single destination. This creates vendor lock-in, cost concentration, and resilience risk.',
      severity: 'high',
      category: 'single-destination',
      evidence: `${c.sourceCount} sources routing to ${c.destinationCount} destination(s)`,
      recommendation: 'Implement multi-destination architecture with data tiering — route critical data to SIEM while sending full-fidelity copies to Lake or S3.',
    });
  }

  if (!c.adoptLake && c.lakeGB === 0 && level >= 1) {
    risks.push({
      id: 'no-lake',
      title: 'No Long-Term Retention Strategy',
      description: 'Cribl Lake is not adopted. Without a low-cost retention layer, compliance data and forensic capability are limited by expensive primary destination retention.',
      severity: 'medium',
      category: 'retention',
      evidence: 'Lake adoption flag is false, 0 GB stored in Lake.',
      recommendation: 'Deploy Lake as a fan-out destination for full-fidelity retention at a fraction of SIEM storage cost.',
    });
  }

  if (!c.adoptSearch && c.completedSearches === 0 && level >= 2) {
    risks.push({
      id: 'no-search',
      title: 'No Federated Search Capability',
      description: 'Cribl Search is not active. Teams rely solely on destination-native search, creating investigation friction during incidents.',
      severity: 'low',
      category: 'investigation',
      evidence: '0 completed searches, Search not adopted.',
      recommendation: 'Enable Cribl Search for federated access across Lake, S3, and live data.',
    });
  }

  if (!c.adoptCloudEdge && c.edgeInBytes === 0 && c.streamInBytes > 0) {
    risks.push({
      id: 'no-edge',
      title: 'No Edge-Side Processing',
      description: 'No Edge fleet is deployed. All filtering and routing happens centrally, increasing bandwidth costs.',
      severity: 'low',
      category: 'flexibility',
      evidence: '0 Edge bytes, Edge not adopted.',
      recommendation: 'Deploy Edge at high-volume source locations to filter data at the point of collection.',
    });
  }

  const totalInGB = (c.streamInBytes + c.edgeInBytes) / 1073741824;
  if (totalInGB > 500 && c.destinationCount <= 2) {
    risks.push({
      id: 'high-volume-no-tiering',
      title: 'High Volume Without Data Tiering',
      description: `${totalInGB.toFixed(0)} GB/day ingested with only ${c.destinationCount} destination(s). This drives unnecessary cost without evident tiering.`,
      severity: 'high',
      category: 'cost',
      evidence: `${totalInGB.toFixed(0)} GB/day to ${c.destinationCount} destinations`,
      recommendation: 'Implement per-source routing: detection-critical to SIEM, full-fidelity to Lake, verbose to cold storage.',
    });
  }

  if (c.searchCreditsUsed > 0 && c.lakeCreditsUsed === 0 && c.lakeGB > 0) {
    risks.push({
      id: 'search-without-lake-credits',
      title: 'Search Usage Without Lake Utilization',
      description: 'Search credits are being consumed but Lake credits are not. This may indicate searches are running against external data stores rather than leveraging Lake for cost-efficient queries.',
      severity: 'low',
      category: 'optimization',
      evidence: `Search credits: ${c.searchCreditsUsed.toFixed(1)}, Lake credits: ${c.lakeCreditsUsed.toFixed(1)}`,
      recommendation: 'Ensure search datasets point to Lake storage to optimize credit usage.',
    });
  }

  return risks;
}

function generateRecommendations(c: CustomerTelemetry, level: number): Recommendation[] {
  const recs: Recommendation[] = [];

  if (c.destinationCount <= 1 && c.sourceCount > 0) {
    recs.push({
      id: 'multi-dest',
      title: 'Implement Multi-Destination Architecture',
      description: 'Route telemetry to multiple destinations based on data value and retention requirements.',
      priority: 'immediate',
      effort: 'medium',
      impact: 'high',
      category: 'multi-destination',
      steps: [
        'Classify source types by security vs. observability use case',
        'Define routing policy: which events are required in primary SIEM vs. retained elsewhere',
        'Configure Lake or S3 as a secondary destination',
        'Implement routes to fan out data based on source type',
        'Monitor cost reduction and investigation improvements',
      ],
    });
  }

  if (!c.adoptLake && c.lakeGB === 0 && level >= 1) {
    recs.push({
      id: 'adopt-lake',
      title: 'Deploy Cribl Lake for Long-Term Retention',
      description: 'Store full-fidelity telemetry in Lake at a fraction of SIEM cost. Enables compliance retention, forensic investigations, and AI/ML use cases.',
      priority: c.destinationCount <= 1 ? 'immediate' : 'short-term',
      effort: 'low',
      impact: 'high',
      category: 'lake-adoption',
      steps: [
        'Provision Lake instance and configure storage classes',
        'Add Lake as a parallel destination on high-volume worker groups',
        'Configure retention policies aligned to compliance requirements',
        'Enable Search for on-demand access to Lake data',
      ],
    });
  }

  if (!c.adoptSearch && c.completedSearches === 0 && level >= 2) {
    recs.push({
      id: 'adopt-search',
      title: 'Enable Cribl Search for Federated Investigations',
      description: 'Deploy Search for federated query access across Lake, S3, and live data. Eliminates tool-hopping during incidents.',
      priority: 'short-term',
      effort: 'low',
      impact: 'medium',
      category: 'search-adoption',
      steps: [
        'Configure Search with dataset definitions for primary data sources',
        'Create search datasets pointing to Lake storage',
        'Build saved searches for common investigation patterns',
        'Train security/ops team on federated search workflows',
      ],
    });
  }

  if (!c.adoptCloudEdge && c.edgeInBytes === 0 && (c.streamInBytes / 1073741824) > 500) {
    recs.push({
      id: 'deploy-edge',
      title: 'Deploy Cribl Edge for Source-Side Processing',
      description: 'Place Edge at high-volume source locations to filter and route data before it crosses the WAN.',
      priority: 'long-term',
      effort: 'high',
      impact: 'medium',
      category: 'edge-deployment',
      steps: [
        'Identify top bandwidth-consuming source locations',
        'Deploy Edge fleet with central management from Leader',
        'Implement source-side filtering to reduce WAN traffic 30-60%',
        'Configure local buffering for resilience during connectivity loss',
      ],
    });
  }

  if (level >= 2 && c.pipelines < 5) {
    recs.push({
      id: 'pipeline-maturity',
      title: 'Develop Pipeline Complexity',
      description: 'Expand pipeline usage beyond basic routing. Add filtering, enrichment, and transformation to optimize data before delivery.',
      priority: 'short-term',
      effort: 'medium',
      impact: 'medium',
      category: 'optimization',
      steps: [
        'Identify high-volume sources that could benefit from field filtering',
        'Build pipelines for event reduction (drop nulls, trim fields)',
        'Add enrichment functions for context (geo-IP, asset lookup)',
        'Implement data masking for compliance-sensitive fields',
      ],
    });
  }

  return recs;
}

function identifyQuickWins(c: CustomerTelemetry, level: number): QuickWin[] {
  const wins: QuickWin[] = [];

  if (c.sourceCount > 0 && c.destinationCount === 1) {
    wins.push({
      id: 'single-dest-fanout',
      title: 'Add a Fan-Out Destination',
      description: 'All data flows to a single destination. Adding a clone route to Lake or S3 takes minutes and gives you a full-fidelity backup.',
      effort: 'minutes',
      impact: 'high',
      action: 'Clone an existing route to also send to a Lake or S3 destination.',
      evidence: `${c.sourceCount} sources routing to only 1 destination`,
    });
  }

  if (c.adoptLake && c.lakeGB > 0 && !c.adoptSearch && c.completedSearches === 0) {
    wins.push({
      id: 'lake-no-search',
      title: 'Lake Has Data — Connect Search',
      description: `${c.lakeGB.toFixed(1)} GB stored in Lake but Search isn't active. Connecting Search to Lake enables on-demand investigations.`,
      effort: 'hours',
      impact: 'high',
      action: 'Create Search datasets pointing to Lake storage and build saved searches for common patterns.',
      evidence: `${c.lakeGB.toFixed(1)} GB in Lake, 0 completed searches`,
    });
  }

  if (c.adoptSearch && c.completedSearches > 0 && c.completedSearches < 10) {
    wins.push({
      id: 'search-underused',
      title: 'Search Active but Underutilized',
      description: `Only ${c.completedSearches} completed searches. Training the team on search workflows can unlock investigation speed.`,
      effort: 'hours',
      impact: 'medium',
      action: 'Schedule a Search workshop — build saved searches for top investigation patterns.',
      evidence: `${c.completedSearches} completed searches`,
    });
  }

  if (c.adoptCloudEdge && c.maxEdgeNodes > 0 && c.maxEdgeNodes < 10) {
    wins.push({
      id: 'edge-scale-up',
      title: 'Edge Deployed — Expand Coverage',
      description: `Edge fleet has ${c.maxEdgeNodes} nodes. Expanding to high-volume sites would reduce WAN bandwidth and improve resilience.`,
      effort: 'days',
      impact: 'high',
      action: 'Identify top 3-5 bandwidth-consuming sites and deploy additional Edge nodes.',
      evidence: `${c.maxEdgeNodes} max edge nodes currently deployed`,
    });
  }

  if (c.productAdoptionCount <= 2 && level >= 1) {
    wins.push({
      id: 'expand-product-adoption',
      title: 'Expand Product Portfolio',
      description: `Only ${c.productAdoptionCount} product(s) adopted (${c.productAdoptionGroup}). Each additional product unlocks compounding value.`,
      effort: 'days',
      impact: 'high',
      action: c.adoptLake ? 'Add Search to leverage existing Lake investment.' : 'Add Lake as the next logical product for retention and cost optimization.',
      evidence: `Product adoption group: ${c.productAdoptionGroup}, count: ${c.productAdoptionCount}`,
    });
  }

  if (c.lakeDatasets > 0 && c.lakeDatasets <= 2) {
    wins.push({
      id: 'expand-lake-datasets',
      title: 'Expand Lake Dataset Coverage',
      description: `Only ${c.lakeDatasets} Lake dataset(s). Adding more source types to Lake expands investigation and compliance coverage.`,
      effort: 'hours',
      impact: 'medium',
      action: 'Route additional high-value source types to Lake with appropriate retention policies.',
      evidence: `${c.lakeDatasets} Lake datasets`,
    });
  }

  return wins.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { minutes: 0, hours: 1, days: 2 };
    return (impactOrder[a.impact] - impactOrder[b.impact]) || (effortOrder[a.effort] - effortOrder[b.effort]);
  });
}

function generateArtOfThePossible(currentLevel: number, c: CustomerTelemetry): ArtOfThePossible[] {
  const items: ArtOfThePossible[] = [];

  if (currentLevel < 2) {
    items.push({
      title: 'Multi-Destination Routing',
      description: 'Route the same data to multiple destinations simultaneously — send optimized data to your SIEM for detections while preserving full-fidelity copies in cost-effective storage.',
      level: 2,
      category: 'multi-destination',
      businessValue: 'Reduce SIEM costs 30-60% while preserving all data for when you need it most.',
    });
    items.push({
      title: 'Data Replay from Object Store',
      description: 'Store raw data in S3/GCS and replay it into any destination on demand. Re-investigate incidents from months ago without maintaining expensive hot retention.',
      level: 2,
      category: 'tiering',
      businessValue: 'Eliminate the tradeoff between retention cost and investigation capability.',
    });
  }

  if (currentLevel < 3) {
    items.push({
      title: 'Cribl Lake: SIEM-Agnostic Retention',
      description: 'Store full-fidelity telemetry in Cribl Lake at a fraction of SIEM cost. Switch SIEMs without losing years of historical data.',
      level: 3,
      category: 'lake',
      businessValue: 'Break vendor lock-in while extending retention from months to years at minimal cost.',
    });
    items.push({
      title: 'Federated Search Across All Data',
      description: 'Use Cribl Search to query across live streaming data, Lake, S3, and other stores from a single interface.',
      level: 3,
      category: 'search',
      businessValue: 'Reduce MTTR by eliminating tool-hopping during investigations.',
    });
    items.push({
      title: 'Hot/Warm/Cold Data Tiering',
      description: 'Implement intelligent data tiering: 30-90 days hot in SIEM, 90-365 days warm in Lake, 1-5+ years cold for compliance.',
      level: 3,
      category: 'tiering',
      businessValue: 'Right-size cost to access pattern — stop paying SIEM prices for data accessed once a year.',
    });
    if (!c.adoptCloudEdge && c.edgeInBytes === 0) {
      items.push({
        title: 'Edge-Side Collection & Filtering',
        description: 'Deploy Edge at source locations to filter and route data before it crosses the WAN. Consolidate agents into one.',
        level: 3,
        category: 'edge',
        businessValue: 'Reduce WAN bandwidth 40-70% and eliminate agent sprawl.',
      });
    }
  }

  if (currentLevel < 4) {
    items.push({
      title: 'Composable Telemetry Cloud',
      description: 'Treat telemetry infrastructure as composable services: any team requests data routed to their preferred tool with governance built in.',
      level: 4,
      category: 'composable',
      businessValue: 'Enable organizational agility — new tools and teams onboard in hours, not months.',
    });
    items.push({
      title: 'Operational Intelligence on Data Flows',
      description: 'Build dashboards and alerts on your telemetry pipeline: volume anomalies, delivery latency, cost tracking, health monitoring.',
      level: 4,
      category: 'enrichment',
      businessValue: 'Proactive detection of data quality issues before they impact security or operations.',
    });
    items.push({
      title: 'Enrichment Services at the Pipeline',
      description: 'Enrich events in-flight with threat intel, asset context, geo-IP before they reach any destination.',
      level: 4,
      category: 'enrichment',
      businessValue: 'Faster detections, richer context during investigations, reduced downstream processing.',
    });
  }

  return items;
}

export function formatBytes(bytes: number): string {
  const gb = bytes / 1073741824;
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  if (gb > 0) return `${(gb * 1024).toFixed(0)} MB`;
  return '0';
}

export function formatGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  if (gb > 0) return `${(gb * 1024).toFixed(0)} MB`;
  return '0';
}
