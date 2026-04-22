export type LeverType = 'Display' | 'Desktop' | 'Meta' | 'Google' | 'Youtube' | 'Snap' | 'Pinterest' | 'TikTok';

export type ObjectiveMode = 'budget' | 'couverture';
export type BudgetMode = 'automatique' | 'levier' | 'pctTotal' | 'libre' | 'v3-levier';

export type ZoneId = 'zone1' | 'zone2' | 'zone3';

export interface Lever {
  id: string;
  type: LeverType;
  startDate: string;
  endDate: string;
  cpm: number;
  minBudgetPerStore: number;
  budget: number;
  budgetPercent: number;
  repetition: number;
  coverage: number;
  maxCoverage: number;
  impressions: number;
  collapsed: boolean;
}

export interface Hypothesis {
  id: string;
  name: string;
  maxBudgetPerStore: number;
  objectiveMode: ObjectiveMode;
  budgetMode: BudgetMode;
  totalBudget: number;
  budgetsByMode: Partial<Record<BudgetMode, number>>;
  levers: Lever[];
  collapsed: boolean;
  zoneId: ZoneId;
}

export interface Prestation {
  id: string;
  name: string;
  quantity: number;
  productionCost: number;
  /** Unit price in €. Total billed = quantity * price unless offered. */
  price: number;
  offered: boolean;
}

export interface Simulation {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cpmId: string;
  hypotheses: Hypothesis[];
  prestations?: Prestation[];
}

/** Presets globaux (admin) vs presets personnels rattachés à un profil. */
export type PresetScope = 'admin' | 'user';

export interface Preset {
  id: string;
  name: string;
  description: string;
  objectiveMode: ObjectiveMode;
  budgetMode: BudgetMode;
  /** Budget total associé au preset (appliqué à l'hypothèse cible lors de l'application). */
  totalBudget?: number;
  /** Budget max par point de vente associé au preset. */
  maxBudgetPerStore?: number;
  levers: Omit<Lever, 'id' | 'collapsed'>[];
  /** Défaut `admin` si absent (rétrocompat). */
  scope?: PresetScope;
  /** Si `scope === 'user'`, identifiant du profil créateur. */
  ownerProfileId?: string | null;
}

export interface Store {
  id: string;
  name: string;
  population: number;
}

export interface LeverConfig {
  type: LeverType;
  defaultCpm: number;
  minBudgetPerStore: number;
  maxCoverage: number;
  color: string;
  icon: string;
  autoBudgetPercent: number;
  /** Image (URL, `/levers/…` ou data URL). `undefined`/`null` → logo par défaut du levier si défini ; `''` → icône Lucide uniquement. */
  logoUrl?: string | null;
}

export interface GlobalParams {
  defaultPopulation: number;
  maxBudgetPerStore: number;
  defaultTotalBudget: number;
  maxBudgetSlider: number;
  maxRepetitionSlider: number;
}

export type AdminTab = 'presets' | 'levers' | 'stores' | 'params' | 'importexport' | 'history';

export interface UserProfile {
  id: string;
  pseudo: string;
  isAdmin: boolean;
}
