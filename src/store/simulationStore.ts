import { create } from 'zustand';
import type {
  Simulation,
  Hypothesis,
  Lever,
  LeverType,
  ObjectiveMode,
  BudgetMode,
  Preset,
  PresetScope,
  Store,
  StoreDistributionMode,
  LeverConfig,
  GlobalParams,
  Prestation,
  ZoneId,
} from '../types';
import { LEVER_CONFIGS as INITIAL_LEVER_CONFIGS, DEFAULT_STORES as INITIAL_STORES, DEFAULT_PRESETS, getZoneAvgPop } from '../data/defaults';
import { api } from '../services/api';
import { useProfileStore } from './profileStore';
import { setPendingProductTour } from '../productTour/storage';
import { useVersionStore } from './versionStore';
import { useToastStore } from './toastStore';
import { formatNum } from '../utils/formatNum';

/** Fusionne une config API avec les defaults (notamment logos `/levers/…` si `logo_url` est NULL en base). */
function normalizePreset(p: Preset): Preset {
  const scope: PresetScope = p.scope === 'user' ? 'user' : 'admin';
  return {
    ...p,
    scope,
    ownerProfileId: scope === 'user' ? (p.ownerProfileId ?? null) : null,
    prestations: Array.isArray(p.prestations) ? p.prestations : [],
  };
}

function mergeLeverConfig(cfg: LeverConfig): LeverConfig {
  const base = INITIAL_LEVER_CONFIGS[cfg.type];
  if (!base) return cfg;
  const raw = cfg.logoUrl;
  const logoUrl = raw == null ? base.logoUrl : raw === '' ? '' : raw;
  return { ...base, ...cfg, logoUrl };
}

let idCounter = 0;
const uid = () => `id-${++idCounter}-${Date.now()}`;

// ── Debounce helper ──────────────────────────────────────────
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
function debouncedCall(key: string, fn: () => void, ms = 400) {
  clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(fn, ms));
}

// ── Calculation helpers ──────────────────────────────────────
function calcImpressions(budget: number, cpm: number): number {
  if (cpm <= 0) return 0;
  return Math.round((budget / cpm) * 1000);
}

function calcBudgetFromImpressions(impressions: number, cpm: number): number {
  return (impressions * cpm) / 1000;
}

function calcCoverageFromBudget(budget: number, cpm: number, repetition: number, maxCoverage: number, avgPop = 140000, storeCount = 10): number {
  if (cpm <= 0 || repetition <= 0) return 0;
  const impressions = calcImpressions(budget, cpm);
  const totalReach = impressions / (repetition * storeCount);
  const coverage = Math.min((totalReach / avgPop) * 100, maxCoverage);
  return Math.round(coverage * 10) / 10;
}

function calcBudgetFromCoverage(coverage: number, cpm: number, repetition: number, avgPop = 140000, storeCount = 10): number {
  const totalReach = (coverage / 100) * avgPop;
  const impressions = totalReach * repetition * storeCount;
  return Math.round(calcBudgetFromImpressions(impressions, cpm));
}

function calcRepetitionFromBudgetAndCoverage(budget: number, cpm: number, coverage: number, avgPop = 140000, storeCount = 10): number {
  if (cpm <= 0 || coverage <= 0) return 1;
  const impressions = calcImpressions(budget, cpm);
  const totalReach = (coverage / 100) * avgPop;
  if (totalReach <= 0) return 1;
  const rep = impressions / (totalReach * storeCount);
  return Math.round(rep * 10) / 10;
}

// Waterfill: distribue une couverture cible moyenne sur N leviers en respectant
// chaque maxCoverage (blocker). Les leviers capés prennent leur max, le reste
// du "budget de couverture" est réparti équitablement sur les leviers restants.
export function distributeCoverageWaterfill(targetAvg: number, maxes: number[]): number[] {
  const n = maxes.length;
  if (n === 0) return [];
  const maxSum = maxes.reduce((s, m) => s + m, 0);
  let budget = Math.min(Math.max(targetAvg, 0) * n, maxSum);

  const sorted = maxes.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m);
  const result = new Array<number>(n).fill(0);

  for (let k = 0; k < sorted.length; k++) {
    const remaining = sorted.length - k;
    const share = budget / remaining;
    if (share <= sorted[k].m) {
      for (let j = k; j < sorted.length; j++) {
        result[sorted[j].i] = Math.round(share * 10) / 10;
      }
      return result;
    }
    result[sorted[k].i] = sorted[k].m;
    budget -= sorted[k].m;
  }
  return result;
}

// Dédup couverture depuis une liste de couvertures par levier :
// 1 - ∏(1 - cov_i/100). Retourne en %.
export function computeDedupCoverage(coverages: number[]): number {
  if (coverages.length === 0) return 0;
  const prod = coverages.reduce((p, c) => p * (1 - Math.max(0, Math.min(100, c)) / 100), 1);
  return (1 - prod) * 100;
}

// Inverse : pour une couverture dédupliquée cible, trouve la couverture
// moyenne à passer au waterfill pour obtenir cette dédupliquée.
export function avgForDedupCoverage(targetDedup: number, maxes: number[]): number {
  if (maxes.length === 0) return 0;
  const target = Math.max(0, Math.min(100, targetDedup));
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const covs = distributeCoverageWaterfill(mid, maxes);
    const d = computeDedupCoverage(covs);
    if (d < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Ventile un budget entier en parts entières (méthode des plus grands restes). */
function largestRemainderToIntegers(raw: number[], targetSum: number): number[] {
  const n = raw.length;
  if (n === 0) return [];
  const floors = raw.map(x => Math.floor(Math.max(0, x)));
  let s = floors.reduce((a, b) => a + b, 0);
  let rem = targetSum - s;
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(Math.max(0, x)) })).sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  const add = Math.max(0, rem);
  for (let k = 0; k < add && k < n; k++) out[order[k].i]++;
  s = out.reduce((a, b) => a + b, 0);
  if (s !== targetSum && n > 0) out[n - 1] += targetSum - s;
  return out;
}

/** Retourne la population d'un magasin pour la zone donnée. */
function storeZonePop(store: Store, zoneId: ZoneId | undefined): number {
  switch (zoneId) {
    case 'zone2': return store.pop20min ?? store.population ?? 0;
    case 'zone3': return store.pop30min ?? store.population ?? 0;
    case 'zone4': return store.popCustom ?? store.population ?? 0;
    default:      return store.pop10min ?? store.population ?? 0;
  }
}

/** Répartition « pure » du montant (sans plancher par magasin). */
function allocateStoreBudgetsCore(totalBudget: number, stores: Store[], mode: StoreDistributionMode, zoneId?: ZoneId): number[] {
  const n = stores.length;
  if (n === 0) return [];
  const tb = Math.max(0, Math.round(totalBudget));
  if (tb === 0) return new Array(n).fill(0);

  if (mode === 'egal') {
    return largestRemainderToIntegers(new Array(n).fill(tb / n), tb);
  }
  if (mode === 'population') {
    const pops = stores.map(s => Math.max(0, storeZonePop(s, zoneId)));
    const sum = pops.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      return largestRemainderToIntegers(new Array(n).fill(tb / n), tb);
    }
    return largestRemainderToIntegers(
      pops.map(p => (tb * p) / sum),
      tb,
    );
  }
  // pondere : part population × (poids/100) ; 100% = identique à « population » ; puis normalisation sur le total.
  const pops = stores.map(s => Math.max(0, storeZonePop(s, zoneId)));
  const sumPop = pops.reduce((a, b) => a + b, 0);
  const popShare =
    sumPop > 0
      ? pops.map(p => p / sumPop)
      : new Array(n).fill(1 / n);
  const mults = stores.map(s => {
    const w = s.budgetWeightPercent ?? 100;
    return Math.max(0, w) / 100;
  });
  const raw = popShare.map((ps, i) => ps * mults[i]!);
  const sumR = raw.reduce((a, b) => a + b, 0);
  if (sumR <= 0) {
    return largestRemainderToIntegers(new Array(n).fill(tb / n), tb);
  }
  return largestRemainderToIntegers(
    raw.map(r => (tb * r) / sumR),
    tb,
  );
}

/**
 * Budget par magasin pour le total d’hypothèse (somme = totalBudget).
 * Si `minPerStore` > 0 : chaque magasin reçoit au moins ce montant (somme des min. par mag. des leviers),
 * puis le reliquat est réparti selon le mode. Si le total ne suffit pas pour ces minimums, retombe sur
 * la répartition sans plancher.
 */
export function allocateStoreBudgets(
  totalBudget: number,
  stores: Store[],
  mode: StoreDistributionMode,
  minPerStore = 0,
  zoneId?: ZoneId,
): number[] {
  const n = stores.length;
  if (n === 0) return [];
  const tb = Math.max(0, Math.round(totalBudget));
  if (tb === 0) return new Array(n).fill(0);

  const m = Math.max(0, Math.round(minPerStore));
  if (m === 0) return allocateStoreBudgetsCore(tb, stores, mode, zoneId);

  if (m * n > tb) {
    return allocateStoreBudgetsCore(tb, stores, mode, zoneId);
  }

  if (m * n === tb) {
    return new Array(n).fill(m);
  }

  const extra = allocateStoreBudgetsCore(tb - m * n, stores, mode, zoneId);
  return new Array(n).fill(m).map((base, i) => base + (extra[i] ?? 0));
}

