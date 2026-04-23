import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Plus, Copy, Trash2, Zap, Target, DollarSign, Percent, Sliders, Unlock, ChevronDown, ChevronUp, BookmarkPlus, AlertTriangle, Lock, Equal, Users, Scale } from 'lucide-react';
import { useSimulationStore, computeDedupCoverage, distributeCoverageWaterfill } from '../store/simulationStore';
import { useProfileStore, getActiveProfile } from '../store/profileStore';
import { useVersionStore } from '../store/versionStore';
import { LEVER_TYPES, LEVER_CONFIGS, ZONES, getZoneAvgPop } from '../data/defaults';
import LeverCard from './LeverCard';
import LeverCardV3 from './LeverCardV3';
import LeverLogoBadge from './LeverLogoBadge';
import WarningBanner from './WarningBanner';
import type { Hypothesis, LeverType, BudgetMode, ObjectiveMode, Preset, StoreDistributionMode } from '../types';
import { formatNum } from '../utils/formatNum';
import NumInput from './NumInput';
import PrestationsPanel from './PrestationsPanel';
import SliderWithTooltip from './SliderWithTooltip';

// V3: per-lever budget lock (true = locked by default)
const DEFAULT_BUDGET_LOCKED = true;

const BUDGET_MODE_LABELS: Record<BudgetMode, { label: string; icon: React.ElementType; desc: string }> = {
  automatique:  { label: 'Automatique', icon: Zap, desc: 'Budget réparti selon la grille' },
  levier:       { label: 'Par levier', icon: Sliders, desc: 'Budget défini par levier' },
  pctTotal:     { label: '% du total', icon: Percent, desc: 'Répartition en % du budget' },
  libre:        { label: 'Libre', icon: Unlock, desc: 'Contrôle total sur chaque paramètre' },
  'v3-levier':  { label: 'V3 levier', icon: Sliders, desc: 'Budget par levier (V3)' },
};

const STORE_DISTRIBUTION_MODES: {
  id: StoreDistributionMode;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { id: 'egal', label: 'Égal', desc: 'Même budget pour chaque point de vente.', icon: Equal },
  { id: 'population', label: 'Population', desc: 'Répartition proportionnelle à la population de chaque magasin.', icon: Users },
  { id: 'pondere', label: 'Pondéré (%)', desc: 'Comme la part population, avec un coefficient par magasin (100% = identique ; 110% ≈ +10% sur cette part, le total reste budgété). Poids dans Admin → Magasins.', icon: Scale },
];

/** Libellé de l'objectif + mode budget tels qu'enregistrés dans le preset (dialogues, bannière). */
function formatPresetModeLabel(p: Preset): string {
  if (p.objectiveMode === 'couverture') return 'Objectif couverture';
  if (p.objectiveMode === 'budget' && p.budgetMode === 'libre') return 'Budget libre';
  if (p.objectiveMode === 'budget' && p.budgetMode === 'automatique') return 'Budget · Automatique';
  if (p.objectiveMode === 'budget' && p.budgetMode === 'pctTotal') return 'Budget · Manuel %';
  if (p.objectiveMode === 'budget' && p.budgetMode === 'levier') return 'Budget · Manuel €';
  return 'ce mode';
}

function nextPresetNameFromHypothesisName(name: string, existingNames: Set<string>): string {
  const base = name.trim() || 'Hypothèse';
  let candidate = `${base} · preset`;
  let n = 2;
  while (existingNames.has(candidate)) {
    candidate = `${base} · preset (${n})`;
    n++;
  }
  return candidate;
}

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  isActive: boolean;
}

