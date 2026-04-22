export interface PrestationPreset {
  name: string;
  productionCost: number;
  /** Unit price in € — 0 means "sur devis" / custom (user edits manually). */
  price: number;
  custom?: boolean;
}

export interface PrestationPresetGroup {
  label: string;
  items: PrestationPreset[];
}

export const PRESTATION_PRESETS: PrestationPresetGroup[] = [
  {
    label: 'Scoring & Etude',
    items: [
      { name: 'Scoring Social Media - 1 réseau', productionCost: 1000, price: 2500 },
      { name: 'Scoring Social Media - 2 réseaux', productionCost: 1400, price: 3500 },
      { name: 'Scoring Social Media - 3 réseaux', productionCost: 1800, price: 4500 },
      { name: 'Scoring VGEO', productionCost: 1800, price: 4500 },
      { name: 'Scoring Octopus (pack 10 vidéos)', productionCost: 400, price: 1000 },
      { name: 'Scoring VSEO - 20 mots clés', productionCost: 2000, price: 5000 },
      { name: 'Scoring VSEO - 30 mots clés', productionCost: 3000, price: 7500 },
    ],
  },
  {
    label: 'Creative Factory digital',
    items: [
      { name: 'Ad Content Master', productionCost: 320, price: 800 },
      { name: 'Ad Content Declination', productionCost: 40, price: 100 },
      { name: 'Enrichissement IA (Avatar, Image to motion)', productionCost: 196, price: 490 },
      { name: 'LP DTS standard pour 1 à 5 poi', productionCost: 200, price: 500 },
      { name: 'LP DTS standard', productionCost: 400, price: 1000 },
      { name: 'LP ecata - flux produits', productionCost: 1000, price: 2500 },
      { name: 'LP modulaire - avec modules de base : Offre + DCO', productionCost: 400, price: 1000 },
      { name: 'LP modulaire - Ajout module', productionCost: 100, price: 250 },
      { name: 'Social media - Statique Post (4:5)', productionCost: 60, price: 150 },
      { name: 'Social media - Statique Story (9:16)', productionCost: 60, price: 150 },
      { name: 'Social media - Statique Carrousel (4:5) Meta', productionCost: 60, price: 150 },
      { name: 'Social media - Statique Carrousel (9:16) TikTok', productionCost: 60, price: 150 },
      { name: 'CRM - Header email', productionCost: 60, price: 150 },
      { name: 'CRM - Push up in app', productionCost: 60, price: 150 },
      { name: 'CRM - Bannière', productionCost: 60, price: 150 },
      { name: 'CRM - Carré', productionCost: 60, price: 150 },
      { name: 'Acquisition digitale - Meta', productionCost: 60, price: 150 },
      { name: 'Acquisition digitale - Google Ads', productionCost: 60, price: 150 },
      { name: 'Acquisition digitale - Smadex', productionCost: 60, price: 150 },
      { name: 'Acquisition digitale - Affiliation', productionCost: 60, price: 150 },
      { name: 'Display - Statique', productionCost: 60, price: 150 },
      { name: 'Com instore - Bandeau', productionCost: 60, price: 150 },
      { name: 'Com instore - Ecran simple paysage', productionCost: 60, price: 150 },
      { name: 'Com instore - Ecran simple portrait', productionCost: 60, price: 150 },
      { name: 'Custom', productionCost: 0, price: 0, custom: true },
    ],
  },
  {
    label: 'Creative Factory print',
    items: [
      { name: 'Custom', productionCost: 0, price: 0, custom: true },
    ],
  },
  {
    label: 'Vidéo Production',
    items: [
      { name: 'Custom', productionCost: 0, price: 0, custom: true },
    ],
  },
  {
    label: 'Mesure',
    items: [
      { name: 'Adsquare - étude footfall', productionCost: 2520, price: 3500 },
      { name: 'Adsquare - étude footfall + insights', productionCost: 3600, price: 5000 },
      { name: 'Géolift Mobsuccess', productionCost: 2000, price: 5000 },
      { name: 'Okube - CPV & uplift (% du média)', productionCost: 0, price: 0, custom: true },
      { name: 'YouGov', productionCost: 0, price: 0, custom: true },
      { name: 'Custom', productionCost: 0, price: 0, custom: true },
    ],
  },
];
