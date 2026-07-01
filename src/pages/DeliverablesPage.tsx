import { useCallback, useState } from 'react';
import { FileText, Copy, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card';
import { generateExecutiveSummary } from '../utils/analysis';
import { MATURITY_LEVELS, formatGB } from '../utils/maturity';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

export default function DeliverablesPage({ snapshot }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to generate deliverables.</p>
        </div>
      </div>
    );
  }

  const summary = generateExecutiveSummary(
    snapshot.customer,
    snapshot.maturityLevel,
    snapshot.maturityTitle,
    snapshot.risks,
    snapshot.recommendations
  );

  const execSummaryText = formatExecSummary(snapshot, summary);
  const futureStateText = formatFutureState(snapshot);
  const snapshotText = formatSnapshotDoc(snapshot);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Deliverables</h1>
        <p className="page-description">
          Ready-to-use documents for {snapshot.customer.customerName}.
          Copy into Google Docs or share directly with the customer team.
        </p>
      </div>

      <div className="deliverables-list">
        <DeliverableCard
          id="exec-summary"
          title="Executive Summary (EBR-Ready)"
          description="Concise narrative for executive stakeholders — current state, maturity, risks, and next actions."
          content={execSummaryText}
          copied={copied}
          onCopy={copyToClipboard}
        />

        <DeliverableCard
          id="future-state"
          title="Future-State Recommendations"
          description="Multi-destination model, data tiering approach, and maturity progression path."
          content={futureStateText}
          copied={copied}
          onCopy={copyToClipboard}
        />

        <DeliverableCard
          id="snapshot"
          title="Telemetry Snapshot"
          description="One-page summary of volumes, product adoption, and infrastructure metrics."
          content={snapshotText}
          copied={copied}
          onCopy={copyToClipboard}
        />
      </div>
    </div>
  );
}

function DeliverableCard({
  id,
  title,
  description,
  content,
  copied,
  onCopy,
}: {
  id: string;
  title: string;
  description: string;
  content: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      title={title}
      subtitle={description}
      actions={
        <div className="btn-group">
          <button className="btn btn-sm" onClick={() => setExpanded(!expanded)}>
            <FileText size={14} />
            {expanded ? 'Collapse' : 'Preview'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => onCopy(content, id)}>
            {copied === id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied === id ? 'Copied!' : 'Copy'}
          </button>
        </div>
      }
    >
      {expanded && (
        <div className="deliverable-preview">
          <pre>{content}</pre>
        </div>
      )}
    </Card>
  );
}

function formatExecSummary(
  snapshot: MaturitySnapshot,
  summary: ReturnType<typeof generateExecutiveSummary>
): string {
  let text = `EXECUTIVE SUMMARY — TELEMETRY MATURITY ASSESSMENT\n`;
  text += `${'='.repeat(52)}\n`;
  text += `Customer: ${snapshot.customer.customerName}\n\n`;

  const currentDef = MATURITY_LEVELS[snapshot.maturityLevel];
  text += `MATURITY ASSESSMENT\n${'-'.repeat(19)}\n`;
  text += `Current Level: ${currentDef.label} — ${currentDef.title}\n`;
  text += `${currentDef.description}\n`;
  if (snapshot.nextLevel) {
    text += `\nNext Level: ${snapshot.nextLevel.label} — ${snapshot.nextLevel.title}\n`;
    text += `${snapshot.nextLevel.description}\n`;
    if (snapshot.gapsToNext.length > 0) {
      text += `\nGaps to close:\n`;
      for (const gap of snapshot.gapsToNext) {
        text += `  • ${gap}\n`;
      }
    }
  }
  text += '\n';

  text += `CURRENT STATE\n${'-'.repeat(13)}\n`;
  text += `${summary.currentState}\n\n`;

  text += `IDENTIFIED RISKS\n${'-'.repeat(16)}\n`;
  for (const risk of summary.identifiedRisks) {
    text += `• ${risk}\n`;
  }
  text += '\n';

  text += `RECOMMENDED EVOLUTION PATH\n${'-'.repeat(25)}\n`;
  for (const rec of summary.recommendedEvolution) {
    text += `• ${rec}\n`;
  }
  text += '\n';

  if (snapshot.artOfThePossible.length > 0) {
    text += `THE ART OF THE POSSIBLE\n${'-'.repeat(23)}\n`;
    for (const item of snapshot.artOfThePossible.slice(0, 5)) {
      text += `• [L${item.level}] ${item.title}: ${item.businessValue}\n`;
    }
    text += '\n';
  }

  text += `POSITIVE BUSINESS OUTCOMES\n${'-'.repeat(25)}\n`;
  for (const outcome of summary.positiveOutcomes) {
    text += `• ${outcome}\n`;
  }
  text += '\n';

  text += `NEXT ACTIONS\n${'-'.repeat(12)}\n`;
  for (const action of summary.nextActions) {
    text += `• ${action.action}\n  Owner: ${action.owner} | Timeline: ${action.timeline}\n`;
  }

  return text;
}

