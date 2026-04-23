import { create } from 'zustand';
import type { Simulation, Preset, Store, LeverConfig, GlobalParams, Hypothesis, Lever } from '../types';
import type { AppVersion } from './versionStore';
import { api } from '../services/api';
import { useSimulationStore, type AppliedPresetInfo } from './simulationStore';
import { useVersionStore } from './versionStore';
import { useProfileStore, getActiveProfile } from './profileStore';
import { applyTheme, type Theme } from '../theme';

type ThemeMode = Theme;

export interface HistorySnapshot {
  simulation: Simulation | null;
  activeHypothesisId: string | null;
  presets: Preset[];
  stores: Store[];
  leverConfigs: Record<string, LeverConfig>;
  globalParams: GlobalParams;
  showComparison: boolean;
  showAdmin: boolean;
  version: AppVersion;
  theme: ThemeMode;
  appliedPresets: Record<string, AppliedPresetInfo>;
}

export interface HistoryEntry {
  id: number | string;
  ts: string;
  profileId: string | null;
  actorPseudo: string | null;
  simulationId: string | null;
  actionLabel: string;
  snapshot: HistorySnapshot;
}

const MAX_STACK = 50;
const DEBOUNCE_MS = 400;

/** Capture full app state snapshot. */
export function captureSnapshot(): HistorySnapshot {
  const sim = useSimulationStore.getState();
  const ver = useVersionStore.getState();
  const theme: ThemeMode = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  return {
    simulation: sim.simulation ? JSON.parse(JSON.stringify(sim.simulation)) : null,
    activeHypothesisId: sim.activeHypothesisId,
    presets: JSON.parse(JSON.stringify(sim.presets)),
    stores: JSON.parse(JSON.stringify(sim.stores)),
    leverConfigs: JSON.parse(JSON.stringify(sim.leverConfigs)),
    globalParams: { ...sim.globalParams },
    showComparison: sim.showComparison,
    showAdmin: sim.showAdmin,
    version: ver.activeVersion,
    theme,
    appliedPresets: JSON.parse(JSON.stringify(sim.appliedPresets ?? {})),
  };
}

// ── Diff → label helpers ─────────────────────────────────────────
const BUDGET_MODE_LABEL: Record<string, string> = {
  automatique: 'budget auto',
  levier: 'budget par levier',
  pctTotal: '% total',
  libre: 'budget libre',
  'v3-levier': 'V3 levier',
};
const OBJECTIVE_LABEL: Record<string, string> = {
  budget: 'objectif budget',
  couverture: 'objectif couverture',
};

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1000) return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

function byId<T extends { id: string }>(arr: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}

function diffLeverField(prev: Lever, next: Lever, hypName: string): string | null {
  if (prev.budget !== next.budget) return `Budget ${next.type} · ${hypName} : ${fmtNum(prev.budget)}€ → ${fmtNum(next.budget)}€`;
  if (prev.coverage !== next.coverage) return `Couverture ${next.type} · ${hypName} : ${fmtNum(prev.coverage)}% → ${fmtNum(next.coverage)}%`;
  if (prev.repetition !== next.repetition) return `Répétition ${next.type} · ${hypName} : ${fmtNum(prev.repetition)} → ${fmtNum(next.repetition)}`;
  if (prev.cpm !== next.cpm) return `CPM ${next.type} · ${hypName} : ${fmtNum(prev.cpm)}€ → ${fmtNum(next.cpm)}€`;
  if (prev.maxCoverage !== next.maxCoverage) return `Couv max ${next.type} · ${hypName} : ${fmtNum(prev.maxCoverage)}% → ${fmtNum(next.maxCoverage)}%`;
  if (prev.startDate !== next.startDate || prev.endDate !== next.endDate) return `Dates ${next.type} · ${hypName} modifiées`;
  if (prev.collapsed !== next.collapsed) return null;
  return null;
}

