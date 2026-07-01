import { Lightbulb, ArrowRight, Clock, Zap, Target } from 'lucide-react';
import Card from '../components/Card';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

const PRIORITY_ICONS = {
  immediate: Zap,
  'short-term': Clock,
  'long-term': Target,
};

const PRIORITY_LABELS = {
  immediate: 'Immediate (0-4 weeks)',
  'short-term': 'Short-Term (1-3 months)',
  'long-term': 'Long-Term (3-6 months)',
};

export default function RecommendationsPage({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to generate recommendations.</p>
        </div>
      </div>
    );
  }

  const { recommendations } = snapshot;
  const immediate = recommendations.filter(r => r.priority === 'immediate');
  const shortTerm = recommendations.filter(r => r.priority === 'short-term');
  const longTerm = recommendations.filter(r => r.priority === 'long-term');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Strategic Recommendations</h1>
        <p className="page-description">
          Prioritized recommendations to evolve {snapshot.customer.customerName}'s telemetry architecture
          from {snapshot.maturityLabel} toward the next maturity level.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <div className="empty-state">
            <Lightbulb size={32} />
            <h3>Architecture Looks Good</h3>
            <p>No major recommendations at this time. Architecture is well-positioned at current maturity level.</p>
          </div>
        </Card>
      ) : (
        <>
          {[
            { items: immediate, key: 'immediate' as const },
            { items: shortTerm, key: 'short-term' as const },
            { items: longTerm, key: 'long-term' as const },
          ].filter(g => g.items.length > 0).map(({ items, key }) => {
            const Icon = PRIORITY_ICONS[key];
            return (
              <div key={key} className="recommendation-group">
                <h2 className="group-title">
                  <Icon size={20} />
                  {PRIORITY_LABELS[key]}
                </h2>
                {items.map(rec => (
                  <Card key={rec.id} className="recommendation-card">
                    <div className="rec-header">
                      <h3>{rec.title}</h3>
                      <div className="rec-meta">
                        <span className={`badge badge-effort-${rec.effort}`}>Effort: {rec.effort}</span>
                        <span className={`badge badge-impact-${rec.impact}`}>Impact: {rec.impact}</span>
                      </div>
                    </div>
                    <p className="rec-description">{rec.description}</p>
                    <div className="rec-steps">
                      <h4>Implementation Steps</h4>
                      <ol>
                        {rec.steps.map((step, i) => (
                          <li key={i}>
                            <ArrowRight size={14} />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
