import { TrendingUp, CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import Card from '../components/Card';
import { MATURITY_LEVELS } from '../utils/maturity';
import type { MaturitySnapshot } from '../types';

interface Props {
  snapshot: MaturitySnapshot | null;
}

const LEVEL_COLORS = ['#6b7280', '#f59e0b', '#3b82f6', '#8b5cf6', '#00cccc'];

export default function MaturityPage({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No Discovery Data</h2>
          <p>Run the discovery process first to assess maturity.</p>
        </div>
      </div>
    );
  }

  const currentDef = MATURITY_LEVELS[snapshot.maturityLevel];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Telemetry Maturity Assessment</h1>
        <p className="page-description">
          {snapshot.customer.customerName}'s position on the maturity curve, what the next level unlocks,
          and the art of the possible for their telemetry architecture.
        </p>
      </div>

      <Card className="maturity-hero">
        <div className="maturity-progress">
          <div className="maturity-bar">
            {MATURITY_LEVELS.map((level) => (
              <div
                key={level.level}
                className={`maturity-step ${level.level <= snapshot.maturityLevel ? 'achieved' : ''} ${level.level === snapshot.maturityLevel ? 'current' : ''}`}
              >
                <div
                  className="maturity-dot"
                  style={{ borderColor: level.level <= snapshot.maturityLevel ? LEVEL_COLORS[level.level] : '#4b5563' }}
                >
                  {level.level < snapshot.maturityLevel ? (
                    <CheckCircle2 size={16} style={{ color: LEVEL_COLORS[level.level] }} />
                  ) : level.level === snapshot.maturityLevel ? (
                    <TrendingUp size={16} style={{ color: LEVEL_COLORS[level.level] }} />
                  ) : (
                    <Circle size={16} style={{ color: '#4b5563' }} />
                  )}
                </div>
                <div className="maturity-step-label">
                  <span className="maturity-level-tag" style={{ color: level.level <= snapshot.maturityLevel ? LEVEL_COLORS[level.level] : '#6b7280' }}>
                    {level.label}
                  </span>
                  <span className="maturity-step-title">{level.title}</span>
                </div>
              </div>
            ))}
            <div
              className="maturity-bar-fill"
              style={{ width: `${(snapshot.maturityLevel / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="maturity-current">
          <div className="maturity-current-badge" style={{ borderColor: LEVEL_COLORS[snapshot.maturityLevel] }}>
            <span className="maturity-current-level" style={{ color: LEVEL_COLORS[snapshot.maturityLevel] }}>
              {currentDef.label}
            </span>
            <span className="maturity-current-title">{currentDef.title}</span>
          </div>
          <p className="maturity-current-desc">{currentDef.description}</p>
        </div>
      </Card>

      <Card title="Assessment Signals" subtitle="What we detected from Omni telemetry data">
        <div className="signals-grid">
          {snapshot.signals.map((signal, i) => (
            <div key={i} className={`signal-item ${signal.present ? 'present' : 'absent'}`}>
              <div className="signal-icon">
                {signal.present ? (
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                ) : (
                  <Circle size={16} style={{ color: '#4b5563' }} />
                )}
              </div>
              <div className="signal-text">
                <span className="signal-indicator">{signal.indicator}</span>
                <span className="signal-level">
                  Level {signal.levelImplication} signal
                  {signal.detail && ` — ${signal.detail}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {snapshot.nextLevel && (
        <Card
          title={`Next Level: ${snapshot.nextLevel.label} — ${snapshot.nextLevel.title}`}
          subtitle="What needs to happen to unlock the next maturity stage"
          className="next-level-card"
        >
          <p className="next-level-desc">{snapshot.nextLevel.description}</p>

          <div className="next-level-characteristics">
            <h4>Characteristics of {snapshot.nextLevel.label}</h4>
            <ul>
              {snapshot.nextLevel.characteristics.map((c, i) => (
                <li key={i}>
                  <ArrowRight size={14} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {snapshot.gapsToNext.length > 0 && (
            <div className="next-level-gaps">
              <h4>Gaps to Close</h4>
              <ul>
                {snapshot.gapsToNext.map((gap, i) => (
                  <li key={i} className="gap-item">
                    <Circle size={14} />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.nextLevel.capabilities.length > 0 && (
            <div className="next-level-capabilities">
              <h4>Capabilities Unlocked</h4>
              <ul>
                {snapshot.nextLevel.capabilities.map((cap, i) => (
                  <li key={i}>
                    <Sparkles size={14} style={{ color: '#00cccc' }} />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {snapshot.artOfThePossible.length > 0 && (
        <>
          <div className="section-header">
            <h2>
              <Sparkles size={22} style={{ color: '#00cccc' }} />
              The Art of the Possible
            </h2>
            <p>Opportunities to mature the telemetry posture — what's achievable at higher levels.</p>
          </div>

          <div className="art-grid">
            {snapshot.artOfThePossible.map((item, i) => (
              <Card key={i} className={`art-card art-level-${item.level}`}>
                <div className="art-header">
                  <span className="art-level-badge" style={{ backgroundColor: LEVEL_COLORS[item.level] }}>
                    L{item.level}
                  </span>
                  <span className="art-category">{item.category.replace(/-/g, ' ')}</span>
                </div>
                <h3 className="art-title">{item.title}</h3>
                <p className="art-description">{item.description}</p>
                <div className="art-value">
                  <strong>Business Value:</strong> {item.businessValue}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card title="Customer Maturity Model Reference" subtitle="Full progression from L0 to L4" className="mt-4">
        <div className="maturity-reference">
          {MATURITY_LEVELS.map((level) => (
            <div
              key={level.level}
              className={`maturity-ref-item ${level.level === snapshot.maturityLevel ? 'current' : ''}`}
            >
              <div className="maturity-ref-header">
                <span className="maturity-ref-badge" style={{ backgroundColor: LEVEL_COLORS[level.level] }}>
                  {level.label}
                </span>
                <span className="maturity-ref-title">{level.title}</span>
              </div>
              <p className="maturity-ref-desc">{level.description}</p>
              {level.capabilities.length > 0 && (
                <ul className="maturity-ref-caps">
                  {level.capabilities.map((cap, i) => (
                    <li key={i}>{cap}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