function diffHypothesis(prev: Hypothesis, next: Hypothesis): string | null {
  if (prev.name !== next.name) return `Hypothèse renommée : « ${prev.name} » → « ${next.name} »`;
  if (prev.objectiveMode !== next.objectiveMode) return `${next.name} → ${OBJECTIVE_LABEL[next.objectiveMode] ?? next.objectiveMode}`;
  if (prev.budgetMode !== next.budgetMode) return `${next.name} → ${BUDGET_MODE_LABEL[next.budgetMode] ?? next.budgetMode}`;
  if (prev.totalBudget !== next.totalBudget) return `Budget total · ${next.name} : ${fmtNum(prev.totalBudget)}€ → ${fmtNum(next.totalBudget)}€`;
  if (prev.maxBudgetPerStore !== next.maxBudgetPerStore) return `Budget max/mag · ${next.name} : ${fmtNum(prev.maxBudgetPerStore)}€ → ${fmtNum(next.maxBudgetPerStore)}€`;
  if (prev.zoneId !== next.zoneId) return `Zone · ${next.name} : ${prev.zoneId} → ${next.zoneId}`;
  if ((prev.storeDistributionMode ?? 'egal') !== (next.storeDistributionMode ?? 'egal')) {
    return `Répartition magasins · ${next.name} : ${prev.storeDistributionMode ?? 'egal'} → ${next.storeDistributionMode ?? 'egal'}`;
  }

  const prevLevers = byId(prev.levers);
  const nextLevers = byId(next.levers);
  for (const [id, l] of nextLevers) {
    if (!prevLevers.has(id)) return `Ajout levier ${l.type} · ${next.name}`;
  }
  for (const [id, l] of prevLevers) {
    if (!nextLevers.has(id)) return `Suppression levier ${l.type} · ${next.name}`;
  }
  for (const [id, nL] of nextLevers) {
    const pL = prevLevers.get(id)!;
    const d = diffLeverField(pL, nL, next.name);
    if (d) return d;
  }
  return null;
}

function diffSimulation(prev: Simulation | null, next: Simulation | null): string | null {
  if (!prev && !next) return null;
  if (!prev && next) return `Création simulation « ${next.name} »`;
  if (prev && !next) return `Simulation fermée`;
  if (!prev || !next) return null;
  if (prev.id !== next.id) return `Changement simulation → « ${next.name} »`;
  if (prev.name !== next.name) return `Simulation renommée : « ${prev.name} » → « ${next.name} »`;
  if (prev.startDate !== next.startDate || prev.endDate !== next.endDate) return `Dates simulation modifiées`;
  if (prev.cpmId !== next.cpmId) return `CPM simulation : ${prev.cpmId} → ${next.cpmId}`;

  const prevHyp = byId(prev.hypotheses);
  const nextHyp = byId(next.hypotheses);
  for (const [id, h] of nextHyp) {
    if (!prevHyp.has(id)) return `Ajout hypothèse « ${h.name} »`;
  }
  for (const [id, h] of prevHyp) {
    if (!nextHyp.has(id)) return `Suppression hypothèse « ${h.name} »`;
  }
  for (const [id, nH] of nextHyp) {
    const pH = prevHyp.get(id)!;
    const d = diffHypothesis(pH, nH);
    if (d) return d;
  }
  return null;
}

function diffGlobalParams(a: GlobalParams, b: GlobalParams): string | null {
  if (a.defaultPopulation !== b.defaultPopulation) return `Population moyenne : ${fmtNum(a.defaultPopulation)} → ${fmtNum(b.defaultPopulation)}`;
  if (a.maxBudgetPerStore !== b.maxBudgetPerStore) return `Budget max/mag (global) : ${fmtNum(a.maxBudgetPerStore)}€ → ${fmtNum(b.maxBudgetPerStore)}€`;
  if (a.typicalBudgetPerStore !== b.typicalBudgetPerStore) return `Budget typique/mag : ${fmtNum(a.typicalBudgetPerStore)}€ → ${fmtNum(b.typicalBudgetPerStore)}€`;
  if (a.maxBudgetSliderPerStore !== b.maxBudgetSliderPerStore) return `Max slider budget/mag : ${fmtNum(a.maxBudgetSliderPerStore)}€ → ${fmtNum(b.maxBudgetSliderPerStore)}€`;
  if (a.maxRepetitionSlider !== b.maxRepetitionSlider) return `Max slider répétition : ${fmtNum(a.maxRepetitionSlider)} → ${fmtNum(b.maxRepetitionSlider)}`;
  return null;
}

