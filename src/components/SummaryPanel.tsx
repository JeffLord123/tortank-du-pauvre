import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationStore } from '../store/simulationStore';
import { useVersionStore } from '../store/versionStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Hash, Eye, Repeat, Layers, Store, Info, Target, Percent, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatNum, formatImpressions } from '../utils/formatNum';
import { getMarginThreshold } from '../data/defaults';
import NumInput from './NumInput';

function CoverageKPI({ coverage, detail }: { coverage: number; detail: { name: string; coverage: number }[] }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    <div className="glass-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
          <Eye className="w-3 h-3 text-teal-400" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-fg/60">Couverture</span>
        {detail.length > 0 && (
          <div ref={iconRef} className="ml-auto" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <Info className="w-3.5 h-3.5 text-fg/40 hover:text-fg/70 cursor-help transition-colors" />
          </div>
        )}
      </div>
      <span className="text-lg font-bold font-mono">{coverage}%</span>
      {show &&
        detail.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-xs border"
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
                <span className="font-mono text-teal-400">{coverage}%</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function CoverageRepKPI({ coverage, avgRepetition, detail }: { coverage: number; avgRepetition: number; detail: { name: string; coverage: number }[] }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    <div className="glass-card p-3 h-full flex flex-col">
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
              <Eye className="w-3 h-3 text-teal-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-fg/60">Couverture</span>
            {detail.length > 0 && (
              <div ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
                <Info className="w-3.5 h-3.5 text-fg/40 hover:text-fg/70 cursor-help transition-colors" />
              </div>
            )}
          </div>
          <span className="text-2xl font-bold font-mono">{coverage}%</span>
        </div>
        <div className="w-full border-t border-fg/10" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
              <Repeat className="w-3 h-3 text-teal-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-fg/60">Rép. moy.</span>
          </div>
          <span className="text-2xl font-bold font-mono">{avgRepetition}×</span>
        </div>
      </div>
      {show &&
        detail.length > 0 &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-xs border"
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
                <span className="font-mono text-teal-400">{coverage}%</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function SummaryPanel() {
  const { simulation, activeHypothesisId, getHypothesisSummary, updateHypothesis } = useSimulationStore();
  const activeVersion = useVersionStore(s => s.activeVersion);

  if (!simulation || !activeHypothesisId) return null;

  const summary = getHypothesisSummary(activeHypothesisId);
  const hypothesis = simulation.hypotheses.find(h => h.id === activeHypothesisId);

  if (!summary || !hypothesis) {
    return (
      <div className="glass-card p-4 text-center">
        <Layers className="w-8 h-8 text-fg/42 mx-auto mb-3" />
        <p className="text-sm text-fg/60">
          Ajoutez des leviers pour voir le récapitulatif
        </p>
      </div>
    );
  }

  const totalImpressions = summary.leverBreakdown.reduce((s, l) => s + l.impressions, 0);
  const leversBudgetUsed = hypothesis.levers.reduce((s, l) => s + l.budget, 0);

  const prestations = simulation.prestations ?? [];
  const prestationsBilled = prestations.reduce((s, p) => s + (p.offered ? 0 : p.price * (p.quantity ?? 1)), 0);
  const hasPrestations = prestations.length > 0;
  const grandTotal = leversBudgetUsed + prestationsBilled;

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg/72">
          Récapitulatif · {hypothesis.name}
        </h3>
      </div>

      {/* KPIs grid */}
      {activeVersion === 'v2' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 h-full flex flex-col">
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                    <Target className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-fg/60">Objectif budget</span>
                </div>
                <span className="text-2xl font-bold font-mono">{formatNum(hypothesis.totalBudget)}€</span>
              </div>
              <div className="w-full border-t border-fg/10" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-fg/60">Budget hypo. réel</span>
                </div>
                <span className="text-2xl font-bold font-mono text-teal-400">{formatNum(leversBudgetUsed)}€</span>
              </div>
            </div>
          </div>

          <CoverageRepKPI coverage={summary.generalCoverage} avgRepetition={summary.avgRepetition} detail={summary.coverageDetail} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Budget hypo.</span>
            </div>
            <span className="text-lg font-bold font-mono text-teal-400">{formatNum(summary.totalBudget)}€</span>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <Hash className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Leviers</span>
            </div>
            <span className="text-lg font-bold font-mono">{summary.leverCount}</span>
          </div>

          <CoverageKPI coverage={summary.generalCoverage} detail={summary.coverageDetail} />

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-teal-400/10 flex items-center justify-center">
                <Repeat className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Rép. moy.</span>
            </div>
            <span className="text-lg font-bold font-mono">{summary.avgRepetition}×</span>
          </div>
        </div>
      )}

      {/* Récapitulatif marge */}
      <MargeRecap
        totalBudget={summary.totalBudget}
        realBudget={leversBudgetUsed}
        grandTotal={grandTotal}
        prestationsBilled={prestationsBilled}
        hasPrestations={hasPrestations}
        retrocommissionPercent={hypothesis.retrocommissionPercent ?? 0}
        onRetroChange={v => updateHypothesis(activeHypothesisId, { retrocommissionPercent: v })}
        purchaseTotal={summary.purchaseTotal}
        retrocommissionAmount={summary.retrocommissionAmount}
        marginAmount={summary.marginAmount}
        marginPercent={summary.marginPercent}
      />

      {/* Store extremes */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-3.5 h-3.5 text-fg/60" />
          <span className="text-[10px] uppercase tracking-wider text-fg/60">Points de vente</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-coral-400" />
            <span className="text-fg/82 truncate max-w-[120px]">{summary.minStore.name}</span>
          </div>
          <span className="font-mono text-coral-400">{formatNum(summary.minStore.budget)}€</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-teal-400" />
            <span className="text-fg/82 truncate max-w-[120px]">{summary.maxStore.name}</span>
          </div>
          <span className="font-mono text-teal-400">{formatNum(summary.maxStore.budget)}€</span>
        </div>
      </div>

      {/* Pie chart — Recharts 3: ResponsiveContainer needs a positive measured size; minWidth avoids flex 0-width */}
      <div className="glass-card p-4 min-w-0 w-full">
        <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Répartition budget</h4>
        <div className="h-[160px] w-full min-w-[180px]">
          <ResponsiveContainer width="100%" height={160} minWidth={180} debounce={32}>
            <PieChart>
              <Pie
                data={summary.leverBreakdown}
                dataKey="budget"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                strokeWidth={0}
              >
                {summary.leverBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--chart-tooltip-fg)',
                }}
                formatter={(value) => [`${formatNum(Number(value))}€`, 'Budget']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {summary.leverBreakdown.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-fg/82">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart - impressions */}
      <div className="glass-card p-4 min-w-0 w-full">
        <h4 className="text-[10px] uppercase tracking-wider text-fg/60 mb-3">Impressions par levier</h4>
        <div className="h-[140px] w-full min-w-[180px]">
          <ResponsiveContainer width="100%" height={140} minWidth={180} debounce={32}>
            <BarChart data={summary.leverBreakdown} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatImpressions(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--chart-tooltip-fg)',
                }}
                formatter={(value) => [formatImpressions(Number(value)), 'Impressions']}
              />
              <Bar dataKey="impressions" radius={[4, 4, 0, 0]}>
                {summary.leverBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Impressions total */}
      <div className="glass-card p-3 text-center">
        <span className="text-[10px] uppercase tracking-wider text-fg/60">Total impressions</span>
        <div className="text-xl font-bold font-mono text-teal-400 mt-1">{formatImpressions(totalImpressions)}</div>
      </div>
    </div>
  );
}

function MargeRecap({
  totalBudget,
  realBudget,
  grandTotal,
  prestationsBilled,
  hasPrestations,
  retrocommissionPercent,
  onRetroChange,
  retrocommissionAmount,
  marginAmount,
  marginPercent,
}: {
  totalBudget: number;
  realBudget: number;
  grandTotal: number;
  prestationsBilled: number;
  hasPrestations: boolean;
  retrocommissionPercent: number;
  onRetroChange: (v: number) => void;
  purchaseTotal: number;
  retrocommissionAmount: number;
  marginAmount: number;
  marginPercent: number;
}) {
  const threshold = getMarginThreshold(grandTotal);
  const ok = marginPercent >= threshold.minMarginPercent;
  const clamped = Math.max(0, Math.min(100, marginPercent));
  const barColor = ok ? 'from-indigo-500 via-teal-400 to-teal-400' : 'from-coral-400 via-amber-400 to-amber-500';

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg/72">Récapitulatif</span>
      </div>

      <div>
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">
          Budget total (avec prestas)
        </span>
        <span className="text-2xl font-bold font-mono text-teal-400">{formatNum(grandTotal)} €</span>
        {hasPrestations && (
          <span className="text-[11px] text-fg/55 font-mono block mt-0.5">
            {formatNum(realBudget)}€ + {formatNum(prestationsBilled)}€ prestas
          </span>
        )}
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1.5">
          Rétrocommission <span className="text-fg/45 normal-case">(optionnel)</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="relative w-24">
            <NumInput
              value={retrocommissionPercent}
              onChange={onRetroChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 pr-7 text-sm text-fg font-mono focus:outline-none focus:border-teal-400/40 transition-colors"
            />
            <Percent className="w-3.5 h-3.5 text-fg/45 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-sm text-fg/60 font-mono">− {formatNum(retrocommissionAmount)} €</span>
        </div>
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">Marge totale</span>
        <span className={`text-2xl font-bold font-mono ${ok ? 'text-teal-400' : 'text-coral-400'}`}>
          {formatNum(Math.round(marginAmount))} €
        </span>
        <p className="text-[10px] text-fg/45 mt-0.5">valeur absolue</p>
      </div>

      <div className="border-t border-fg/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-fg/60 block mb-1">Marge en pourcentage</span>
        <span className={`text-2xl font-bold font-mono ${ok ? 'text-teal-400' : 'text-coral-400'}`}>
          {marginPercent.toFixed(2)} %
        </span>
        <div className="mt-2 h-2 rounded-full bg-navy-800/60 overflow-hidden relative">
          <div
            className={`h-full bg-gradient-to-r ${barColor} transition-all`}
            style={{ width: `${clamped}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-fg/60"
            style={{ left: `${Math.min(100, threshold.minMarginPercent)}%` }}
            title={`Seuil ${threshold.minMarginPercent}% (${threshold.label})`}
          />
        </div>
      </div>

      <div
        className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border ${
          ok
            ? 'bg-teal-400/10 border-teal-400/30 text-[#0b2e1a]'
            : 'bg-coral-400/10 border-coral-400/30 text-[#3a0f0f]'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div className="text-[13px] leading-relaxed">
          {ok ? (
            <>
              <span className="font-bold">OK</span> — marge au-dessus du seuil de{' '}
              <span className="font-bold">{threshold.minMarginPercent.toFixed(2)} %</span>{' '}
              <span className="opacity-80">({threshold.label})</span>
            </>
          ) : (
            <>
              <span className="font-bold">Validation requise</span> — marge sous le seuil de{' '}
              <span className="font-bold">{threshold.minMarginPercent.toFixed(2)} %</span>{' '}
              <span className="opacity-80">({threshold.label})</span>. Accord de Thomas, Nico N ou Nico G nécessaire.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
