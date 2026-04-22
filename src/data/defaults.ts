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
  Display:   { type: 'Display',   defaultCpm: 4.50, minBudgetPerStore: 120, maxCoverage: 65, color: '#00e5a0', icon: 'Monitor',       autoBudgetPercent: 20 },
  Desktop:   { type: 'Desktop',   defaultCpm: 5.00, minBudgetPerStore: 100, maxCoverage: 55, color: '#00b4d8', icon: 'Laptop',        autoBudgetPercent: 10 },
  Meta:      { type: 'Meta',      defaultCpm: 6.20, minBudgetPerStore: 150, maxCoverage: 75, color: '#667eea', icon: 'Facebook',      autoBudgetPercent: 25, logoUrl: '/levers/meta.svg' },
  Google:    { type: 'Google',    defaultCpm: 7.80, minBudgetPerStore: 200, maxCoverage: 70, color: '#f59e0b', icon: 'Search',        autoBudgetPercent: 20, logoUrl: '/levers/google.svg' },
  Youtube:   { type: 'Youtube',   defaultCpm: 8.50, minBudgetPerStore: 250, maxCoverage: 60, color: '#ef4444', icon: 'Youtube',       autoBudgetPercent: 10, logoUrl: '/levers/youtube.svg' },
  Snap:      { type: 'Snap',      defaultCpm: 5.50, minBudgetPerStore: 100, maxCoverage: 45, color: '#fbbf24', icon: 'Ghost',         autoBudgetPercent: 5,  logoUrl: '/levers/snap.svg' },
  Pinterest: { type: 'Pinterest', defaultCpm: 3.80, minBudgetPerStore:  80, maxCoverage: 35, color: '#ec4899', icon: 'Pin',           autoBudgetPercent: 5,  logoUrl: '/levers/pinterest.svg' },
  TikTok:    { type: 'TikTok',    defaultCpm: 6.00, minBudgetPerStore: 130, maxCoverage: 55, color: '#06b6d4', icon: 'Music',         autoBudgetPercent: 5,  logoUrl: '/levers/tiktok.svg' },
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
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, minBudgetPerStore: 150, budget: 0, budgetPercent: 60, repetition: 3, coverage: 40, maxCoverage: 75, impressions: 0 },
      { type: 'Google', startDate: '', endDate: '', cpm: 7.80, minBudgetPerStore: 200, budget: 0, budgetPercent: 40, repetition: 2, coverage: 30, maxCoverage: 70, impressions: 0 },
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
      { type: 'Display', startDate: '', endDate: '', cpm: 4.50, minBudgetPerStore: 120, budget: 0, budgetPercent: 20, repetition: 3, coverage: 35, maxCoverage: 65, impressions: 0 },
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, minBudgetPerStore: 150, budget: 0, budgetPercent: 25, repetition: 3, coverage: 45, maxCoverage: 75, impressions: 0 },
      { type: 'Google', startDate: '', endDate: '', cpm: 7.80, minBudgetPerStore: 200, budget: 0, budgetPercent: 25, repetition: 2, coverage: 35, maxCoverage: 70, impressions: 0 },
      { type: 'Youtube', startDate: '', endDate: '', cpm: 8.50, minBudgetPerStore: 250, budget: 0, budgetPercent: 20, repetition: 2, coverage: 30, maxCoverage: 60, impressions: 0 },
      { type: 'Snap', startDate: '', endDate: '', cpm: 5.50, minBudgetPerStore: 100, budget: 0, budgetPercent: 10, repetition: 2, coverage: 20, maxCoverage: 45, impressions: 0 },
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
      { type: 'Meta', startDate: '', endDate: '', cpm: 6.20, minBudgetPerStore: 150, budget: 0, budgetPercent: 30, repetition: 4, coverage: 50, maxCoverage: 75, impressions: 0 },
      { type: 'TikTok', startDate: '', endDate: '', cpm: 6.00, minBudgetPerStore: 130, budget: 0, budgetPercent: 30, repetition: 3, coverage: 35, maxCoverage: 55, impressions: 0 },
      { type: 'Snap', startDate: '', endDate: '', cpm: 5.50, minBudgetPerStore: 100, budget: 0, budgetPercent: 20, repetition: 3, coverage: 25, maxCoverage: 45, impressions: 0 },
      { type: 'Pinterest', startDate: '', endDate: '', cpm: 3.80, minBudgetPerStore: 80, budget: 0, budgetPercent: 20, repetition: 2, coverage: 20, maxCoverage: 35, impressions: 0 },
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