function diffAdmin(prev: HistorySnapshot, next: HistorySnapshot): string | null {
  const gp = diffGlobalParams(prev.globalParams, next.globalParams);
  if (gp) return gp;

  const prevP = byId(prev.presets);
  const nextP = byId(next.presets);
  for (const [id, p] of nextP) if (!prevP.has(id)) return `Ajout preset « ${p.name} »`;
  for (const [id, p] of prevP) if (!nextP.has(id)) return `Suppression preset « ${p.name} »`;

  const prevS = byId(prev.stores);
  const nextS = byId(next.stores);
  for (const [id, s] of nextS) if (!prevS.has(id)) return `Ajout magasin « ${s.name} »`;
  for (const [id, s] of prevS) if (!nextS.has(id)) return `Suppression magasin « ${s.name} »`;
  for (const [id, nS] of nextS) {
    const pS = prevS.get(id)!;
    if (pS.name !== nS.name) return `Magasin renommé : « ${pS.name} » → « ${nS.name} »`;
    if (pS.population !== nS.population) return `Population magasin « ${nS.name} » : ${fmtNum(pS.population)} → ${fmtNum(nS.population)}`;
  }

  for (const type of Object.keys(next.leverConfigs)) {
    const pc = prev.leverConfigs[type];
    const nc = next.leverConfigs[type];
    if (!pc || !nc) continue;
    if (pc.defaultCpm !== nc.defaultCpm) return `CPM défaut ${type} : ${fmtNum(pc.defaultCpm)}€ → ${fmtNum(nc.defaultCpm)}€`;
    if (pc.minBudgetPerStore !== nc.minBudgetPerStore) return `Budget min/mag ${type} : ${fmtNum(pc.minBudgetPerStore)}€ → ${fmtNum(nc.minBudgetPerStore)}€`;
    if (pc.maxCoverage !== nc.maxCoverage) return `Couv max ${type} : ${fmtNum(pc.maxCoverage)}% → ${fmtNum(nc.maxCoverage)}%`;
    if (pc.autoBudgetPercent !== nc.autoBudgetPercent) return `Auto % ${type} : ${fmtNum(pc.autoBudgetPercent)}% → ${fmtNum(nc.autoBudgetPercent)}%`;
    if (pc.color !== nc.color) return `Couleur ${type} modifiée`;
    if ((pc.logoUrl ?? null) !== (nc.logoUrl ?? null)) return `Logo ${type} modifié`;
  }
  return null;
}

function diffUI(prev: HistorySnapshot, next: HistorySnapshot): string | null {
  if (prev.version !== next.version) return `Changement version : ${prev.version.toUpperCase()} → ${next.version.toUpperCase()}`;
  if (prev.theme !== next.theme) return `Mode ${next.theme === 'dark' ? 'sombre' : 'clair'}`;
  if (prev.showComparison !== next.showComparison) return next.showComparison ? 'Ouverture comparateur' : 'Fermeture comparateur';
  if (prev.showAdmin !== next.showAdmin) return next.showAdmin ? 'Ouverture admin' : 'Fermeture admin';
  if (prev.activeHypothesisId !== next.activeHypothesisId) {
    const h = next.simulation?.hypotheses.find(x => x.id === next.activeHypothesisId);
    return h ? `Sélection hypothèse « ${h.name} »` : 'Sélection hypothèse';
  }

  // Preset lock changes
  const prevAP = prev.appliedPresets ?? {};
  const nextAP = next.appliedPresets ?? {};
  for (const hypId of Object.keys(nextAP)) {
    if (!prevAP[hypId]) {
      const h = next.simulation?.hypotheses.find(x => x.id === hypId);
      return `Preset « ${nextAP[hypId].name} » appliqué${h ? ` · ${h.name}` : ''}`;
    }
    if (prevAP[hypId].id !== nextAP[hypId].id) {
      const h = next.simulation?.hypotheses.find(x => x.id === hypId);
      return `Changement preset → « ${nextAP[hypId].name} »${h ? ` · ${h.name}` : ''}`;
    }
  }
  for (const hypId of Object.keys(prevAP)) {
    if (!nextAP[hypId]) {
      const h = next.simulation?.hypotheses.find(x => x.id === hypId);
      return `Déverrouillage preset${h ? ` · ${h.name}` : ''}`;
    }
  }
  return null;
}

