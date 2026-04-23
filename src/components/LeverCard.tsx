import { useState, useRef } from 'react';
import { ChevronDown, Trash2, CalendarDays, Lock } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { useVersionStore } from '../store/versionStore';
import { LEVER_CONFIGS, getZoneAvgPop } from '../data/defaults';
import type { Lever, Hypothesis } from '../types';
import { formatNum, formatImpressions } from '../utils/formatNum';
import NumInput, { PlainNumericInput } from './NumInput';
import FrenchDateInput from './FrenchDateInput';
import LeverLogoBadge from './LeverLogoBadge';
import SliderWithTooltip from './SliderWithTooltip';

interface Props {
  lever: Lever;
  hypothesis: Hypothesis;
  index: number;
}

export default function LeverCard({ lever, hypothesis, index }: Props) {
  const { removeLever, toggleLeverCollapse, updateLever, updateLeverBudget, updateLeverCoverage, updateLeverRepetition, globalParams, stores, leverConfigs } = useSimulationStore();
  const config = leverConfigs[lever.type] ?? LEVER_CONFIGS[lever.type];

  const version = useVersionStore(s => s.activeVersion);
  const budgetMode = hypothesis.budgetMode;
  // V2 objectif couverture : le budget est toujours éditable (il impacte la répétition)
  const isBudgetEditable = budgetMode === 'levier' || budgetMode === 'libre'
    || (version === 'v2' && hypothesis.objectiveMode === 'couverture');
  const isPctEditable = budgetMode === 'pctTotal';
  const isCoverageEditable = true;
  const isRepetitionEditable = true;

  // Local slider state to avoid React controlled input fighting during drag
  const [localBudget, setLocalBudget] = useState<number | null>(null);
  const isDraggingBudget = useRef(false);

  const sc = stores.length || 1;
  const avgPop = getZoneAvgPop(stores, hypothesis.zoneId);
  const sliderMax = (globalParams.maxBudgetSliderPerStore || 3000) * sc;
  // Coverage at which repetition reaches maxRepetitionSlider: cov = impressions / (maxRep * sc * avgPop) * 100
  const maxRepCoverage = lever.impressions > 0
    ? Math.min(100, (lever.impressions / (globalParams.maxRepetitionSlider * sc * avgPop)) * 100)
    : null;
  const coverageBelowMaxRep = maxRepCoverage !== null && lever.coverage < maxRepCoverage;

  const othersBudgetPctSum = hypothesis.levers
    .filter(l => l.id !== lever.id)
    .reduce((s, l) => s + l.budgetPercent, 0);
  const totalBudgetPctSum = hypothesis.levers.reduce((s, l) => s + l.budgetPercent, 0);
  const maxPctBeforeGlobal100 = Math.max(0, Math.min(100, 100 - othersBudgetPctSum));
  const pctBudgetSumOver100 = isPctEditable && totalBudgetPctSum > 100;
  const pctLeverPastGlobal100Cap = isPctEditable && lever.budgetPercent > maxPctBeforeGlobal100;

  return (
    <div
      className="glass-card overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 50}ms`, borderLeftColor: config?.color, borderLeftWidth: '3px' }}
    >
      {/* Header */}
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

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-navy-700/80 text-fg/80 px-2 py-0.5 rounded-full border border-fg/10 shrink-0">
            <span className="text-[10px] font-sans font-medium text-fg/62 normal-case tracking-normal">Budget levier</span>
            <span>{formatNum(lever.budget)}€</span>
          </span>
          <span className="inline-flex items-center text-[10px] font-mono font-medium bg-navy-700/60 text-fg/75 px-1.5 py-0.5 rounded-full border border-fg/15 shrink-0">
            CPM {lever.cpm.toFixed(2)}€
          </span>
          {(() => {
            const purchase = lever.purchaseCpm ?? 0;
            if (lever.cpm <= 0 || purchase <= 0) return null;
            const m = ((lever.cpm - purchase) / lever.cpm) * 100;
            const cls = m >= 40 ? 'text-teal-400' : m >= 35 ? 'text-amber-400' : 'text-coral-400';
            return (
              <span className={`inline-flex items-center text-[10px] font-mono font-medium bg-navy-700/60 px-1.5 py-0.5 rounded-full border border-fg/15 shrink-0 ${cls}`}>
                Marge {m.toFixed(1)}%
              </span>
            );
          })()}
          <span className="inline-flex items-center text-[11px] font-medium bg-navy-700/60 text-fg/75 px-2 py-0.5 rounded-full border border-fg/15 shrink-0">
            {lever.coverage}% couv.
          </span>
          <span className="inline-flex items-center text-[11px] font-medium bg-navy-700/60 text-fg/75 px-2 py-0.5 rounded-full border border-fg/15 shrink-0">
            {lever.repetition}× rép.
          </span>
          <span className="inline-flex items-center text-[11px] font-medium bg-navy-700/60 text-fg/75 px-2 py-0.5 rounded-full border border-fg/15 shrink-0">
            Min/mag {formatNum(lever.minBudgetPerStore)} €
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); removeLever(hypothesis.id, lever.id); }}
            className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer le levier"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className={`w-4 h-4 text-fg/60 transition-transform duration-200 ${
              lever.collapsed ? '' : 'rotate-180'
            }`}
          />
        </div>
      </div>

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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-amber-400">
                  {isPctEditable ? '% du budget total' : 'Budget'}
                </label>
                {isBudgetEditable ? (
                  <span className="text-[10px] text-fg/62">max admin : {formatNum(sliderMax)} €</span>
                ) : (
                  <div className="flex items-center gap-2">
                    {pctBudgetSumOver100 && (
                      <span className="text-[10px] text-coral-400 font-medium">
                        Σ % : {totalBudgetPctSum}%
                      </span>
                    )}
                    {!isPctEditable && (
                      <span className="text-[10px] text-fg/62 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Auto
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isPctEditable ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 relative">
                    <SliderWithTooltip
                      min={0}
                      max={100}
                      step={1}
                      value={lever.budgetPercent}
                      label={`${lever.budgetPercent} %`}
                      onChange={e => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                        updateLever(hypothesis.id, lever.id, { budgetPercent: v });
                      }}
                      className="w-full"
                      style={pctLeverPastGlobal100Cap ? { '--thumb-color': 'var(--color-coral-400)' } as React.CSSProperties : { '--thumb-color': 'var(--color-amber-400)' } as React.CSSProperties}
                    />
                    <div
                      className={`absolute w-px h-4 rounded-sm pointer-events-none z-10 transition-colors ${
                        pctLeverPastGlobal100Cap
                          ? 'bg-coral-400/90'
                          : pctBudgetSumOver100
                            ? 'bg-fg/45'
                            : 'bg-fg/40'
                      }`}
                      style={{ left: `${maxPctBeforeGlobal100}%`, bottom: '5px' }}
                      title={`Part max. de ce levier pour Σ % ≤ 100 (autres : ${othersBudgetPctSum}%)`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <PlainNumericInput
                      value={lever.budgetPercent}
                      onChange={v => updateLever(hypothesis.id, lever.id, { budgetPercent: Math.min(100, Math.max(0, v)) })}
                      min={0}
                      max={100}
                      step={1}
                      className={`w-14 bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right focus:outline-none focus:border-teal-400/40 transition-colors ${
                        pctLeverPastGlobal100Cap ? 'text-coral-400' : 'text-fg'
                      }`}
                    />
                    <span className="text-[10px] text-fg/60">%</span>
                  </div>
                  <span className="font-mono text-xs text-fg/60">=&nbsp;{formatNum(lever.budget)}€</span>
                </div>
              ) : isBudgetEditable ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <SliderWithTooltip
                      min={0}
                      max={sliderMax}
                      step={100}
                      value={isDraggingBudget.current ? (localBudget ?? lever.budget) : lever.budget}
                      label={`${formatNum(isDraggingBudget.current ? (localBudget ?? lever.budget) : lever.budget)} €`}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setLocalBudget(v);
                        updateLeverBudget(hypothesis.id, lever.id, v);
                      }}
                      onPointerDown={() => { isDraggingBudget.current = true; setLocalBudget(lever.budget); }}
                      onPointerUp={() => {
                        isDraggingBudget.current = false;
                        setLocalBudget(null);
                      }}
                      className="w-full"
                      style={{ '--thumb-color': 'var(--color-amber-400)' } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                    <NumInput
                      value={lever.budget}
                      onChange={v => updateLeverBudget(hypothesis.id, lever.id, v)}
                      min={0}
                      className="w-full bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                    />
                    <span className="text-[10px] text-fg/60 tabular-nums shrink-0" aria-hidden>
                      €
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative group">
                    <SliderWithTooltip
                      min={0}
                      max={sliderMax}
                      step={100}
                      value={lever.budget}
                      label={`${formatNum(lever.budget)} €`}
                      disabled
                      className="w-full opacity-40 pointer-events-none"
                      style={{ '--thumb-color': 'var(--color-amber-400)' } as React.CSSProperties}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-navy-800 border border-navy-600/40 text-[11px] text-fg/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Budget calculé depuis le budget total et la répartition&nbsp;%
                    </div>
                  </div>
                  <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                    <span className="w-full bg-navy-800/40 border border-navy-600/20 rounded-md px-2 py-1.5 text-xs font-mono text-fg/60 cursor-not-allowed text-right block">
                      {formatNum(lever.budget)}
                    </span>
                    <span className="text-xs text-fg/60 shrink-0">€</span>
                  </div>
                </div>
              )}
            </div>

            {/* Coverage */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-blue-400">
                  Couverture
                </label>
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
                    value={lever.coverage}
                    label={`${lever.coverage.toFixed(1)} %`}
                    onChange={e => updateLeverCoverage(hypothesis.id, lever.id, Math.min(lever.maxCoverage, Number(e.target.value)))}
                    className="w-full"
                    disabled={!isCoverageEditable}
                    style={coverageBelowMaxRep ? { '--thumb-color': 'var(--color-coral-400)' } as React.CSSProperties : { '--thumb-color': 'var(--color-blue-400)' } as React.CSSProperties}
                  />
                  {/* Max repetition coverage marker */}
                  {maxRepCoverage !== null && (
                    <div
                      className={`absolute w-px h-4 rounded-sm pointer-events-none transition-colors ${coverageBelowMaxRep ? 'bg-coral-400/70' : 'bg-fg/40'}`}
                      style={{ left: `${maxRepCoverage}%`, bottom: '5px' }}
                      title={`Couverture max répétition (${globalParams.maxRepetitionSlider}×): ${maxRepCoverage.toFixed(1)}%`}
                    />
                  )}
                  {/* Max coverage marker */}
                  <div
                    className="absolute w-px h-4 bg-fg/40 rounded-sm pointer-events-none"
                    style={{ left: `${lever.maxCoverage}%`, bottom: '5px' }}
                    title={`Max théorique: ${lever.maxCoverage}%`}
                  />
                </div>
                <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                  <PlainNumericInput
                    value={lever.coverage}
                    onChange={v => updateLeverCoverage(hypothesis.id, lever.id, Math.min(lever.maxCoverage, Math.max(0, v)))}
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

            {/* Repetition */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-purple-400">
                  Répétition
                </label>
                {!isRepetitionEditable && (
                  <span className="text-[10px] text-fg/62 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Calculée
                  </span>
                )}
              </div>
              {isRepetitionEditable ? (
                <div className="flex items-center gap-3">
                  <SliderWithTooltip
                    min={0.1}
                    max={globalParams.maxRepetitionSlider}
                    step={0.1}
                    value={lever.repetition}
                    label={`${lever.repetition.toFixed(1)} ×`}
                    onChange={e => updateLeverRepetition(hypothesis.id, lever.id, Number(e.target.value))}
                    className="flex-1"
                    style={{ '--thumb-color': 'var(--color-purple-400)' } as React.CSSProperties}
                  />
                  <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                    <PlainNumericInput
                      value={lever.repetition}
                      onChange={v => updateLeverRepetition(hypothesis.id, lever.id, Math.min(globalParams.maxRepetitionSlider, Math.max(0.1, v)))}
                      min={0.1}
                      max={globalParams.maxRepetitionSlider}
                      step={0.1}
                      className="w-full bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                    />
                    <span className="text-xs text-fg/60 shrink-0">×</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <SliderWithTooltip
                    min={0.5}
                    max={globalParams.maxRepetitionSlider}
                    step={0.5}
                    value={lever.repetition}
                    label={`${lever.repetition}×`}
                    disabled
                    className="flex-1 opacity-40 cursor-not-allowed"
                    style={{ '--thumb-color': 'var(--color-purple-400)' } as React.CSSProperties}
                  />
                  <div className="w-[5.5rem] shrink-0">
                    <span className="flex items-center gap-1.5 bg-navy-800/40 border border-navy-600/20 rounded-md px-3 py-1.5 text-xs font-mono text-fg/60 cursor-not-allowed w-full">
                      <Lock className="w-3 h-3 text-fg/35 shrink-0" />
                      {lever.repetition}×
                    </span>
                  </div>
                </div>
              )}
            </div>

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
