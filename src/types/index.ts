export interface CustomerTelemetry {
  customerName: string;
  date: string;

  // Volume metrics (daily, in bytes — display in GB/TB)
  streamInBytes: number;
  streamOutBytes: number;
  edgeInBytes: number;
  edgeOutBytes: number;

  // Infrastructure counts
  sourceCount: number;
  destinationCount: number;
  workerGroups: number;
  maxEdgeNodes: number;
  connectedEdgeNodes: number;
  pipelines: number;
  routes: number;

  // Lake metrics
  lakeGB: number;
  lakeDatasets: number;
  lakeDatasetsParquet: number;
  lakeDatasetsJson: number;

  // Search metrics
  completedSearches: number;
  dispatchedSearches: number;
  erroredSearches: number;
  searchDatasets: number;

  // Credit usage
  searchCreditsUsed: number;
  lakeCreditsUsed: number;

  // Adoption flags (derived from adoption model)
  adoptCloudStream: boolean;
  adoptCloudEdge: boolean;
  adoptOnpremStream: boolean;
  adoptOnpremEdge: boolean;
  adoptLake: boolean;
  adoptSearch: boolean;
  productAdoptionCount: number;
  productAdoptionGroup: string;

  // Raw response for debugging
  rawResponse?: Record<string, unknown>;
}

export interface MaturitySnapshot {
  customer: CustomerTelemetry;
  maturityLevel: number;
  maturityLabel: string;
  maturityTitle: string;
  signals: MaturitySignal[];
  risks: Risk[];
  recommendations: Recommendation[];
  quickWins: QuickWin[];
  nextLevel: MaturityLevelDef | null;
  gapsToNext: string[];
  artOfThePossible: ArtOfThePossible[];
  volumeSummary: VolumeSummary;
}

export interface VolumeSummary {
  totalDailyIngestGB: number;
  totalDailyOutgestGB: number;
  streamInGB: number;
  streamOutGB: number;
  edgeInGB: number;
  edgeOutGB: number;
  lakeStorageGB: number;
  searchesPerDay: number;
}

export interface MaturitySignal {
  indicator: string;
  present: boolean;
  levelImplication: number;
  detail?: string;
}

export interface MaturityLevelDef {
  level: number;
  label: string;
  title: string;
  description: string;
  characteristics: string[];
  capabilities: string[];
}

export interface ArtOfThePossible {
  title: string;
  description: string;
  level: number;
  category: 'multi-destination' | 'search' | 'lake' | 'edge' | 'tiering' | 'enrichment' | 'composable';
  businessValue: string;
}

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  category: string;
  evidence: string;
  recommendation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  impact: 'high' | 'medium' | 'low';
  category: string;
  steps: string[];
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  effort: 'minutes' | 'hours' | 'days';
  impact: 'high' | 'medium' | 'low';
  action: string;
  evidence: string;
}

export interface ValueLineItem {
  id: string;
  category: 'cost-reduction' | 'operational' | 'flexibility' | 'risk-mitigation';
  title: string;
  description: string;
  annualValue: number;
  evidence: string;
}

export interface ValueProjection {
  id: string;
  targetLevel: number;
  title: string;
  description: string;
  additionalAnnualValue: number;
  requirement: string;
}

export interface CustomerValue {
  costPerGBPerDay: number;
  currentAnnualValue: number;
  projectedAnnualValue: number;
  valueLineItems: ValueLineItem[];
  projections: ValueProjection[];
}

export interface ExecutiveSummary {
  currentState: string;
  maturityLevel: string;
  identifiedRisks: string[];
  recommendedEvolution: string[];
  positiveOutcomes: string[];
  nextActions: Array<{
    action: string;
    owner: string;
    timeline: string;
  }>;
}
