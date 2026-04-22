/**
 * Script d'import des 331 magasins Feu Vert dans la DB.
 * Usage : node scripts/import-feu-vert.mjs
 */
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.db');
const xlsxPath = path.join(__dirname, '..', '..', 'Collection Feu vert.xlsx');

const wb = XLSX.read(readFileSync(xlsxPath));
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

// Populations par id de magasin (aire de chalandise estimée)
// Basé sur la connaissance des agglomérations françaises
const POP_OVERRIDES = {
  // IDF (2.2M)
  '32': 2200000, '46': 2200000, '49': 2200000, '265': 2200000, '309': 2200000,
  '318': 2200000, '330': 2200000, '337': 2200000, '345': 2200000, '358': 2200000,
  '405': 2200000, '406': 2200000, '489': 2200000, '520': 2200000, '27': 2200000,
  '290': 2200000, '310': 2200000, '328': 2200000,
  // Lyon (1.8M)
  '5': 1800000, '6': 1800000, '57': 1800000, '91': 700000, // Ambutrix = Ain, zone Bourg/Lyon
  '166': 1800000, '188': 1800000, '194': 1800000, '260': 1800000,
  '334': 1800000, '335': 1800000, '167': 1800000, '448': 1800000,
  // Marseille (1.8M)
  '81': 1800000, '227': 1800000, '228': 1800000, '336': 1800000,
  // Toulouse (1M)
  '248': 1000000, '355': 1000000, '356': 1000000, '357': 1000000, '297': 1000000,
  // Bordeaux (900k)
  '128': 900000, '208': 900000, '255': 900000, '313': 900000, '314': 900000, '315': 900000,
  // Lille (900k)
  '13': 900000, '377': 900000, '409': 900000,
  // Nantes (850k)
  '15': 850000, '16': 850000, '291': 850000, '292': 850000,
  // Grenoble (700k)
  '54': 700000, '193': 700000, '326': 700000,
  // Montpellier (700k)
  '76': 700000, '190': 700000, '233': 700000, '338': 700000,
  // Rouen (700k)
  '21': 700000, '311': 700000, '404': 700000,
  // Rennes (650k)
  '239': 650000, '347': 650000, '437': 650000,
  // AIX (650k)
  '200': 650000, '305': 650000,
  // Toulon (600k)
  '354': 600000, '482': 600000,
  // Nice (600k)
  '97': 600000, '98': 600000,
  // Strasbourg (550k)
  '29': 550000, '67': 550000,
  // Saint-Etienne (400k)
  '220': 400000, '242': 400000, '243': 400000,
  // Nancy (400k)
  '37': 400000,
  // Dijon (400k)
  '217': 400000, '218': 400000,
  // Orléans (400k)
  '28': 400000,
  // Reims (350k)
  '18': 350000,
  // Angers (420k)
  '140': 420000, '141': 420000, '306': 420000,
  // Metz (380k)
  '253': 380000, '455': 380000, '468': 380000,
  // Tours (380k)
  '435': 380000, '477': 380000,
  // Annemasse (280k)
  '170': 280000, '204': 280000,
  // Annecy (280k)
  '66': 280000, '203': 280000,
  // Bayonne/Anglet (320k)
  '307': 320000,
  // Antibes (350k)
  '308': 350000, '226': 350000, '251': 350000,
  // Avignon (340k)
  '88': 340000, '445': 340000, '472': 340000,
  // Perpignan (330k)
  '164': 330000, '165': 330000, '302': 330000, '344': 180000, '483': 330000, '450': 200000,
  // Nîmes (310k)
  '69': 310000, '304': 310000,
  // Le Mans (330k)
  '512': 330000,
  // Meaux (350k)
  '175': 350000,
  // Thionville (220k)
  '35': 220000,
  // Chambéry (220k)
  '70': 220000,
  // Lorient (210k)
  '224': 210000,
  // Montbeliard (140k)
  '34': 140000,
  // Besançon (240k)
  '303': 240000,
  // Caen (370k)
  '106': 370000,
  // Hyères (170k)
  '223': 170000,
  // Fréjus (150k)
  '221': 150000,
  // Draguignan (90k)
  '180': 90000,
  // Istres (90k)
  '432': 90000,
  // Brignoles (65k)
  '181': 65000,
  // Cogolin (80k) zone Var/Saint-Tropez
  '366': 80000,
  // Mandelieu (350k)
  '226': 350000,
  // Chasse sur Rhône = zone Lyon
  '194': 1800000,
  // Tignieu-Jameyzieu = zone Lyon Est
  '188': 700000,
  // Civrieux d'Azergues = nord Lyon
  '260': 700000,
  // Neuville Genay = nord Lyon
  '167': 700000,
  // Pierre-Bénite = sud Lyon
  '448': 1800000,
  // Ambutrix = Ain / zone Bourg-en-Bresse
  '91': 130000,
  // Givors = zone Lyon
  '333': 700000,
  // Clermont l'Hérault (petit bourg Hérault)
  '500': 25000,
  // Nevers Varennes
  '258': 110000,
  // Saint Nicolas de Redon
  '408': 60000,
  // Villefranche sur Saône
  '198': 140000,
  // Bourgoin Jallieu
  '131': 100000,
  // Segny (Ain, zone Genève)
  '416': 150000,
  // Thoiry (Ain, zone Genève)
  '379': 150000,
  // Ferney-Voltaire (zone Genève)
  '77': 150000,
  // Anthy sur Léman
  '53': 100000,
  // Amphion les Bains
  '467': 100000,
  // Rumilly
  '490': 50000,
  // Scionzier
  '509': 50000,
  // Sallanches
  '363': 50000,
  // Albertville
  '201': 60000,
  // Marmoutier
  '261': 35000,
  // Dorlisheim = zone Strasbourg
  '67': 550000,
  // Barentin = zone Rouen
  '311': 700000,
  // Tourville la Rivière = zone Rouen
  '404': 700000,
  // Bihorel = zone Rouen
  '21': 700000,
  // Gonfreville = zone Le Havre
  '174': 300000,
  // Creil St Maximin = zone Creil/Oise
  '155': 120000,
  // Compiegne Venette
  '319': 150000,
  // Wattignies = zone Lille
  '409': 900000,
  // Saint Pol sur Mer = zone Dunkerque
  '377': 200000,
  // Denain = zone Valenciennes
  '151': 350000,
  // Courrieres = zone Lens
  '418': 300000,
  // Auchy les Mines = zone Lens
  '62': 300000,
  // Muret = banlieue Toulouse
  '297': 1000000,
  // Saint André de Cubzac = zone Bordeaux
  '240': 900000,
  // Castelsarrasin (Tarn-et-Garonne)
  '457': 60000,
  // Distre = zone Saumur
  '465': 80000,
  // Dommartin-lès-Toul
  '411': 65000,
  // Charancieu = zone Bourgoin
  '507': 80000,
  // Bourg-lès-Valence = zone Valence
  '471': 250000,
  // Montesson = IDF (boucle de Seine)
  '358': 2200000,
  // Lieusaint Carré Sénart = IDF
  '337': 2200000,
  // Villabé = IDF
  '405': 2200000,
  // Villiers-en-Bière = IDF
  '406': 2200000,
  // Avrainville = IDF
  '489': 2200000,
  // Saint-Ouen-l'Aumône = IDF
  '520': 2200000,
  // Conflans = IDF
  '290': 2200000,
  // Rambouillet = zone Île-de-France élargie
  '346': 200000,
  // Chambly
  '281': 120000,
  // Freneuse
  '429': 200000,
  // Coquelles = zone Calais/Dunkerque
  '427': 200000,
  // Claye-Souilly = IDF
  '318': 2200000,
  // Pontault-Combault = IDF
  '345': 2200000,
  // Athis-Mons = IDF
  '309': 2200000,
  // Aulnay-sous-Bois = IDF
  '310': 2200000,
  // Ivry-sur-Seine = IDF
  '328': 2200000,
  // Vitry-sur-Seine = IDF
  '265': 2200000,
  // Ermont = IDF
  '46': 2200000,
  // Conflans-Ste-Honorine = IDF
  '49': 2200000,
  // Les Ulis = IDF
  '330': 2200000,
  // L'Haÿ-les-Roses = IDF
  '32': 2200000,
  // Orgeval = IDF
  '27': 2200000,
};

