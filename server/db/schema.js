import db from './database.js';

export function initDB() {
  // ── Create tables ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_params (
      id                    INTEGER PRIMARY KEY CHECK (id = 1),
      default_population    INTEGER NOT NULL DEFAULT 140000,
      max_budget_per_store  INTEGER NOT NULL DEFAULT 5000,
      default_total_budget  INTEGER NOT NULL DEFAULT 50000,
      max_budget_slider     INTEGER NOT NULL DEFAULT 500000,
      max_repetition_slider INTEGER NOT NULL DEFAULT 20
    );

    CREATE TABLE IF NOT EXISTS lever_configs (
      type                 TEXT PRIMARY KEY,
      label                TEXT,
      family               TEXT,
      default_cpm          REAL    NOT NULL,
      purchase_cpm         REAL    NOT NULL DEFAULT 0,
      min_budget_per_store INTEGER NOT NULL,
      max_coverage         INTEGER NOT NULL,
      color                TEXT    NOT NULL,
      icon                 TEXT    NOT NULL,
      auto_budget_percent  INTEGER NOT NULL,
      logo_url             TEXT,
      hidden               INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stores (
      id         TEXT PRIMARY KEY,
      name       TEXT    NOT NULL,
      population INTEGER NOT NULL DEFAULT 140000
    );

    CREATE TABLE IF NOT EXISTS presets (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      objective_mode TEXT NOT NULL DEFAULT 'budget',
      budget_mode    TEXT NOT NULL DEFAULT 'automatique',
      scope            TEXT NOT NULL DEFAULT 'admin',
      owner_profile_id TEXT,
      total_budget   REAL,
      max_budget_per_store REAL
    );

    CREATE TABLE IF NOT EXISTS preset_levers (
      id                   TEXT PRIMARY KEY,
      preset_id            TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
      type                 TEXT NOT NULL,
      cpm                  REAL    NOT NULL DEFAULT 0,
      purchase_cpm         REAL    NOT NULL DEFAULT 0,
      min_budget_per_store INTEGER NOT NULL DEFAULT 0,
      budget               REAL    NOT NULL DEFAULT 0,
      budget_percent       REAL    NOT NULL DEFAULT 0,
      repetition           REAL    NOT NULL DEFAULT 3,
      coverage             REAL    NOT NULL DEFAULT 30,
      max_coverage         REAL    NOT NULL DEFAULT 65,
      impressions          REAL    NOT NULL DEFAULT 0,
      start_date           TEXT    NOT NULL DEFAULT '',
      end_date             TEXT    NOT NULL DEFAULT '',
      sort_order           INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS simulations (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id TEXT
    );

    CREATE TABLE IF NOT EXISTS hypotheses (
      id                   TEXT PRIMARY KEY,
      simulation_id        TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
      name                 TEXT NOT NULL,
      max_budget_per_store REAL NOT NULL DEFAULT 0,
      objective_mode       TEXT NOT NULL DEFAULT 'budget',
      budget_mode          TEXT NOT NULL DEFAULT 'automatique',
      total_budget         REAL NOT NULL DEFAULT 0,
      retrocommission_percent REAL NOT NULL DEFAULT 0,
      collapsed            INTEGER NOT NULL DEFAULT 0,
      sort_order           INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS levers (
      id                   TEXT PRIMARY KEY,
      hypothesis_id        TEXT NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
      type                 TEXT NOT NULL,
      cpm                  REAL    NOT NULL DEFAULT 0,
      purchase_cpm         REAL    NOT NULL DEFAULT 0,
      min_budget_per_store REAL    NOT NULL DEFAULT 0,
      budget               REAL    NOT NULL DEFAULT 0,
      budget_percent       REAL    NOT NULL DEFAULT 0,
      repetition           REAL    NOT NULL DEFAULT 3,
      coverage             REAL    NOT NULL DEFAULT 30,
      max_coverage         REAL    NOT NULL DEFAULT 65,
      impressions          REAL    NOT NULL DEFAULT 0,
      start_date           TEXT    NOT NULL DEFAULT '',
      end_date             TEXT    NOT NULL DEFAULT '',
      collapsed            INTEGER NOT NULL DEFAULT 0,
      sort_order           INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prestations (
      id              TEXT PRIMARY KEY,
      simulation_id   TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
      name            TEXT NOT NULL DEFAULT '',
      category        TEXT,
      quantity        INTEGER NOT NULL DEFAULT 1,
      production_cost REAL NOT NULL DEFAULT 0,
      price           REAL NOT NULL DEFAULT 0,
      offered         INTEGER NOT NULL DEFAULT 0,
      sort_order      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS excel_uploads (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      row_count   INTEGER NOT NULL DEFAULT 0,
      replace_all INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ts            TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id    TEXT,
      actor_pseudo  TEXT,
      simulation_id TEXT,
      action_label  TEXT NOT NULL,
      snapshot_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_history_profile ON history(profile_id);
  `);

  // ── Migrations (add new columns to existing databases) ──────────
  try { db.exec(`ALTER TABLE global_params ADD COLUMN max_budget_slider INTEGER NOT NULL DEFAULT 500000`); } catch {}
  try { db.exec(`ALTER TABLE global_params ADD COLUMN max_repetition_slider INTEGER NOT NULL DEFAULT 20`); } catch {}
  try { db.exec(`ALTER TABLE global_params ADD COLUMN default_total_budget INTEGER NOT NULL DEFAULT 50000`); } catch {}
  try { db.exec(`ALTER TABLE lever_configs ADD COLUMN logo_url TEXT`); } catch {}
  try { db.exec(`ALTER TABLE presets ADD COLUMN scope TEXT NOT NULL DEFAULT 'admin'`); } catch {}
  try { db.exec(`ALTER TABLE presets ADD COLUMN owner_profile_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE simulations ADD COLUMN profile_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE presets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE presets ADD COLUMN total_budget REAL`); } catch {}
  try { db.exec(`ALTER TABLE presets ADD COLUMN max_budget_per_store REAL`); } catch {}
  try { db.exec(`ALTER TABLE lever_configs ADD COLUMN purchase_cpm REAL NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE lever_configs ADD COLUMN label TEXT`); } catch {}
  try { db.exec(`ALTER TABLE lever_configs ADD COLUMN family TEXT`); } catch {}
  try { db.exec(`ALTER TABLE levers ADD COLUMN purchase_cpm REAL NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE preset_levers ADD COLUMN purchase_cpm REAL NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE hypotheses ADD COLUMN retrocommission_percent REAL NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE lever_configs ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE stores ADD COLUMN budget_weight_percent REAL`); } catch {}
  try { db.exec(`ALTER TABLE hypotheses ADD COLUMN store_distribution_mode TEXT NOT NULL DEFAULT 'egal'`); } catch {}

  // ── Seed initial data ─────────────────────────────────────────
  db.prepare(`INSERT OR IGNORE INTO global_params (id, default_population, max_budget_per_store, default_total_budget, max_budget_slider, max_repetition_slider) VALUES (1, 140000, 10000, 1500, 3000, 20)`).run();

  const seedLeverConfigs = [
    // Legacy
    { type: 'Display',   label: 'Display',   family: 'Legacy', default_cpm: 4.50, purchase_cpm: 0,    min_budget_per_store: 120, max_coverage: 65, color: '#00e5a0', icon: 'Monitor',  auto_budget_percent: 20 },
    { type: 'Desktop',   label: 'Desktop',   family: 'Legacy', default_cpm: 5.00, purchase_cpm: 0,    min_budget_per_store: 100, max_coverage: 55, color: '#00b4d8', icon: 'Laptop',   auto_budget_percent: 10 },
    { type: 'Meta',      label: 'Meta',      family: 'Legacy', default_cpm: 6.20, purchase_cpm: 0,    min_budget_per_store: 150, max_coverage: 75, color: '#667eea', icon: 'Facebook', auto_budget_percent: 25 },
    { type: 'Google',    label: 'Google',    family: 'Legacy', default_cpm: 7.80, purchase_cpm: 0,    min_budget_per_store: 200, max_coverage: 70, color: '#f59e0b', icon: 'Search',   auto_budget_percent: 20 },
    { type: 'Youtube',   label: 'Youtube',   family: 'Legacy', default_cpm: 8.50, purchase_cpm: 0,    min_budget_per_store: 250, max_coverage: 60, color: '#ef4444', icon: 'Youtube',  auto_budget_percent: 10 },
    { type: 'Snap',      label: 'Snap',      family: 'Legacy', default_cpm: 5.50, purchase_cpm: 0,    min_budget_per_store: 100, max_coverage: 45, color: '#fbbf24', icon: 'Ghost',    auto_budget_percent: 5  },
    { type: 'Pinterest', label: 'Pinterest', family: 'Legacy', default_cpm: 3.80, purchase_cpm: 0,    min_budget_per_store: 80,  max_coverage: 35, color: '#ec4899', icon: 'Pin',      auto_budget_percent: 5  },
    { type: 'TikTok',    label: 'TikTok',    family: 'Legacy', default_cpm: 6.00, purchase_cpm: 0,    min_budget_per_store: 130, max_coverage: 55, color: '#06b6d4', icon: 'Music',    auto_budget_percent: 5  },

    // Ratecard Mobsuccess — Display Mobile
    { type: 'DisplayMobile-Interstitiel', label: 'Interstitiel',         family: 'Display Mobile', default_cpm: 11.00, purchase_cpm: 5.00,  min_budget_per_store: 120, max_coverage: 65, color: '#00e5a0', icon: 'Monitor', auto_budget_percent: 77  },
    { type: 'DisplayMobile-Pave',         label: 'Pavé',                 family: 'Display Mobile', default_cpm: 5.00,  purchase_cpm: 2.00,  min_budget_per_store: 120, max_coverage: 65, color: '#00c48c', icon: 'Monitor', auto_budget_percent: 22  },
    { type: 'DisplayMobile-Banner',       label: 'Banner',               family: 'Display Mobile', default_cpm: 2.50,  purchase_cpm: 1.00,  min_budget_per_store: 120, max_coverage: 65, color: '#00a775', icon: 'Monitor', auto_budget_percent: 11  },
    { type: 'DisplayMobile-Mixed',        label: 'Mixed format',         family: 'Display Mobile', default_cpm: 9.00,  purchase_cpm: 3.30,  min_budget_per_store: 120, max_coverage: 65, color: '#00e5a0', icon: 'Monitor', auto_budget_percent: 110 },

    // Meta
    { type: 'Meta-Reach',  label: 'Reach',        family: 'Meta', default_cpm: 2.00, purchase_cpm: 0.80, min_budget_per_store: 150, max_coverage: 75, color: '#667eea', icon: 'Facebook', auto_budget_percent: 55 },
    { type: 'Meta-Trafic', label: 'Trafic',       family: 'Meta', default_cpm: 5.00, purchase_cpm: 3.00, min_budget_per_store: 150, max_coverage: 75, color: '#7c8eec', icon: 'Facebook', auto_budget_percent: 55 },
    { type: 'Meta-Mixed',  label: 'Mixed format', family: 'Meta', default_cpm: 4.00, purchase_cpm: 1.90, min_budget_per_store: 150, max_coverage: 75, color: '#667eea', icon: 'Facebook', auto_budget_percent: 60 },

    // CTV
    { type: 'CTV-Mixed',           label: 'Mixed format',           family: 'CTV', default_cpm: 16.00, purchase_cpm: 9.33,  min_budget_per_store: 300, max_coverage: 55, color: '#a855f7', icon: 'Tv', auto_budget_percent: 90 },
    { type: 'CTV-BroadcasterOnly', label: 'Mixed Broadcaster only', family: 'CTV', default_cpm: 20.00, purchase_cpm: 12.00, min_budget_per_store: 300, max_coverage: 55, color: '#c084fc', icon: 'Tv', auto_budget_percent: 90 },

    // Display Desktop
    { type: 'DisplayDesktop-Mixed', label: 'Mixed format', family: 'Display Desktop', default_cpm: 9.00, purchase_cpm: 3.30, min_budget_per_store: 120, max_coverage: 65, color: '#00b4d8', icon: 'Laptop', auto_budget_percent: 60 },

    // Youtube (ex-VOL)
    { type: 'VOL-Mixed', label: 'Youtube seul', family: 'Youtube', default_cpm: 10.00, purchase_cpm: 4.50, min_budget_per_store: 200, max_coverage: 60, color: '#ef4444', icon: 'Youtube', auto_budget_percent: 80 },

    // DOOH
    { type: 'DOOH-Mixed', label: 'Mixed format', family: 'DOOH', default_cpm: 22.00, purchase_cpm: 10.00, min_budget_per_store: 500, max_coverage: 50, color: '#f59e0b', icon: 'Monitor', auto_budget_percent: 5 },

    // Google
    { type: 'Google-PMAX',      label: 'PMAX',       family: 'Google', default_cpm: 3.00, purchase_cpm: 1.60, min_budget_per_store: 200, max_coverage: 70, color: '#f59e0b', icon: 'Search', auto_budget_percent: 90 },
    { type: 'Google-DemandGen', label: 'Demand Gen', family: 'Google', default_cpm: 3.50, purchase_cpm: 1.90, min_budget_per_store: 200, max_coverage: 70, color: '#fbbf24', icon: 'Search', auto_budget_percent: 50 },

    // Audio
    { type: 'Audio-Mixed', label: 'Mixed format', family: 'Audio', default_cpm: 20.00, purchase_cpm: 10.00, min_budget_per_store: 200, max_coverage: 40, color: '#06b6d4', icon: 'Music', auto_budget_percent: 90 },

    // Pinterest
    { type: 'Pinterest-Pinterest', label: 'Pinterest', family: 'Pinterest', default_cpm: 5.00, purchase_cpm: 3.00, min_budget_per_store: 100, max_coverage: 20, color: '#ec4899', icon: 'Pin', auto_budget_percent: 50 },

    // Snapchat
    { type: 'Snapchat-Snapchat', label: 'Snapchat', family: 'Snapchat', default_cpm: 5.00, purchase_cpm: 3.00, min_budget_per_store: 100, max_coverage: 20, color: '#fbbf24', icon: 'Ghost', auto_budget_percent: 60 },
  ];
  const insertConfig = db.prepare(`INSERT OR IGNORE INTO lever_configs (type, label, family, default_cpm, purchase_cpm, min_budget_per_store, max_coverage, color, icon, auto_budget_percent) VALUES (@type, @label, @family, @default_cpm, @purchase_cpm, @min_budget_per_store, @max_coverage, @color, @icon, @auto_budget_percent)`);
  const backfillPurchaseCpm = db.prepare(`UPDATE lever_configs SET purchase_cpm = @purchase_cpm, label = COALESCE(label, @label), family = COALESCE(family, @family) WHERE type = @type AND (purchase_cpm = 0 OR purchase_cpm IS NULL)`);
  for (const cfg of seedLeverConfigs) {
    insertConfig.run(cfg);
    // Backfill purchase_cpm for rows inserted before this column existed.
    backfillPurchaseCpm.run(cfg);
  }
  // Rename VOL → Youtube for existing databases
  db.prepare(`UPDATE lever_configs SET label = 'Youtube seul', family = 'Youtube' WHERE type = 'VOL-Mixed' AND family = 'VOL'`).run();

  // Feu Vert — 331 magasins (populations estimées par aire urbaine)
  const seedStores = [
    { id: '5', name: 'LYON RILLIEUX', population: 1800000 },
    { id: '6', name: 'LYON ST GENIS LAVAL', population: 1800000 },
    { id: '7', name: 'BOURG EN BRESSE VIRIAT', population: 130000 },
    { id: '11', name: 'CHARLEVILLE', population: 130000 },
    { id: '13', name: 'WASQUEHAL', population: 900000 },
    { id: '15', name: 'NANTES PARIDIS', population: 850000 },
    { id: '16', name: 'NANTES ST HERBLAIN', population: 850000 },
    { id: '17', name: 'POITIERS 1 SUD', population: 250000 },
    { id: '18', name: 'REIMS TINQUEUX', population: 350000 },
    { id: '21', name: 'BIHOREL', population: 700000 },
    { id: '25', name: 'BOURGES', population: 130000 },
    { id: '27', name: 'ORGEVAL', population: 2200000 },
    { id: '28', name: 'ORLEANS SARAN', population: 400000 },
    { id: '29', name: 'STRASBOURG LAMPERTHEIM', population: 550000 },
    { id: '31', name: 'VOIRON', population: 80000 },
    { id: '32', name: 'L HAY LES ROSES', population: 2200000 },
    { id: '34', name: 'MONTBELIARD', population: 140000 },
    { id: '35', name: 'MONDELANGE-THIONVILLE', population: 220000 },
    { id: '36', name: 'CAMBRAI', population: 110000 },
    { id: '37', name: 'ESSEY LES NANCY', population: 400000 },
    { id: '39', name: 'NEVERS 1', population: 110000 },
    { id: '41', name: 'FORBACH', population: 100000 },
    { id: '46', name: 'ERMONT', population: 2200000 },
    { id: '47', name: 'ABBEVILLE', population: 80000 },
    { id: '48', name: 'CHATEAU D OLONNE', population: 80000 },
    { id: '49', name: 'CONFLANS STE HONORINE', population: 2200000 },
    { id: '51', name: 'PAMIERS', population: 80000 },
    { id: '52', name: 'SAINT DIE', population: 75000 },
    { id: '53', name: 'ANTHY SUR LEMAN', population: 100000 },
    { id: '54', name: 'GRENOBLE COMBOIRE', population: 700000 },
    { id: '56', name: 'CHAUMONT', population: 55000 },
    { id: '57', name: 'LYON MEYZIEU', population: 1800000 },
    { id: '62', name: 'AUCHY LES MINES', population: 300000 },
    { id: '66', name: 'ANNECY EPAGNY', population: 280000 },
    { id: '67', name: 'DORLISHEIM', population: 550000 },
    { id: '68', name: 'FOUGERES', population: 80000 },
    { id: '69', name: 'NIMES 1 ARCHIPEL', population: 310000 },
    { id: '70', name: 'CHAMBERY', population: 220000 },
    { id: '72', name: 'CERNAY', population: 120000 },
    { id: '73', name: 'LONS LE SAUNIER MONTMOROT', population: 65000 },
    { id: '74', name: 'BEAUNE', population: 55000 },
    { id: '76', name: 'MONTPELLIER CELLENEUVE', population: 700000 },
    { id: '77', name: 'FERNEY VOLTAIRE', population: 150000 },
    { id: '80', name: 'SAINT QUENTIN', population: 130000 },
    { id: '81', name: 'MARSEILLE GRAND LITTORAL', population: 1800000 },
    { id: '82', name: 'CHOLET II CARREFOUR', population: 150000 },
    { id: '83', name: 'QUIMPER 1 CARREFOUR', population: 180000 },
    { id: '84', name: 'EPINAL', population: 90000 },
    { id: '88', name: 'AVIGNON MONTFAVET', population: 340000 },
    { id: '89', name: 'DINAN', population: 65000 },
    { id: '90', name: 'AGEN BOE', population: 140000 },
    { id: '91', name: 'AMBUTRIX', population: 130000 },
    { id: '92', name: 'OYONNAX', population: 80000 },
    { id: '93', name: 'SOISSONS', population: 90000 },
    { id: '94', name: 'LAON', population: 75000 },
    { id: '96', name: 'MOULINS', population: 75000 },
    { id: '97', name: 'NICE 1 ST ISIDORE', population: 600000 },
    { id: '98', name: 'NICE 2 ROQUEBILIERE', population: 600000 },
    { id: '100', name: 'NARBONNE', population: 130000 },
    { id: '101', name: 'RODEZ ONET LE CHATEAU', population: 100000 },
    { id: '102', name: 'CHATEAUNEUF LES MARTIGUES', population: 120000 },
    { id: '103', name: 'SALON DE PROVENCE', population: 90000 },
    { id: '105', name: 'LISIEUX', population: 80000 },
    { id: '106', name: 'CAEN 2 CARREFOUR', population: 370000 },
    { id: '107', name: 'AURILLAC1', population: 90000 },
    { id: '108', name: 'ANGOULEME CHAMPNIERS', population: 180000 },
    { id: '109', name: 'COGNAC', population: 75000 },
    { id: '110', name: 'ROCHEFORT', population: 80000 },
    { id: '111', name: 'SAINTES CHAMPMAUDUIT', population: 80000 },
    { id: '112', name: 'ROYAN', population: 70000 },
    { id: '113', name: 'LA ROCHELLE PUILBOREAU', population: 250000 },
    { id: '114', name: 'SAINTES CARREFOUR', population: 80000 },
    { id: '115', name: 'BRIVE 1 CARREFOUR', population: 130000 },
    { id: '116', name: 'GUERET', population: 60000 },
    { id: '118', name: 'PERIGUEUX TRELISSAC', population: 130000 },
    { id: '119', name: 'PONTARLIER', population: 120000 },
    { id: '120', name: 'MONTELIMAR', population: 80000 },
    { id: '121', name: 'EVREUX 1 LEPOUZE', population: 120000 },
    { id: '122', name: 'EVREUX II CARREFOUR', population: 120000 },
    { id: '124', name: 'ALES', population: 100000 },
    { id: '125', name: 'BAGNOLS SUR CEZE', population: 50000 },
    { id: '127', name: 'AUCH', population: 80000 },
    { id: '128', name: 'BORDEAUX GRADIGNAN', population: 900000 },
    { id: '129', name: 'BIGANOS', population: 100000 },
    { id: '130', name: 'BEZIERS RHIN', population: 120000 },
    { id: '131', name: 'BOURGOIN JALLIEU', population: 100000 },
    { id: '133', name: 'DAX ST PAUL', population: 110000 },
    { id: '134', name: 'BLOIS', population: 130000 },
    { id: '136', name: 'LE PUY EN VELAY', population: 65000 },
    { id: '138', name: 'CAHORS', population: 80000 },
    { id: '140', name: 'ANGERS 1 JOXE', population: 420000 },
    { id: '141', name: 'ANGERS 2 MURS ERIGNE', population: 420000 },
    { id: '143', name: 'GRANVILLE', population: 80000 },
    { id: '144', name: 'EPERNAY', population: 80000 },
    { id: '146', name: 'SAINT DIZIER', population: 80000 },
    { id: '147', name: 'VERDUN', population: 60000 },
    { id: '148', name: 'VANNES', population: 170000 },
    { id: '151', name: 'DENAIN', population: 350000 },
    { id: '152', name: 'DOUAI', population: 200000 },
    { id: '154', name: 'COMPIEGNE CAMP DU ROY', population: 150000 },
    { id: '155', name: 'CREIL ST MAXIMIN', population: 120000 },
    { id: '157', name: 'FLERS', population: 65000 },
    { id: '158', name: 'SAINT OMER', population: 100000 },
    { id: '159', name: 'ARRAS 1 BERNARD', population: 160000 },
    { id: '160', name: 'BRUAY LA BUISSIERE', population: 120000 },
    { id: '161', name: 'ARRAS 2 DAINVILLE', population: 160000 },
    { id: '162', name: 'THIERS', population: 50000 },
    { id: '163', name: 'TARBES', population: 130000 },
    { id: '164', name: 'PERPIGNAN GRAND CHENE', population: 330000 },
    { id: '165', name: 'PERPIGNAN CANET CHATEAU-ROUSSILLON', population: 330000 },
    { id: '166', name: 'LYON BRON', population: 1800000 },
    { id: '167', name: 'NEUVILLE GENAY', population: 700000 },
    { id: '170', name: 'ANNEMASSE RESISTANCE', population: 280000 },
    { id: '174', name: 'GONFREVILLE', population: 300000 },
    { id: '175', name: 'MEAUX', population: 350000 },
    { id: '177', name: 'AMIENS', population: 200000 },
    { id: '178', name: 'CASTRES', population: 110000 },
    { id: '179', name: 'ALBI', population: 110000 },
    { id: '180', name: 'DRAGUIGNAN TRANS EN PROVENCE', population: 90000 },
    { id: '181', name: 'BRIGNOLES', population: 65000 },
    { id: '182', name: 'ORANGE', population: 90000 },
    { id: '183', name: 'CARPENTRAS', population: 90000 },
    { id: '184', name: 'LA ROCHE SUR YON', population: 160000 },
    { id: '186', name: 'SENS ST MARTIN DU TERTRE', population: 80000 },
    { id: '188', name: 'TIGNIEU JAMEYZIEU', population: 700000 },
    { id: '190', name: 'MONTPELLIER LE CRES', population: 700000 },
    { id: '191', name: 'ROMORANTIN', population: 50000 },
    { id: '193', name: 'GRENOBLE ST MARTIN D HERES', population: 700000 },
    { id: '194', name: 'CHASSE SUR RHONE', population: 1800000 },
    { id: '195', name: 'LES HERBIERS', population: 50000 },
    { id: '196', name: 'BRESSUIRE', population: 45000 },
    { id: '198', name: 'VILLEFRANCHE SUR SAONE', population: 140000 },
    { id: '200', name: 'AIX EN PROVENCE AUCHAN', population: 650000 },
    { id: '201', name: 'ALBERTVILLE', population: 60000 },
    { id: '202', name: 'ANGOULEME GEANT', population: 180000 },
    { id: '203', name: 'ANNECY SEYNOD', population: 280000 },
    { id: '204', name: 'ANNEMASSE INTERMARCHE', population: 280000 },
    { id: '206', name: 'AUXERRE', population: 140000 },
    { id: '207', name: 'BEZIERS LECLERC', population: 120000 },
    { id: '208', name: 'BORDEAUX VILLENAVE D ORNON', population: 900000 },
    { id: '209', name: 'BOURG DE PEAGE', population: 80000 },
    { id: '211', name: 'BRIVE 2 MALEMORT', population: 130000 },
    { id: '212', name: 'CARCASSONNE ROCADEST', population: 120000 },
    { id: '213', name: 'CHALON SUR SAONE GEANT', population: 180000 },
    { id: '214', name: 'CHARTRES 2 LUCE', population: 180000 },
    { id: '216', name: 'CLERMONT FERRAND', population: 480000 },
    { id: '217', name: 'DIJON CHENOVE', population: 400000 },
    { id: '218', name: 'DIJON FONTAINE', population: 400000 },
    { id: '219', name: 'DOLE', population: 80000 },
    { id: '220', name: 'SAINT ETIENNE FIRMINY', population: 400000 },
    { id: '221', name: 'FREJUS', population: 150000 },
    { id: '223', name: 'HYERES', population: 170000 },
    { id: '224', name: 'LANESTER', population: 210000 },
    { id: '225', name: 'LIMOGES CASSEAUX', population: 280000 },
    { id: '226', name: 'MANDELIEU', population: 350000 },
    { id: '227', name: 'MARSEILLE BARNEOUD', population: 1800000 },
    { id: '228', name: 'MARSEILLE VALENTINE', population: 1800000 },
    { id: '230', name: 'MONTARGIS 2 GEANT', population: 80000 },
    { id: '231', name: 'MONT DE MARSAN', population: 90000 },
    { id: '232', name: 'MONTELIMAR AUCHAN', population: 80000 },
    { id: '233', name: 'MONTPELLIER PRES D ARENE', population: 700000 },
    { id: '234', name: 'MORLAIX', population: 80000 },
    { id: '235', name: 'CHAURAY', population: 70000 },
    { id: '237', name: 'POITIERS 2 BEAULIEU', population: 250000 },
    { id: '238', name: 'QUIMPER 2 GEANT', population: 180000 },
    { id: '239', name: 'RENNES ST GREGOIRE', population: 650000 },
    { id: '240', name: 'SAINT ANDRE DE CUBZAC', population: 900000 },
    { id: '242', name: 'SAINT ETIENNE MONTHIEU', population: 400000 },
    { id: '243', name: 'SAINT ETIENNE LA RICAMARIE', population: 400000 },
    { id: '245', name: 'SAINT NAZAIRE', population: 200000 },
    { id: '246', name: 'TARNOS', population: 110000 },
    { id: '248', name: 'TOULOUSE FENOUILLET', population: 1000000 },
    { id: '250', name: 'VALENCE', population: 250000 },
    { id: '251', name: 'VILLENEUVE LOUBET', population: 350000 },
    { id: '252', name: 'SARREGUEMINES', population: 55000 },
    { id: '253', name: 'METZ MARLY', population: 380000 },
    { id: '254', name: 'CHATEAU THIERRY', population: 50000 },
    { id: '255', name: 'BORDEAUX PESSAC', population: 900000 },
    { id: '257', name: 'HAZEBROUCK', population: 80000 },
    { id: '258', name: 'NEVERS VARENNES', population: 110000 },
    { id: '259', name: 'LUNEVILLE MONCEL', population: 45000 },
    { id: '260', name: 'CIVRIEUX D AZERGUES', population: 700000 },
    { id: '261', name: 'MARMOUTIER', population: 35000 },
    { id: '262', name: 'VIERZON', population: 65000 },
    { id: '263', name: 'FECAMP', population: 55000 },
    { id: '265', name: 'VITRY SUR SEINE', population: 2200000 },
    { id: '266', name: 'SAINT GAUDENS/LANDORTHE', population: 45000 },
    { id: '268', name: 'NEUFCHATEAU', population: 35000 },
    { id: '269', name: 'PROVINS', population: 60000 },
    { id: '270', name: 'CARCASSONNE FERRAUDIERE', population: 120000 },
    { id: '273', name: 'VITRY LE FRANCOIS', population: 45000 },
    { id: '277', name: 'MAYENNE', population: 120000 },
    { id: '281', name: 'CHAMBLY', population: 120000 },
    { id: '287', name: 'ORLEIX', population: 120000 },
    { id: '289', name: 'ROMILLY SUR SEINE', population: 50000 },
    { id: '290', name: 'CONFLANS', population: 2200000 },
    { id: '291', name: 'NANTES REZE', population: 850000 },
    { id: '292', name: 'NANTES GOULAINE', population: 850000 },
    { id: '294', name: 'SAINT LIZIER', population: 25000 },
    { id: '295', name: 'SARREBOURG', population: 40000 },
    { id: '297', name: 'MURET', population: 1000000 },
    { id: '299', name: 'PAU LONS', population: 250000 },
    { id: '302', name: 'PERPIGNAN POLYGONE', population: 330000 },
    { id: '303', name: 'BESANCON GEANT', population: 240000 },
    { id: '304', name: 'NIMES 2 AUCHAN', population: 310000 },
    { id: '305', name: 'AIX EN PROVENCE CARREFOUR', population: 650000 },
    { id: '306', name: 'ANGERS 3 GRAND MAINE', population: 420000 },
    { id: '307', name: 'ANGLET', population: 320000 },
    { id: '308', name: 'ANTIBES', population: 350000 },
    { id: '309', name: 'ATHIS-MONS', population: 2200000 },
    { id: '310', name: 'AULNAY SOUS BOIS', population: 2200000 },
    { id: '311', name: 'BARENTIN', population: 700000 },
    { id: '313', name: 'BORDEAUX BEGLES', population: 900000 },
    { id: '314', name: 'BORDEAUX LORMONT', population: 900000 },
    { id: '315', name: 'BORDEAUX MERIGNAC', population: 900000 },
    { id: '317', name: 'CHARTRES 3 CARREFOUR', population: 180000 },
    { id: '318', name: 'CLAYE SOUILLY', population: 2200000 },
    { id: '319', name: 'COMPIEGNE VENETTE CARREFOUR', population: 150000 },
    { id: '326', name: 'GRENOBLE GRAND PLACE', population: 700000 },
    { id: '328', name: 'IVRY SUR SEINE', population: 2200000 },
    { id: '329', name: 'LA ROCHELLE ANGOULINS', population: 250000 },
    { id: '330', name: 'LES ULIS', population: 2200000 },
    { id: '332', name: 'LIMOGES BOISSEUIL', population: 280000 },
    { id: '333', name: 'GIVORS CARREFOUR', population: 700000 },
    { id: '334', name: 'LYON ECULLY', population: 1800000 },
    { id: '335', name: 'LYON VENISSIEUX', population: 1800000 },
    { id: '336', name: 'MARSEILLE VITROLLES', population: 1800000 },
    { id: '337', name: 'LIEUSAINT CARRE SENART', population: 2200000 },
    { id: '338', name: 'MONTPELLIER LATTES', population: 700000 },
    { id: '341', name: 'NIORT', population: 170000 },
    { id: '344', name: 'CLAIRA', population: 180000 },
    { id: '345', name: 'PONTAULT COMBAULT', population: 2200000 },
    { id: '346', name: 'RAMBOUILLET', population: 200000 },
    { id: '347', name: 'RENNES CESSON', population: 650000 },
    { id: '348', name: 'SAINT BRIEUC LANGUEUX', population: 180000 },
    { id: '350', name: 'SENS CARREFOUR', population: 80000 },
    { id: '354', name: 'TOULON GRAND VAR', population: 600000 },
    { id: '355', name: 'TOULOUSE LABEGE', population: 1000000 },
    { id: '356', name: 'TOULOUSE PORTET SUR GARONNE', population: 1000000 },
    { id: '357', name: 'TOULOUSE PURPAN', population: 1000000 },
    { id: '358', name: 'MONTESSON', population: 2200000 },
    { id: '360', name: 'DREUX', population: 90000 },
    { id: '362', name: 'HIRSON', population: 35000 },
    { id: '363', name: 'SALLANCHES', population: 50000 },
    { id: '364', name: 'LURE', population: 50000 },
    { id: '365', name: 'BELFORT', population: 140000 },
    { id: '366', name: 'COGOLIN', population: 80000 },
    { id: '367', name: 'CHALON S/S II CARREFOUR', population: 180000 },
    { id: '369', name: 'ROYE', population: 40000 },
    { id: '370', name: 'FITZ JAMES', population: 70000 },
    { id: '372', name: 'CONTREXEVILLE', population: 30000 },
    { id: '373', name: 'VENDOME', population: 60000 },
    { id: '374', name: 'MENDE', population: 40000 },
    { id: '375', name: 'BAR-LE-DUC', population: 55000 },
    { id: '376', name: 'SAINT MALO', population: 130000 },
    { id: '377', name: 'SAINT POL SUR MER', population: 200000 },
    { id: '379', name: 'THOIRY', population: 150000 },
    { id: '380', name: 'COULOMMIERS', population: 60000 },
    { id: '381', name: 'LOURDES', population: 60000 },
    { id: '382', name: 'SAINT PAUL LES ROMANS', population: 80000 },
    { id: '404', name: 'TOURVILLE LA RIVIERE', population: 700000 },
    { id: '405', name: 'VILLABE', population: 2200000 },
    { id: '406', name: 'VILLIERS-EN-BIERE', population: 2200000 },
    { id: '408', name: 'SAINT NICOLAS DE REDON', population: 60000 },
    { id: '409', name: 'WATTIGNIES', population: 900000 },
    { id: '411', name: 'DOMMARTIN-LES-TOUL', population: 65000 },
    { id: '413', name: 'LA ROCHE SUR YON SUD', population: 160000 },
    { id: '415', name: 'ANNONAY', population: 55000 },
    { id: '416', name: 'SEGNY', population: 150000 },
    { id: '417', name: 'CHATEAUROUX-DEOLS', population: 120000 },
    { id: '418', name: 'COURRIERES', population: 300000 },
    { id: '421', name: 'LANGRES', population: 35000 },
    { id: '422', name: 'AURAY', population: 70000 },
    { id: '423', name: 'SAINT RENAN', population: 60000 },
    { id: '424', name: 'SEDAN', population: 60000 },
    { id: '426', name: 'BERGERAC 2 CREYSSE', population: 80000 },
    { id: '427', name: 'COQUELLES', population: 200000 },
    { id: '429', name: 'FRENEUSE', population: 200000 },
    { id: '432', name: 'ISTRES', population: 90000 },
    { id: '433', name: 'TROYES LA CHAPELLE ST LUC', population: 200000 },
    { id: '434', name: 'DOMERAT', population: 75000 },
    { id: '435', name: 'JOUE LES TOURS', population: 380000 },
    { id: '437', name: 'VERN SUR SEICHE', population: 650000 },
    { id: '438', name: 'SISTERON', population: 40000 },
    { id: '443', name: 'COSNE COURS SUR LOIRE', population: 40000 },
    { id: '445', name: 'AVIGNON SORGUES', population: 340000 },
    { id: '447', name: 'SAINT AVOLD', population: 50000 },
    { id: '448', name: 'PIERRE BENITE', population: 1800000 },
    { id: '450', name: 'THUIR', population: 200000 },
    { id: '451', name: 'LOUDEAC', population: 50000 },
    { id: '453', name: 'ANGOULEME LA COURONNE', population: 180000 },
    { id: '455', name: 'MOULINS LES METZ', population: 380000 },
    { id: '456', name: 'UZES', population: 50000 },
    { id: '457', name: 'CASTELSARRASIN', population: 60000 },
    { id: '465', name: 'DISTRE', population: 80000 },
    { id: '466', name: 'BAIN DE BRETAGNE', population: 45000 },
    { id: '467', name: 'AMPHION LES BAINS', population: 100000 },
    { id: '468', name: 'HAUCONCOURT-MAIZIERES LES METZ', population: 380000 },
    { id: '469', name: 'LONGWY LEXY', population: 80000 },
    { id: '470', name: 'VESOUL PUSEY', population: 75000 },
    { id: '471', name: 'BOURG LES VALENCE', population: 250000 },
    { id: '472', name: 'AVIGNON LES ANGLES', population: 340000 },
    { id: '473', name: 'SAINT HILAIRE DE RIEZ', population: 50000 },
    { id: '474', name: 'COLMAR HOUSSEN', population: 180000 },
    { id: '475', name: 'ARGENTAN', population: 55000 },
    { id: '477', name: 'TOURS PETITES ARCHES', population: 380000 },
    { id: '479', name: 'BIDART', population: 110000 },
    { id: '480', name: 'MACON', population: 120000 },
    { id: '481', name: 'CARBONNE', population: 80000 },
    { id: '482', name: 'TOULON OLLIOULES', population: 600000 },
    { id: '483', name: 'PERPIGNAN DALBIEZ', population: 330000 },
    { id: '484', name: 'LA TESTE DE BUCH', population: 110000 },
    { id: '488', name: 'VITRE', population: 65000 },
    { id: '489', name: 'AVRAINVILLE', population: 2200000 },
    { id: '490', name: 'RUMILLY', population: 50000 },
    { id: '495', name: 'HAGUENAU', population: 80000 },
    { id: '497', name: 'PUGET-SUR-ARGENS', population: 80000 },
    { id: '498', name: 'HENDAYE', population: 110000 },
    { id: '499', name: 'FRONTIGNAN', population: 60000 },
    { id: '500', name: 'CLERMONT L HERAULT', population: 25000 },
    { id: '504', name: 'HAM', population: 30000 },
    { id: '505', name: 'MIREPEIX', population: 20000 },
    { id: '506', name: 'CHATTE-SAINT MARCELLIN', population: 80000 },
    { id: '507', name: 'CHARANCIEU', population: 60000 },
    { id: '509', name: 'SCIONZIER', population: 50000 },
    { id: '512', name: 'LE MANS RUAUDIN', population: 330000 },
    { id: '515', name: 'TRELISSAC LES ROMAINS 2', population: 130000 },
    { id: '517', name: 'BEAUVAIS', population: 150000 },
    { id: '518', name: 'ARCACHON', population: 110000 },
    { id: '520', name: 'SAINT OUEN L AUMONE', population: 2200000 },
    { id: '522', name: 'MAUBOURGUET', population: 20000 },
  ];
  const insertStore = db.prepare(`INSERT OR IGNORE INTO stores (id, name, population) VALUES (@id, @name, @population)`);
  for (const s of seedStores) insertStore.run(s);

  // Seed presets
  const insertPreset = db.prepare(`INSERT OR IGNORE INTO presets (id, name, description, objective_mode, budget_mode, scope, owner_profile_id, total_budget, max_budget_per_store) VALUES (@id, @name, @description, @objective_mode, @budget_mode, @scope, @owner_profile_id, @total_budget, @max_budget_per_store)`);
  const backfillTotalBudget = db.prepare(`UPDATE presets SET total_budget = @total_budget WHERE id = @id AND total_budget IS NULL`);
  const backfillMaxBudget = db.prepare(`UPDATE presets SET max_budget_per_store = @max_budget_per_store WHERE id = @id AND max_budget_per_store IS NULL`);
  const insertPresetLever = db.prepare(`INSERT OR IGNORE INTO preset_levers (id, preset_id, type, cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, sort_order) VALUES (@id, @preset_id, @type, @cpm, @min_budget_per_store, @budget, @budget_percent, @repetition, @coverage, @max_coverage, @impressions, @start_date, @end_date, @sort_order)`);

  const seedPresets = [
    {
      id: 'preset-starter', name: 'Starter',
      description: 'Configuration basique avec Meta et Google pour démarrer rapidement',
      objective_mode: 'budget', budget_mode: 'automatique',
      total_budget: 200000, max_budget_per_store: 50000,
      levers: [
        { type: 'Meta',   cpm: 6.20, min_budget_per_store: 150, budget: 0, budget_percent: 60, repetition: 3, coverage: 40, max_coverage: 75, impressions: 0, start_date: '', end_date: '' },
        { type: 'Google', cpm: 7.80, min_budget_per_store: 200, budget: 0, budget_percent: 40, repetition: 2, coverage: 30, max_coverage: 70, impressions: 0, start_date: '', end_date: '' },
      ],
    },
    {
      id: 'preset-multi', name: 'Multi-canal',
      description: 'Couverture maximale avec 5 leviers complémentaires',
      objective_mode: 'budget', budget_mode: 'automatique',
      total_budget: 500000, max_budget_per_store: 50000,
      levers: [
        { type: 'Display', cpm: 4.50, min_budget_per_store: 120, budget: 0, budget_percent: 20, repetition: 3, coverage: 35, max_coverage: 65, impressions: 0, start_date: '', end_date: '' },
        { type: 'Meta',    cpm: 6.20, min_budget_per_store: 150, budget: 0, budget_percent: 25, repetition: 3, coverage: 45, max_coverage: 75, impressions: 0, start_date: '', end_date: '' },
        { type: 'Google',  cpm: 7.80, min_budget_per_store: 200, budget: 0, budget_percent: 25, repetition: 2, coverage: 35, max_coverage: 70, impressions: 0, start_date: '', end_date: '' },
        { type: 'Youtube', cpm: 8.50, min_budget_per_store: 250, budget: 0, budget_percent: 20, repetition: 2, coverage: 30, max_coverage: 60, impressions: 0, start_date: '', end_date: '' },
        { type: 'Snap',    cpm: 5.50, min_budget_per_store: 100, budget: 0, budget_percent: 10, repetition: 2, coverage: 20, max_coverage: 45, impressions: 0, start_date: '', end_date: '' },
      ],
    },
    {
      id: 'preset-social', name: 'Social First',
      description: 'Focus réseaux sociaux pour cibler les 18-35 ans',
      objective_mode: 'couverture', budget_mode: 'automatique',
      total_budget: 300000, max_budget_per_store: 50000,
      levers: [
        { type: 'Meta',      cpm: 6.20, min_budget_per_store: 150, budget: 0, budget_percent: 30, repetition: 4, coverage: 50, max_coverage: 75, impressions: 0, start_date: '', end_date: '' },
        { type: 'TikTok',    cpm: 6.00, min_budget_per_store: 130, budget: 0, budget_percent: 30, repetition: 3, coverage: 35, max_coverage: 55, impressions: 0, start_date: '', end_date: '' },
        { type: 'Snap',      cpm: 5.50, min_budget_per_store: 100, budget: 0, budget_percent: 20, repetition: 3, coverage: 25, max_coverage: 45, impressions: 0, start_date: '', end_date: '' },
        { type: 'Pinterest', cpm: 3.80, min_budget_per_store: 80,  budget: 0, budget_percent: 20, repetition: 2, coverage: 20, max_coverage: 35, impressions: 0, start_date: '', end_date: '' },
      ],
    },
  ];

  let leverCounter = 0;
  for (const preset of seedPresets) {
    insertPreset.run({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      objective_mode: preset.objective_mode,
      budget_mode: preset.budget_mode,
      scope: 'admin',
      owner_profile_id: null,
      total_budget: preset.total_budget,
      max_budget_per_store: preset.max_budget_per_store,
    });
    // Backfill budget columns for pre-existing seeded rows (migration path).
    backfillTotalBudget.run({ id: preset.id, total_budget: preset.total_budget });
    backfillMaxBudget.run({ id: preset.id, max_budget_per_store: preset.max_budget_per_store });
    for (let i = 0; i < preset.levers.length; i++) {
      const l = preset.levers[i];
      insertPresetLever.run({ id: `pl-seed-${++leverCounter}`, preset_id: preset.id, ...l, sort_order: i });
    }
  }

  console.log('Database initialized and seeded.');
}
