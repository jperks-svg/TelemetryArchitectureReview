import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2, CheckCircle2, Database, ArrowRightLeft, Search, Building2, Link2, Unlink, BarChart3 } from 'lucide-react';
import Card from '../components/Card';
import { discoverCustomer } from '../utils/discovery';
import { assessMaturity } from '../utils/maturity';
import type { MaturitySnapshot } from '../types';

interface Props {
  onDiscoveryComplete: (snapshot: MaturitySnapshot) => void;
  existingSnapshot: MaturitySnapshot | null;
}

export default function DiscoveryPage({ onDiscoveryComplete, existingSnapshot }: Props) {
  const [customerName, setCustomerName] = useState(existingSnapshot?.customer.customerName ?? '');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gleanConnected, setGleanConnected] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkGleanStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success')) {
      setGleanConnected(true);
      window.history.replaceState({}, '', '/');
    } else if (params.get('auth_error')) {
      setError(`Glean auth failed: ${params.get('auth_error')}`);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const checkGleanStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setGleanConnected(data.connected);
    } catch {
      setGleanConnected(false);
    }
  };

  const connectGlean = async () => {
    try {
      const res = await fetch('/api/auth/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start OAuth flow');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const disconnectGlean = async () => {
    await fetch('/api/auth/disconnect', { method: 'POST' });
    setGleanConnected(false);
  };

  const runDiscovery = async () => {
    if (!customerName.trim()) {
      setError('Please enter a customer name');
      return;
    }

    setRunning(true);
    setError(null);
    setProgress([]);

    try {
      const telemetry = await discoverCustomer(customerName.trim(), (msg) => {
        setProgress(prev => [...prev, msg]);
      });

      // Validate we got meaningful data back
      const hasAnyData = telemetry.streamInBytes > 0 ||
        telemetry.edgeInBytes > 0 ||
        telemetry.sourceCount > 0 ||
        telemetry.destinationCount > 0 ||
        telemetry.adoptCloudStream ||
        telemetry.adoptLake ||
        telemetry.adoptSearch ||
        telemetry.lakeGB > 0;

      if (!hasAnyData) {
        setProgress(prev => [...prev, 'Warning: Omni returned no telemetry data for this customer.']);
        setError('No telemetry data found for this customer. Check that the name matches exactly in Omni, or try reconnecting to Glean.');
        console.warn('Discovery returned empty telemetry:', telemetry);
        return;
      }

      setProgress(prev => [...prev, 'Running maturity assessment...']);
      const maturitySnapshot = assessMaturity(telemetry);
      onDiscoveryComplete(maturitySnapshot);
      navigate('/snapshot');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Discovery failed';
      setError(msg);
      setProgress(prev => [...prev, `Failed: ${msg}`]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Telemetry Maturity Discovery</h1>
        <p className="page-description">
          Enter a customer name to pull their Cribl telemetry data from Omni via Glean.
          This builds a maturity assessment including volumes, product adoption, risks, and recommendations.
        </p>
      </div>

      <div className="grid grid-2">
        <Card title="What Gets Assessed">
          <ul className="feature-list">
            <li><BarChart3 size={16} /> Stream and Edge volume metrics</li>
            <li><Database size={16} /> Lake storage and dataset counts</li>
            <li><Search size={16} /> Search activity and credit usage</li>
            <li><ArrowRightLeft size={16} /> Source, destination, pipeline, route counts</li>
          </ul>
          <div className="info-box">
            <strong>How it works:</strong> The app queries Omni analytics through Glean to retrieve
            aggregate telemetry metrics. No direct access to the customer environment is needed.
          </div>
        </Card>

        <Card title="Run Discovery">
          <div className="connection-status">
            {gleanConnected === null ? (
              <div className="connection-checking">Checking Glean connection...</div>
            ) : gleanConnected ? (
              <div className="connection-connected">
                <CheckCircle2 size={16} />
                <span>Connected to Glean</span>
                <button className="btn btn-sm" onClick={disconnectGlean}>
                  <Unlink size={12} />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="connection-disconnected">
                <button className="btn btn-primary" onClick={connectGlean}>
                  <Link2 size={16} />
                  Connect to Glean
                </button>
                <p className="connection-hint">OAuth sign-in required to query Omni data</p>
              </div>
            )}
          </div>

          {existingSnapshot && !running && (
            <div className="info-box info-box-success">
              <CheckCircle2 size={16} />
              <span>
                Previous discovery for <strong>{existingSnapshot.customer.customerName}</strong> — assessed at <strong>{existingSnapshot.maturityLabel} ({existingSnapshot.maturityTitle})</strong>.
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
              disabled={running || !gleanConnected}
              onKeyDown={(e) => e.key === 'Enter' && !running && gleanConnected && runDiscovery()}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={runDiscovery}
            disabled={running || !customerName.trim() || !gleanConnected}
          >
            {running ? (
              <>
                <Loader2 size={18} className="spin" />
                Discovering...
              </>
            ) : (
              <>
                <Play size={18} />
                {existingSnapshot ? 'Re-run Discovery' : 'Discover Maturity'}
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
          This app assesses a customer's <strong>Telemetry Maturity</strong> by pulling aggregate metrics
          from Omni and analyzing them against the L0-L4 maturity framework. It generates risk analysis,
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
