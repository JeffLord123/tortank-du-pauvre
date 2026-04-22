import type { LeverConfig, Preset, Store, ZoneId } from '../types';

export const ZONES: { id: ZoneId; label: string; multiplier: number }[] = [
  { id: 'zone1', label: 'Moins de 10 min en voiture', multiplier: 1 },
  { id: 'zone2', label: 'Moins de 20 min en voiture', multiplier: 2 },
  { id: 'zone3', label: 'Moins de 30 min en voiture', multiplier: 3 },
];

export function getZoneMultiplier(zoneId: ZoneId | undefined): number {
  return ZONES.find(z => z.id === zoneId)?.multiplier ?? 1;
}

export const LEVER_CONFIGS: Record<string, LeverConfig> = {
  // ── Legacy ────────────────────────────────────────────────────
  Display:   { type: 'Display',   label: 'Display',   family: 'Legacy',  defaultCpm: 4.50, purchaseCpm: 0, minBudgetPerStore: 120, maxCoverage: 65, color: '#00e5a0', icon: 'Monitor', autoBudgetPercent: 20 },
  Desktop:   { type: 'Desktop',   label: 'Desktop',   family: 'Legacy',  defaultCpm: 5.00, purchaseCpm: 0, minBudgetPerStore: 100, maxCoverage: 55, color: '#00b4d8', icon: 'Laptop',  autoBudgetPercent: 10 },
  Meta:      { type: 'Meta',      label: 'Meta',      family: 'Legacy',  defaultCpm: 6.20, purchaseCpm: 0, minBudgetPerStore: 150, maxCoverage: 75, color: '#667eea', icon: 'Facebook',autoBudgetPercent: 25, logoUrl: '/levers/meta.svg' },
  Google:    { type: 'Google',    label: 'Google',    family: 'Legacy',  defaultCpm: 7.80, purchaseCpm: 0, minBudgetPerStore: 200, maxCoverage: 70, color: '#f59e0b', icon: 'Search',  autoBudgetPercent: 20, logoUrl: '/levers/google.svg' },
  Youtube:   { type: 'Youtube',   label: 'Youtube',   family: 'Legacy',  defaultCpm: 8.50, purchaseCpm: 0, minBudgetPerStore: 250, maxCoverage: 60, color: '#ef4444', icon: 'Youtube', autoBudgetPercent: 10, logoUrl: '/levers/youtube.svg' },
  Snap:      { type: 'Snap',      label: 'Snap',      family: 'Legacy',  defaultCpm: 5.50, purchaseCpm: 0, minBudgetPerStore: 100, maxCoverage: 45, color: '#fbbf24', icon: 'Ghost',   autoBudgetPercent: 5,  logoUrl: '/levers/snap.svg' },
  Pinterest: { type: 'Pinterest', label: 'Pinterest', family: 'Legacy',  defaultCpm: 3.80, purchaseCpm: 0, minBudgetPerStore:  80, maxCoverage: 35, color: '#ec4899', icon: 'Pin',     autoBudgetPercent: 5,  logoUrl: '/levers/pinterest.svg' },
  TikTok:    { type: 'TikTok',    label: 'TikTok',    family: 'Legacy',  defaultCpm: 6.00, purchaseCpm: 0, minBudgetPerStore: 130, maxCoverage: 55, color: '#06b6d4', icon: 'Music',   autoBudgetPercent: 5,  logoUrl: '/levers/tiktok.svg' },

  // ── Ratecard Mobsuccess (CPM Fixe) ─────────────────────────────
  // Display Mobile
  'DisplayMobile-Interstitiel': { type: 'DisplayMobile-Interstitiel', label: 'Interstitiel',     family: 'Display Mobile', defaultCpm: 11.00, purchaseCpm: 5.00,  minBudgetPerStore: 120, maxCoverage: 65, color: '#00e5a0', icon: 'Monitor', autoBudgetPercent: 15 },
  'DisplayMobile-Pave':         { type: 'DisplayMobile-Pave',         label: 'Pavé',             family: 'Display Mobile', defaultCpm: 5.00,  purchaseCpm: 2.00,  minBudgetPerStore: 120, maxCoverage: 65, color: '#00c48c', icon: 'Monitor', autoBudgetPercent: 5  },
  'DisplayMobile-Banner':       { type: 'DisplayMobile-Banner',       label: 'Banner',           family: 'Display Mobile', defaultCpm: 2.50,  purchaseCpm: 1.00,  minBudgetPerStore: 120, maxCoverage: 65, color: '#00a775', icon: 'Monitor', autoBudgetPercent: 5  },
  'DisplayMobile-Mixed':        { type: 'DisplayMobile-Mixed',        label: 'Mixed format',     family: 'Display Mobile', defaultCpm: 9.00,  purchaseCpm: 3.25,  minBudgetPerStore: 120, maxCoverage: 65, color: '#00e5a0', icon: 'Monitor', autoBudgetPercent: 15 },

  // Meta
  'Meta-Reach':  { type: 'Meta-Reach',  label: 'Reach',        family: 'Meta', defaultCpm: 2.00, purchaseCpm: 0.80, minBudgetPerStore: 150, maxCoverage: 75, color: '#667eea', icon: 'Facebook', autoBudgetPercent: 15, logoUrl: '/levers/meta.svg' },
  'Meta-Trafic': { type: 'Meta-Trafic', label: 'Trafic',       family: 'Meta', defaultCpm: 5.00, purchaseCpm: 3.00, minBudgetPerStore: 150, maxCoverage: 75, color: '#7c8eec', icon: 'Facebook', autoBudgetPercent: 5,  logoUrl: '/levers/meta.svg' },
  'Meta-Mixed':  { type: 'Meta-Mixed',  label: 'Mixed format', family: 'Meta', defaultCpm: 4.00, purchaseCpm: 1.90, minBudgetPerStore: 150, maxCoverage: 75, color: '#667eea', icon: 'Facebook', autoBudgetPercent: 15, logoUrl: '/levers/meta.svg' },

  // CTV
  'CTV-Mixed':            { type: 'CTV-Mixed',            label: 'Mixed format',               family: 'CTV', defaultCpm: 16.00, purchaseCpm: 9.33,  minBudgetPerStore: 300, maxCoverage: 55, color: '#a855f7', icon: 'Tv', autoBudgetPercent: 10 },
  'CTV-BroadcasterOnly':  { type: 'CTV-BroadcasterOnly',  label: 'Mixed Broadcaster only',     family: 'CTV', defaultCpm: 20.00, purchaseCpm: 12.00, minBudgetPerStore: 300, maxCoverage: 55, color: '#c084fc', icon: 'Tv', autoBudgetPercent: 5  },

  // VOL (hors CTV)
  'VOL-Mixed': { type: 'VOL-Mixed', label: 'Mixed format', family: 'VOL', defaultCpm: 10.00, purchaseCpm: 4.50, minBudgetPerStore: 200, maxCoverage: 60, color: '#ef4444', icon: 'Youtube', autoBudgetPercent: 10, logoUrl: '/levers/youtube.svg' },

  // DOOH
  'DOOH-Mixed': { type: 'DOOH-Mixed', label: 'Mixed format', family: 'DOOH', defaultCpm: 22.00, purchaseCpm: 10.00, minBudgetPerStore: 500, maxCoverage: 50, color: '#f59e0b', icon: 'Monitor', autoBudgetPercent: 5 },

  // Google
  'Google-PMAX':      { type: 'Google-PMAX',      label: 'PMAX',       family: 'Google', defaultCpm: 3.00, purchaseCpm: 1.60, minBudgetPerStore: 200, maxCoverage: 70, color: '#f59e0b', icon: 'Search', autoBudgetPercent: 10, logoUrl: '/levers/google.svg' },
  'Google-DemandGen': { type: 'Google-DemandGen', label: 'Demand Gen', family: 'Google', defaultCpm: 3.50, purchaseCpm: 1.90, minBudgetPerStore: 200, maxCoverage: 70, color: '#fbbf24', icon: 'Search', autoBudgetPercent: 10, logoUrl: '/levers/google.svg' },

  // Audio
  'Audio-Mixed': { type: 'Audio-Mixed', label: 'Mixed format', family: 'Audio', defaultCpm: 20.00, purchaseCpm: 10.00, minBudgetPerStore: 200, maxCoverage: 40, color: '#06b6d4', icon: 'Music', autoBudgetPercent: 5 },
};