const BUDGET_STORE_STEP = 50;

/**
 * Ajuste des budgets déjà ventilés pour viser des montants en tranches de 50 €,
 * en conservant la somme et en restant proche de la répartition d’origine
 * (les magasins les plus « sous-alloués » reçoivent les tranches de 50 en priorité).
 * Si le total n’est pas un multiple de 50, le reliquat (≤ 49 €) est ajouté sur un seul magasin.
 * Quand `minPerStore` est effectif (somme des minimums atteignable), chaque part reste ≥ ce minimum.
 */
export function snapStoreBudgetsToFifty(
  parts: number[],
  targetSum: number,
  minPerStore: number,
): number[] {
  const n = parts.length;
  if (n === 0) return [];
  const tb = Math.max(0, Math.round(targetSum));
  if (tb === 0) return new Array(n).fill(0);

  const m = Math.max(0, Math.round(minPerStore));
  const usedMin = m > 0 && m * n <= tb;

  const b = parts.map(p => {
    const flo = Math.floor(p / BUDGET_STORE_STEP) * BUDGET_STORE_STEP;
    return usedMin ? Math.max(m, flo) : flo;
  });

  let diff = tb - b.reduce((a, x) => a + x, 0);

  const wantAdd = (i: number) => (parts[i] ?? 0) - b[i]!;
  const wantSub = (i: number) => b[i]! - (parts[i] ?? 0);
  const minFloor = () => (usedMin ? m : 0);

  for (let guard = 0; guard < n * tb && diff >= BUDGET_STORE_STEP; guard++) {
    let best = 0;
    let bestW = -Infinity;
    for (let i = 0; i < n; i++) {
      const w = wantAdd(i);
      if (w > bestW) {
        bestW = w;
        best = i;
      }
    }
    b[best]! += BUDGET_STORE_STEP;
    diff -= BUDGET_STORE_STEP;
  }

  for (let guard = 0; guard < n * tb && diff <= -BUDGET_STORE_STEP; guard++) {
    let best = -1;
    let bestW = -Infinity;
    for (let i = 0; i < n; i++) {
      if (b[i]! < minFloor() + BUDGET_STORE_STEP) continue;
      const w = wantSub(i);
      if (w > bestW) {
        bestW = w;
        best = i;
      }
    }
    if (best < 0) break;
    b[best]! -= BUDGET_STORE_STEP;
    diff += BUDGET_STORE_STEP;
  }

  if (diff !== 0) {
    let t = 0;
    for (let i = 1; i < n; i++) {
      if (diff > 0 && wantAdd(i) > wantAdd(t)) t = i;
      if (diff < 0 && wantSub(i) > wantSub(t)) t = i;
    }
    b[t]! += diff;
  }

  const s = b.reduce((a, x) => a + x, 0);
  if (s !== tb && n > 0) b[n - 1]! += tb - s;

  return b;
}

// ── Warnings ─────────────────────────────────────────────────
export interface Warning {
  leverId: string;
  type: 'coverage_exceeded' | 'budget_below_min' | 'budget_exceeded' | 'impossible' | 'budget_uncapped';
  kind: 'error' | 'warning' | 'info';
  message: string;
  /** Alerte « globale » : champ paramètres à mettre en évidence */
  focusHypothesisField?: 'totalBudget' | 'maxBudgetPerStore' | 'budgetGrid' | 'dedupCoverage';
  /** Alerte ciblant un levier : rangée (slider) à mettre en évidence */
  focusLeverControl?: 'budget' | 'coverage' | 'repetition' | 'card';
}

const PRIMARY_WARNING_KIND_ORDER: Record<Warning['kind'], number> = { error: 0, warning: 1, info: 2 };

/**
 * Même logique que la bannière : gravité d’abord, puis alertes levier avant globales
 * (même kind), pour ne pas masquer un levier concret par un message de synthèse.
 */
export function getPrimaryWarning(warnings: Warning[]): Warning | null {
  if (warnings.length === 0) return null;
  return [...warnings].sort((a, b) => {
    const d = PRIMARY_WARNING_KIND_ORDER[a.kind] - PRIMARY_WARNING_KIND_ORDER[b.kind];
    if (d !== 0) return d;
    const ag = a.leverId === 'global' ? 1 : 0;
    const bg = b.leverId === 'global' ? 1 : 0;
    return ag - bg;
  })[0] ?? null;
}

function getWarnings(hypothesis: Hypothesis, storeCount: number): Warning[] {
  const warnings: Warning[] = [];
  const inc = (l: Lever) => l.includedInHypothesis !== false;
  const active = hypothesis.levers.filter(inc);

  const minTotal = active.reduce((s, l) => s + l.minBudgetPerStore, 0);

  for (const lever of active) {
    if (lever.coverage > lever.maxCoverage) {
      warnings.push({
        leverId: lever.id,
        kind: 'error',
        type: 'coverage_exceeded',
        message: `${lever.type}: Couverture ${lever.coverage}% dépasse le max théorique de ${lever.maxCoverage}%`,
        focusLeverControl: 'coverage',
      });
    }
    if (lever.budget < lever.minBudgetPerStore * storeCount * 0.8) {
      warnings.push({
        leverId: lever.id,
        kind: 'warning',
        type: 'budget_below_min',
        message: `${lever.type}: Budget en dessous du minimum recommandé (${lever.minBudgetPerStore}€/mag)`,
        focusLeverControl: 'budget',
      });
    }
  }

  if (hypothesis.maxBudgetPerStore > 0 && hypothesis.totalBudget > hypothesis.maxBudgetPerStore * storeCount) {
    warnings.push({
      leverId: 'global',
      kind: 'warning',
      type: 'budget_exceeded',
      message: `Le budget total dépasse le maximum par magasin (${hypothesis.maxBudgetPerStore}€ × ${storeCount} magasins)`,
      focusHypothesisField: 'budgetGrid',
    });
  }

  if (hypothesis.maxBudgetPerStore > 0 && minTotal > hypothesis.maxBudgetPerStore) {
    warnings.push({
      leverId: 'global',
      kind: 'error',
      type: 'impossible',
      message: `Le budget minimum des leviers (${minTotal}€/mag) dépasse le budget max par magasin`,
      focusHypothesisField: 'maxBudgetPerStore',
    });
  }

  if (hypothesis.budgetMode === 'automatique' && hypothesis.totalBudget > 0 && active.length > 0) {
    const budgetUsed = active.reduce((s, l) => s + l.budget, 0);
    const budgetUnused = hypothesis.totalBudget - budgetUsed;
    if (budgetUnused > 1) {
      const cappedLevers = active
        .filter(l => l.coverage >= l.maxCoverage)
        .map(l => l.type)
        .join(', ');
      const reason = cappedLevers
        ? `Couverture max atteinte sur : ${cappedLevers}`
        : 'Leviers saturés en couverture';
      warnings.push({
        leverId: 'global',
        kind: 'info',
        type: 'budget_uncapped',
        message: `${formatNum(budgetUnused)}€ non utilisés sur l'objectif de ${formatNum(hypothesis.totalBudget)}€ — ${reason}`,
        focusHypothesisField: 'totalBudget',
      });
    }
  }

  return warnings;
}

// ── Store interface ──────────────────────────────────────────
export interface AppliedPresetInfo {
  id: string;
  name: string;
}

interface SimulationState {
  simulation: Simulation | null;
  activeHypothesisId: string | null;
  presets: Preset[];
  warnings: Warning[];
  showComparison: boolean;
  showAdmin: boolean;
  leverConfigs: Record<string, LeverConfig>;
  stores: Store[];
  globalParams: GlobalParams;
  apiReady: boolean;
  /** Per-hypothesis preset lock. Transient (not persisted), captured by history snapshots. */
  appliedPresets: Record<string, AppliedPresetInfo>;

  // Applied-preset lock controls
  setAppliedPreset: (hypothesisId: string, preset: AppliedPresetInfo | null) => void;

  // Init from API (simulations filtrées par profil)
  initFromAPI: (profileId: string) => Promise<void>;

  // Simulation
  createSimulation: (
    name: string,
    startDate: string,
    endDate: string,
    cpmId: string,
    opts?: { productTourFirstTime?: boolean },
  ) => void;
  updateSimulation: (updates: Partial<Pick<Simulation, 'name' | 'startDate' | 'endDate' | 'cpmId'>>) => void;

  // Hypotheses
  addHypothesis: (name: string, maxBudget: number, objective: ObjectiveMode, budgetMode: BudgetMode, totalBudget: number) => void;
  duplicateHypothesis: (id: string) => void;
  removeHypothesis: (id: string) => void;
  setActiveHypothesis: (id: string) => void;
  updateHypothesis: (id: string, updates: Partial<Hypothesis>) => void;
  toggleHypothesisCollapse: (id: string) => void;
  applyPreset: (presetId: string, hypothesisId: string) => void;
  addPresetFromHypothesis: (hypothesisId: string, ctx?: { isUserPreset: boolean; profileId: string | null }) => void;

