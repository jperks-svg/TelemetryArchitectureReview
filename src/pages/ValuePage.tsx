import { useState } from 'react';
import { DollarSign, TrendingUp, Shield, Shuffle, Settings2, ArrowUpRight } from 'lucide-react';
import Card from '../components/Card';
import { calculateCustomerValue } from '../utils/value';
import { MATURITY_LEVELS } from '../utils/maturity';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

const CATEGORY_ICONS = {
  'cost-reduction': DollarSign,
  'operational': Settings2,
  'flexibility': Shuffle,
  'risk-mitigation': Shield,
};

const CATEGORY_LABELS = {
  'cost-reduction': 'Cost Reduction',
  'operational': 'Operational Efficiency',
  'flexibility': 'Flexibility & Choice',
  'risk-mitigation': 'Risk Mitigation',
};

export default function ValuePage({ snapshot }: Props) {
  const [costPerGB, setCostPerGB] = useState(3.50);

  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to calculate customer value.</p>
        </div>
      </div>
    );
  }

  const { customer, maturityLevel } = snapshot;
  const value = calculateCustomerValue(customer, maturityLevel, costPerGB);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customer Value</h1>
        <p className="page-description">
          Quantified value {customer.customerName} is realizing today from their Cribl investment,
          plus additional value available by progressing up the maturity model.
        </p>
      </div>

      <div className="value-config">
        <Card className="config-card">
          <div className="config-row">
            <label htmlFor="cost-per-gb">
              <DollarSign size={16} />
              <span>Cost per GB/day (destination ingest)</span>
            </label>
            <div className="config-input-group">
              <span className="input-prefix">$</span>
              <input
                id="cost-per-gb"
                type="number"
                min="0.01"
                step="0.25"
                value={costPerGB}
                onChange={(e) => setCostPerGB(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              />
              <span className="input-suffix">/GB/day</span>
            </div>
            <p className="config-hint">
              Set this to your customer's actual SIEM/destination ingest cost to tailor the value calculations.
              Industry average is $3.00–$5.00/GB/day for commercial SIEMs.
            </p>
          </div>
        </Card>
      </div>

      <div className="value-summary-bar">
        <div className="value-summary-item current">
          <div className="value-summary-label">Current Annual Value</div>
          <div className="value-summary-amount">${formatCurrency(value.currentAnnualValue)}</div>
          <div className="value-summary-detail">realized today</div>
        </div>
        <div className="value-summary-arrow">
          <ArrowUpRight size={24} />
        </div>
        <div className="value-summary-item projected">
          <div className="value-summary-label">Potential Annual Value</div>
          <div className="value-summary-amount">${formatCurrency(value.projectedAnnualValue)}</div>
          <div className="value-summary-detail">at full maturity</div>
        </div>
        <div className="value-summary-item uplift">
          <div className="value-summary-label">Unrealized Value</div>
          <div className="value-summary-amount">${formatCurrency(value.projectedAnnualValue - value.currentAnnualValue)}</div>
          <div className="value-summary-detail">available through progression</div>
        </div>
      </div>

      {value.valueLineItems.length > 0 && (
        <>
          <div className="section-header">
            <h2><DollarSign size={22} style={{ color: '#10b981' }} /> Current Value Realized</h2>
            <p>Value your Cribl investment is delivering today, based on telemetry data.</p>
          </div>

          <div className="value-items-list">
            {value.valueLineItems.map(item => {
              const Icon = CATEGORY_ICONS[item.category];
              return (
                <div key={item.id} className="value-item-card">
                  <div className="value-item-header">
                    <div className="value-item-title-row">
                      <Icon size={18} className={`value-icon category-${item.category}`} />
                      <h3>{item.title}</h3>
                    </div>
                    <div className="value-item-amount">${formatCurrency(item.annualValue)}<span>/yr</span></div>
                  </div>
                  <p className="value-item-desc">{item.description}</p>
                  <div className="value-item-footer">
                    <span className={`badge badge-category-${item.category}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="value-item-evidence">{item.evidence}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {value.projections.length > 0 && (
        <>
          <div className="section-header mt-4">
            <h2><TrendingUp size={22} style={{ color: '#6366f1' }} /> Value Through Maturity Progression</h2>
            <p>Additional value available by advancing to the next maturity levels.</p>
          </div>

          <div className="projections-list">
            {value.projections.map(proj => {
              const targetDef = MATURITY_LEVELS[proj.targetLevel];
              return (
                <div key={proj.id} className="projection-card">
                  <div className="projection-header">
                    <div className="projection-level-badge">
                      {targetDef.label}
                    </div>
                    <div className="projection-title-block">
                      <h3>{proj.title}</h3>
                      <span className="projection-level-title">{targetDef.title}</span>
                    </div>
                    <div className="projection-amount">+${formatCurrency(proj.additionalAnnualValue)}<span>/yr</span></div>
                  </div>
                  <p className="projection-desc">{proj.description}</p>
                  <div className="projection-requirement">
                    <strong>To unlock:</strong> {proj.requirement}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Card className="mt-3" title="Methodology" subtitle="How these values are calculated">
        <ul className="assumptions-list">
          <li>Cost reduction values use the customer-provided $/GB/day rate (currently ${costPerGB.toFixed(2)})</li>
          <li>Data reduction value = (ingest GB - outgest GB) x cost/GB x 365 days</li>
          <li>Lake retention savings = Lake GB x (SIEM rate - Lake rate of $0.35/GB/day) x 365</li>
          <li>Projections assume industry-standard ratios for tiering splits and edge filtering efficiency</li>
          <li>Actual value depends on customer contracts, data profiles, and use case specifics</li>
        </ul>
      </Card>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}
