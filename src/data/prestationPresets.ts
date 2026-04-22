export interface PrestationPreset {
  name: string;
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
      { name: 'Scoring Social Media - 1 réseau', price: 2500 },
      { name: 'Scoring Social Media - 2 réseaux', price: 3500 },
      { name: 'Scoring Social Media - 3 réseaux', price: 4500 },
      { name: 'Scoring VGEO', price: 4500 },
      { name: 'Scoring Octopus (pack 10 vidéos)', price: 1000 },
      { name: 'Scoring VSEO - 20 mots clés', price: 5000 },
      { name: 'Scoring VSEO - 30 mots clés', price: 7500 },
    ],
  },
  {
    label: 'Creative Factory digital',
    items: [
      { name: 'Ad Content Master', price: 800 },
      { name: 'Ad Content Declination', price: 100 },
      { name: 'Enrichissement IA (Avatar, Image to motion)', price: 490 },
      { name: 'LP DTS standard pour 1 à 5 poi', price: 500 },
      { name: 'LP DTS standard', price: 1000 },
      { name: 'LP ecata - flux produits', price: 2500 },
      { name: 'LP modulaire - avec modules de base : Offre + DCO', price: 1000 },
      { name: 'LP modulaire - Ajout module', price: 250 },
      { name: 'Social media - Statique Post (4:5)', price: 150 },
      { name: 'Social media - Statique Story (9:16)', price: 150 },
      { name: 'Social media - Statique Carrousel (4:5) Meta', price: 150 },
      { name: 'Social media - Statique Carrousel (9:16) TikTok', price: 150 },
      { name: 'CRM - Header email', price: 150 },
      { name: 'CRM - Push up in app', price: 150 },
      { name: 'CRM - Bannière', price: 150 },
      { name: 'CRM - Carré', price: 150 },
      { name: 'Acquisition digitale - Meta', price: 150 },
      { name: 'Acquisition digitale - Google Ads', price: 150 },
      { name: 'Acquisition digitale - Smadex', price: 150 },
      { name: 'Acquisition digitale - Affiliation', price: 150 },
      { name: 'Display - Statique', price: 150 },
      { name: 'Com instore - Bandeau', price: 150 },
      { name: 'Com instore - Ecran simple paysage', price: 150 },
      { name: 'Com instore - Ecran simple portrait', price: 150 },
      { name: 'Custom — sur devis', price: 0, custom: true },
    ],
  },
  {
    label: 'Creative Factory print',
    items: [
      { name: 'Custom — sur devis', price: 0, custom: true },
    ],
  },
  {
    label: 'Vidéo Production',
    items: [
      { name: 'Custom — sur devis', price: 0, custom: true },
    ],
  },
  {
    label: 'Mesure',
    items: [
      { name: 'Adsquare - étude footfall', price: 3500 },
      { name: 'Adsquare - étude footfall + insights', price: 5000 },
      { name: 'Géolift Mobsuccess', price: 5000 },
      { name: 'Okube - CPV & uplift (4% du total)', price: 0, custom: true },
      { name: 'YouGov — sur devis', price: 0, custom: true },
      { name: 'Custom — sur devis', price: 0, custom: true },
    ],
  },
];
