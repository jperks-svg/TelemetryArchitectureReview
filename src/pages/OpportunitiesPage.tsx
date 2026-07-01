import { DollarSign, Zap, ArrowRight, Clock, Calendar, Timer } from 'lucide-react';
import Card from '../components/Card';
import { formatGB } from '../utils/maturity';
import { generateCostModel } from '../utils/opportunities';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

export default function OpportunitiesPage({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to identify opportunities.</p>
        </div>
      </div>
    );
  }

  const { quickWins, customer } = snapshot;
  const costModel = generateCostModel(customer);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Opportunities</h1>
        <p className="page-description">
          Quick wins for {customer.customerName} that can be acted on immediately,
          plus the cost impact of evolving to a tiered architecture.
        </p>
      </div>

      {quickWins.length > 0 && (
        <>
          <div className="section-header">
            <h2><Zap size={22} style={{ color: '#f59e0b' }} /> Quick Wins</h2>
            <p>Low-effort changes that unlock immediate value.</p>
          </div>

          <div className="quick-wins-list">
            {quickWins.map(win => (
              <div key={win.id} className={`quick-win-card impact-${win.impact}`}>
                <div className="quick-win-header">
                  <h3>{win.title}</h3>
                  <div className="quick-win-meta">
                    <span className={`badge badge-effort-${win.effort === 'minutes' ? 'low' : win.effort === 'hours' ? 'medium' : 'high'}`}>
                      {win.effort === 'minutes' ? <Timer size={11} /> : win.effort === 'hours' ? <Clock size={11} /> : <Calendar size={11} />}
                      {win.effort}
                    </span>
                    <span className={`badge badge-impact-${win.impact}`}>
                      Impact: {win.impact}
                    </span>
                  </div>
                </div>
                <p className="quick-win-desc">{win.description}</p>
                <div className="quick-win-action">
                  <ArrowRight size={14} />
                  <span><strong>Action:</strong> {win.action}</span>
                </div>
                <div className="quick-win-evidence">
                  <span>{win.evidence}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {costModel.currentDailyGB > 0 && (
        <>
          <div className="section-header mt-4">
            <h2><DollarSign size={22} style={{ color: '#10b981' }} /> Cost/Value Model</h2>
            <p>Estimated impact of shifting from single-destination to tiered architecture.</p>
          </div>

          <div className="cost-model-grid">
            <Card className="cost-card cost-current">
              <div className="cost-card-header">Current State</div>
              <div className="cost-value">${formatCurrency(costModel.currentAnnualEstimate)}</div>
              <div className="cost-detail">est. annual / all to SIEM</div>
              <div className="cost-breakdown">
                <div className="cost-line">
                  <span>Daily Volume</span>
                  <span>{formatGB(costModel.currentDailyGB)}</span>
                </div>
                <div className="cost-line">
                  <span>Destinations</span>
                  <span>100% → SIEM</span>
                </div>
              </div>
            </Card>

            <Card className="cost-card cost-proposed">
              <div className="cost-card-header">With Data Tiering</div>
              <div className="cost-value cost-value-savings">${formatCurrency(costModel.proposedAnnualEstimate)}</div>
              <div className="cost-detail">est. annual / tiered model</div>
              <div className="cost-breakdown">
                <div className="cost-line">
                  <span>SIEM (Hot)</span>
                  <span>{formatGB(costModel.proposedSIEMDailyGB)}/day</span>
                </div>
                <div className="cost-line">
                  <span>Lake (Warm)</span>
                  <span>{formatGB(costModel.proposedLakeDailyGB)}/day</span>
                </div>
                <div className="cost-line">
                  <span>Archive (Cold)</span>
                  <span>{formatGB(costModel.proposedArchiveDailyGB)}/day</span>
                </div>
              </div>
            </Card>

            <Card className="cost-card cost-savings">
              <div className="cost-card-header">Estimated Savings</div>
              <div className="cost-value cost-value-highlight">${formatCurrency(costModel.annualSavings)}</div>
              <div className="cost-detail">{costModel.savingsPercent.toFixed(0)}% annual reduction</div>
              <div className="cost-breakdown">
                <div className="cost-line">
                  <span>Per Day</span>
                  <span>${formatCurrency(costModel.annualSavings / 365)}</span>
                </div>
                <div className="cost-line">
                  <span>Per Month</span>
                  <span>${formatCurrency(costModel.annualSavings / 12)}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-3" title="Assumptions" subtitle="Adjust these based on customer-specific contract pricing">
            <ul className="assumptions-list">
              {costModel.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}
