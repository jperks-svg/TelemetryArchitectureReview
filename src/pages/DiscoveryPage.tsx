import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2, CheckCircle2, Server, Database, ArrowRightLeft, Search, Building2 } from 'lucide-react';
import Card from '../components/Card';
import { discoverArchitecture } from '../utils/discovery';
import type { ArchitectureSnapshot } from '../types';

interface Props {
  onDiscoveryComplete: (snapshot: ArchitectureSnapshot) => void;
  existingSnapshot: ArchitectureSnapshot | null;
}

export default function DiscoveryPage({ onDiscoveryComplete, existingSnapshot }: Props) {
  const [customerName, setCustomerName] = useState(existingSnapshot?.customerName ?? '');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const runDiscovery = async () => {
    if (!customerName.trim()) {
      setError('Please enter a customer name');
      return;
    }

    setRunning(true);
    setError(null);
    setProgress([]);

    try {
      const snapshot = await discoverArchitecture(customerName.trim(), (msg) => {
        setProgress(prev => [...prev, msg]);
      });
      onDiscoveryComplete(snapshot);
      navigate('/snapshot');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Telemetry Maturity Discovery</h1>
        <p className="page-description">
          Enter a customer name to automatically pull their Cribl architecture data from Omni via Glean.
          This builds a complete telemetry snapshot including sources, destinations, volumes, and product adoption.
        </p>
      </div>

      <div className="grid grid-2">
        <Card title="What Gets Discovered">
          <ul className="feature-list">
            <li><Server size={16} /> Worker groups and Edge fleets</li>
            <li><Database size={16} /> All configured sources and destinations</li>
            <li><ArrowRightLeft size={16} /> Active data flows and routing rules</li>
            <li><Search size={16} /> Cribl Lake and Search configurations</li>
          </ul>
          <div className="info-box">
            <strong>How it works:</strong> The app queries Omni analytics through Glean to retrieve
            the customer's Cribl configuration data. No direct access to the customer environment is needed.
          </div>
        </Card>

        <Card title="Run Discovery">
          {existingSnapshot && !running && (
            <div className="info-box info-box-success">
              <CheckCircle2 size={16} />
              <span>
                Previous discovery for <strong>{existingSnapshot.customerName}</strong> found {existingSnapshot.sourceCount} sources and {existingSnapshot.destinationCount} destinations.
              </span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="customer-name" className="input-label">
              <Building2 size={14} />
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              className="input"
              placeholder="e.g., Acme Corp"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={running}
              onKeyDown={(e) => e.key === 'Enter' && !running && runDiscovery()}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={runDiscovery}
            disabled={running || !customerName.trim()}
          >
            {running ? (
              <>
                <Loader2 size={18} className="spin" />
                Discovering...
              </>
            ) : (
              <>
                <Play size={18} />
                {existingSnapshot ? 'Re-run Discovery' : 'Discover Architecture'}
              </>
            )}
          </button>

          {progress.length > 0 && (
            <div className="progress-log">
              {progress.map((msg, i) => (
                <div key={i} className="progress-line">
                  <CheckCircle2 size={14} />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error}
            </div>
          )}
        </Card>
      </div>

      <Card title="About Telemetry Maturity" className="mt-4">
        <p>
          This app assesses a customer's <strong>Telemetry Maturity</strong> by pulling their Cribl architecture
          data from Omni and analyzing it against the L0-L4 maturity framework. It generates risk analysis,
          strategic recommendations, and identifies quick wins — all without needing direct access to the customer environment.
        </p>
        <div className="grid grid-3 mt-3">
          <div className="stat-box">
            <div className="stat-label">Data Source</div>
            <div className="stat-value">Omni</div>
            <div className="stat-detail">Via Glean AI integration</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Deliverables Generated</div>
            <div className="stat-value">4</div>
            <div className="stat-detail">Snapshot, risks, recommendations, exec summary</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Maturity Levels</div>
            <div className="stat-value">L0-L4</div>
            <div className="stat-detail">With progression paths</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