function formatFutureState(snapshot: MaturitySnapshot): string {
  let text = `FUTURE-STATE ARCHITECTURE RECOMMENDATIONS\n`;
  text += `${'='.repeat(42)}\n`;
  text += `Customer: ${snapshot.customer.customerName}\n\n`;

  const currentDef = MATURITY_LEVELS[snapshot.maturityLevel];
  text += `MATURITY PROGRESSION\n${'-'.repeat(20)}\n`;
  text += `Current: ${currentDef.label} — ${currentDef.title}\n`;
  if (snapshot.nextLevel) {
    text += `Target: ${snapshot.nextLevel.label} — ${snapshot.nextLevel.title}\n`;
    text += `\nTo reach ${snapshot.nextLevel.label}, the architecture should demonstrate:\n`;
    for (const char of snapshot.nextLevel.characteristics) {
      text += `  • ${char}\n`;
    }
  }
  text += '\n';

  text += `OBJECTIVES\n${'-'.repeat(10)}\n`;
  if (snapshot.customer.destinationCount <= 1) {
    text += `• Reduce single-destination dependency by implementing multi-destination routing\n`;
  }
  text += `• Preserve detection-critical telemetry in the primary SIEM while shifting retention to cost-effective storage\n`;
  text += `• Maintain architectural flexibility for future tool adoption\n\n`;

  text += `MULTI-DESTINATION MODEL\n${'-'.repeat(22)}\n`;
  text += `• "Lake-first" fan-out: All events land in Cribl Lake; Stream fans out curated subset to primary SIEM\n`;
  text += `• Per-use-case routing: Define which events are required for:\n`;
  text += `  - SIEM detections & dashboards → Primary destination\n`;
  text += `  - Threat hunting, forensics, compliance → Cribl Lake via Cribl Search\n\n`;

  text += `DATA TIERING APPROACH\n${'-'.repeat(20)}\n`;
  text += `Tier 0 – Hot (Primary SIEM): 30-90 days of detection-critical events\n`;
  text += `Tier 1 – Warm (Cribl Lake active): Full-fidelity for 90-365 days\n`;
  text += `Tier 2 – Cold (Lake archive/S3 Glacier): 1-5+ years for compliance\n\n`;

  text += `AGREED NEXT ACTIONS\n${'-'.repeat(18)}\n`;
  const immRecs = snapshot.recommendations.filter(r => r.priority === 'immediate');
  if (immRecs.length > 0) {
    for (const rec of immRecs) {
      text += `• ${rec.title}\n`;
      for (const step of rec.steps.slice(0, 3)) {
        text += `  - ${step}\n`;
      }
    }
  } else {
    text += `• Review maturity assessment findings with customer\n`;
    text += `• Prioritize top recommendations for pilot\n`;
    text += `• Define source-by-source routing and retention matrix\n`;
  }

  return text;
}

function formatSnapshotDoc(snapshot: MaturitySnapshot): string {
  const { customer, volumeSummary } = snapshot;
  let text = `TELEMETRY SNAPSHOT — ${customer.customerName.toUpperCase()}\n`;
  text += `${'='.repeat(40)}\n\n`;

  text += `OVERVIEW\n${'-'.repeat(8)}\n`;
  text += `Maturity Level: ${snapshot.maturityLabel} — ${snapshot.maturityTitle}\n`;
  text += `Daily Ingest: ${formatGB(volumeSummary.totalDailyIngestGB)}\n`;
  text += `Daily Outgest: ${formatGB(volumeSummary.totalDailyOutgestGB)}\n`;
  text += `Sources: ${customer.sourceCount}\n`;
  text += `Destinations: ${customer.destinationCount}\n`;
  text += `Worker Groups: ${customer.workerGroups}\n`;
  text += `Pipelines: ${customer.pipelines}\n`;
  text += `Routes: ${customer.routes}\n\n`;

  text += `PRODUCT ADOPTION\n${'-'.repeat(16)}\n`;
  text += `Cloud Stream: ${customer.adoptCloudStream ? 'Yes' : 'No'}\n`;
  text += `Cloud Edge: ${customer.adoptCloudEdge ? 'Yes' : 'No'}${customer.maxEdgeNodes > 0 ? ` (${customer.maxEdgeNodes} max nodes)` : ''}\n`;
  text += `On-Prem Stream: ${customer.adoptOnpremStream ? 'Yes' : 'No'}\n`;
  text += `On-Prem Edge: ${customer.adoptOnpremEdge ? 'Yes' : 'No'}\n`;
  text += `Lake: ${customer.adoptLake ? 'Yes' : 'No'}${customer.lakeGB > 0 ? ` (${formatGB(customer.lakeGB)} stored)` : ''}\n`;
  text += `Search: ${customer.adoptSearch ? 'Yes' : 'No'}${customer.completedSearches > 0 ? ` (${customer.completedSearches} searches)` : ''}\n`;
  text += `Adoption Group: ${customer.productAdoptionGroup} (${customer.productAdoptionCount} products)\n\n`;

  text += `VOLUME BREAKDOWN\n${'-'.repeat(16)}\n`;
  text += `Stream In: ${formatGB(volumeSummary.streamInGB)}\n`;
  text += `Stream Out: ${formatGB(volumeSummary.streamOutGB)}\n`;
  text += `Edge In: ${formatGB(volumeSummary.edgeInGB)}\n`;
  text += `Edge Out: ${formatGB(volumeSummary.edgeOutGB)}\n`;
  text += `Lake Storage: ${formatGB(volumeSummary.lakeStorageGB)}\n\n`;

  text += `SEARCH & CREDITS\n${'-'.repeat(16)}\n`;
  text += `Completed Searches: ${customer.completedSearches}\n`;
  text += `Dispatched Searches: ${customer.dispatchedSearches}\n`;
  text += `Search Credits Used: ${customer.searchCreditsUsed.toFixed(1)}\n`;
  text += `Lake Credits Used: ${customer.lakeCreditsUsed.toFixed(1)}\n`;
  text += `Lake Datasets: ${customer.lakeDatasets} (${customer.lakeDatasetsParquet} parquet, ${customer.lakeDatasetsJson} JSON)\n`;

  return text;
}