function ZoneDropdown({
  hypothesisId,
  zoneId,
  disabled = false,
}: {
  hypothesisId: string;
  zoneId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { updateHypothesis } = useSimulationStore();
  const selected = ZONES.find(z => z.id === zoneId) ?? ZONES[0];

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? 'Verrouillé par le preset · déverrouiller depuis la bannière' : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen(o => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-xs text-fg transition-colors ${
          disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:border-teal-400/40 focus:outline-none focus:border-teal-400/40'
        }`}
      >
        <span>{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-fg/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-navy-900 border border-fg/15 rounded-lg shadow-xl shadow-black/40 overflow-hidden animate-fade-in">
          {ZONES.map(z => (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                updateHypothesis(hypothesisId, { zoneId: z.id as typeof ZONES[number]['id'] });
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-navy-800/60 hover:text-fg ${z.id === zoneId ? 'bg-teal-400/12 text-teal-400' : 'text-fg/70'}`}
            >
              {z.id === zoneId && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />}
              {z.id !== zoneId && <span className="w-1.5 h-1.5 flex-shrink-0" />}
              {z.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HypothesisCard({ hypothesis, isActive }: HypothesisCardProps) {
  const {
    setActiveHypothesis,
    updateHypothesis,
    duplicateHypothesis,
    addPresetFromHypothesis,
    removeHypothesis,
    toggleHypothesisCollapse,
    addLever,
    applyPreset,
    getHypothesisWarnings,
    setHypothesisTargetDedupCoverage,
    updateLever,
    presets,
    leverConfigs,
    stores,
  } = useSimulationStore();
  const profiles = useProfileStore(s => s.profiles);
  const activeProfileId = useProfileStore(s => s.activeProfileId);
  const activeProfile = getActiveProfile(profiles, activeProfileId);
  const version = useVersionStore(s => s.activeVersion);

  const visiblePresets = useMemo(() => {
    if (!activeProfile) return presets;
    if (activeProfile.isAdmin) {
      return presets.filter(p => (p.scope ?? 'admin') === 'admin');
    }
    return presets.filter(
      p =>
        (p.scope ?? 'admin') === 'admin' ||
        (p.scope === 'user' && p.ownerProfileId === activeProfile.id),
    );
  }, [presets, activeProfile]);

  const [showAddLever, setShowAddLever] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(true);

  // V3: per-lever budget lock (locked by default)
  const [budgetLocks, setBudgetLocks] = useState<Record<string, boolean>>({});
  function isBudgetLocked(leverId: string): boolean {
    return budgetLocks[leverId] ?? DEFAULT_BUDGET_LOCKED;
  }
  function handleToggleBudgetLock(leverId: string) {
    setBudgetLocks(prev => ({ ...prev, [leverId]: !(prev[leverId] ?? DEFAULT_BUDGET_LOCKED) }));
  }
  const allBudgetsLocked = hypothesis.levers.length > 0 &&
    hypothesis.levers.every(l => isBudgetLocked(l.id));

  function handleV3TotalBudgetChange(newTotal: number) {
    const currentSum = hypothesis.levers.reduce((s, l) => s + l.budget, 0);
    for (const lever of hypothesis.levers) {
      const newBudget = currentSum > 0
        ? Math.round((lever.budget / currentSum) * newTotal)
        : Math.round(newTotal / hypothesis.levers.length);
      // coverage fixed, rep adjusts
      const maxCov = lever.maxCoverage;
      const sc = stores.length || 1;
      const avgPop = getZoneAvgPop(stores, hypothesis.zoneId);
      const covAtRep1 = lever.cpm > 0
        ? Math.min(maxCov, Math.round(((newBudget / lever.cpm * 1000) / (1 * sc) / avgPop) * 1000) / 10)
        : 0;
      let newCov: number;
      let newRep: number;
      if (covAtRep1 >= maxCov) {
        newCov = maxCov;
        newRep = lever.cpm > 0 && maxCov > 0
          ? Math.max(0.1, Math.round(((newBudget / lever.cpm * 1000) / ((maxCov / 100) * avgPop * sc)) * 10) / 10)
          : 1;
      } else {
        newCov = Math.max(0, covAtRep1);
        newRep = 1;
      }
      const impressions = lever.cpm > 0 ? Math.round((newBudget / lever.cpm) * 1000) : 0;
      updateLever(hypothesis.id, lever.id, { budget: newBudget, coverage: newCov, repetition: newRep, impressions });
    }
  }

  // V2 objectif couverture : slider de couverture cible au niveau hypothèse
  const isV2Coverage = version === 'v2' && hypothesis.objectiveMode === 'couverture';
  // Couverture dédupliquée actuelle : 1 - ∏(1 - cov_i/100). C'est la même
  // valeur que celle du recap hypothèse.
  const dedupLeverCoverage = hypothesis.levers.length > 0
    ? Math.round(computeDedupCoverage(hypothesis.levers.map(l => l.coverage)) * 10) / 10
    : 0;
  const [localTargetCov, setLocalTargetCov] = useState<number | null>(null);
  const [covInput, setCovInput] = useState<string>('');
  const isDraggingCov = useRef(false);
  const displayCov = isDraggingCov.current && localTargetCov !== null ? localTargetCov : dedupLeverCoverage;

  function handleTargetCovChange(dedupCov: number) {
    const clamped = Math.max(0, Math.min(100, dedupCov));
    setLocalTargetCov(clamped);
    setHypothesisTargetDedupCoverage(hypothesis.id, clamped);
  }

  function commitCovInput() {
    const v = parseFloat(covInput.replace(',', '.'));
    if (!isNaN(v)) handleTargetCovChange(v);
    setCovInput('');
  }

  // Seuils waterfill : pour chaque levier (trié par max asc), la couverture
  // moyenne à partir de laquelle il sature est seuil_i = (m_i*(n-i)+Σ_{j<i} m_j)/n.
  // Mais le slider représente maintenant la couverture DÉDUPLIQUÉE. On calcule
  // donc la dédup correspondante à ce point de saturation. Le label affiché
  // reste le maxCoverage du levier (ex. "YouTube · 60 %") alors que la
  // position sur la piste utilise la dédup (ex. 84 %).
  const coverageFillPoints = useMemo(() => {
    const lvs = hypothesis.levers;
    const n = lvs.length;
    if (n === 0) return [] as { id: string; type: string; color: string; threshold: number; maxCoverage: number }[];
    const sorted = [...lvs].sort((a, b) => a.maxCoverage - b.maxCoverage);
    const maxes = sorted.map(l => l.maxCoverage);
    const pts: { id: string; type: string; color: string; threshold: number; maxCoverage: number }[] = [];
    let cum = 0;
    for (let i = 0; i < n; i++) {
      const m = sorted[i].maxCoverage;
      const avgThreshold = (m * (n - i) + cum) / n;
      const covs = distributeCoverageWaterfill(avgThreshold, maxes);
      const dedup = computeDedupCoverage(covs);
      pts.push({
        id: sorted[i].id,
        type: sorted[i].type,
        color: leverConfigs[sorted[i].type]?.color ?? '#94a3b8',
        threshold: dedup,
        maxCoverage: m,
      });
      cum += m;
    }
    return pts;
  }, [hypothesis.levers, leverConfigs]);

  // Répulsion des labels pour qu'ils ne se superposent pas. Le trait pointe
  // toujours à la position "threshold" réelle ; on ne déplace que la position
  // du label (pos) en gardant un écart minimum basé sur la largeur du conteneur.
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const [sliderWidthPx, setSliderWidthPx] = useState(0);
  useLayoutEffect(() => {
    const el = sliderTrackRef.current;
    if (!el) return;
    const update = () => setSliderWidthPx(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const LABEL_PX = 64;
  const spreadFillPoints = useMemo(() => {
    if (coverageFillPoints.length === 0) return [];
    const gapPct = sliderWidthPx > 0 ? (LABEL_PX / sliderWidthPx) * 100 : 12;
    const sorted = [...coverageFillPoints].sort((a, b) => a.threshold - b.threshold);
    const adj = sorted.map(p => ({ ...p, pos: p.threshold }));
    for (let i = 1; i < adj.length; i++) {
      if (adj[i].pos < adj[i - 1].pos + gapPct) adj[i].pos = adj[i - 1].pos + gapPct;
    }
    const last = adj.length - 1;
    const halfGap = gapPct / 2;
    if (adj[last].pos > 100 - halfGap) {
      adj[last].pos = 100 - halfGap;
      for (let i = last - 1; i >= 0; i--) {
        if (adj[i].pos > adj[i + 1].pos - gapPct) adj[i].pos = adj[i + 1].pos - gapPct;
      }
    }
    if (adj[0].pos < halfGap) {
      adj[0].pos = halfGap;
      for (let i = 1; i < adj.length; i++) {
        if (adj[i].pos < adj[i - 1].pos + gapPct) adj[i].pos = adj[i - 1].pos + gapPct;
      }
    }
    return adj;
  }, [coverageFillPoints, sliderWidthPx]);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const appliedPresetsMap = useSimulationStore(s => s.appliedPresets);
  const setAppliedPresetAction = useSimulationStore(s => s.setAppliedPreset);
  const appliedPreset = appliedPresetsMap[hypothesis.id] ?? null;
  const setAppliedPreset = (p: { id: string; name: string } | null) => {
    setAppliedPresetAction(hypothesis.id, p);
  };
  const [pendingModeChange, setPendingModeChange] = useState<
    { updates: Partial<Hypothesis>; targetLabel: string } | null
  >(null);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const isLocked = version === 'v2' && appliedPreset !== null;
  const presetTriggerRef = useRef<HTMLButtonElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const warnings = getHypothesisWarnings(hypothesis.id);

  const appliedPresetDefinition = useMemo(
    () => (appliedPreset ? presets.find(p => p.id === appliedPreset.id) ?? null : null),
    [appliedPreset, presets],
  );

  function v2StateAfter(updates: Partial<Hypothesis>): { objectiveMode: ObjectiveMode; budgetMode: BudgetMode } {
    return {
      objectiveMode: updates.objectiveMode ?? hypothesis.objectiveMode,
      budgetMode: updates.budgetMode ?? hypothesis.budgetMode,
    };
  }

  /** True si, après le clic, l’objectif + mode budget coïncident avec le preset (pas de conflit). */
  function v2ModeMatchesAppliedPreset(updates: Partial<Hypothesis>): boolean {
    if (!appliedPreset) return true;
    if (!appliedPresetDefinition) return true;
    const next = v2StateAfter(updates);
    return (
      next.objectiveMode === appliedPresetDefinition.objectiveMode &&
      next.budgetMode === appliedPresetDefinition.budgetMode
    );
  }

  function v2ModeButtonLocked(updates: Partial<Hypothesis>): boolean {
    return isLocked && appliedPresetDefinition !== null && !v2ModeMatchesAppliedPreset(updates);
  }

  /** Objectif couverture + preset couverture : le slider (et la saisie) ne doivent pas bouger. */
  const isCoverageGlobalSliderLocked =
    isLocked && appliedPresetDefinition?.objectiveMode === 'couverture';

  const budgetFieldInputClass =
    'min-w-0 flex-1 bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-teal-400/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  function requestV2ModeChange(updates: Partial<Hypothesis>, targetLabel: string) {
    if (version === 'v2' && appliedPreset && !v2ModeMatchesAppliedPreset(updates)) {
      setPendingModeChange({ updates, targetLabel });
      return;
    }
    updateHypothesis(hypothesis.id, updates);
  }

  useEffect(() => {
    if (!showPresets) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (presetTriggerRef.current?.contains(t) || presetMenuRef.current?.contains(t)) return;
      setShowPresets(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPresets]);

  const hasLevers = hypothesis.levers.length > 0;
  const presetNamePreview = nextPresetNameFromHypothesisName(
    hypothesis.name,
    new Set(presets.map(p => p.name)),
  );

  const existingLeverTypes = hypothesis.levers.map(l => l.type);
  const availableLevers = LEVER_TYPES.filter(t => {
    if (existingLeverTypes.includes(t as LeverType)) return false;
    const cfg = leverConfigs[t as LeverType];
    if (cfg?.hidden) return false;
    return true;
  });

  const budgetEditable = hypothesis.budgetMode === 'automatique' || hypothesis.budgetMode === 'pctTotal';

  const handleAddLever = (type: string) => {
    addLever(hypothesis.id, type as LeverType);
    setShowAddLever(false);
  };

  return (
    <>
    <div
      className={`glass-card transition-all duration-200 ${
        isActive ? 'ring-1 ring-teal-400/30' : ''
      }`}
    >
      {/* Hypothesis header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none hover:bg-fg/[0.06] transition-colors"
        onClick={() => {
          setActiveHypothesis(hypothesis.id);
          if (!isActive) return;
          toggleHypothesisCollapse(hypothesis.id);
        }}
      >
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-teal-500' : 'bg-fg/25'}`} />

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={hypothesis.name}
            onClick={e => e.stopPropagation()}
            onChange={e => updateHypothesis(hypothesis.id, { name: e.target.value })}
            className="bg-navy-800/80 border border-navy-600/50 rounded-md px-3 py-1 text-sm font-semibold text-fg focus:outline-none focus:border-teal-400/50 transition-colors shrink-0"
            style={{ width: `${Math.max(hypothesis.name.length, 6) + 2}ch` }}
          />
          {warnings.length > 0 && (
            <span className="text-[10px] bg-fg/10 text-fg/60 px-1.5 py-0.5 rounded-full font-medium border border-fg/15 shrink-0">
              {warnings.length}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-navy-700/80 text-fg/70 px-2 py-0.5 rounded-full border border-fg/10 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60 inline-block" />
            {hypothesis.levers.length} levier{hypothesis.levers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Budget total (gauche) + Budget max (droite) */}
        <div className="flex items-center gap-3 mr-2">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-fg/50 leading-none mb-0.5">Total</div>
            <div className="text-[13px] font-mono font-semibold text-fg/90 leading-none">
              {formatNum(hypothesis.totalBudget)}€
            </div>
          </div>
          <div className="w-px h-6 bg-fg/10" />
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-fg/50 leading-none mb-0.5">Max/mag</div>
            <div className="text-[13px] font-mono font-semibold text-fg/80 leading-none">
              {formatNum(hypothesis.maxBudgetPerStore)}€
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); duplicateHypothesis(hypothesis.id); }}
            className="p-1.5 rounded-md text-fg/62 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
            title="Dupliquer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!hasLevers}
            onClick={e => {
              e.stopPropagation();
              if (!hasLevers) return;
              setPresetConfirmOpen(true);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              hasLevers
                ? 'text-fg/62 hover:text-amber-400 hover:bg-amber-400/10'
                : 'text-fg/25 cursor-not-allowed opacity-60'
            }`}
            title={
              hasLevers
                ? 'Créer un preset à partir de cette hypothèse'
                : 'Ajoutez au moins un levier pour enregistrer un preset'
            }
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); removeHypothesis(hypothesis.id); }}
            className="p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className={`w-4 h-4 text-fg/60 transition-transform duration-200 ml-1 ${
              hypothesis.collapsed ? '' : 'rotate-180'
            }`}
          />
        </div>
      </div>

      {/* Hypothesis body */}
      <div className={`collapse-transition ${hypothesis.collapsed ? '' : 'open'}`}>
        <div>
          <div className="border-t border-fg/12">

            {/* Paramètres toggle header */}
            <button
              onClick={() => setParamsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-fg/[0.04] transition-colors group"
            >
              <span className="text-[10px] uppercase tracking-wider text-fg/50 group-hover:text-fg/70 transition-colors">
                Paramètres
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-fg/40 transition-transform duration-200 ${paramsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Collapsible params */}
            <div className={`collapse-transition ${paramsOpen ? 'open' : ''}`}>
              <div>
                <div className="px-4 pb-4 space-y-4">
                  {/* Warnings */}
                  <WarningBanner warnings={warnings} />

                  {/* Lock banner (V2 + preset appliqué) */}
                  {isLocked && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-400/8 border border-amber-400/25">
                      <div className="w-7 h-7 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-amber-400 leading-tight">
                          Hypothèse verrouillée
                        </div>
                        <div className="text-[10px] text-fg/65 mt-0.5 leading-snug">
                          Preset « {appliedPreset!.name} » appliqué · les leviers sont figés sur les
                          valeurs du preset.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUnlockConfirmOpen(true)}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 border border-amber-400/40 hover:border-amber-300/60 rounded-md px-2 py-1 transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        Déverrouiller
                      </button>
                    </div>
                  )}

                  {/* Zone de chalandise */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                      Zone de chalandise
                    </label>
                    <ZoneDropdown
                      hypothesisId={hypothesis.id}
                      zoneId={hypothesis.zoneId ?? 'zone1'}
                      disabled={isLocked}
                    />
                    <p className="text-[10px] text-fg/45 mt-1">
                      Population moyenne&nbsp;:{' '}
                      {formatNum(
                        getZoneAvgPop(stores, hypothesis.zoneId),
                      )}{' '}
                      hab./magasin
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                      Répartition budget par magasin
                    </label>
                    <div className="flex rounded-lg overflow-hidden border border-navy-600/30">
                      {STORE_DISTRIBUTION_MODES.map(({ id, label, desc, icon: Icon }) => {
                        const mode = hypothesis.storeDistributionMode ?? 'egal';
                        const on = mode === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => updateHypothesis(hypothesis.id, { storeDistributionMode: id })}
                            title={desc}
                            className={`flex-1 py-2 px-2 text-xs font-medium transition-colors flex flex-row items-center justify-center gap-1.5 ${
                              on ? 'bg-teal-400/15 text-teal-400' : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-fg/62 mt-1">
                      {
                        STORE_DISTRIBUTION_MODES.find(m => m.id === (hypothesis.storeDistributionMode ?? 'egal'))
                          ?.desc
                      }
                    </p>
                  </div>

                  {/* Config row */}
                  <div className="space-y-3">
                    {/* V3 : pas de mode, juste budget total affiché */}

                    {/* V1 : Objectif + mode budget */}
                    {version === 'v1' && (
                      <>
                        {/* Objective mode */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Objectif</label>
                          <div className="flex rounded-lg overflow-hidden border border-navy-600/30">
                            {(['budget', 'couverture'] as ObjectiveMode[]).map(mode => (
                              <button
                                key={mode}
                                onClick={() => updateHypothesis(hypothesis.id, { objectiveMode: mode })}
                                className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                  hypothesis.objectiveMode === mode
                                    ? 'bg-teal-400/15 text-teal-400'
                                    : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                                }`}
                              >
                                {mode === 'budget' ? <DollarSign className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                                {mode === 'budget' ? 'Budget' : 'Couverture'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Budget mode */}
                        {hypothesis.objectiveMode === 'budget' && (
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Mode budget</label>
                            <div className="flex rounded-lg overflow-hidden border border-navy-600/30">
                              {(Object.entries(BUDGET_MODE_LABELS) as [BudgetMode, typeof BUDGET_MODE_LABELS[BudgetMode]][]).map(([key, { label, icon: Icon }]) => (
                                <button
                                  key={key}
                                  onClick={() => updateHypothesis(hypothesis.id, { budgetMode: key })}
                                  className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                    hypothesis.budgetMode === key
                                      ? 'bg-teal-400/15 text-teal-400'
                                      : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                                  }`}
                                >
                                  {key !== 'pctTotal' && <Icon className="w-3 h-3" />}
                                  {label}
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-fg/62 mt-1">
                              {BUDGET_MODE_LABELS[hypothesis.budgetMode]?.desc}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* V2 : Objectif + mode budget */}
                    {version === 'v2' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Objectif</label>
                          <div className="flex rounded-lg overflow-hidden border border-navy-600/30">
                            <button
                              type="button"
                              disabled={v2ModeButtonLocked({
                                objectiveMode: 'budget',
                                ...(hypothesis.budgetMode === 'libre' ? { budgetMode: 'automatique' } : {}),
                              })}
                              onClick={() => requestV2ModeChange(
                                { objectiveMode: 'budget', ...(hypothesis.budgetMode === 'libre' ? { budgetMode: 'automatique' } : {}) },
                                hypothesis.budgetMode === 'libre' ? 'Budget · Auto' : 'Budget',
                              )}
                              className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                hypothesis.objectiveMode === 'budget' && hypothesis.budgetMode !== 'libre'
                                  ? 'bg-teal-400/15 text-teal-400'
                                  : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                              }`}
                            >
                              <DollarSign className="w-3 h-3" />
                              Budget
                            </button>
                            <button
                              type="button"
                              disabled={v2ModeButtonLocked({ objectiveMode: 'couverture' })}
                              onClick={() => requestV2ModeChange({ objectiveMode: 'couverture' }, 'Couverture')}
                              className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                hypothesis.objectiveMode === 'couverture'
                                  ? 'bg-teal-400/15 text-teal-400'
                                  : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                              }`}
                            >
                              <Target className="w-3 h-3" />
                              Couverture
                            </button>
                            <button
                              type="button"
                              disabled={v2ModeButtonLocked({ objectiveMode: 'budget', budgetMode: 'libre' })}
                              onClick={() => requestV2ModeChange({ objectiveMode: 'budget', budgetMode: 'libre' }, 'Libre')}
                              className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                hypothesis.objectiveMode === 'budget' && hypothesis.budgetMode === 'libre'
                                  ? 'bg-teal-400/15 text-teal-400'
                                  : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                              }`}
                            >
                              <Unlock className="w-3 h-3" />
                              Libre
                            </button>
                          </div>
                        </div>

                        {hypothesis.objectiveMode === 'budget' && hypothesis.budgetMode !== 'libre' && (
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Mode budget</label>
                            <div className="flex rounded-lg overflow-hidden border border-navy-600/30">
                              {(['automatique', 'pctTotal', 'levier'] as BudgetMode[]).map(key => {
                                const v2Labels: Record<string, string> = { automatique: 'Auto', pctTotal: 'Manuel %', levier: 'Manuel €' };
                                return (
                                  <button
                                    type="button"
                                    key={key}
                                    disabled={v2ModeButtonLocked({ budgetMode: key })}
                                    onClick={() => requestV2ModeChange({ budgetMode: key }, `Budget · ${v2Labels[key]}`)}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                      hypothesis.budgetMode === key
                                        ? 'bg-teal-400/15 text-teal-400'
                                        : 'bg-navy-800/40 text-fg/72 hover:text-fg/88'
                                    }`}
                                  >
                                    {v2Labels[key]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Budget row V3 : total éditable si tous les leviers sont lockés, sinon calculé */}
                  {version === 'v3' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Budget total</label>
                        {allBudgetsLocked && hypothesis.levers.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <NumInput
                              value={hypothesis.totalBudget}
                              onChange={handleV3TotalBudgetChange}
                              min={0}
                              className="min-w-0 flex-1 bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                            />
                            <span className="text-[10px] text-fg/62 tabular-nums shrink-0">€</span>
                          </div>
                        ) : (
                          <div className="bg-navy-800/30 border border-navy-600/10 rounded-lg px-3 py-2 text-xs font-mono text-teal-400">
                            {formatNum(hypothesis.totalBudget)} €
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Budget max / magasin</label>
                        <div className="flex items-center gap-1.5">
                          <NumInput
                            value={hypothesis.maxBudgetPerStore}
                            onChange={v => updateHypothesis(hypothesis.id, { maxBudgetPerStore: v })}
                            min={0}
                            className="min-w-0 flex-1 bg-navy-800/60 border border-navy-600/30 rounded-lg px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-teal-400/40 transition-colors"
                          />
                          <span className="text-[10px] text-fg/62 tabular-nums shrink-0">€</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget row / Couverture cible (V1/V2 seulement) */}
                  {version !== 'v3' && (isV2Coverage ? (
                    <div className="space-y-3">
                      {/* Budget total disabled + Budget max/magasin */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">Budget total</label>
                          {isLocked ? (
                            <div className="flex items-center gap-1.5">
                              <NumInput
                                value={hypothesis.totalBudget}
                                onChange={v => updateHypothesis(hypothesis.id, { totalBudget: v })}
                                min={0}
                                disabled
                                title="Verrouillé par le preset · déverrouiller depuis la bannière"
                                className={budgetFieldInputClass}
                              />
                              <span className="text-[10px] text-fg/62 tabular-nums shrink-0" aria-hidden>
                                €
                              </span>
                            </div>
                          ) : (
                            <div className="bg-navy-800/30 border border-navy-600/10 rounded-lg px-3 py-2 text-xs font-mono text-teal-400">
                              {formatNum(hypothesis.totalBudget)} €
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                            Budget max / magasin
                          </label>
                          <div className="flex items-center gap-1.5">
                            <NumInput
                              value={hypothesis.maxBudgetPerStore}
                              onChange={v => updateHypothesis(hypothesis.id, { maxBudgetPerStore: v })}
                              min={0}
                              disabled={isLocked}
                              title={isLocked ? 'Verrouillé par le preset · déverrouiller depuis la bannière' : undefined}
                              className={budgetFieldInputClass}
                            />
                            <span className="text-[10px] text-fg/62 tabular-nums shrink-0" aria-hidden>€</span>
                          </div>
                        </div>
                      </div>
                      {/* Slider couverture cible pleine largeur */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                          Couverture cible (dédupliquée)
                        </label>
                        <div className="flex items-center gap-3">
                          <div ref={sliderTrackRef} className="flex-1 relative">
                            {/* Tick marks : seuil de saturation de chaque levier */}
                            {coverageFillPoints.length > 0 && (
                              <div className="absolute left-0 right-0 h-3 pointer-events-none px-[8px]" style={{ top: '14px' }}>
                                {coverageFillPoints.map(p => (
                                  <div
                                    key={p.id}
                                    className="absolute top-0 flex flex-col items-center"
                                    style={{ left: `${p.threshold}%`, transform: 'translateX(-50%)' }}
                                    title={`${p.type} saturé (max ${p.maxCoverage}%) — couv. dédup. ${p.threshold.toFixed(1)}%`}
                                  >
                                    <div
                                      className="w-[2px] h-3 rounded-full"
                                      style={{ backgroundColor: p.color, boxShadow: `0 0 0 1px rgba(0,0,0,0.25)` }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <SliderWithTooltip
                              min={0}
                              max={100}
                              step={0.5}
                              value={displayCov}
                              label={`${displayCov.toFixed(1)} %`}
                              disabled={hypothesis.levers.length === 0 || isCoverageGlobalSliderLocked}
                              onChange={e => handleTargetCovChange(Number(e.target.value))}
                              onPointerDown={() => { isDraggingCov.current = true; setLocalTargetCov(dedupLeverCoverage); }}
                              onPointerUp={() => { isDraggingCov.current = false; setLocalTargetCov(null); }}
                              className={`w-full relative ${
                                hypothesis.levers.length === 0 || isCoverageGlobalSliderLocked
                                  ? 'opacity-40 cursor-not-allowed'
                                  : ''
                              }`}
                            />
                            {/* Connecteurs entre les ticks et les labels repoussés */}
                            {spreadFillPoints.length > 0 && (
                              <svg
                                className="relative block w-full pointer-events-none px-[8px]"
                                style={{ height: '8px', marginTop: '2px', overflow: 'visible' }}
                                viewBox="0 0 100 8"
                                preserveAspectRatio="none"
                              >
                                {spreadFillPoints.map(p => (
                                  <polyline
                                    key={p.id}
                                    points={`${p.threshold},0 ${p.threshold},3 ${p.pos},5 ${p.pos},8`}
                                    fill="none"
                                    stroke={p.color}
                                    strokeWidth="0.4"
                                    strokeOpacity="0.7"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                ))}
                              </svg>
                            )}
                            {/* Labels sous les connecteurs, positions repoussées */}
                            {spreadFillPoints.length > 0 && (
                              <div className="relative h-4 px-[8px]">
                                {spreadFillPoints.map(p => (
                                  <span
                                    key={p.id}
                                    className="absolute top-0 text-[9px] font-mono whitespace-nowrap"
                                    style={{
                                      left: `${p.pos}%`,
                                      transform: 'translateX(-50%)',
                                      color: p.color,
                                    }}
                                    title={`${p.type} saturé (max ${p.maxCoverage}%) — couv. dédup. ${p.threshold.toFixed(1)}%`}
                                  >
                                    {p.type} · {p.maxCoverage}%
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 w-[5.5rem] shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              disabled={hypothesis.levers.length === 0 || isCoverageGlobalSliderLocked}
                              title={
                                isCoverageGlobalSliderLocked
                                  ? 'Verrouillé par le preset couverture · déverrouiller depuis la bannière'
                                  : undefined
                              }
                              value={covInput !== '' ? covInput : displayCov.toFixed(1)}
                              onFocus={() => setCovInput(displayCov.toFixed(1))}
                              onChange={e => setCovInput(e.target.value)}
                              onBlur={commitCovInput}
                              onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                              className="w-full bg-navy-800/60 border border-navy-600/30 rounded-md px-2 py-1.5 text-xs font-mono text-right text-fg focus:outline-none focus:border-teal-400/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <span className="text-xs text-fg/60 shrink-0">%</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-fg/45 mt-1">
                          {hypothesis.levers.length === 0
                            ? 'Ajoutez un levier pour activer ce slider'
                            : isCoverageGlobalSliderLocked
                              ? 'Couverture figée par le preset · déverrouillez l’hypothèse pour ajuster'
                              : 'Ajuste le budget de chaque levier · la répétition s\'adapte'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                          Budget total
                        </label>
                        {budgetEditable ? (
                          <div className="flex items-center gap-1.5">
                            <NumInput
                              value={hypothesis.totalBudget}
                              onChange={v => updateHypothesis(hypothesis.id, { totalBudget: v })}
                              min={0}
                              disabled={isLocked}
                              title={isLocked ? 'Verrouillé par le preset · déverrouiller depuis la bannière' : undefined}
                              className={budgetFieldInputClass}
                            />
                            <span className="text-[10px] text-fg/62 tabular-nums shrink-0" aria-hidden>
                              €
                            </span>
                          </div>
                        ) : (
                          <div className="bg-navy-800/30 border border-navy-600/10 rounded-lg px-3 py-2 text-xs font-mono text-teal-400">
                            {formatNum(hypothesis.totalBudget)} €
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-fg/60 mb-1.5 block">
                          Budget max / magasin
                        </label>
                        <div className="flex items-center gap-1.5">
                          <NumInput
                            value={hypothesis.maxBudgetPerStore}
                            onChange={v => updateHypothesis(hypothesis.id, { maxBudgetPerStore: v })}
                            min={0}
                            disabled={isLocked}
                            title={isLocked ? 'Verrouillé par le preset · déverrouiller depuis la bannière' : undefined}
                            className={budgetFieldInputClass}
                          />
                          <span className="text-[10px] text-fg/62 tabular-nums shrink-0" aria-hidden>
                            €
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Preset quick-apply (V1–V2 : tous objectifs / modes) */}
                  {(version === 'v1' || version === 'v2' || version === 'v3') && (
                    <div className="relative w-full">
                      <button
                        ref={presetTriggerRef}
                        type="button"
                        onClick={() => setShowPresets(!showPresets)}
                        className="text-xs text-fg/60 hover:text-teal-400 transition-colors flex items-center gap-1 border border-fg/20 hover:border-teal-400/50 rounded px-2 py-1"
                      >
                        <Zap className="w-3 h-3" />
                        Appliquer un preset
                        <ChevronUp className={`w-3 h-3 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
                      </button>
                      {showPresets && (
                        <div
                          ref={presetMenuRef}
                          className="absolute bottom-full left-0 right-0 mb-2 z-20 bg-navy-800 border border-navy-600/50 rounded-lg shadow-2xl p-2 animate-fade-in"
                        >
                          {visiblePresets.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                applyPreset(p.id, hypothesis.id);
                                setShowPresets(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-teal-400/10 transition-colors group"
                            >
                              <div className="font-medium text-fg/92 group-hover:text-teal-400">{p.name}</div>
                              <div className="text-fg/60 mt-0.5">{p.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Levers (always visible) */}
            <div
              className={`px-4 pb-4 space-y-3 ${
                isLocked ? 'opacity-80 pointer-events-none select-none relative' : ''
              }`}
              aria-disabled={isLocked || undefined}
            >
              {hypothesis.levers.map((lever, i) =>
                version === 'v3' ? (
                  <LeverCardV3
                    key={lever.id}
                    lever={lever}
                    hypothesis={hypothesis}
                    index={i}
                    budgetLocked={isBudgetLocked(lever.id)}
                    onToggleBudgetLock={() => handleToggleBudgetLock(lever.id)}
                  />
                ) : (
                  <LeverCard key={lever.id} lever={lever} hypothesis={hypothesis} index={i} />
                )
              )}

              {/* Add lever */}
              {availableLevers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddLever(!showAddLever)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-navy-600/40 text-fg/60 hover:text-teal-400 hover:border-teal-400/30 transition-all text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un levier
                  </button>

                  {showAddLever && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-20 bg-navy-800 border border-navy-600/50 rounded-lg shadow-2xl p-2 animate-fade-in max-h-[320px] overflow-y-auto">
                      {(() => {
                        const grouped: Record<string, string[]> = {};
                        for (const t of availableLevers) {
                          const cfg = leverConfigs[t] ?? LEVER_CONFIGS[t];
                          const fam = cfg?.family || 'Autres';
                          (grouped[fam] ??= []).push(t);
                        }
                        const familyOrder = ['Display Mobile', 'Display Desktop', 'Meta', 'CTV', 'Youtube', 'DOOH', 'Google', 'Audio', 'Pinterest', 'Snapchat', 'Legacy', 'Autres'];
                        const fams = Object.keys(grouped).sort((a, b) => {
                          const ia = familyOrder.indexOf(a); const ib = familyOrder.indexOf(b);
                          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                        });
                        return fams.map(fam => (
                          <div key={fam} className="mb-1 last:mb-0">
                            <div className="text-[9px] uppercase tracking-wider text-fg/45 px-2 pt-1.5 pb-1">{fam}</div>
                            <div className="grid grid-cols-2 gap-1">
                              {grouped[fam].map(type => {
                                const cfg = leverConfigs[type] ?? LEVER_CONFIGS[type];
                                const m = cfg && cfg.defaultCpm > 0
                                  ? ((cfg.defaultCpm - (cfg.purchaseCpm ?? 0)) / cfg.defaultCpm) * 100
                                  : 0;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => handleAddLever(type)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-fg/10 transition-colors group"
                                  >
                                    <LeverLogoBadge cfg={cfg} className="w-6 h-6" iconClassName="w-3.5 h-3.5" />
                                    <span className="flex-1 text-left text-fg/88 group-hover:text-fg truncate">
                                      {cfg?.label || type}
                                    </span>
                                    {cfg && cfg.purchaseCpm > 0 && (
                                      <span className="text-[9px] text-fg/50 font-mono shrink-0">{m.toFixed(0)}%</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>

    {unlockConfirmOpen && appliedPreset && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        onClick={() => setUnlockConfirmOpen(false)}
      >
        <div
          className="glass-card max-w-md w-full p-4 shadow-2xl border border-amber-400/30 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
              <Unlock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 id="unlock-title" className="text-sm font-semibold text-fg">
                Déverrouiller l'hypothèse&nbsp;?
              </h2>
              <p className="text-xs text-fg/75 mt-2 leading-relaxed">
                Le preset <strong className="text-fg/92">« {appliedPreset.name} »</strong> restera
                appliqué, mais les leviers (budgets, couvertures, répétitions) redeviendront
                modifiables. Les changements que vous ferez ne seront plus protégés par le preset,
                et vous pourrez passer à un autre mode sans nouvel avertissement.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg/72 hover:bg-fg/10 transition-colors"
              onClick={() => setUnlockConfirmOpen(false)}
            >
              Garder verrouillé
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-navy-900 shadow-md shadow-black/25 hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 transition-colors"
              onClick={() => {
                setAppliedPreset(null);
                setUnlockConfirmOpen(false);
              }}
            >
              Déverrouiller
            </button>
          </div>
        </div>
      </div>
    )}

    {pendingModeChange && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-change-title"
        onClick={() => setPendingModeChange(null)}
      >
        <div
          className="glass-card max-w-md w-full p-4 shadow-2xl border border-amber-400/30 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 id="mode-change-title" className="text-sm font-semibold text-fg">
                Changer de mode&nbsp;?
              </h2>
              <p className="text-xs text-fg/75 mt-2 leading-relaxed">
                Le preset <strong className="text-fg/92">« {appliedPreset?.name} »</strong> a été
                conçu pour le mode{' '}
                {appliedPresetDefinition ? (
                  <strong className="text-fg/92">{formatPresetModeLabel(appliedPresetDefinition)}</strong>
                ) : (
                  <span className="text-fg/92">(mode inconnu)</span>
                )}
                . En passant au mode <strong className="text-fg/92">{pendingModeChange.targetLabel}</strong>
                , les couvertures, répétitions et budgets des leviers pourront être recalculés et
                ne correspondront plus exactement aux valeurs du preset.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg/72 hover:bg-fg/10 transition-colors"
              onClick={() => setPendingModeChange(null)}
            >
              Garder le mode du preset
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-navy-900 shadow-md shadow-black/25 hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 transition-colors"
              onClick={() => {
                updateHypothesis(hypothesis.id, pendingModeChange.updates);
                setAppliedPreset(null);
                setPendingModeChange(null);
              }}
            >
              Changer quand même
            </button>
          </div>
        </div>
      </div>
    )}

    {presetConfirmOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-confirm-title"
        onClick={() => setPresetConfirmOpen(false)}
      >
        <div
          className="glass-card max-w-md w-full p-4 shadow-2xl border border-navy-600/40 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <h2 id="preset-confirm-title" className="text-sm font-semibold text-fg">
            Enregistrer comme preset
          </h2>
          <p className="text-xs text-fg/70 mt-2 leading-relaxed">
            Un <strong className="text-fg/88">nouveau preset</strong> sera ajouté
            {activeProfile?.isAdmin ? (
              <> à la bibliothèque globale. Vous pourrez l’appliquer depuis « Appliquer un preset » ou le gérer dans
              l’administration (onglet Presets).</>
            ) : (
              <> à <strong className="text-fg/88">vos presets personnels</strong>. Les presets administrateur restent
              disponibles en lecture seule dans la fenêtre Presets.</>
            )}
          </p>
          <ul className="mt-4 space-y-2 text-xs text-fg/78 border border-fg/10 rounded-lg p-3 bg-navy-900/50">
            <li className="flex gap-2">
              <span className="text-fg/50 shrink-0">Nom</span>
              <span className="font-medium text-fg/92 text-right flex-1">{presetNamePreview}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-fg/50 shrink-0">Objectif</span>
              <span className="text-right flex-1">
                {hypothesis.objectiveMode === 'budget' ? 'Budget' : 'Couverture'}
              </span>
            </li>
            {hypothesis.objectiveMode === 'budget' && (
              <li className="flex gap-2">
                <span className="text-fg/50 shrink-0">Mode budget</span>
                <span className="text-right flex-1">{BUDGET_MODE_LABELS[hypothesis.budgetMode].label}</span>
              </li>
            )}
            <li className="flex gap-2 items-start">
              <span className="text-fg/50 shrink-0 pt-0.5">Leviers</span>
              <span className="text-right flex-1">
                {hypothesis.levers.length} levier{hypothesis.levers.length !== 1 ? 's' : ''} :{' '}
                {hypothesis.levers.map(l => l.type).join(', ')}
              </span>
            </li>
            <li className="text-fg/58 pt-1 border-t border-fg/10">
              Les réglages de chaque levier (dates, budgets, couverture, répétitions, etc.) seront copiés dans le
              preset.
            </li>
          </ul>
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-fg/72 hover:bg-fg/10 transition-colors"
              onClick={() => setPresetConfirmOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 text-white shadow-md shadow-black/25 hover:bg-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 transition-colors"
              onClick={() => {
                addPresetFromHypothesis(hypothesis.id, {
                  isUserPreset: !(activeProfile?.isAdmin ?? true),
                  profileId: activeProfile?.id ?? null,
                });
                setPresetConfirmOpen(false);
              }}
            >
              Créer le preset
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default function HypothesisPanel() {
  const { simulation, activeHypothesisId, addHypothesis, globalParams, stores, apiReady } = useSimulationStore();
  const version = useVersionStore(s => s.activeVersion);
  const defaultBudgetMode = version === 'v3' ? 'v3-levier' : 'automatique';
  const defaultTotal = globalParams.typicalBudgetPerStore * (stores.length || 1);

  useEffect(() => {
    if (apiReady && simulation && simulation.hypotheses.length === 0) {
      addHypothesis('Hypothèse 1', globalParams.maxBudgetPerStore, 'budget', defaultBudgetMode, defaultTotal);
    }
  }, [simulation?.id, apiReady]);

  if (!simulation) return null;

  const handleAdd = () => {
    const n = simulation.hypotheses.length + 1;
    addHypothesis(`Hypothèse ${n}`, globalParams.maxBudgetPerStore, 'budget', defaultBudgetMode, defaultTotal);
  };

  return (
    <div className="space-y-4">
      {simulation.hypotheses.map(h => (
        <HypothesisCard key={h.id} hypothesis={h} isActive={h.id === activeHypothesisId} />
      ))}

      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-navy-600/30 text-fg/65 hover:text-teal-400 hover:border-teal-400/30 transition-all text-sm"
      >
        <Plus className="w-4 h-4" />
        Nouvelle hypothèse
      </button>

      <PrestationsPanel />
    </div>
  );
}
