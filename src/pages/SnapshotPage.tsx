import { Database, ArrowRightLeft, HardDrive, Layers, Search, BarChart3 } from 'lucide-react';
import Card from '../components/Card';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { formatGB } from '../utils/maturity';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

export default function SnapshotPage({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to generate your telemetry snapshot.</p>
        </div>
      </div>
    );
  }

  const { customer, volumeSummary } = snapshot;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Telemetry Snapshot: {customer.customerName}</h1>
        <p className="page-description">
          Aggregate telemetry metrics for this customer pulled from Omni — volumes, infrastructure counts, and product adoption.
        </p>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Daily Ingest" value={formatGB(volumeSummary.totalDailyIngestGB)} icon={<Database size={20} />} />
        <MetricCard label="Daily Outgest" value={formatGB(volumeSummary.totalDailyOutgestGB)} icon={<HardDrive size={20} />} />
        <MetricCard label="Sources" value={customer.sourceCount} icon={<BarChart3 size={20} />} />
        <MetricCard label="Destinations" value={customer.destinationCount} icon={<ArrowRightLeft size={20} />} />
        <MetricCard label="Lake Storage" value={formatGB(customer.lakeGB)} icon={<Layers size={20} />} />
        <MetricCard label="Searches/Day" value={customer.completedSearches} icon={<Search size={20} />} />
      </div>

      <div className="grid grid-3 mt-4">
        <Card title="Product Adoption">
          <table className="data-table">
            <tbody>
              <tr>
                <td>Cloud Stream</td>
                <td><StatusBadge status={customer.adoptCloudStream ? 'active' : 'inactive'} /></td>
              </tr>
              <tr>
                <td>Cloud Edge</td>
                <td><StatusBadge status={customer.adoptCloudEdge ? 'active' : 'inactive'} /></td>
                <td>{customer.maxEdgeNodes > 0 ? `${customer.maxEdgeNodes} max nodes` : ''}</td>
              </tr>
              <tr>
                <td>On-Prem Stream</td>
                <td><StatusBadge status={customer.adoptOnpremStream ? 'active' : 'inactive'} /></td>
              </tr>
              <tr>
                <td>On-Prem Edge</td>
                <td><StatusBadge status={customer.adoptOnpremEdge ? 'active' : 'inactive'} /></td>
              </tr>
              <tr>
                <td>Lake</td>
                <td><StatusBadge status={customer.adoptLake ? 'active' : 'inactive'} /></td>
                <td>{customer.lakeGB > 0 ? `${formatGB(customer.lakeGB)}` : ''}</td>
              </tr>
              <tr>
                <td>Search</td>
                <td><StatusBadge status={customer.adoptSearch ? 'active' : 'inactive'} /></td>
                <td>{customer.completedSearches > 0 ? `${customer.completedSearches} searches` : ''}</td>
              </tr>
            </tbody>
          </table>
          <div className="info-box mt-3">
            <strong>Adoption Group:</strong> {customer.productAdoptionGroup} ({customer.productAdoptionCount} product{customer.productAdoptionCount !== 1 ? 's' : ''})
          </div>
        </Card>

        <Card title="Volume Breakdown">
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Stream In</td><td>{formatGB(volumeSummary.streamInGB)}</td></tr>
              <tr><td>Stream Out</td><td>{formatGB(volumeSummary.streamOutGB)}</td></tr>
              <tr><td>Edge In</td><td>{formatGB(volumeSummary.edgeInGB)}</td></tr>
              <tr><td>Edge Out</td><td>{formatGB(volumeSummary.edgeOutGB)}</td></tr>
              <tr><td>Lake Storage</td><td>{formatGB(volumeSummary.lakeStorageGB)}</td></tr>
            </tbody>
          </table>
        </Card>

        <Card title="Infrastructure">
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Count</th></tr>
            </thead>
            <tbody>
              <tr><td>Sources</td><td>{customer.sourceCount}</td></tr>
              <tr><td>Destinations</td><td>{customer.destinationCount}</td></tr>
              <tr><td>Worker Groups</td><td>{customer.workerGroups}</td></tr>
              <tr><td>Pipelines</td><td>{customer.pipelines}</td></tr>
              <tr><td>Routes</td><td>{customer.routes}</td></tr>
              <tr><td>Max Edge Nodes</td><td>{customer.maxEdgeNodes}</td></tr>
              <tr><td>Lake Datasets</td><td>{customer.lakeDatasets}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid grid-2 mt-4">
        <Card title="Search & Lake Credits">
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Completed Searches</td><td>{customer.completedSearches}</td></tr>
              <tr><td>Dispatched Searches</td><td>{customer.dispatchedSearches}</td></tr>
              <tr><td>Errored Searches</td><td>{customer.erroredSearches}</td></tr>
              <tr><td>Search Credits Used</td><td>{customer.searchCreditsUsed.toFixed(1)}</td></tr>
              <tr><td>Lake Credits Used</td><td>{customer.lakeCreditsUsed.toFixed(1)}</td></tr>
              <tr><td>Lake Datasets (Parquet)</td><td>{customer.lakeDatasetsParquet}</td></tr>
              <tr><td>Lake Datasets (JSON)</td><td>{customer.lakeDatasetsJson}</td></tr>
            </tbody>
          </table>
        </Card>

        <Card title="Maturity Summary">
          <div className="info-box info-box-success">
            <strong>Level:</strong> {snapshot.maturityLabel} — {snapshot.maturityTitle}
          </div>
          <p className="mt-3">
            <strong>{snapshot.signals.filter(s => s.present).length}</strong> of {snapshot.signals.length} maturity signals detected.
          </p>
          {snapshot.gapsToNext.length > 0 && (
            <div className="mt-3">
              <strong>Gaps to next level:</strong>
              <ul className="mt-1">
                {snapshot.gapsToNext.slice(0, 4).map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
