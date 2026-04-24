import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { HypothesisSummary } from '../store/simulationStore';
import type { Hypothesis, LeverConfig } from '../types';
import { isLeverIncludedInHypothesis } from '../types';
import { LEVER_CONFIGS } from '../data/defaults';
import LeverLogoBadge from './LeverLogoBadge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Eye, Repeat, DollarSign, ArrowUp, ArrowDown, Minus, Info, Plus, Percent, TrendingUp } from 'lucide-react';
import { formatNum } from '../utils/formatNum';

export const COMPARISON_CHART_COLORS = ['#00e5a0', '#667eea', '#f59e0b', '#ef4444', '#ec4899'];

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

export interface ComparisonReportContentProps {
  hypotheses: Hypothesis[];
  summaries: (HypothesisSummary | null)[];
  allLeverTypes: string[];
  budgetComparisonData: Record<string, string | number>[];
  leverConfigs: Record<string, LeverConfig>;
  /** Colonne d’écart (désactivée dans l’UI actuelle) */
  showDiffColumn?: boolean;
}

export default function ComparisonReportContent({
  hypotheses,
  summaries,
  allLeverTypes,
  budgetComparisonData,
  leverConfigs,
  showDiffColumn = false,
}: ComparisonReportContentProps) {
  const COLORS = COMPARISON_CHART_COLORS;

  return (
    <div className="space-y-4 comparison-report-content">
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
              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> Objectif budget
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

              {allLeverTypes.map((type) => {
                const cfg = leverConfigs[type] ?? LEVER_CONFIGS[type];
                return (
                  <tr key={type} className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                    <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                      <LeverLogoBadge cfg={cfg} className="w-5 h-5" iconClassName="w-3 h-3" />
                      {type}
                    </td>
                    {hypotheses.map((h, i) => {
                      const lever = h.levers.find((l) => l.type === type);
                      const inScenario = lever && isLeverIncludedInHypothesis(lever);
                      return (
                        <td key={i} className="text-right px-4 py-2.5 font-mono text-fg/88">
                          {lever ? (
                            inScenario ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span>{formatNum(lever.budget)}€</span>
                                <span className="text-[10px] text-fg/65">{lever.coverage}% · {lever.repetition}×</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5 text-fg/45">
                                <span>0€</span>
                                <span className="text-[10px]">hors scénario</span>
                              </div>
                            )
                          ) : (
                            <span className="text-fg/55">—</span>
                          )}
                        </td>
                      );
                    })}
                    {showDiffColumn && hypotheses.length >= 2 && (
                      <td className="text-right px-4 py-2.5">
                        {(() => {
                          const a = hypotheses[0].levers.find((l) => l.type === type);
                          const b = hypotheses[1].levers.find((l) => l.type === type);
                          if (a && b) {
                            const ab = isLeverIncludedInHypothesis(a) ? a.budget : 0;
                            const bb = isLeverIncludedInHypothesis(b) ? b.budget : 0;
                            return <DiffBadge a={ab} b={bb} suffix="€" />;
                          }
                          return <span className="text-fg/55">—</span>;
                        })()}
                      </td>
                    )}
                  </tr>
                );
              })}

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

              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <Plus className="w-3 h-3" /> Prestas addi.
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? `${formatNum(s.prestationsSaleTotal)}€` : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].prestationsSaleTotal} b={summaries[1].prestationsSaleTotal} suffix="€" />
                  </td>
                )}
              </tr>

              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <Percent className="w-3 h-3" /> Rétrocom
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? `${s.retrocommissionPercent.toFixed(1)}%` : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].retrocommissionPercent} b={summaries[1].retrocommissionPercent} suffix="%" />
                  </td>
                )}
              </tr>

              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Marge (€)
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? (
                      <span className={s.marginAmount >= 0 ? 'text-teal-400' : 'text-red-400'}>
                        {formatNum(Math.round(s.marginAmount))}€
                      </span>
                    ) : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].marginAmount} b={summaries[1].marginAmount} suffix="€" />
                  </td>
                )}
              </tr>

              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06]">
                <td className="px-4 py-2.5 text-fg/82 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 opacity-80" /> Marge (%)
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono">
                    {s ? (
                      <span className={s.marginPercent >= 0 ? 'text-teal-400' : 'text-red-400'}>
                        {s.marginPercent.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].marginPercent} b={summaries[1].marginPercent} suffix="%" />
                  </td>
                )}
              </tr>

              <tr className="border-b border-fg/[0.09] hover:bg-fg/[0.06] bg-fg/[0.03]">
                <td className="px-4 py-2.5 text-fg/90 font-medium flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-teal-400" /> Budget total avec prestas
                </td>
                {summaries.map((s, i) => (
                  <td key={i} className="text-right px-4 py-2.5 font-mono font-semibold text-teal-400">
                    {s ? `${formatNum(s.grandTotal)}€` : '-'}
                  </td>
                ))}
                {showDiffColumn && summaries.length >= 2 && summaries[0] && summaries[1] && (
                  <td className="text-right px-4 py-2.5">
                    <DiffBadge a={summaries[0].grandTotal} b={summaries[1].grandTotal} suffix="€" />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {budgetComparisonData.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Budget par levier</h4>
          <div className="h-[180px] min-h-[180px] print:h-[220px]">
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
                  tickFormatter={(v) => formatNum(v)}
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
                <Legend wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }} />
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
