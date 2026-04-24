export type TourStep = {
  id: string;
  title: string;
  body: string;
};

export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: 'tour-header',
    title: 'Simulation',
    body:
      'Ici vous pilotez le nom de l’opération, la période (dates) et le mode CPM. Ces paramètres cadrent tout le calcul des budgets et impressions.',
  },
  {
    id: 'tour-compare',
    title: 'Comparer les hypothèses',
    body:
      'Passez en mode comparaison pour juxtaposer plusieurs hypothèses côte à côte : budgets, couvertures, répétitions et répartition par levier.',
  },
  {
    id: 'tour-history',
    title: 'Annuler / refaire',
    body:
      'Revenez en arrière ou réappliquez une action grâce à l’historique (raccourcis Ctrl+Z / Ctrl+Y ou ⌘Z / ⌘Y sur Mac).',
  },
  {
    id: 'tour-settings',
    title: 'Paramètres',
    body:
      'Profil utilisateur, thème clair/sombre, version de l’outil (V1 / V2 / V3) et accès administration (magasins, presets globaux, logos…).',
  },
  {
    id: 'tour-hypothesis',
    title: 'Hypothèses',
    body:
      'Chaque carte est une hypothèse : renommez-la, dupliquez-la, enregistrez-la en preset ou supprimez-la. Le point coloré indique l’hypothèse active.',
  },
  {
    id: 'tour-zone',
    title: 'Zone & magasins',
    body:
      'Choisissez la zone de chalandise (population de référence) et la répartition du budget entre magasins : égal, au prorata population ou pondéré.',
  },
  {
    id: 'tour-budget',
    title: 'Budget & objectifs',
    body:
      'Définissez l’objectif (budget ou couverture selon la version), le mode de répartition, puis chargez un preset en un clic pour reprendre un scénario enregistré.',
  },
  {
    id: 'tour-levers',
    title: 'Leviers média',
    body:
      'Ajoutez des leviers (display, social, vidéo, etc.), ajustez couverture, répétition et budgets. Chaque levier contribue au scénario global.',
  },
  {
    id: 'tour-prestations',
    title: 'Prestations',
    body:
      'Ajoutez des lignes hors média (production, opérations…) avec quantités et prix. Elles s’intègrent au total et au calcul de marge.',
  },
  {
    id: 'tour-summary',
    title: 'Récap & marge',
    body:
      'Le panneau de droite synthétise KPIs, graphiques, tableaux magasins / leviers et le bloc marge (rétrocommission, seuils). En mode comparaison, il affiche le rapport comparatif.',
  },
];