export const LEVER_TYPES = Object.keys(LEVER_CONFIGS) as (keyof typeof LEVER_CONFIGS)[];

export const DEFAULT_STORES: Store[] = [
  { id: 's1', name: 'Paris Rivoli', population: 250000 },
  { id: 's2', name: 'Lyon Part-Dieu', population: 180000 },
  { id: 's3', name: 'Marseille Prado', population: 160000 },
  { id: 's4', name: 'Bordeaux Sainte-Catherine', population: 140000 },
  { id: 's5', name: 'Lille Grand Place', population: 130000 },
  { id: 's6', name: 'Toulouse Capitole', population: 120000 },
  { id: 's7', name: 'Nice Masséna', population: 110000 },
  { id: 's8', name: 'Nantes Commerce', population: 105000 },
  { id: 's9', name: 'Strasbourg Kléber', population: 100000 },
  { id: 's10', name: 'Rennes République', population: 95000 },
];

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'preset-starter',
    scope: 'admin',
    ownerProfileId: null,
    name: 'Starter',
    description: 'Configuration basique avec Meta et Google pour démarrer rapidement',
    objectiveMode: 'budget',
    budgetMode: 'automatique',
    totalBudget: 200000,
    maxBudgetPerStore: 50000,
    levers: [
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, purchaseCpm: 0, minBudgetPerStore: 150, budget: 0, budgetPercent: 60, repetition: 3, coverage: 40, maxCoverage: 75, impressions: 0 },
      { type: 'Google', startDate: '', endDate: '', cpm: 7.80, purchaseCpm: 0, minBudgetPerStore: 200, budget: 0, budgetPercent: 40, repetition: 2, coverage: 30, maxCoverage: 70, impressions: 0 },
    ],
  },
  {
    id: 'preset-multi',
    scope: 'admin',
    ownerProfileId: null,
    name: 'Multi-canal',
    description: 'Couverture maximale avec 5 leviers complémentaires',
    objectiveMode: 'budget',
    budgetMode: 'automatique',
    totalBudget: 500000,
    maxBudgetPerStore: 50000,
    levers: [
      { type: 'Display', startDate: '', endDate: '', cpm: 4.50, purchaseCpm: 0, minBudgetPerStore: 120, budget: 0, budgetPercent: 20, repetition: 3, coverage: 35, maxCoverage: 65, impressions: 0 },
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, purchaseCpm: 0, minBudgetPerStore: 150, budget: 0, budgetPercent: 25, repetition: 3, coverage: 45, maxCoverage: 75, impressions: 0 },
      { type: 'Google', startDate: '', endDate: '', cpm: 7.80, purchaseCpm: 0, minBudgetPerStore: 200, budget: 0, budgetPercent: 25, repetition: 2, coverage: 35, maxCoverage: 70, impressions: 0 },
      { type: 'Youtube', startDate: '', endDate: '', cpm: 8.50, purchaseCpm: 0, minBudgetPerStore: 250, budget: 0, budgetPercent: 20, repetition: 2, coverage: 30, maxCoverage: 60, impressions: 0 },
      { type: 'Snap', startDate: '', endDate: '', cpm: 5.50, purchaseCpm: 0, minBudgetPerStore: 100, budget: 0, budgetPercent: 10, repetition: 2, coverage: 20, maxCoverage: 45, impressions: 0 },
    ],
  },
  {
    id: 'preset-social',
    scope: 'admin',
    ownerProfileId: null,
    name: 'Social First',
    description: 'Focus réseaux sociaux pour cibler les 18-35 ans',
    objectiveMode: 'couverture',
    budgetMode: 'automatique',
    totalBudget: 300000,
    maxBudgetPerStore: 50000,
    levers: [
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, purchaseCpm: 0, minBudgetPerStore: 150, budget: 0, budgetPercent: 30, repetition: 4, coverage: 50, maxCoverage: 75, impressions: 0 },
      { type: 'TikTok', startDate: '', endDate: '', cpm: 6.00, purchaseCpm: 0, minBudgetPerStore: 130, budget: 0, budgetPercent: 30, repetition: 3, coverage: 35, maxCoverage: 55, impressions: 0 },
      { type: 'Snap', startDate: '', endDate: '', cpm: 5.50, purchaseCpm: 0, minBudgetPerStore: 100, budget: 0, budgetPercent: 20, repetition: 3, coverage: 25, maxCoverage: 45, impressions: 0 },
      { type: 'Pinterest', startDate: '', endDate: '', cpm: 3.80, purchaseCpm: 0, minBudgetPerStore: 80, budget: 0, budgetPercent: 20, repetition: 2, coverage: 20, maxCoverage: 35, impressions: 0 },
    ],
  },
];