export function diffLabel(prev: HistorySnapshot | null, next: HistorySnapshot): string {
  if (!prev) return 'État initial';
  return (
    diffSimulation(prev.simulation, next.simulation)
    ?? diffUI(prev, next)
    ?? diffAdmin(prev, next)
    ?? 'Modification'
  );
}

function snapshotsEqual(a: HistorySnapshot, b: HistorySnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Store ────────────────────────────────────────────────────────
interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  all: HistoryEntry[];  // full log from DB (admin tab), desc order
  isRestoring: boolean;
  lastSnapshot: HistorySnapshot | null;
  initialized: boolean;

  init: () => Promise<void>;
  schedulePush: () => void;
  flushPending: () => void;
  commit: (label?: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  restore: (snapshot: HistorySnapshot) => Promise<void>;
  jumpTo: (entryId: number | string) => Promise<void>;
  fetchAll: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  all: [],
  isRestoring: false,
  lastSnapshot: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    const profileId = useProfileStore.getState().activeProfileId;
    try {
      const rows = await api.getHistory(profileId, 500);
      // Rows come DESC. Build `past` ascending, keep last MAX_STACK filtered to current profile.
      const asc = [...rows].reverse();
      const seed = captureSnapshot();
      const past: HistoryEntry[] = asc.slice(-MAX_STACK).map(r => ({
        id: r.id,
        ts: r.ts,
        profileId: r.profileId,
        actorPseudo: r.actorPseudo,
        simulationId: r.simulationId,
        actionLabel: r.actionLabel,
        snapshot: r.snapshot as HistorySnapshot,
      }));
      // Ensure current state is the tip of past (push if different)
      const last = past[past.length - 1];
      if (!last || !snapshotsEqual(last.snapshot, seed)) {
        past.push({
          id: `local-${Date.now()}`,
          ts: new Date().toISOString(),
          profileId,
          actorPseudo: getActiveProfile(useProfileStore.getState().profiles, profileId)?.pseudo ?? null,
          simulationId: seed.simulation?.id ?? null,
          actionLabel: 'État initial',
          snapshot: seed,
        });
      }
      const allEntries: HistoryEntry[] = rows.map(r => ({
        id: r.id,
        ts: r.ts,
        profileId: r.profileId,
        actorPseudo: r.actorPseudo,
        simulationId: r.simulationId,
        actionLabel: r.actionLabel,
        snapshot: r.snapshot as HistorySnapshot,
      }));
      set({ past, future: [], all: allEntries, lastSnapshot: seed, initialized: true });
    } catch (err) {
      console.warn('history init failed', err);
      const seed = captureSnapshot();
      set({
        past: [{
          id: `local-${Date.now()}`,
          ts: new Date().toISOString(),
          profileId: null,
          actorPseudo: null,
          simulationId: seed.simulation?.id ?? null,
          actionLabel: 'État initial',
          snapshot: seed,
        }],
        future: [],
        all: [],
        lastSnapshot: seed,
        initialized: true,
      });
    }
  },

  schedulePush: () => {
    if (get().isRestoring) return;
    if (!get().initialized) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      void get().commit();
    }, DEBOUNCE_MS);
  },

  flushPending: () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
      void get().commit();
    }
  },

  commit: async (explicitLabel) => {
    const state = get();
    if (state.isRestoring) return;
    const snapshot = captureSnapshot();
    if (state.lastSnapshot && snapshotsEqual(state.lastSnapshot, snapshot)) return;
    const label = explicitLabel ?? diffLabel(state.lastSnapshot, snapshot);

    const profileId = useProfileStore.getState().activeProfileId;
    const actorPseudo = getActiveProfile(useProfileStore.getState().profiles, profileId)?.pseudo ?? null;
    const simulationId = snapshot.simulation?.id ?? null;

    const localEntry: HistoryEntry = {
      id: `local-${Date.now()}`,
      ts: new Date().toISOString(),
      profileId,
      actorPseudo,
      simulationId,
      actionLabel: label,
      snapshot,
    };

    const past = [...state.past, localEntry].slice(-MAX_STACK);
    set({ past, future: [], lastSnapshot: snapshot });

    try {
      const resp = await api.postHistory({ profileId, actorPseudo, simulationId, actionLabel: label, snapshot });
      set(s => ({
        past: s.past.map(e => (e === localEntry ? { ...e, id: resp.id, ts: resp.ts } : e)),
        all: [{ ...localEntry, id: resp.id, ts: resp.ts }, ...s.all].slice(0, 500),
      }));
    } catch (err) {
      console.warn('history post failed', err);
    }
  },

  restore: async (snapshot) => {
    set({ isRestoring: true });
    try {
      // 1) Version
      useVersionStore.setState({ activeVersion: snapshot.version });
      // 2) Theme
      applyTheme(snapshot.theme);
      // 3) Simulation store (full replace of admin + simulation)
      useSimulationStore.setState({
        simulation: snapshot.simulation ? JSON.parse(JSON.stringify(snapshot.simulation)) : null,
        activeHypothesisId: snapshot.activeHypothesisId,
        presets: JSON.parse(JSON.stringify(snapshot.presets)),
        stores: JSON.parse(JSON.stringify(snapshot.stores)),
        leverConfigs: JSON.parse(JSON.stringify(snapshot.leverConfigs)),
        globalParams: { ...snapshot.globalParams },
        showComparison: snapshot.showComparison,
        showAdmin: snapshot.showAdmin,
        appliedPresets: JSON.parse(JSON.stringify(snapshot.appliedPresets ?? {})),
      });
      // 4) Backend sync: rebuild simulation atomically
      const sim = snapshot.simulation;
      if (sim) {
        const profileId = useProfileStore.getState().activeProfileId;
        try {
          await api.replaceSimulation(sim.id, {
            name: sim.name,
            startDate: sim.startDate,
            endDate: sim.endDate,
            profileId,
            hypotheses: sim.hypotheses as Array<Hypothesis & { levers: Lever[] }>,
          });
        } catch (err) {
          console.warn('replaceSimulation failed', err);
        }
      }
      // 5) Update globalParams via existing endpoint (fire-and-forget)
      try { await api.putGlobalParams(snapshot.globalParams); } catch {}

      // lastSnapshot reflects the restored state
      set({ lastSnapshot: captureSnapshot() });
    } finally {
      // Release guard on next tick so pending subscribers don't re-trigger
      setTimeout(() => set({ isRestoring: false }), 0);
    }
  },

  undo: async () => {
    get().flushPending();
    const state = get();
    if (state.past.length < 2) return;
    const current = state.past[state.past.length - 1];
    const target = state.past[state.past.length - 2];
    set({
      past: state.past.slice(0, -1),
      future: [...state.future, current],
    });
    await get().restore(target.snapshot);
  },

  redo: async () => {
    get().flushPending();
    const state = get();
    if (state.future.length === 0) return;
    const target = state.future[state.future.length - 1];
    set({
      future: state.future.slice(0, -1),
      past: [...state.past, target],
    });
    await get().restore(target.snapshot);
  },

  jumpTo: async (entryId) => {
    get().flushPending();
    const state = get();
    const entry = state.all.find(e => e.id === entryId);
    if (!entry) return;
    // Push current state onto past as a "pre-jump" marker, then restore
    const current = captureSnapshot();
    const profileId = useProfileStore.getState().activeProfileId;
    const actorPseudo = getActiveProfile(useProfileStore.getState().profiles, profileId)?.pseudo ?? null;
    const preJump: HistoryEntry = {
      id: `local-${Date.now()}`,
      ts: new Date().toISOString(),
      profileId,
      actorPseudo,
      simulationId: current.simulation?.id ?? null,
      actionLabel: `Avant restauration (${entry.actionLabel})`,
      snapshot: current,
    };
    const newEntry: HistoryEntry = { ...entry, id: `local-${Date.now()}-r`, actionLabel: `Restauration : ${entry.actionLabel}` };
    set({
      past: [...state.past, preJump, newEntry].slice(-MAX_STACK),
      future: [],
    });
    await get().restore(entry.snapshot);
  },

  fetchAll: async () => {
    try {
      const rows = await api.getHistory(null, 500);
      set({ all: rows.map(r => ({
        id: r.id,
        ts: r.ts,
        profileId: r.profileId,
        actorPseudo: r.actorPseudo,
        simulationId: r.simulationId,
        actionLabel: r.actionLabel,
        snapshot: r.snapshot as HistorySnapshot,
      })) });
    } catch (err) {
      console.warn('fetchAll history failed', err);
    }
  },

  canUndo: () => get().past.length > 1,
  canRedo: () => get().future.length > 0,
}));
