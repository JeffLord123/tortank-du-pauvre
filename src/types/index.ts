export type LeverType = string;

export type ObjectiveMode = 'budget' | 'couverture';
export type BudgetMode = 'automatique' | 'levier' | 'pctTotal' | 'libre' | 'v3-levier';

export type ZoneId = 'zone1' | 'zone2' | 'zone3' | 'zone4';

/** Comment le budget total d’hypothèse est ventilé entre les points de vente (récap / tableaux). */
export type StoreDistributionMode = 'egal' | 'population' | 'pondere';

export interface Lever {
  id: string;
  type: LeverType;
  startDate: string;
  endDate: string;
  cpm: number;
  /** Prix d'achat CPM (€). Sert au calcul de marge. */
  purchaseCpm: number;
  minBudgetPerStore: number;
  budget: number;
  budgetPercent: number;
  repetition: number;
  coverage: number;
  maxCoverage: number;
  impressions: number;
  collapsed: boolean;
  /**
   * Si `false`, le levier reste dans la liste mais est exclu du récap, des totaux
   * et des agrégats (couverture dédup., ventilation magasins, etc.). `undefined` = inclus.
   */
  includedInHypothesis?: boolean;
}

/** Levier pris en compte dans les calculs d’hypothèse (récap, totaux, comparaisons). */
export function isLeverIncludedInHypothesis(l: Lever): boolean {
  return l.includedInHypothesis !== false;
}

export function leversIncludedInHypothesis(levers: Lever[]): Lever[] {
  return levers.filter(isLeverIncludedInHypothesis);
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
  /** Prestations additionnelles propres à cette hypothèse. */
  prestations?: Prestation[];
  collapsed: boolean;
  zoneId: ZoneId;
  /** Rétrocommission appliquée sur le budget total (en %). */
  retrocommissionPercent?: number;
  /** Répartition du budget total entre magasins (défaut : égal). */
  storeDistributionMode?: StoreDistributionMode;
}

export interface Prestation {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  productionCost: number;
  /** Unit price in €. Total billed = quantity * price unless offered. */
  price: number;
  offered: boolean;
  /** Ligne issue d’un preset appliqué (non supprimable tant que le verrou est actif). */
  fromPreset?: boolean;
}

export interface Simulation {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cpmId: string;
  hypotheses: Hypothesis[];
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
  levers: (Omit<Lever, 'id' | 'collapsed' | 'purchaseCpm'> & { purchaseCpm?: number })[];
  /** Prestations enregistrées dans le preset (appliquées sur l’hypothèse avec fromPreset: true). */
  prestations?: Omit<Prestation, 'id' | 'fromPreset'>[];
  /** Défaut `admin` si absent (rétrocompat). */
  scope?: PresetScope;
  /** Si `scope === 'user'`, identifiant du profil créateur. */
  ownerProfileId?: string | null;
}

export interface Store {
  id: string;
  name: string;
  /** Population zone 1 (< 10 min). Aussi utilisé comme valeur par défaut pour la répartition par population. */
  population: number;
  /** Population zone 1 : < 10 min en voiture. */
  pop10min: number;
  /** Population zone 2 : < 20 min en voiture. */
  pop20min: number;
  /** Population zone 3 : < 30 min en voiture. */
  pop30min: number;
  /** Population zone 4 : Zone custom (ex. zone CRM). */
  popCustom: number;
  /** Poids en % pour le mode « pondéré » (Admin → magasins). La somme peut différer de 100 : normalisation à l’application. */
  budgetWeightPercent?: number;
}

export interface LeverConfig {
  type: LeverType;
  /** Libellé d'affichage (fallback = type). */
  label?: string;
  /** Famille (ex : "Display Mobile", "Meta", "CTV") pour regrouper dans l'UI. */
  family?: string;
  defaultCpm: number;
  /** Prix d'achat CPM par défaut (€). Sert au calcul de marge. */
  purchaseCpm: number;
  minBudgetPerStore: number;
  maxCoverage: number;
  color: string;
  icon: string;
  autoBudgetPercent: number;
  /** Masquer ce levier dans le sélecteur de leviers. */
  hidden?: boolean;
  /** Image (URL, `/levers/…` ou data URL). `undefined`/`null` → logo par défaut du levier si défini ; `''` → icône Lucide uniquement. */
  logoUrl?: string | null;
}

export interface GlobalParams {
  defaultPopulation: number;
  maxBudgetPerStore: number;
  typicalBudgetPerStore: number;
  maxBudgetSliderPerStore: number;
  maxRepetitionSlider: number;
}

export type AdminTab = 'presets' | 'levers' | 'stores' | 'params' | 'importexport' | 'history';

export interface UserProfile {
  id: string;
  pseudo: string;
  isAdmin: boolean;
}