// Simulated population per store for coverage calculations
export const STORE_POPULATIONS: Record<string, number> = {
  's1': 250000,
  's2': 180000,
  's3': 160000,
  's4': 140000,
  's5': 130000,
  's6': 120000,
  's7': 110000,
  's8': 105000,
  's9': 100000,
  's10': 95000,
};

export const MAX_BUDGET_PER_STORE = 5000;

/**
 * Seuils de marge autorisés en autonomie commerciale selon Notion « Mobsuccess – Ratecard CPM Fixe ».
 * Sous le seuil applicable → validation Thomas / Nico N / Nico G nécessaire.
 */
export const MARGIN_THRESHOLDS: { maxBudget: number; minMarginPercent: number; label: string }[] = [
  { maxBudget: 20000,         minMarginPercent: 40,   label: 'campagne < 20 k€' },
  { maxBudget: 60000,         minMarginPercent: 37.5, label: 'campagne 20–60 k€' },
  { maxBudget: Infinity,      minMarginPercent: 35,   label: 'campagne > 60 k€' },
];

export function getMarginThreshold(totalBudget: number) {
  return MARGIN_THRESHOLDS.find(t => totalBudget < t.maxBudget) ?? MARGIN_THRESHOLDS[MARGIN_THRESHOLDS.length - 1];
}