function estimatePop(id, name) {
  if (POP_OVERRIDES[id] !== undefined) return POP_OVERRIDES[id];
  const n = name.toUpperCase();
  if (/PARIS/.test(n)) return 2200000;
  if (/LYON/.test(n)) return 1800000;
  if (/MARSEILLE/.test(n)) return 1800000;
  if (/TOULOUSE/.test(n)) return 1000000;
  if (/BORDEAUX/.test(n)) return 900000;
  if (/LILLE/.test(n)) return 900000;
  if (/NANTES/.test(n)) return 850000;
  if (/GRENOBLE/.test(n)) return 700000;
  if (/MONTPELLIER/.test(n)) return 700000;
  if (/RENNES/.test(n)) return 650000;
  if (/TOULON/.test(n)) return 600000;
  if (/NICE/.test(n)) return 600000;
  if (/STRASBOURG/.test(n)) return 550000;
  if (/ANGERS/.test(n)) return 420000;
  if (/DIJON/.test(n)) return 400000;
  if (/NANCY/.test(n)) return 400000;
  if (/SAINT ETIENNE/.test(n)) return 400000;
  if (/REIMS/.test(n)) return 350000;
  if (/METZ/.test(n)) return 380000;
  if (/TOURS/.test(n)) return 380000;
  if (/AVIGNON/.test(n)) return 340000;
  if (/PERPIGNAN/.test(n)) return 330000;
  if (/LE MANS/.test(n)) return 330000;
  if (/NIMES/.test(n)) return 310000;
  if (/CAEN/.test(n)) return 370000;
  if (/CLERMONT FERRAND/.test(n)) return 480000;
  if (/ANNECY/.test(n)) return 280000;
  if (/ANNEMASSE/.test(n)) return 280000;
  if (/LIMOGES/.test(n)) return 280000;
  if (/MULHOUSE/.test(n)) return 280000;
  if (/BESANCON/.test(n)) return 240000;
  if (/CHAMBERY/.test(n)) return 220000;
  if (/LORIENT/.test(n)) return 210000;
  if (/LA ROCHELLE/.test(n)) return 250000;
  if (/ANGOULEME/.test(n)) return 180000;
  if (/QUIMPER/.test(n)) return 180000;
  if (/COLMAR/.test(n)) return 180000;
  if (/CHARTRES/.test(n)) return 180000;
  if (/CHALON/.test(n)) return 180000;
  if (/TROYES/.test(n)) return 200000;
  if (/SAINT NAZAIRE/.test(n)) return 200000;
  if (/AMIENS/.test(n)) return 200000;
  if (/DOUAI/.test(n)) return 200000;
  if (/CHOLET/.test(n)) return 150000;
  if (/FREJUS/.test(n)) return 150000;
  if (/BEAUVAIS/.test(n)) return 150000;
  if (/COMPIEGNE/.test(n)) return 150000;
  if (/SEGNY|FERNEY|THOIRY/.test(n)) return 150000;
  if (/HYERES/.test(n)) return 170000;
  if (/VANNES/.test(n)) return 170000;
  if (/NIORT/.test(n)) return 170000;
  if (/LA ROCHE SUR YON/.test(n)) return 160000;
  if (/ARRAS/.test(n)) return 160000;
  if (/VILLEFRANCHE SUR SAONE/.test(n)) return 140000;
  if (/BELFORT/.test(n)) return 140000;
  if (/MONTBELIARD/.test(n)) return 140000;
  if (/AUXERRE/.test(n)) return 140000;
  if (/AGEN/.test(n)) return 140000;
  if (/BOURG EN BRESSE/.test(n)) return 130000;
  if (/TARBES/.test(n)) return 130000;
  if (/CHARLEVILLE/.test(n)) return 130000;
  if (/BOURGES/.test(n)) return 130000;
  if (/BLOIS/.test(n)) return 130000;
  if (/SAINT MALO/.test(n)) return 130000;
  if (/NARBONNE/.test(n)) return 130000;
  if (/PERIGUEUX/.test(n)) return 130000;
  if (/BRIVE/.test(n)) return 130000;
  if (/SAINT QUENTIN/.test(n)) return 130000;
  if (/POITIERS/.test(n)) return 250000;
  if (/PAU/.test(n)) return 250000;
  if (/VALENCE/.test(n)) return 250000;
  if (/GONFREVILLE/.test(n)) return 300000;
  if (/MEAUX/.test(n)) return 350000;
  if (/MANDELIEU|ANTIBES|VILLENEUVE LOUBET/.test(n)) return 350000;
  if (/SAINT BRIEUC/.test(n)) return 180000;
  if (/NEVERS/.test(n)) return 110000;
  if (/CAMBRAI/.test(n)) return 110000;
  if (/DAX/.test(n)) return 110000;
  if (/TARNOS|ANGLET|BIDART|HENDAYE/.test(n)) return 110000;
  if (/ARCACHON|LA TESTE/.test(n)) return 110000;
  if (/BIGANOS/.test(n)) return 100000;
  if (/FORBACH/.test(n)) return 100000;
  if (/ALES/.test(n)) return 100000;
  if (/SAINT OMER/.test(n)) return 100000;
  if (/RODEZ/.test(n)) return 100000;
  if (/BOURGOIN/.test(n)) return 100000;
  if (/DRAGUIGNAN/.test(n)) return 90000;
  if (/SOISSONS/.test(n)) return 90000;
  if (/EPINAL/.test(n)) return 90000;
  if (/ORANGE/.test(n)) return 90000;
  if (/CARPENTRAS/.test(n)) return 90000;
  if (/SALON/.test(n)) return 90000;
  if (/ISTRES/.test(n)) return 90000;
  if (/DREUX/.test(n)) return 90000;
  if (/MONT DE MARSAN/.test(n)) return 90000;
  if (/AURILLAC/.test(n)) return 90000;
  if (/CASTRES/.test(n)) return 110000;
  if (/ALBI/.test(n)) return 110000;
  if (/CARCASSONNE/.test(n)) return 120000;
  if (/CHATEAUNEUF|MARTIGUES/.test(n)) return 120000;
  if (/OYONNAX/.test(n)) return 80000;
  if (/VOIRON/.test(n)) return 80000;
  if (/MONTELIMAR/.test(n)) return 80000;
  if (/FOUGERES/.test(n)) return 80000;
  if (/MORLAIX/.test(n)) return 80000;
  if (/HAZEBROUCK/.test(n)) return 80000;
  if (/ABBEVILLE/.test(n)) return 80000;
  if (/CAHORS/.test(n)) return 80000;
  if (/AUCH/.test(n)) return 80000;
  if (/DOLE/.test(n)) return 80000;
  if (/MONTARGIS/.test(n)) return 80000;
  if (/DISTRE|SAUMUR/.test(n)) return 80000;
  if (/ROCHEFORT|SAINTES/.test(n)) return 80000;
  if (/BERGERAC/.test(n)) return 80000;
  if (/LONGWY/.test(n)) return 80000;
  if (/SARREGUEMINES/.test(n)) return 55000;
  if (/HAGUENAU/.test(n)) return 80000;
  if (/VESOUL/.test(n)) return 75000;
  if (/MOULINS/.test(n)) return 75000;
  if (/COGNAC/.test(n)) return 75000;
  if (/LAON/.test(n)) return 75000;
  if (/SAINT DIE/.test(n)) return 75000;
  if (/EVREUX/.test(n)) return 120000;
  if (/LISIEUX/.test(n)) return 80000;
  if (/GRANVILLE/.test(n)) return 80000;
  if (/FLERS/.test(n)) return 65000;
  if (/ARGENTAN/.test(n)) return 55000;
  if (/VIERZON/.test(n)) return 65000;
  if (/LONS LE SAUNIER/.test(n)) return 65000;
  if (/DINAN/.test(n)) return 65000;
  if (/VITRE/.test(n)) return 65000;
  if (/DOMMARTIN/.test(n)) return 65000;
  if (/BRIGNOLES/.test(n)) return 65000;
  if (/LE PUY/.test(n)) return 65000;
  if (/FECAMP/.test(n)) return 55000;
  if (/CHAUMONT/.test(n)) return 55000;
  if (/BEAUNE/.test(n)) return 55000;
  if (/ARGENTAN/.test(n)) return 55000;
  if (/LANGRES/.test(n)) return 35000;
  if (/BAR.LE.DUC/.test(n)) return 55000;
  if (/VERDUN/.test(n)) return 60000;
  if (/SAINT DIZIER/.test(n)) return 80000;
  if (/EPERNAY/.test(n)) return 80000;
  if (/LUNEVILLE/.test(n)) return 45000;
  if (/SAINT AVOLD/.test(n)) return 50000;
  if (/SARREBOURG/.test(n)) return 40000;
  if (/MARMOUTIER/.test(n)) return 35000;
  if (/ALBERTVILLE/.test(n)) return 60000;
  if (/SALLANCHES|SCIONZIER/.test(n)) return 50000;
  if (/RUMILLY/.test(n)) return 50000;
  if (/LES HERBIERS/.test(n)) return 50000;
  if (/BRESSUIRE/.test(n)) return 45000;
  if (/SAINT HILAIRE DE RIEZ/.test(n)) return 50000;
  if (/CHATEAU D OLONNE/.test(n)) return 80000;
  if (/ROYAN/.test(n)) return 70000;
  if (/AURAY/.test(n)) return 70000;
  if (/SAINT NICOLAS DE REDON/.test(n)) return 60000;
  if (/BAIN DE BRETAGNE/.test(n)) return 45000;
  if (/LOUDEAC/.test(n)) return 50000;
  if (/SAINT RENAN/.test(n)) return 60000;
  if (/VENDOME/.test(n)) return 60000;
  if (/ROMORANTIN/.test(n)) return 50000;
  if (/COSNE/.test(n)) return 40000;
  if (/HIRSON/.test(n)) return 35000;
  if (/NEUFCHATEAU/.test(n)) return 35000;
  if (/CONTREXEVILLE/.test(n)) return 30000;
  if (/MENDE/.test(n)) return 40000;
  if (/MAUBOURGUET/.test(n)) return 20000;
  if (/MIREPEIX/.test(n)) return 20000;
  if (/SAINT LIZIER/.test(n)) return 25000;
  if (/CARBONNE/.test(n)) return 80000;
  if (/CASTELSARRASIN/.test(n)) return 60000;
  if (/PAMIERS/.test(n)) return 80000;
  if (/SAINT GAUDENS/.test(n)) return 45000;
  if (/LOURDES/.test(n)) return 60000;
  if (/FRONTIGNAN/.test(n)) return 60000;
  if (/UZES/.test(n)) return 50000;
  if (/BAGNOLS/.test(n)) return 50000;
  if (/COGOLIN/.test(n)) return 80000;
  if (/SISTERON/.test(n)) return 40000;
  if (/PUGET.SUR.ARGENS/.test(n)) return 80000;
  if (/THUIR/.test(n)) return 200000;
  if (/CLAIRA/.test(n)) return 180000;
  if (/CLERMONT L HERAULT/.test(n)) return 25000;
  if (/HAM/.test(n)) return 30000;
  if (/CHARANCIEU/.test(n)) return 60000;
  if (/ANNONAY/.test(n)) return 55000;
  if (/CHATEAUROUX/.test(n)) return 120000;
  if (/GUERET/.test(n)) return 60000;
  if (/SEDAN/.test(n)) return 60000;
  if (/PROVINS/.test(n)) return 60000;
  if (/COULOMMIERS/.test(n)) return 60000;
  if (/CHATEAU THIERRY/.test(n)) return 50000;
  if (/ROMILLY/.test(n)) return 50000;
  if (/VITRY LE FRANCOIS/.test(n)) return 45000;
  if (/ROYE/.test(n)) return 40000;
  if (/MAYENNE/.test(n)) return 120000;
  if (/MACON/.test(n)) return 120000;
  return 120000;
}

const db = new Database(dbPath);

// Init schema if needed
db.exec(`CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  population INTEGER NOT NULL DEFAULT 140000
)`);


const stores = rows.map(r => ({
  id: String(r.location_id),
  name: String(r.location_name).trim(),
  population: estimatePop(String(r.location_id), String(r.location_name)),
}));

const insertStore = db.prepare('INSERT OR REPLACE INTO stores (id, name, population) VALUES (?, ?, ?)');

const run = db.transaction(() => {
  db.prepare('DELETE FROM stores').run();
  for (const s of stores) insertStore.run(s.id, s.name, s.population);
});

run();
db.close();

const dist = {'>1M': 0, '500k-1M': 0, '200-500k': 0, '100-200k': 0, '<100k': 0};
for (const s of stores) {
  if (s.population >= 1000000) dist['>1M']++;
  else if (s.population >= 500000) dist['500k-1M']++;
  else if (s.population >= 200000) dist['200-500k']++;
  else if (s.population >= 100000) dist['100-200k']++;
  else dist['<100k']++;
}
console.log(`✓ ${stores.length} magasins importés dans ${dbPath}`);
console.log('Distribution populations:', dist);