  // Levers
  addLever: (hypothesisId: string, leverType: LeverType) => void;
  removeLever: (hypothesisId: string, leverId: string) => void;
  updateLever: (hypothesisId: string, leverId: string, updates: Partial<Lever>) => void;
  toggleLeverCollapse: (hypothesisId: string, leverId: string) => void;
  updateLeverBudget: (hypothesisId: string, leverId: string, budget: number) => void;
  updateLeverCoverage: (hypothesisId: string, leverId: string, coverage: number) => void;
  updateLeverRepetition: (hypothesisId: string, leverId: string, repetition: number) => void;
  setHypothesisTargetCoverage: (hypothesisId: string, targetAvg: number) => void;
  setHypothesisTargetDedupCoverage: (hypothesisId: string, targetDedup: number) => void;

  // Admin
  addPreset: (preset: Omit<Preset, 'id'>) => void;
  removePreset: (id: string, ctx?: { isAdmin: boolean; profileId: string | null }) => void;
  updatePreset: (
    id: string,
    updates: Partial<Pick<Preset, 'name' | 'description'>>,
    ctx?: { isAdmin: boolean; profileId: string | null },
  ) => void;
  reorderAdminPresets: (ids: string[]) => void;
  toggleComparison: () => void;
  toggleAdmin: () => void;

  // Prestations (par hypothèse)
  addPrestation: (hypothesisId: string, p: Omit<Prestation, 'id'>) => void;
  updatePrestation: (hypothesisId: string, id: string, updates: Partial<Omit<Prestation, 'id'>>) => void;
  removePrestation: (hypothesisId: string, id: string) => void;

  // Admin - Lever configs
  updateLeverConfig: (type: string, updates: Partial<LeverConfig>) => void;

  // Admin - Stores
  addStore: (name: string) => void;
  removeStore: (id: string) => void;
  updateStore: (id: string, updates: Partial<Pick<Store, 'name' | 'population' | 'pop10min' | 'pop20min' | 'pop30min' | 'popCustom' | 'budgetWeightPercent'>>) => void;
  importStoresFromExcel: (file: File, mode: 'replace' | 'append') => Promise<void>;

  // Admin - Global params
  updateGlobalParams: (updates: Partial<GlobalParams>) => void;

  // Admin - Import/Export
  exportData: () => string;
  importData: (json: string) => boolean;

  // Computed
  getHypothesisWarnings: (id: string) => Warning[];
  getHypothesisSummary: (id: string) => HypothesisSummary | null;
}

export interface HypothesisSummary {
  totalBudget: number;
  leverCount: number;
  minStore: { name: string; budget: number };
  maxStore: { name: string; budget: number };
  /** Budget simulé par magasin (même formule que min/max), pour le détail / tri. */
  storeBudgets: {
    id: string;
    name: string;
    population: number;
    /** Poids % (Admin → Magasins), utilisé en répartition « Pondéré ». */
    weightPercent: number;
    budget: number;
    coverage: number;
    repetition: number;
  }[];
  generalCoverage: number;
  coverageDetail: { name: string; coverage: number }[];
  avgRepetition: number;
  leverBreakdown: {
    id: string;
    name: string;
    budget: number;
    impressions: number;
    color: string;
    coverage: number;
    repetition: number;
    cpm: number;
  }[];
  /** Achat total (€) = Σ budget_levier * (purchaseCpm / cpm). */
  purchaseTotal: number;
  /** Total des prestations additionnelles (€). */
  prestationsSaleTotal: number;
  /** Budget total + prestations (€). */
  grandTotal: number;
  /** Taux de rétrocommission (%). */
  retrocommissionPercent: number;
  /** Rétrocommission appliquée (€). */
  retrocommissionAmount: number;
  /** Marge absolue (€) = vente - achat - rétrocommission. */
  marginAmount: number;
  /** Marge en % du budget total (0 si budget = 0). */
  marginPercent: number;
}

function equalBudgetPercents(levers: Lever[]): Lever[] {
  if (levers.length === 0) return levers;
  const equalPct = Math.round(100 / levers.length);
  // distribute remainder to last lever
  const total = equalPct * (levers.length - 1);
  return levers.map((l, i) => ({
    ...l,
    budgetPercent: i === levers.length - 1 ? 100 - total : equalPct,
  }));
}

function recalcHypothesis(h: Hypothesis, _simStart: string, _simEnd: string, configs: Record<string, LeverConfig>, stores: Store[], storeCount: number): Hypothesis {
  const updated = { ...h, levers: h.levers.map(l => ({ ...l })) };
  const zoneAvgPop = getZoneAvgPop(stores, h.zoneId);
  const inc = (l: Lever) => l.includedInHypothesis !== false;

  // V2 objectif couverture : on ne recalcule PAS la couverture / budget depuis
  // budgetMode. Le slider de couverture globale et les modifications manuelles
  // sur les leviers sont la seule source de vérité. Un levier ajouté reste à
  // coverage=0 / budget=0 tant que l'utilisateur ne bouge rien.
  const isCoverageObjective = h.objectiveMode === 'couverture';

  if (!isCoverageObjective && h.budgetMode === 'automatique' && h.totalBudget > 0) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const active = updated.levers.filter(inc);
    const totalPercent = active.reduce((s, l) => s + (configs[l.type]?.autoBudgetPercent || 0), 0);
    for (const lever of updated.levers) {
      if (!inc(lever)) continue;
      const config = configs[lever.type];
      if (config && totalPercent > 0) {
        // Répet fixée par les dates de campagne du levier
        const weeks = Math.max(1, Math.round((new Date(lever.endDate).getTime() - new Date(lever.startDate).getTime()) / msPerWeek));
        const bonusRepet = (lever.type === 'Display' || lever.type === 'Meta' || config.family === 'Meta' || config.family === 'Google') ? 1 : 0;
        lever.repetition = weeks + bonusRepet;

        // Budget cible selon poids relatif (autoBudgetPercent)
        const targetBudget = Math.round((config.autoBudgetPercent / totalPercent) * h.totalBudget);

        // Couverture depuis le budget cible
        const covFromTarget = calcCoverageFromBudget(targetBudget, lever.cpm, lever.repetition, lever.maxCoverage, zoneAvgPop, storeCount);

        if (covFromTarget >= lever.maxCoverage) {
          // Budget cappé à la couverture max
          lever.coverage = lever.maxCoverage;
          lever.budget = calcBudgetFromCoverage(lever.maxCoverage, lever.cpm, lever.repetition, zoneAvgPop, storeCount);
        } else {
          lever.coverage = covFromTarget;
          lever.budget = targetBudget;
        }

        lever.impressions = calcImpressions(lever.budget, lever.cpm);
      }
    }
  }

  if (!isCoverageObjective && h.budgetMode === 'pctTotal' && h.totalBudget > 0) {
    for (const lever of updated.levers) {
      if (!inc(lever)) continue;
      lever.budget = Math.round((lever.budgetPercent / 100) * h.totalBudget);
      lever.impressions = calcImpressions(lever.budget, lever.cpm);
      lever.repetition = calcRepetitionFromBudgetAndCoverage(lever.budget, lever.cpm, lever.coverage, zoneAvgPop, storeCount);
      if (lever.repetition < 1) lever.repetition = 1;
    }
  }

  if (h.budgetMode === 'levier' || h.budgetMode === 'libre' || h.budgetMode === 'v3-levier') {
    updated.totalBudget = updated.levers.filter(inc).reduce((s, l) => s + l.budget, 0);
    // Budget is fixed by user — recalc coverage from budget with new zone population
    for (const lever of updated.levers) {
      if (!inc(lever)) continue;
      const newCov = calcCoverageFromBudget(lever.budget, lever.cpm, lever.repetition, lever.maxCoverage, zoneAvgPop, storeCount);
      lever.coverage = newCov;
    }
  }

  // Mode couverture objectif (V2): coverage is fixed — recalc budget from coverage with new zone population
  if (isCoverageObjective) {
    for (const lever of updated.levers) {
      if (!inc(lever)) continue;
      lever.budget = calcBudgetFromCoverage(lever.coverage, lever.cpm, lever.repetition, zoneAvgPop, storeCount);
    }
    updated.totalBudget = updated.levers.filter(inc).reduce((s, l) => s + l.budget, 0);
  }

  for (const lever of updated.levers) {
    lever.impressions = calcImpressions(lever.budget, lever.cpm);
  }

  return updated;
}

