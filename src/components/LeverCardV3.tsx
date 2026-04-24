import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Trash2, CalendarDays, Lock, LockOpen, Eye, EyeOff } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { LEVER_CONFIGS, getZoneAvgPop } from '../data/defaults';
import type { Lever, Hypothesis } from '../types';
import { leversIncludedInHypothesis } from '../types';
import { formatNum, formatImpressions } from '../utils/formatNum';
import NumInput, { PlainNumericInput } from './NumInput';
import FrenchDateInput from './FrenchDateInput';
import LeverLogoBadge from './LeverLogoBadge';
import SliderWithTooltip from './SliderWithTooltip';
import AlertFieldFlash from './AlertFieldFlash';
import type { LeverFlashRegion } from './LeverCard';

interface Props {
  lever: Lever;
  hypothesis: Hypothesis;
  index: number;
  budgetLocked: boolean;
  onToggleBudgetLock: () => void;
  alertFlashRegion?: LeverFlashRegion;
  alertFlashKey?: string;
}

export default function LeverCardV3({
  lever,
  hypothesis,
  index,
  budgetLocked,
  onToggleBudgetLock,
  alertFlashRegion = null,
  alertFlashKey = '',
}: Props) {
  const { removeLever, toggleLeverCollapse, updateLever, globalParams, stores, leverConfigs } = useSimulationStore();
  const config = leverConfigs[lever.type] ?? LEVER_CONFIGS[lever.type];

  const sc = stores.length || 1;
  const avgPop = getZoneAvgPop(stores, hypothesis.zoneId);
  const sliderMax = (globalParams.maxBudgetSliderPerStore || 3000) * sc;

  // Budget display unit: € or % (only when budget is locked)
  const [budgetUnit, setBudgetUnit] = useState<'€' | '%'>('€');
  // When budget unlocks, force back to €
  const effectiveBudgetUnit = budgetLocked ? budgetUnit : '€';

  // Total budget des leviers inclus dans le scénario (pour % affiché)
  const totalHypBudget = leversIncludedInHypothesis(hypothesis.levers).reduce((s, l) => s + l.budget, 0);
  const budgetPct = totalHypBudget > 0 ? Math.round((lever.budget / totalHypBudget) * 1000) / 10 : 0;

  // Local slider states
  const [localBudget, setLocalBudget] = useState<number | null>(null);
  const [localCov, setLocalCov] = useState<number | null>(null);
  const [localRep, setLocalRep] = useState<number | null>(null);
  const isDraggingBudget = useRef(false);
  const isDraggingCov = useRef(false);
  const isDraggingRep = useRef(false);

  const displayBudget = isDraggingBudget.current && localBudget !== null ? localBudget : lever.budget;
  const displayCov = isDraggingCov.current && localCov !== null ? localCov : lever.coverage;
  const displayRep = isDraggingRep.current && localRep !== null ? localRep : lever.repetition;

  // ── Calc helpers ─────────────────────────────────────────────
  function calcCovFromBudgetRep(budget: number, rep: number): number {
    if (lever.cpm <= 0 || rep <= 0) return 0;
    const impressions = (budget / lever.cpm) * 1000;
    const totalReach = impressions / (rep * sc);
    return Math.min(Math.round((totalReach / avgPop) * 1000) / 10, lever.maxCoverage);
  }

  function calcRepFromBudgetCov(budget: number, cov: number): number {
    if (lever.cpm <= 0 || cov <= 0) return 0.1;
    const impressions = (budget / lever.cpm) * 1000;
    const totalReach = (cov / 100) * avgPop;
    if (totalReach <= 0) return 0.1;
    return Math.max(0.1, Math.round((impressions / (totalReach * sc)) * 10) / 10);
  }

  // ── Budget change (unlocked): couv up to maxCoverage then répet, and vice-versa ──
  function handleBudgetChange(budget: number) {
    const maxCov = lever.maxCoverage;
    let newCov: number;
    let newRep: number;

    const covAtRep1 = calcCovFromBudgetRep(budget, 1);

    if (covAtRep1 >= maxCov) {
      // Budget high enough to saturate coverage → rep increases beyond 1
      newCov = maxCov;
      newRep = Math.max(0.1, calcRepFromBudgetCov(budget, maxCov));
    } else {
      // Coverage not saturated → rep = 1, coverage adjusts
      newCov = Math.max(0, covAtRep1);
      newRep = 1;
    }

    const impressions = Math.round((budget / lever.cpm) * 1000);
    updateLever(hypothesis.id, lever.id, { budget, coverage: newCov, repetition: newRep, impressions });
  }

  // ── Coverage change (budget locked): rep adjusts ──
  function handleCoverageChange(coverage: number) {
    const newRep = Math.max(0.1, calcRepFromBudgetCov(lever.budget, coverage));
    const impressions = Math.round((lever.budget / lever.cpm) * 1000);
    updateLever(hypothesis.id, lever.id, { coverage, repetition: newRep, impressions });
  }

  // ── Repetition change (budget locked): coverage adjusts ──
  function handleRepetitionChange(repetition: number) {
    const newCov = Math.max(0, calcCovFromBudgetRep(lever.budget, repetition));
    const impressions = Math.round((lever.budget / lever.cpm) * 1000);
    updateLever(hypothesis.id, lever.id, { repetition, coverage: newCov, impressions });
  }


  const maxRepCoverage = lever.impressions > 0
    ? Math.min(100, (lever.impressions / (globalParams.maxRepetitionSlider * sc * avgPop)) * 100)
    : null;
  const coverageBelowMaxRep = maxRepCoverage !== null && lever.coverage < maxRepCoverage;

  // ── Lock button ───────────────────────────────────────────────
  function BudgetLockBtn() {
    return (
      <button
        type="button"
        onClick={onToggleBudgetLock}
        title={budgetLocked ? 'Déverrouiller le budget' : 'Verrouiller le budget'}
        className={`p-1 rounded transition-colors shrink-0 ${
          budgetLocked
            ? 'text-teal-400 bg-teal-400/15 hover:bg-teal-400/25'
            : 'text-fg/40 hover:text-fg/70 hover:bg-fg/10'
        }`}
      >
        {budgetLocked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
      </button>
    );
  }

  // ── Unit switch (mini) ────────────────────────────────────────
  function BudgetUnitSwitch() {
    const canSwitch = budgetLocked;
    return (
      <div
        className={`flex rounded overflow-hidden border text-[10px] font-medium shrink-0 transition-opacity ${
          canSwitch ? 'border-fg/20 opacity-100' : 'border-fg/10 opacity-30 pointer-events-none'
        }`}
      >
        {(['€', '%'] as const).map(unit => (
          <button
            key={unit}
            type="button"
            disabled={!canSwitch}
            onClick={() => setBudgetUnit(unit)}
            className={`px-1.5 py-0.5 transition-colors ${
              effectiveBudgetUnit === unit
                ? 'bg-teal-400/20 text-teal-400'
                : 'bg-navy-800/40 text-fg/55 hover:text-fg/80'
            }`}
          >
            {unit}
          </button>
        ))}
      </div>
    );
  }

  const excludedFromScenario = lever.includedInHypothesis === false;
  const r = alertFlashRegion;
  const k = alertFlashKey;
  const isRowTarget = r === 'budget' || r === 'coverage' || r === 'repetition';
  const flashEntireCard = r === 'card';
  const headFlash = !!r && isRowTarget && lever.collapsed;
  const flashBudgetBlock = r === 'budget' && !lever.collapsed;
  const flashCoverageBlock = r === 'coverage' && !lever.collapsed;
  const flashRepetitionBlock = r === 'repetition' && !lever.collapsed;
  const keySeg = `${k}-h${lever.collapsed ? 1 : 0}`;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!flashEntireCard) {
      el.classList.remove('animate-alert-flash');
      return;
    }
    el.classList.remove('animate-alert-flash');
    void el.getBoundingClientRect();
    el.classList.add('animate-alert-flash');
  }, [flashEntireCard, k]);

  return (
    <div
      ref={rootRef}
      className={`glass-card animate-fade-in ${excludedFromScenario ? 'opacity-[0.58]' : ''}`}
      style={{ animationDelay: `${index * 50}ms`, borderLeftColor: config?.color, borderLeftWidth: '3px' }}
    >
      {/* Header */}
      <AlertFieldFlash active={headFlash} animKey={keySeg} className="-mx-0.5 px-0.5 rounded-lg">
        <div
          className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-fg/[0.06] transition-colors"
          onClick={() => toggleLeverCollapse(hypothesis.id, lever.id)}
        >
        <LeverLogoBadge cfg={config} />
        <span className="font-semibold text-sm shrink-0">
          {config?.family && config.family !== 'Legacy'
            ? `${config.family} - ${config.label || lever.type}`
            : (config?.label || lever.type)}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap content-start">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-navy-700/80 text-fg/80 px-2 py-0.5 rounded-full border border-fg/10 shrink-0 tabular-nums"
            title="Budget (€) · couverture (%) · répétition (×) — valeurs actuelles du levier sur la zone."
          >
            <span>
              {formatNum(displayBudget)}€ / {Number(displayCov).toFixed(1)}% / {Number(displayRep).toFixed(1)}×
            </span>
            <span
              className="inline-flex w-2.5 h-2.5 shrink-0 items-center justify-center"
              title={
                budgetLocked
                  ? 'Budget verrouillé : couverture et répétition s’ajustent au budget.'
                  : 'Budget déverrouillé : le budget suit vos réglages couverture / répétition.'
              }
            >
              {budgetLocked ? <Lock className="w-2.5 h-2.5 text-teal-400/70" /> : <span className="block w-2.5 h-2.5" aria-hidden />}
            </span>
          </span>
          <span
            className="inline-flex items-center text-[10px] font-mono font-medium bg-navy-700/60 text-fg/75 px-1.5 py-0.5 rounded-full border border-fg/15 shrink-0 tabular-nums"
            title="CPM — coût pour mille impressions (€), avant marge."
          >
            {lever.cpm.toFixed(2)} €
          </span>
          {(() => {
            const purchase = lever.purchaseCpm ?? 0;
            if (lever.cpm <= 0 || purchase <= 0) return null;
            const m = ((lever.cpm - purchase) / lever.cpm) * 100;
            const cls = m >= 40 ? 'text-teal-400' : m >= 35 ? 'text-amber-400' : 'text-coral-400';
            return (
              <span
                className={`inline-flex items-center text-[10px] font-mono font-medium bg-navy-700/60 px-1.5 py-0.5 rounded-full border border-fg/15 shrink-0 tabular-nums ${cls}`}
                title="Marge d’achat — (CPM affiché − CPM d’achat) / CPM, en %."
              >
                {m.toFixed(1)}%
              </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              updateLever(hypothesis.id, lever.id, { includedInHypothesis: excludedFromScenario });
            }}
            className={`p-1.5 rounded-md transition-colors ${
              excludedFromScenario
                ? 'text-amber-400/95 bg-amber-400/15 hover:bg-amber-400/25'
                : 'text-fg/45 hover:text-fg/78 hover:bg-fg/10'
            }`}
            title={
              excludedFromScenario
                ? 'Réintégrer dans le scénario (récap, totaux, comparaison)'
                : 'Exclure temporairement du scénario (récap et totaux)'
            }
          >
            {excludedFromScenario ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); removeLever(hypothesis.id, lever.id); }}
            className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer le levier"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className={`w-4 h-4 text-fg/60 transition-transform duration-200 ${lever.collapsed ? '' : 'rotate-180'}`}
          />
        </div>
        </div>
      </AlertFieldFlash>

      {/* Content */}
      <div className={`collapse-transition ${lever.collapsed ? '' : 'open'}`}>
        <div>
          <div className="px-4 pb-4 space-y-4 border-t border-fg/12 pt-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">
                  <CalendarDays className="w-3 h-3 inline mr-1" />Début custom
                </label>
                <FrenchDateInput
                  value={lever.startDate}
                  onChange={v => updateLever(hypothesis.id, lever.id, { startDate: v })}
                  className="w-full"
                  size="sm"
                  aria-label="Début custom"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1 block">
                  <CalendarDays className="w-3 h-3 inline mr-1" />Fin custom
                </label>
                <FrenchDateInput
                  value={lever.endDate}
                  onChange={v => updateLever(hypothesis.id, lever.id, { endDate: v })}
                  className="w-full"
                  size="sm"
                  aria-label="Fin custom"
                />
              </div>
            </div>

            {/* Budget */}
            <AlertFieldFlash
              active={flashBudgetBlock}
              animKey={`${k}-bud-${keySeg}`}
              className="-mx-0.5 px-0.5 rounded-lg"
            >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-amber-400">Budget levier</label>
                <span className="text-[10px] text-fg/62">max admin : {formatNum(sliderMax)} €</span>
              </div>
              <div className="flex items-center gap-2">
                <BudgetLockBtn />
                {budgetLocked ? (
                  /* Locked: display as read-only with unit switch */
                  <div className="flex-1 flex items-center gap-2">
                    <SliderWithTooltip
                      min={0}
                      max={sliderMax}
                      step={100}
                      value={displayBudget}
                      label={`${formatNum(displayBudget)} €`}
                      disabled
                      className="flex-1 opacity-40 cursor-not-allowed"
                      style={{ '--thumb-color': 'var(--color-amber-400)' } as React.CSSProperties}
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      {effectiveBudgetUnit === '%' ? (
                        <span className="w-16 bg-navy-800/40 border border-navy-600/20 rounded-md px-2 py-1.5 text-xs font-mono text-right text-fg/60 block">
                          {budgetPct.toFixed(1)}
                        </span>
                      ) : (
                        <span className="w-24 bg-navy-800/40 border border-navy-600/20 rounded-md px-3 py-1.5 text-xs font-mono text-right text-fg/60 block">
                          {formatNum(displayBudget)}
                        </span>
                      )}
                      <BudgetUnitSwitch />
                    </div>
                  </div>
                ) : (
                  /* Unlocked: editable slider + input */
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1">
                      <SliderWithTooltip
                        min={0}
                        max={sliderMax}
                        step={100}
                        value={displayBudget}
                        label={`${formatNum(displayBudget)} €`}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setLocalBudget(v);
                          handleBudgetChange(v);
                        }}
                        onPointerDown={() => { isDraggingBudget.current = true; setLocalBudget(lever.budget); }}
                        onPointerUp={() => { isDraggingBudget.current = false; setLocalBudget(null); }}
                        className="w-full"
                        style={{ '--thumb-color': 'var(--color-amber-400)' } as React.CSSProperties}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <NumInput
                        value={lever.budget}
                        onChange={v => handleBudgetChange(v)}
                        min={0}
                        className="w-24 bg-navy-800/60 border border-navy-600/30 rounded-md px-3 py-1.5 text-xs font-mono text-right text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                      />
                      <BudgetUnitSwitch />
                    </div>
                  </div>
                )}
              </div>
            </div>
            </AlertFieldFlash>

            {/* Coverage */}
            <AlertFieldFlash
              active={flashCoverageBlock}
              animKey={`${k}-cov-${keySeg}`}
              className="-mx-0.5 px-0.5 rounded-lg"
            >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-blue-400">Couverture</label>
                <div className="flex items-center gap-2">
                  {maxRepCoverage !== null && (
                    <span className={`text-[10px] transition-colors ${coverageBelowMaxRep ? 'text-coral-400' : 'text-fg/62'}`}>
                      max rép. : {maxRepCoverage.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-[10px] text-fg/62">max théo. : {lever.maxCoverage}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <SliderWithTooltip
                    min={0}
                    max={100}
                    step={0.5}
                    value={displayCov}
                    label={`${displayCov.toFixed(1)} %`}
                    onChange={e => {
                      const v = Math.min(lever.maxCoverage, Number(e.target.value));
                      setLocalCov(v);
                      handleCoverageChange(v);
                    }}
                    onPointerDown={() => { isDraggingCov.current = true; setLocalCov(lever.coverage); }}
                    onPointerUp={() => { isDraggingCov.current = false; setLocalCov(null); }}
                    className="w-full"
                    style={(lever.coverage > lever.maxCoverage || coverageBelowMaxRep) ? { '--thumb-color': 'var(--color-coral-400)' } as React.CSSProperties : { '--thumb-color': 'var(--color-blue-400)' } as React.CSSProperties}
                  />
                  {maxRepCoverage !== null && (
                    <div
                      className={`absolute w-px h-4 rounded-sm pointer-events-none transition-colors ${coverageBelowMaxRep ? 'bg-coral-400/70' : 'bg-fg/40'}`}
                      style={{ left: `${maxRepCoverage}%`, bottom: '5px' }}
                    />
                  )}
                  <div
                    className="absolute w-px h-4 bg-fg/40 rounded-sm pointer-events-none"
                    style={{ left: `${lever.maxCoverage}%`, bottom: '5px' }}
                  />
                </div>
                <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                  <PlainNumericInput
                    value={lever.coverage}
                    onChange={v => handleCoverageChange(Math.min(lever.maxCoverage, Math.max(0, v)))}
                    min={0}
                    max={100}
                    step={0.5}
                    className={`w-full bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right focus:outline-none focus:border-teal-400/40 transition-colors ${
                      coverageBelowMaxRep ? 'text-coral-400' : 'text-fg'
                    }`}
                  />
                  <span className="text-xs text-fg/60 shrink-0">%</span>
                </div>
              </div>
            </div>
            </AlertFieldFlash>

            {/* Repetition */}
            <AlertFieldFlash
              active={flashRepetitionBlock}
              animKey={`${k}-rep-${keySeg}`}
              className="-mx-0.5 px-0.5 rounded-lg"
            >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-purple-400">Répétition</label>
              </div>
              <div className="flex items-center gap-3">
                <SliderWithTooltip
                  min={0.1}
                  max={globalParams.maxRepetitionSlider}
                  step={0.1}
                  value={displayRep}
                  label={`${displayRep.toFixed(1)} ×`}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setLocalRep(v);
                    handleRepetitionChange(v);
                  }}
                  onPointerDown={() => { isDraggingRep.current = true; setLocalRep(lever.repetition); }}
                  onPointerUp={() => { isDraggingRep.current = false; setLocalRep(null); }}
                  className="flex-1"
                  style={{ '--thumb-color': 'var(--color-purple-400)' } as React.CSSProperties}
                />
                <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                  <PlainNumericInput
                    value={lever.repetition}
                    onChange={v => handleRepetitionChange(Math.min(globalParams.maxRepetitionSlider, Math.max(0.1, v)))}
                    min={0.1}
                    max={globalParams.maxRepetitionSlider}
                    step={0.1}
                    className="w-full bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                  />
                  <span className="text-xs text-fg/60 shrink-0">×</span>
                </div>
              </div>
            </div>
            </AlertFieldFlash>

            {/* Impressions readout */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-navy-800/30 border border-navy-600/10">
              <span className="text-[10px] uppercase tracking-wider text-fg/60">Impressions</span>
              <span className="font-mono text-sm text-teal-400">{formatImpressions(lever.impressions)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
