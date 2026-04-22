import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationStore, type HypothesisSummary } from '../store/simulationStore';
import { LEVER_CONFIGS } from '../data/defaults';
import LeverLogoBadge from './LeverLogoBadge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GitCompareArrows, Eye, Repeat, DollarSign, Layers, ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import { formatNum } from '../utils/formatNum';

function CoverageCell({ summary }: { summary: HypothesisSummary }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detail = summary.coverageDetail;
  const nonExposureProduct = detail.reduce((prod, l) => prod * (1 - l.coverage / 100), 1);

  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.left - 8 });
    }
    setShow(true);
  }
  function handleLeave() {
    hideTimer.current = setTimeout(() => setShow(false), 120);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {summary.generalCoverage}%
      {detail.length > 0 && (
        <span ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          <Info className="w-3 h-3 text-fg/40 hover:text-fg/70 cursor-help transition-colors" />
        </span>
      )}
      {show &&
        detail.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-xs border text-left"
            style={{
              top: pos.top,
              left: pos.left,
              transform: 'translate(-100%, -100%)',
              background: 'var(--chart-tooltip-bg)',
              borderColor: 'var(--chart-tooltip-border)',
              color: 'var(--chart-tooltip-fg)',
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <p className="font-semibold mb-1.5">Couverture dédupliquée</p>
            {detail.map((l, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>{l.name}</span>
                <span className="font-mono">1 − {l.coverage}% = {Math.round((1 - l.coverage / 100) * 1000) / 10}%</span>
              </div>
            ))}
            <div className="border-t border-fg/10 mt-1.5 pt-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>∏ non-exposition</span>
                <span className="font-mono">{Math.round(nonExposureProduct * 1000) / 10}%</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>1 − {Math.round(nonExposureProduct * 1000) / 10}%</span>
                <span className="font-mono text-teal-400">{summary.generalCoverage}%</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

function DiffBadge({ a, b, suffix = '' }: { a: number; b: number; suffix?: string }) {
  const diff = b - a;
  if (Math.abs(diff) < 0.1) return <Minus className="w-3 h-3 text-fg/62" />;
  const isUp = diff > 0;
  return (
    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${isUp ? 'text-teal-400' : 'text-coral-400'}`}>
      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{diff.toFixed(1)}{suffix}
    </span>
  );
}

export default function ComparisonView() {
  const { simulation, getHypothesisSummary, leverConfigs } = useSimulationStore();

  if (!simulation || simulation.hypotheses.length < 2) {
    return (
      <div className="glass-card p-4 text-center">
        <GitCompareArrows className="w-8 h-8 text-fg/42 mx-auto mb-3" />
        <p className="text-sm text-fg/60">
          Créez au moins 2 hypothèses pour les comparer
        </p>
      </div>
    );
  }

  const hypotheses = simulation.hypotheses;
  const summaries = hypotheses.map(h => getHypothesisSummary(h.id));

  // Build comparison chart data
  const allLeverTypes = [...new Set(hypotheses.flatMap(h => h.levers.map(l => l.type)))];
  const budgetComparisonData = allLeverTypes.map(type => {
    const entry: Record<string, string | number> = { name: type };
    hypotheses.forEach(h => {
      const lever = h.levers.find(l => l.type === type);
      entry[h.name] = lever?.budget || 0;
    });
    return entry;
  });

  const COLORS = ['#00e5a0', '#667eea', '#f59e0b', '#ef4444', '#ec4899'];

  /** Colonne des écarts entre hypothèses 1 et 2 — désactivée pour l’instant */
  const showDiffColumn = false;

  return (
    <div className="space-y-4 animate-slide-in">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72 flex items-center gap-2">
        <GitCompareArrows className="w-4 h-4" />
        Comparaison des hypothèses
      </h3>

      {/* Comparison table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-fg/12">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-fg/60 font-medium">
                  Métrique
                </th>
                {hypotheses.map((h, i) => (
                  <th key={h.id} className="text-right px-4 py-3 font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                    {h.name}
                  </th>
                ))}
                {showDiffColumn && hypotheses.length >= 2 && (
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-fg/62 font-medium">
                    Diff
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Budget */}
              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> Budget total
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? `${formatNum(s.totalBudget)}€` : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].totalBudget} b={summaries[1].totalBudget} suffix="€" />
                  </td>
                )}
              </tr>

              {/* Leviers */}
              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Leviers
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? s.leverCount : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].leverCount} b={summaries[1].leverCount} />
                  </td>
                )}
              </tr>

              {/* Couverture */}
              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <Eye className="w-3 h-3" /> Couverture
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? <CoverageCell summary={s} /> : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].generalCoverage} b={summaries[1].generalCoverage} suffix="%" />
                  </td>
                )}
              </tr>

              {/* Repetition */}
              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <Repeat className="w-3 h-3" /> Rép. moyenne
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? `${s.avgRepetition}×` : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].avgRepetition} b={summaries[1].avgRepetition} suffix="×" />
                  </td>
                )}
              </tr>

              {/* Per-lever details */}
              {allLeverTypes.map(type => {
                const cfg = leverConfigs[type] ?? LEVER_CONFIGS[type];
                return (
                  <tr key={type} className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                    <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                      <LeverLogoBadge cfg={cfg} className="w-5 h-5" iconClassName="w-3 h-3" />
                      {type}
                    </td>
                    {hypotheses.map((h, i) => {
                      const lever = h.levers.find(l => l.type === type);
                      return (
                        <td key={i} className="text-right px-4 py-2.5 font-mono text-fg/88">
                          {lever ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{formatNum(lever.budget)}€</span>
                              <span className="text-[10px] text-fg/65">{lever.coverage}% · {lever.repetition}×</span>
                            </div>
                          ) : (
                            <span className="text-fg/55">—</span>
                          )}
                        </td>
                      );
                    })}
                    {showDiffColumn && hypotheses.length >= 2 && (
                      <td className="text-right px-4 py-2.5">
                        {(() => {
                          const a = hypotheses[0].levers.find(l => l.type === type);
                          const b = hypotheses[1].levers.find(l => l.type === type);
                          if (a && b) return <DiffBadge a={a.budget} b={b.budget} suffix="€" />;
                          return <span className="text-fg/55">—</span>;
                        })()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget comparison chart */}
      {budgetComparisonData.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Budget par levier</h4>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetComparisonData} barGap={4}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => formatNum(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(value) => [`${formatNum(Number(value))}€`]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}
                />
                {hypotheses.map((h, i) => (
                  <Bar key={h.id} dataKey={h.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} barSize={16} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