const initialStores: Store[] = INITIAL_STORES.map(s => ({
  ...s,
  pop10min: s.pop10min ?? s.population ?? 0,
  pop20min: s.pop20min ?? s.population ?? 0,
  pop30min: s.pop30min ?? s.population ?? 0,
  popCustom: s.popCustom ?? 0,
}));

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simulation: null,
  activeHypothesisId: null,
  presets: DEFAULT_PRESETS,
  warnings: [],
  showComparison: false,
  showAdmin: false,
  leverConfigs: { ...INITIAL_LEVER_CONFIGS },
  stores: initialStores,
  globalParams: { defaultPopulation: 140000, maxBudgetPerStore: 50000, typicalBudgetPerStore: 1500, maxBudgetSliderPerStore: 3000, maxRepetitionSlider: 10 },
  apiReady: false,
  appliedPresets: {},

  setAppliedPreset: (hypothesisId, preset) => {
    if (!preset) {
      const prev = get().simulation?.hypotheses.find(h => h.id === hypothesisId);
      const clearIds = (prev?.prestations ?? []).filter(p => p.fromPreset).map(p => p.id);
      set(state => {
        if (!state.simulation) {
          const ap = { ...state.appliedPresets };
          delete ap[hypothesisId];
          return { appliedPresets: ap };
        }
        const hypotheses = state.simulation.hypotheses.map(h => {
          if (h.id !== hypothesisId) return h;
          const prestations = (h.prestations ?? []).map(p =>
            p.fromPreset ? { ...p, fromPreset: false } : p,
          );
          return { ...h, prestations };
        });
        const ap = { ...state.appliedPresets };
        delete ap[hypothesisId];
        return { appliedPresets: ap, simulation: { ...state.simulation, hypotheses } };
      });
      clearIds.forEach(id => {
        api.putPrestation(hypothesisId, id, { fromPreset: false }).catch(console.error);
      });
      return;
    }
    set(state => {
      const next = { ...state.appliedPresets };
      next[hypothesisId] = preset;
      return { appliedPresets: next };
    });
  },

  // ── Init from API ────────────────────────────────────────────
  initFromAPI: async (profileId: string) => {
    set({
      simulation: null,
      activeHypothesisId: null,
      showComparison: false,
      showAdmin: false,
      appliedPresets: {},
      apiReady: false,
    });
    try {
      const [globalParams, leverConfigsArr, stores, presets, simulations] = await Promise.all([
        api.getGlobalParams(),
        api.getLeverConfigs(),
        api.getStores(),
        api.getPresets(),
        api.getSimulations(profileId),
      ]);

      const leverConfigs: Record<string, LeverConfig> = {};
      for (const cfg of leverConfigsArr) leverConfigs[cfg.type] = mergeLeverConfig(cfg);

      // Ensure critical slider params always have sane defaults if missing/zero from API
      const safeGlobalParams: GlobalParams = {
        defaultPopulation: globalParams.defaultPopulation || 140000,
        maxBudgetPerStore: globalParams.maxBudgetPerStore || 50000,
        typicalBudgetPerStore: globalParams.typicalBudgetPerStore || 1500,
        maxBudgetSliderPerStore: globalParams.maxBudgetSliderPerStore || 3000,
        maxRepetitionSlider: globalParams.maxRepetitionSlider || 10,
      };

      // Load the most recent simulation if any
      let simulation: Simulation | null = null;
      if (simulations.length > 0) {
        simulation = await api.getSimulation(simulations[0].id);
      }

      const sc = stores.length || 1;

      // Normalize hypotheses, then recalc lever budgets/impressions (API load skips updateHypothesis → recalc)
      if (simulation) {
        const raw = simulation as Simulation & { prestations?: Prestation[] };
        const legacyPrestations = raw.prestations;
        const { prestations: _legacyTop, ...simBase } = raw;
        const start = simBase.startDate;
        const end = simBase.endDate;
        simulation = {
          ...simBase,
          hypotheses: simBase.hypotheses.map((h, idx) => {
            const rawPrest = h.prestations !== undefined ? h.prestations : (idx === 0 ? (legacyPrestations ?? []) : []);
            const normalized: Hypothesis = {
              ...h,
              prestations: rawPrest.map(p => ({ ...p, fromPreset: !!p.fromPreset })),
              zoneId: h.zoneId ?? 'zone1',
              storeDistributionMode: h.storeDistributionMode ?? 'egal',
              budgetsByMode: (h.budgetsByMode && Object.keys(h.budgetsByMode).length > 0)
                ? h.budgetsByMode
                : { [h.budgetMode]: h.totalBudget },
            };
            return recalcHypothesis(normalized, start, end, leverConfigs, stores, sc);
          }),
        };
      }

      const activeHypothesisId = simulation?.hypotheses[0]?.id ?? null;
      const normalizedPresets = presets.map(normalizePreset);
      set({
        globalParams: safeGlobalParams,
        leverConfigs,
        stores,
        presets: normalizedPresets,
        simulation,
        activeHypothesisId,
        apiReady: true,
      });
    } catch (err) {
      console.warn('API not available, using local defaults.', err);
      set({ apiReady: true });
    }
  },

  // ── Simulation ───────────────────────────────────────────────
  createSimulation: (name, startDate, endDate, cpmId, opts) => {
    const profileId = useProfileStore.getState().activeProfileId;
    if (!profileId) {
      console.warn('createSimulation: aucun profil actif');
      return;
    }
    if (opts?.productTourFirstTime) {
      setPendingProductTour(profileId);
    }
    const gp = get().globalParams;
    const defaultTotal = gp.typicalBudgetPerStore * (get().stores.length || 1);
    const h: Hypothesis = {
      id: uid(),
      name: 'Hypothèse 1',
      maxBudgetPerStore: gp.maxBudgetPerStore,
      objectiveMode: 'budget',
      budgetMode: 'automatique',
      totalBudget: defaultTotal,
      budgetsByMode: { automatique: defaultTotal },
      levers: [],
      prestations: [],
      collapsed: false,
      zoneId: 'zone1',
      storeDistributionMode: 'egal',
    };
    const sim: Simulation = { id: uid(), name, startDate, endDate, cpmId, hypotheses: [h] };
    set({ simulation: sim, activeHypothesisId: h.id });
    api.postSimulation({ ...sim, profileId }).then(() => {
      api.postHypothesis(sim.id, { ...h, sort_order: 0 }).catch(console.error);
    }).catch(console.error);
  },

  updateSimulation: (updates) => {
    set(state => {
      if (!state.simulation) return state;
      const sim = { ...state.simulation, ...updates };
      api.putSimulation(sim.id, updates).catch(console.error);
      return { simulation: sim };
    });
  },

  // ── Hypotheses ───────────────────────────────────────────────
  addHypothesis: (name, maxBudget, objective, budgetMode, totalBudget) => {
    set(state => {
      if (!state.simulation) return state;
      const h: Hypothesis = {
        id: uid(),
        name,
        maxBudgetPerStore: maxBudget,
        objectiveMode: objective,
        budgetMode,
        totalBudget,
        budgetsByMode: { [budgetMode]: totalBudget },
        levers: [],
        prestations: [],
        collapsed: false,
        zoneId: 'zone1',
        retrocommissionPercent: 0,
        storeDistributionMode: 'egal',
      };
      const sim = { ...state.simulation, hypotheses: [...state.simulation.hypotheses, h] };
      api.postHypothesis(state.simulation.id, { ...h, sort_order: sim.hypotheses.length - 1 }).catch(console.error);
      return { simulation: sim, activeHypothesisId: h.id };
    });
  },

  duplicateHypothesis: (id) => {
    set(state => {
      if (!state.simulation) return state;
      const source = state.simulation.hypotheses.find(h => h.id === id);
      if (!source) return state;
      const newH: Hypothesis = {
        ...source,
        id: uid(),
        name: `${source.name} (copie)`,
        levers: source.levers.map(l => ({ ...l, id: uid() })),
        prestations: (source.prestations ?? []).map(p => ({ ...p, id: uid(), fromPreset: false })),
      };
      const sim = { ...state.simulation, hypotheses: [...state.simulation.hypotheses, newH] };
      api.postHypothesis(state.simulation.id, { ...newH, sort_order: sim.hypotheses.length - 1 })
        .then(() => {
          newH.levers.forEach((l, i) => api.postLever(newH.id, { ...l, sort_order: i }).catch(console.error));
          newH.prestations?.forEach(p => api.postPrestation(newH.id, p).catch(console.error));
        })
        .catch(console.error);
      return { simulation: sim, activeHypothesisId: newH.id };
    });
  },

  removeHypothesis: (id) => {
    set(state => {
      if (!state.simulation) return state;
      const hypotheses = state.simulation.hypotheses.filter(h => h.id !== id);
      api.deleteHypothesis(state.simulation.id, id).catch(console.error);
      const appliedPresets = { ...state.appliedPresets };
      delete appliedPresets[id];
      return {
        simulation: { ...state.simulation, hypotheses },
        activeHypothesisId: state.activeHypothesisId === id ? (hypotheses[0]?.id ?? null) : state.activeHypothesisId,
        appliedPresets,
      };
    });
  },

  setActiveHypothesis: (id) => set({ activeHypothesisId: id }),

  updateHypothesis: (id, updates) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== id) return h;

        // When switching budget mode: save current budget for old mode, restore saved budget for new mode
        if (updates.budgetMode && updates.budgetMode !== h.budgetMode) {
          const newMode = updates.budgetMode;
          const oldMode = h.budgetMode;
          const savedBudgets = { ...(h.budgetsByMode || {}), [oldMode]: h.totalBudget };
          const restoredBudget = savedBudgets[newMode] ?? h.totalBudget;

          // For pctTotal: equalize percentages when switching into that mode
          let levers = h.levers;
          if (newMode === 'pctTotal') {
            levers = equalBudgetPercents(h.levers);
          }

          const updated = { ...h, ...updates, budgetsByMode: savedBudgets, totalBudget: restoredBudget, levers };
          return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
        }

        // When updating totalBudget explicitly, save to current mode's budget
        if (updates.totalBudget !== undefined && !updates.budgetMode) {
          const updatedBudgetsByMode = { ...(h.budgetsByMode || {}), [h.budgetMode]: updates.totalBudget };
          const updated = { ...h, ...updates, budgetsByMode: updatedBudgetsByMode };
          return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
        }

        const updated = { ...h, ...updates };
        return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
      });
      const recalced = hypotheses.find(h => h.id === id);
      if (recalced) {
        debouncedCall(`hyp-${id}`, () => {
          api.putHypothesis(get().simulation!.id, id, {
            name: recalced.name,
            maxBudgetPerStore: recalced.maxBudgetPerStore,
            objectiveMode: recalced.objectiveMode,
            budgetMode: recalced.budgetMode,
            totalBudget: recalced.totalBudget,
            retrocommissionPercent: recalced.retrocommissionPercent ?? 0,
            collapsed: recalced.collapsed,
            storeDistributionMode: recalced.storeDistributionMode ?? 'egal',
            zoneId: recalced.zoneId ?? 'zone1',
          }).catch(console.error);
          recalced.levers.forEach(l => {
            api.putLever(id, l.id, l).catch(console.error);
          });
        });
      }
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  toggleHypothesisCollapse: (id) => {
    set(state => {
      if (!state.simulation) return state;
      const hypotheses = state.simulation.hypotheses.map(h =>
        h.id === id ? { ...h, collapsed: !h.collapsed } : h
      );
      const h = hypotheses.find(h => h.id === id);
      if (h) api.putHypothesis(state.simulation.id, id, { collapsed: h.collapsed }).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  applyPreset: (presetId, hypothesisId) => {
    const state0 = get();
    if (!state0.simulation) return;
    const preset = state0.presets.find(p => p.id === presetId);
    if (!preset) return;
    const h0 = state0.simulation.hypotheses.find(h => h.id === hypothesisId);
    if (!h0) return;
    const oldLeverIds = h0.levers.map(l => l.id);
    const oldPrestationIds = (h0.prestations ?? []).map(p => p.id);

    type ToastPayload = {
      preset: Preset;
      prev: { totalBudget: number; maxBudgetPerStore: number; leverCount: number; prestationCount: number };
      next: { totalBudget: number; maxBudgetPerStore: number; leverCount: number; prestationCount: number };
    };
    let toastPayload: ToastPayload | null = null;

    set(state => {
      if (!state.simulation) return state;
      const pRef = state.presets.find(p => p.id === presetId);
      if (!pRef) return state;
      const sc = state.stores.length;

      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const levers: Lever[] = pRef.levers.map(pl => ({
          ...pl,
          id: uid(),
          purchaseCpm: pl.purchaseCpm ?? state.leverConfigs[pl.type]?.purchaseCpm ?? 0,
          startDate: pl.startDate || state.simulation!.startDate,
          endDate: pl.endDate || state.simulation!.endDate,
          collapsed: false,
        }));
        const prestations: Prestation[] = (pRef.prestations ?? []).map(t => ({
          id: uid(),
          name: t.name,
          category: t.category,
          quantity: t.quantity ?? 1,
          productionCost: t.productionCost ?? 0,
          price: t.offered ? 0 : (t.price ?? 0),
          offered: !!t.offered,
          fromPreset: true,
        }));
        const nextBudget = pRef.totalBudget ?? h.totalBudget;
        const nextMaxPerStore = pRef.maxBudgetPerStore ?? h.maxBudgetPerStore;
        const budgetsByMode = { ...(h.budgetsByMode || {}), [pRef.budgetMode]: nextBudget };
        const updated: Hypothesis = {
          ...h,
          objectiveMode: pRef.objectiveMode,
          budgetMode: pRef.budgetMode,
          totalBudget: nextBudget,
          maxBudgetPerStore: nextMaxPerStore,
          budgetsByMode,
          levers,
          prestations,
        };
        toastPayload = {
          preset: pRef,
          prev: {
            totalBudget: h.totalBudget,
            maxBudgetPerStore: h.maxBudgetPerStore,
            leverCount: h.levers.length,
            prestationCount: (h.prestations ?? []).length,
          },
          next: {
            totalBudget: nextBudget,
            maxBudgetPerStore: nextMaxPerStore,
            leverCount: levers.length,
            prestationCount: prestations.length,
          },
        };
        return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
      });

      const recalced = hypotheses.find(h => h.id === hypothesisId);
      if (recalced && state.simulation) {
        const simId = state.simulation.id;
        api.putHypothesis(simId, hypothesisId, {
          objectiveMode: recalced.objectiveMode,
          budgetMode: recalced.budgetMode,
          totalBudget: recalced.totalBudget,
          maxBudgetPerStore: recalced.maxBudgetPerStore,
        }).catch(console.error);
        oldLeverIds.forEach(lid => {
          api.deleteLever(hypothesisId, lid).catch(console.error);
        });
        recalced.levers.forEach((l, i) => {
          api.postLever(hypothesisId, { ...l, sort_order: i }).catch(console.error);
        });
        oldPrestationIds.forEach(pid => {
          api.deletePrestation(hypothesisId, pid).catch(console.error);
        });
        (recalced.prestations ?? []).forEach(p => {
          api.postPrestation(hypothesisId, p).catch(console.error);
        });
      }

      const presetInfo: AppliedPresetInfo = { id: preset.id, name: preset.name };
      return {
        simulation: { ...state.simulation, hypotheses },
        appliedPresets: { ...state.appliedPresets, [hypothesisId]: presetInfo },
      };
    });

    const payload = toastPayload as ToastPayload | null;
    if (payload) {
      const { preset, prev, next } = payload;
      const lines: string[] = [];
      if (prev.totalBudget !== next.totalBudget) {
        lines.push(`Budget total : ${formatNum(prev.totalBudget)}€ → ${formatNum(next.totalBudget)}€`);
      } else {
        lines.push(`Budget total : ${formatNum(next.totalBudget)}€`);
      }
      if (prev.maxBudgetPerStore !== next.maxBudgetPerStore) {
        lines.push(`Budget max / PDV : ${formatNum(prev.maxBudgetPerStore)}€ → ${formatNum(next.maxBudgetPerStore)}€`);
      } else {
        lines.push(`Budget max / PDV : ${formatNum(next.maxBudgetPerStore)}€`);
      }
      lines.push(`Leviers : ${prev.leverCount} → ${next.leverCount} (${preset.levers.map(l => l.type).join(', ')})`);
      lines.push(`Prestations : ${prev.prestationCount} → ${next.prestationCount}`);
      useToastStore.getState().push({
        kind: 'success',
        title: `Preset « ${preset.name} » appliqué`,
        lines,
      });
    }
  },

  addPresetFromHypothesis: (hypothesisId, ctx) => {
    const state = get();
    if (!state.simulation) return;
    const h = state.simulation.hypotheses.find(x => x.id === hypothesisId);
    if (!h) return;
    const levers = h.levers.map(({ id: _id, collapsed: _collapsed, ...rest }) => rest);
    const base = h.name.trim() || 'Hypothèse';
    let name = `${base} · preset`;
    let n = 2;
    while (state.presets.some(p => p.name === name)) {
      name = `${base} · preset (${n})`;
      n++;
    }
    const isUserPreset = ctx?.isUserPreset === true;
    const profileId = ctx?.profileId ?? null;
    get().addPreset({
      name,
      description: `Créé depuis l'hypothèse « ${h.name} »`,
      objectiveMode: h.objectiveMode,
      budgetMode: h.budgetMode,
      totalBudget: h.totalBudget,
      maxBudgetPerStore: h.maxBudgetPerStore,
      levers,
      prestations: (h.prestations ?? []).map(p => ({
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        productionCost: p.productionCost,
        price: p.price,
        offered: p.offered,
      })),
      scope: isUserPreset ? 'user' : 'admin',
      ownerProfileId: isUserPreset ? profileId : null,
    });
  },

  // ── Levers ───────────────────────────────────────────────────
  addLever: (hypothesisId, leverType) => {
    set(state => {
      if (!state.simulation) return state;
      const config = state.leverConfigs[leverType];
      if (!config) return state;
      const sc = state.stores.length;

      const startDate = state.simulation.startDate;
      const endDate = state.simulation.endDate;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeks = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerWeek));
      const bonusRepet = (leverType === 'Display' || leverType === 'Meta' || config.family === 'Meta' || config.family === 'Google') ? 1 : 0;
      const initialRepetition = weeks + bonusRepet;

      // Ajout en objectif couverture : démarre à 0 % (budget 0). Répétition
      // calculée sur les semaines comme d'habitude. En objectif budget : 30 %
      // par défaut comme avant.
      const parentH = state.simulation.hypotheses.find(h => h.id === hypothesisId);
      const initialCoverage = parentH?.objectiveMode === 'couverture' ? 0 : 30;

      const lever: Lever = {
        id: uid(),
        type: leverType,
        startDate,
        endDate,
        cpm: config.defaultCpm,
        purchaseCpm: config.purchaseCpm ?? 0,
        minBudgetPerStore: config.minBudgetPerStore,
        budget: 0,
        budgetPercent: 0,
        repetition: initialRepetition,
        coverage: initialCoverage,
        maxCoverage: config.maxCoverage,
        impressions: 0,
        collapsed: false,
      };

      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const newLevers = [...h.levers, lever];
        // Auto-equalize percentages in pctTotal mode
        const adjustedLevers = h.budgetMode === 'pctTotal' ? equalBudgetPercents(newLevers) : newLevers;
        const updated = { ...h, levers: adjustedLevers };
        return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
      });

      api.postLever(hypothesisId, { ...lever, sort_order: hypotheses.find(h => h.id === hypothesisId)?.levers.length ?? 0 }).catch(console.error);

      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  removeLever: (hypothesisId, leverId) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const filteredLevers = h.levers.filter(l => l.id !== leverId);
        // Re-equalize percentages in pctTotal mode after removal
        const adjustedLevers = h.budgetMode === 'pctTotal' ? equalBudgetPercents(filteredLevers) : filteredLevers;
        const updated = { ...h, levers: adjustedLevers };
        return recalcHypothesis(updated, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
      });
      api.deleteLever(hypothesisId, leverId).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  updateLever: (hypothesisId, leverId, updates) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        let levers = h.levers.map(l => l.id === leverId ? { ...l, ...updates } : l);
        // En mode pctTotal, si on met à jour budgetPercent, redistribuer le reste
        // proportionnellement aux autres leviers pour que la somme reste 100%
        if (h.budgetMode === 'pctTotal' && 'budgetPercent' in updates) {
          const newPct = (updates as { budgetPercent: number }).budgetPercent;
          const others = levers.filter(l => l.id !== leverId);
          const othersSum = others.reduce((s, l) => s + l.budgetPercent, 0);
          const remaining = 100 - newPct;
          if (othersSum > 0) {
            levers = levers.map(l => {
              if (l.id === leverId) return l;
              return { ...l, budgetPercent: Math.round((l.budgetPercent / othersSum) * remaining) };
            });
            // Corriger l'arrondi sur le dernier levier pour que la somme soit exactement 100
            const sum = levers.reduce((s, l) => s + l.budgetPercent, 0);
            if (sum !== 100) {
              const lastOther = levers.findIndex(l => l.id !== leverId);
              if (lastOther !== -1) {
                levers = levers.map((l, i) => i === lastOther ? { ...l, budgetPercent: l.budgetPercent + (100 - sum) } : l);
              }
            }
          } else if (others.length > 0) {
            // Tous les autres sont à 0, les distribuer également
            const equalPct = Math.floor(remaining / others.length);
            let assigned = 0;
            levers = levers.map(l => {
              if (l.id === leverId) return l;
              assigned += equalPct;
              return { ...l, budgetPercent: equalPct };
            });
            // Donner le reste au premier autre levier
            const diff = remaining - assigned;
            if (diff !== 0) {
              const firstOtherIdx = levers.findIndex(l => l.id !== leverId);
              if (firstOtherIdx !== -1) {
                levers = levers.map((l, i) => i === firstOtherIdx ? { ...l, budgetPercent: l.budgetPercent + diff } : l);
              }
            }
          }
        }
        return recalcHypothesis({ ...h, levers }, state.simulation!.startDate, state.simulation!.endDate, state.leverConfigs, state.stores, sc);
      });
      debouncedCall(`lever-${leverId}`, () => api.putLever(hypothesisId, leverId, updates).catch(console.error));
      // Persister aussi les leviers dont budgetPercent a été redistribué
      if ('budgetPercent' in updates) {
        const h = hypotheses.find(h => h.id === hypothesisId);
        h?.levers.filter(l => l.id !== leverId).forEach(l => {
          debouncedCall(`lever-${l.id}`, () => api.putLever(hypothesisId, l.id, { budgetPercent: l.budgetPercent }).catch(console.error));
        });
      }
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  toggleLeverCollapse: (hypothesisId, leverId) => {
    set(state => {
      if (!state.simulation) return state;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const levers = h.levers.map(l => l.id === leverId ? { ...l, collapsed: !l.collapsed } : l);
        return { ...h, levers };
      });
      const h = hypotheses.find(h => h.id === hypothesisId);
      const l = h?.levers.find(l => l.id === leverId);
      if (l) api.putLever(hypothesisId, leverId, { collapsed: l.collapsed }).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  updateLeverBudget: (hypothesisId, leverId, budget) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const version = useVersionStore.getState().activeVersion;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const avgPop = getZoneAvgPop(state.stores, h.zoneId);
        const levers = h.levers.map(l => {
          if (l.id !== leverId) return l;
          const newL = { ...l, budget };
          newL.impressions = calcImpressions(budget, l.cpm);

          // V2 objectif couverture: Budget change → repetition adjusts (coverage stays fixed)
          if (version === 'v2' && h.objectiveMode === 'couverture') {
            newL.repetition = calcRepetitionFromBudgetAndCoverage(budget, l.cpm, l.coverage, avgPop, sc);
            if (newL.repetition < 0.1) newL.repetition = 0.1;
          // V2 objectif budget libre: Budget → couv up to max then répét increases ;
          //   en baisse: répét descend jusqu'à 1 d'abord, puis couv baisse
          } else if (version === 'v2' && h.objectiveMode === 'budget' && h.budgetMode === 'libre') {
            const newCovAtCurrentRep = calcCoverageFromBudget(budget, l.cpm, l.repetition, l.maxCoverage, avgPop, sc);
            if (newCovAtCurrentRep >= l.maxCoverage) {
              // Budget monte encore au-delà du max de couv → répét augmente
              newL.coverage = l.maxCoverage;
              newL.repetition = calcRepetitionFromBudgetAndCoverage(budget, l.cpm, l.maxCoverage, avgPop, sc);
            } else if (l.repetition > 1) {
              // Budget baisse : répét descend en premier (couv reste fixe), jusqu'à répét = 1
              const newRep = calcRepetitionFromBudgetAndCoverage(budget, l.cpm, l.coverage, avgPop, sc);
              if (newRep >= 1) {
                newL.repetition = newRep;
              } else {
                // répét atteint 1, le reste de la baisse impacte la couv
                newL.repetition = 1;
                newL.coverage = calcCoverageFromBudget(budget, l.cpm, 1, l.maxCoverage, avgPop, sc);
              }
            } else {
              // répét déjà à 1 ou moins → couv baisse
              newL.coverage = newCovAtCurrentRep;
            }
          } else if (h.budgetMode === 'libre') {
            const newCov = calcCoverageFromBudget(budget, l.cpm, l.repetition, l.maxCoverage, avgPop, sc);
            if (newCov >= l.maxCoverage) {
              newL.coverage = l.maxCoverage;
              newL.repetition = calcRepetitionFromBudgetAndCoverage(budget, l.cpm, l.maxCoverage, avgPop, sc);
            } else {
              newL.coverage = newCov;
            }
          } else if (h.budgetMode === 'pctTotal' || h.budgetMode === 'levier') {
            const newCov = calcCoverageFromBudget(budget, l.cpm, l.repetition, l.maxCoverage, avgPop, sc);
            if (newCov >= l.maxCoverage) {
              newL.coverage = l.maxCoverage;
              newL.repetition = calcRepetitionFromBudgetAndCoverage(budget, l.cpm, l.maxCoverage, avgPop, sc);
            } else {
              newL.coverage = newCov;
            }
          }
          return newL;
        });
        const updated = { ...h, levers };
        if (h.budgetMode === 'levier' || h.budgetMode === 'libre' || h.budgetMode === 'v3-levier') {
          updated.totalBudget = levers.filter(l => l.includedInHypothesis !== false).reduce((s, l) => s + l.budget, 0);
        }
        return updated;
      });

      const h = hypotheses.find(h => h.id === hypothesisId);
      const l = h?.levers.find(l => l.id === leverId);
      if (l) debouncedCall(`lever-${leverId}`, () => api.putLever(hypothesisId, leverId, l).catch(console.error));
      if (h) debouncedCall(`hyp-total-${hypothesisId}`, () => api.putHypothesis(get().simulation!.id, hypothesisId, { totalBudget: h.totalBudget }).catch(console.error));

      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  updateLeverCoverage: (hypothesisId, leverId, coverage) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const version = useVersionStore.getState().activeVersion;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const avgPop = getZoneAvgPop(state.stores, h.zoneId);
        const levers = h.levers.map(l => {
          if (l.id !== leverId) return l;
          const newL = { ...l, coverage };

          // V2 objectif couverture: Coverage change → budget adjusts (repetition stays fixed)
          if (version === 'v2' && h.objectiveMode === 'couverture') {
            newL.budget = calcBudgetFromCoverage(coverage, l.cpm, l.repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          // V2 objectif budget libre: Coverage change → budget adjusts (repetition stays fixed)
          } else if (version === 'v2' && h.objectiveMode === 'budget' && h.budgetMode === 'libre') {
            newL.budget = calcBudgetFromCoverage(coverage, l.cpm, l.repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          } else if (h.budgetMode === 'libre') {
            newL.budget = calcBudgetFromCoverage(coverage, l.cpm, l.repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          } else if (h.budgetMode === 'automatique') {
            newL.repetition = calcRepetitionFromBudgetAndCoverage(l.budget, l.cpm, coverage, avgPop, sc);
            if (newL.repetition < 0.1) newL.repetition = 0.1;
          } else if (h.budgetMode === 'pctTotal' || h.budgetMode === 'levier') {
            newL.repetition = calcRepetitionFromBudgetAndCoverage(l.budget, l.cpm, coverage, avgPop, sc);
            if (newL.repetition < 0.1) newL.repetition = 0.1;
          }
          return newL;
        });
        const updated = { ...h, levers };
        // V2 couverture ou V2 budget libre: budget recalculé → mettre à jour totalBudget
        if ((version === 'v2' && (h.objectiveMode === 'couverture' || (h.objectiveMode === 'budget' && h.budgetMode === 'libre'))) || h.budgetMode === 'libre') {
          updated.totalBudget = levers.filter(l => l.includedInHypothesis !== false).reduce((s, l) => s + l.budget, 0);
        }
        return updated;
      });

      const h = hypotheses.find(h => h.id === hypothesisId);
      const l = h?.levers.find(l => l.id === leverId);
      if (l) debouncedCall(`lever-${leverId}`, () => api.putLever(hypothesisId, leverId, l).catch(console.error));

      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  updateLeverRepetition: (hypothesisId, leverId, repetition) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const version = useVersionStore.getState().activeVersion;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        const avgPop = getZoneAvgPop(state.stores, h.zoneId);
        const levers = h.levers.map(l => {
          if (l.id !== leverId) return l;
          const newL = { ...l, repetition };

          // V2 objectif couverture: Repetition change → budget adjusts (coverage stays fixed)
          if (version === 'v2' && h.objectiveMode === 'couverture') {
            newL.budget = calcBudgetFromCoverage(l.coverage, l.cpm, repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          // V2 objectif budget libre: Repetition change → budget adjusts (coverage stays fixed)
          } else if (version === 'v2' && h.objectiveMode === 'budget' && h.budgetMode === 'libre') {
            newL.budget = calcBudgetFromCoverage(l.coverage, l.cpm, repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          } else if (h.budgetMode === 'libre') {
            newL.budget = calcBudgetFromCoverage(l.coverage, l.cpm, repetition, avgPop, sc);
            newL.impressions = calcImpressions(newL.budget, l.cpm);
          } else if (h.budgetMode === 'pctTotal' || h.budgetMode === 'levier' || h.budgetMode === 'automatique') {
            newL.coverage = calcCoverageFromBudget(l.budget, l.cpm, repetition, l.maxCoverage, avgPop, sc);
          }
          return newL;
        });
        const updated = { ...h, levers };
        // V2 couverture ou V2 budget libre: budget recalculé → mettre à jour totalBudget
        if ((version === 'v2' && (h.objectiveMode === 'couverture' || (h.objectiveMode === 'budget' && h.budgetMode === 'libre'))) || h.budgetMode === 'libre') {
          updated.totalBudget = levers.filter(l => l.includedInHypothesis !== false).reduce((s, l) => s + l.budget, 0);
        }
        return updated;
      });

      const h = hypotheses.find(h => h.id === hypothesisId);
      const l = h?.levers.find(l => l.id === leverId);
      if (l) debouncedCall(`lever-${leverId}`, () => api.putLever(hypothesisId, leverId, l).catch(console.error));

      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  // V2 objectif couverture : slider "couverture globale" au niveau hypothèse.
  // Applique un waterfill sur les leviers : chaque coverage est capée à son
  // maxCoverage, et le reste du budget de couverture est redistribué sur les
  // leviers non capés. Le budget de chaque levier est recalculé à partir de sa
  // nouvelle couverture (répétition inchangée), comme dans updateLeverCoverage.
  setHypothesisTargetCoverage: (hypothesisId, targetAvg) => {
    set(state => {
      if (!state.simulation) return state;
      const sc = state.stores.length;
      const hypotheses = state.simulation.hypotheses.map(h => {
        if (h.id !== hypothesisId) return h;
        if (h.levers.length === 0) return h;
        const avgPop = getZoneAvgPop(state.stores, h.zoneId);
        const inc = (l: Lever) => l.includedInHypothesis !== false;
        const includedIndices = h.levers.map((l, i) => (inc(l) ? i : -1)).filter(i => i >= 0);
        if (includedIndices.length === 0) return h;
        const maxes = includedIndices.map(i => h.levers[i]!.maxCoverage);
        const coverages = distributeCoverageWaterfill(targetAvg, maxes);
        const levers = h.levers.map((l, i) => {
          const pos = includedIndices.indexOf(i);
          if (pos < 0) return { ...l };
          const coverage = coverages[pos]!;
          const budget = calcBudgetFromCoverage(coverage, l.cpm, l.repetition, avgPop, sc);
          const impressions = calcImpressions(budget, l.cpm);
          return { ...l, coverage, budget, impressions };
        });
        const totalBudget = levers.filter(inc).reduce((s, l) => s + l.budget, 0);
        return { ...h, levers, totalBudget };
      });

      const h = hypotheses.find(h => h.id === hypothesisId);
      if (h) {
        for (const l of h.levers) {
          debouncedCall(`lever-${l.id}`, () => api.putLever(hypothesisId, l.id, l).catch(console.error));
        }
      }

      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  // V2 objectif couverture : slider "couverture dédupliquée" globale.
  // Le slider représente maintenant la couverture dédupliquée totale
  // (1 - ∏(1-cov_i/100)). On inverse via bisection pour retrouver la
  // cible moyenne à passer au waterfill, puis on réutilise la logique
  // existante de distribution + recalcul des budgets.
  setHypothesisTargetDedupCoverage: (hypothesisId, targetDedup) => {
    const state = get();
    const h = state.simulation?.hypotheses.find(x => x.id === hypothesisId);
    if (!h || h.levers.length === 0) return;
    const inc = (l: Lever) => l.includedInHypothesis !== false;
    const active = h.levers.filter(inc);
    if (active.length === 0) return;
    const maxes = active.map(l => l.maxCoverage);
    const targetAvg = avgForDedupCoverage(targetDedup, maxes);
    get().setHypothesisTargetCoverage(hypothesisId, targetAvg);
  },

  // ── Presets ──────────────────────────────────────────────────
  addPreset: (preset) => {
    const id = uid();
    const normalized = normalizePreset({ ...preset, id });
    set(state => ({ presets: [...state.presets, normalized] }));
    api.postPreset(normalized).catch(console.error);
  },

  removePreset: (id, ctx) => {
    const preset = get().presets.find(p => p.id === id);
    if (!preset) return;
    const scope = preset.scope ?? 'admin';
    if (ctx) {
      if (!ctx.isAdmin) {
        if (scope === 'admin') return;
        if (preset.ownerProfileId !== ctx.profileId) return;
      }
    }
    set(state => ({ presets: state.presets.filter(p => p.id !== id) }));
    api.deletePreset(id).catch(console.error);
  },

  updatePreset: (id, updates, ctx) => {
    const preset = get().presets.find(p => p.id === id);
    if (!preset) return;
    const scope = preset.scope ?? 'admin';
    if (ctx) {
      if (!ctx.isAdmin) {
        if (scope === 'admin') return;
        if (preset.ownerProfileId !== ctx.profileId) return;
      }
    }
    const body: { name?: string; description?: string } = {};
    if (updates.name !== undefined) {
      const t = updates.name.trim();
      if (!t) return;
      body.name = t;
    }
    if (updates.description !== undefined) {
      body.description = updates.description;
    }
    if (Object.keys(body).length === 0) return;
    set(state => {
      const nextPresets = state.presets.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        };
      });
      let nextApplied = state.appliedPresets;
      if (body.name !== undefined) {
        const ap = { ...state.appliedPresets };
        let changed = false;
        for (const [hid, info] of Object.entries(ap)) {
          if (info.id === id) {
            ap[hid] = { ...info, name: body.name! };
            changed = true;
          }
        }
        if (changed) nextApplied = ap;
      }
      return { presets: nextPresets, appliedPresets: nextApplied };
    });
    api.patchPreset(id, body).catch(console.error);
  },

  reorderAdminPresets: (ids: string[]) => {
    set(state => {
      const adminIds = new Set(ids);
      const adminOrdered = ids.map(id => state.presets.find(p => p.id === id)).filter(Boolean) as typeof state.presets;
      const rest = state.presets.filter(p => !adminIds.has(p.id));
      return { presets: [...adminOrdered, ...rest] };
    });
    api.reorderPresets(ids).catch(console.error);
  },

  toggleComparison: () => set(state => ({ showComparison: !state.showComparison })),
  toggleAdmin: () => set(state => ({ showAdmin: !state.showAdmin })),

  // ── Prestations ──────────────────────────────────────────────
  addPrestation: (hypothesisId, p) => {
    set(state => {
      if (!state.simulation) return state;
      const prestation: Prestation = { ...p, id: uid() };
      const hypotheses = state.simulation.hypotheses.map(h =>
        h.id === hypothesisId
          ? { ...h, prestations: [...(h.prestations ?? []), prestation] }
          : h,
      );
      api.postPrestation(hypothesisId, prestation).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  updatePrestation: (hypothesisId, id, updates) => {
    set(state => {
      if (!state.simulation) return state;
      const lock = state.appliedPresets[hypothesisId];
      const h = state.simulation.hypotheses.find(x => x.id === hypothesisId);
      const target = h?.prestations?.find(p => p.id === id);
      if (lock && target?.fromPreset) return state;
      const hypotheses = state.simulation.hypotheses.map(h0 => {
        if (h0.id !== hypothesisId) return h0;
        const prestations = (h0.prestations ?? []).map(p =>
          p.id === id ? { ...p, ...updates } : p,
        );
        return { ...h0, prestations };
      });
      api.putPrestation(hypothesisId, id, updates).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  removePrestation: (hypothesisId, id) => {
    set(state => {
      if (!state.simulation) return state;
      const lock = state.appliedPresets[hypothesisId];
      const h = state.simulation.hypotheses.find(x => x.id === hypothesisId);
      const p = h?.prestations?.find(x => x.id === id);
      if (lock && p?.fromPreset) return state;
      const hypotheses = state.simulation.hypotheses.map(h0 =>
        h0.id === hypothesisId
          ? { ...h0, prestations: (h0.prestations ?? []).filter(x => x.id !== id) }
          : h0,
      );
      api.deletePrestation(hypothesisId, id).catch(console.error);
      return { simulation: { ...state.simulation, hypotheses } };
    });
  },

  // ── Admin - Lever configs ────────────────────────────────────
  updateLeverConfig: (type, updates) => {
    set(state => {
      const prev = state.leverConfigs[type];
      if (!prev) return state;
      const merged = mergeLeverConfig({ ...prev, ...updates });
      api.putLeverConfig(type, updates).catch(console.error);
      return { leverConfigs: { ...state.leverConfigs, [type]: merged } };
    });
  },

  // ── Admin - Stores ───────────────────────────────────────────
  addStore: (name) => {
    const id = uid();
    const population = get().globalParams.defaultPopulation;
    set(state => ({
      stores: [...state.stores, { id, name, population, pop10min: population, pop20min: population, pop30min: population, popCustom: 0, budgetWeightPercent: 100 }],
    }));
    api.postStore({ id, name, population, pop10min: population, pop20min: population, pop30min: population, popCustom: 0, budgetWeightPercent: 100 }).catch(console.error);
  },

  removeStore: (id) => {
    set(state => ({ stores: state.stores.filter(s => s.id !== id) }));
    api.deleteStore(id).catch(console.error);
  },

  updateStore: (id, updates) => {
    set(state => ({
      stores: state.stores.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
    api.putStore(id, updates).catch(console.error);
  },

  importStoresFromExcel: async (file, mode) => {
    const { stores } = await api.uploadStores(file, mode);
    set({ stores });
  },

  // ── Admin - Global params ────────────────────────────────────
  updateGlobalParams: (updates) => {
    set(state => {
      const globalParams = { ...state.globalParams, ...updates };
      api.putGlobalParams(globalParams).catch(console.error);
      return { globalParams };
    });
  },

  // ── Import/Export ────────────────────────────────────────────
  exportData: () => {
    const state = get();
    const data = {
      simulation: state.simulation,
      presets: state.presets,
      leverConfigs: state.leverConfigs,
      stores: state.stores,
      globalParams: state.globalParams,
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (json) => {
    try {
      const data = JSON.parse(json);
      let importedSim = data.simulation as (Simulation & { prestations?: Prestation[] }) | undefined;
      if (importedSim?.prestations?.length && importedSim.hypotheses?.length) {
        const legacy = importedSim.prestations;
        const { prestations: _drop, ...rest } = importedSim;
        importedSim = {
          ...rest,
          hypotheses: importedSim.hypotheses.map((h, i) =>
            i === 0
              ? { ...h, prestations: [...(h.prestations ?? []), ...legacy] }
              : { ...h, prestations: h.prestations ?? [] },
          ),
        };
      }
      set(state => ({
        ...(importedSim !== undefined && { simulation: importedSim }),
        ...(importedSim !== undefined && { activeHypothesisId: importedSim?.hypotheses?.[0]?.id ?? null }),
        ...(data.presets && { presets: (data.presets as Preset[]).map(normalizePreset) }),
        ...(data.leverConfigs && {
          leverConfigs: Object.fromEntries(
            Object.entries(data.leverConfigs as Record<string, LeverConfig>).map(([k, v]) => [k, mergeLeverConfig(v)]),
          ),
        }),
        ...(data.stores && { stores: data.stores }),
        ...(data.globalParams && { globalParams: { ...state.globalParams, ...data.globalParams } }),
      }));
      return true;
    } catch {
      return false;
    }
  },

  // ── Computed ─────────────────────────────────────────────────
  getHypothesisWarnings: (id) => {
    const state = get();
    if (!state.simulation) return [];
    const h = state.simulation.hypotheses.find(h => h.id === id);
    if (!h) return [];
    return getWarnings(h, state.stores.length);
  },

  getHypothesisSummary: (id) => {
    const state = get();
    if (!state.simulation) return null;
    const h = state.simulation.hypotheses.find(h => h.id === id);
    const inc = (l: Lever) => l.includedInHypothesis !== false;
    const activeLevers = h ? h.levers.filter(inc) : [];
    if (!h || (activeLevers.length === 0 && !(h.prestations?.length))) return null;

    // Toujours utiliser la dépense RÉELLE (somme des budgets leviers) pour la
    // ventilation par magasin. En modes `automatique` / `pctTotal` / couverture,
    // h.totalBudget est l'objectif saisi ; la dépense réelle peut différer
    // (plafonnement maxCoverage, recalcul via avgPop au changement de zone…),
    // et c'est cette dépense qui doit être répartie sur les magasins.
    const totalBudget = activeLevers.reduce((s, l) => s + l.budget, 0);

    // Couverture dédupliquée : 1 - ∏(1 - couv_i/100) — alignée sur le récap, répétition moyenne des leviers
    const coverageDetail = activeLevers.map(l => ({ name: l.type, coverage: l.coverage }));
    const deduplicatedCoverage = activeLevers.length > 0
      ? Math.round((1 - activeLevers.reduce((prod, l) => prod * (1 - l.coverage / 100), 1)) * 1000) / 10
      : 0;

    const avgRepetition = activeLevers.length > 0
      ? Math.round((activeLevers.reduce((s, l) => s + l.repetition, 0) / activeLevers.length) * 10) / 10
      : 0;

    const distMode: StoreDistributionMode = h.storeDistributionMode ?? 'egal';
    const zoneId = h.zoneId ?? 'zone1';
    const minPerStoreFromLevers =
      activeLevers.length > 0 ? activeLevers.reduce((s, l) => s + l.minBudgetPerStore, 0) : 0;
    // Objectif couverture + tranches de 50 € : plancher par mag. aligné au multiple de 50 supérieur
    // (ex. 120 € de config → 150 €) pour cohérence avec `snapStoreBudgetsToFifty`.
    const minForStoreAllocation =
      h.objectiveMode === 'couverture' && minPerStoreFromLevers > 0
        ? Math.ceil(minPerStoreFromLevers / BUDGET_STORE_STEP) * BUDGET_STORE_STEP
        : minPerStoreFromLevers;
    let parts = allocateStoreBudgets(
      totalBudget,
      state.stores,
      distMode,
      Math.round(minForStoreAllocation),
      zoneId,
    );
    if (h.objectiveMode === 'couverture') {
      parts = snapStoreBudgetsToFifty(parts, totalBudget, Math.round(minForStoreAllocation));
    }
    const storeBudgets = state.stores.map((store, i) => ({
      id: store.id,
      name: store.name,
      population: storeZonePop(store, zoneId),
      weightPercent: store.budgetWeightPercent ?? 100,
      budget: parts[i] ?? 0,
      coverage: deduplicatedCoverage,
      repetition: avgRepetition,
    }));

    const sortedStores = [...storeBudgets].map(({ name, budget }) => ({ name, budget })).sort((a, b) => a.budget - b.budget);

    const leverBreakdown = activeLevers.map(l => {
      const cfg = state.leverConfigs[l.type];
      const name = cfg?.family && cfg.family !== 'Legacy'
        ? `${cfg.family} - ${cfg.label || l.type}`
        : (cfg?.label || l.type);
      return {
        id: l.id,
        name,
        budget: l.budget,
        impressions: calcImpressions(l.budget, l.cpm),
        color: cfg?.color || '#666',
        coverage: l.coverage,
        repetition: l.repetition,
        cpm: l.cpm,
      };
    });

    // Marge : achat total = somme des (budget levier × purchaseCpm / cpm) + coûts de production prestas.
    const realBudget = activeLevers.reduce((s, l) => s + l.budget, 0);
    const purchaseTotal = activeLevers.reduce((sum, l) => {
      if (!l.cpm || l.cpm <= 0) return sum;
      const ratio = (l.purchaseCpm ?? 0) / l.cpm;
      return sum + l.budget * ratio;
    }, 0);
    const prestations = h.prestations ?? [];
    const prestationsSaleTotal = prestations.reduce((s, p) => s + (p.offered ? 0 : p.price * (p.quantity ?? 1)), 0);
    const prestationsCostTotal = prestations.reduce((s, p) => s + (p.offered ? 0 : (p.productionCost ?? 0) * (p.quantity ?? 1)), 0);
    const retrocommissionPercent = h.retrocommissionPercent ?? 0;
    const retrocommissionAmount = realBudget * (retrocommissionPercent / 100);
    const grandTotal = realBudget + prestationsSaleTotal;
    const marginAmount = grandTotal - purchaseTotal - prestationsCostTotal - retrocommissionAmount;
    const marginPercent = grandTotal > 0 ? (marginAmount / grandTotal) * 100 : 0;

    return {
      totalBudget,
      leverCount: activeLevers.length,
      minStore: sortedStores[0] || { name: '-', budget: 0 },
      maxStore: sortedStores[sortedStores.length - 1] || { name: '-', budget: 0 },
      storeBudgets,
      generalCoverage: deduplicatedCoverage,
      coverageDetail,
      avgRepetition,
      leverBreakdown,
      purchaseTotal,
      prestationsSaleTotal,
      grandTotal,
      retrocommissionPercent,
      retrocommissionAmount,
      marginAmount,
      marginPercent,
    };
  },
}));
