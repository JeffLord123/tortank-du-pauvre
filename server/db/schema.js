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
      population INTEGER NOT NULL DEFAULT 0,
      pop_10min  INTEGER NOT NULL DEFAULT 0,
      pop_20min  INTEGER NOT NULL DEFAULT 0,
      pop_30min  INTEGER NOT NULL DEFAULT 0,
      pop_custom INTEGER NOT NULL DEFAULT 0
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
  try { db.exec(`ALTER TABLE stores ADD COLUMN pop_10min INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE stores ADD COLUMN pop_20min INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE stores ADD COLUMN pop_30min INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE stores ADD COLUMN pop_custom INTEGER NOT NULL DEFAULT 0`); } catch {}
  // Backfill pop_10min from population for pre-existing stores (population was zone1 equivalent)
  try { db.exec(`UPDATE stores SET pop_10min = population WHERE pop_10min = 0 AND population > 0`); } catch {}
  try { db.exec(`ALTER TABLE hypotheses ADD COLUMN zone_id TEXT NOT NULL DEFAULT 'zone1'`); } catch {}
  // Migration Décathlon : si la base ne contient pas encore les magasins Décathlon (détecté via l'ID '2928'), vider et remplacer
  const hasDecath = db.prepare(`SELECT id FROM stores WHERE id = '2928' LIMIT 1`).get();
  if (!hasDecath) {
    db.prepare('DELETE FROM stores').run();
    console.log('Remplacement des magasins par les 327 magasins Décathlon...');
  }

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

  // Décathlon — 327 magasins avec populations par zone de chalandise
  const seedStores = [
    { id: '2928', name: 'Mountain La Plagne', population: 5657, pop_10min: 5657, pop_20min: 7302, pop_30min: 7472, pop_custom: 0 },
    { id: '2933', name: 'Mountain Les 2 Alpes', population: 1297, pop_10min: 1297, pop_20min: 1728, pop_30min: 4505, pop_custom: 0 },
    { id: '3332', name: 'Mountain Chamrousse', population: 9291, pop_10min: 9291, pop_20min: 10184, pop_30min: 12424, pop_custom: 0 },
    { id: '3402', name: 'Running Bordeaux', population: 26497, pop_10min: 26497, pop_20min: 81522, pop_30min: 87420, pop_custom: 0 },
    { id: '3510', name: 'Rennes City', population: 68147, pop_10min: 68147, pop_20min: 116450, pop_30min: 146367, pop_custom: 0 },
    { id: '3542', name: 'Mountain Villard de Lans', population: 7362, pop_10min: 7362, pop_20min: 8412, pop_30min: 10350, pop_custom: 0 },
    { id: '3590', name: 'Running Annecy', population: 38631, pop_10min: 38631, pop_20min: 53417, pop_30min: 62446, pop_custom: 0 },
    { id: '1882', name: 'Contact La Guérinière, îl', population: 6440, pop_10min: 6440, pop_20min: 7980, pop_30min: 12186, pop_custom: 6440 },
    { id: '2530', name: 'Laruns', population: 2696, pop_10min: 2696, pop_20min: 6453, pop_30min: 8404, pop_custom: 6681 },
    { id: '1954', name: 'Contact Saint Martin de R', population: 9841, pop_10min: 9841, pop_20min: 11225, pop_30min: 12075, pop_custom: 9021 },
    { id: '723', name: 'City Chamonix', population: 8088, pop_10min: 8088, pop_20min: 8767, pop_30min: 9039, pop_custom: 9562 },
    { id: '365', name: 'Hendaye', population: 11539, pop_10min: 11539, pop_20min: 12370, pop_30min: 12370, pop_custom: 12370 },
    { id: '3364', name: 'La Palmyre', population: 12170, pop_10min: 12170, pop_20min: 13234, pop_30min: 15424, pop_custom: 13234 },
    { id: '2442', name: 'Essentiel Givet', population: 14135, pop_10min: 14135, pop_20min: 36718, pop_30min: 79920, pop_custom: 14159 },
    { id: '1874', name: 'Contact Ile d\'Oléron', population: 12478, pop_10min: 12478, pop_20min: 17839, pop_30min: 15421, pop_custom: 15421 },
    { id: '3424', name: 'Bourg Saint Maurice', population: 8379, pop_10min: 8379, pop_20min: 9377, pop_30min: 12878, pop_custom: 16502 },
    { id: '1123', name: 'Essentiel Sisteron', population: 9948, pop_10min: 9948, pop_20min: 19189, pop_30min: 18841, pop_custom: 21695 },
    { id: '2405', name: 'Contact Quiberon', population: 4761, pop_10min: 4761, pop_20min: 6273, pop_30min: 11815, pop_custom: 22834 },
    { id: '1912', name: 'Essentiel Briançon', population: 12557, pop_10min: 12557, pop_20min: 16679, pop_30min: 20864, pop_custom: 23207 },
    { id: '1120', name: 'Essentiel Dinard Pleurtui', population: 25251, pop_10min: 25251, pop_20min: 29392, pop_30min: 31071, pop_custom: 25251 },
    { id: '3191', name: 'Les Menuires Mountain', population: 2446, pop_10min: 2446, pop_20min: 2446, pop_30min: 3698, pop_custom: 27044 },
    { id: '232', name: 'Passy - Mountain Store', population: 27079, pop_10min: 27079, pop_20min: 29143, pop_30min: 30771, pop_custom: 29936 },
    { id: '437', name: 'Marcq-en-Baroeul Inesis G', population: 25801, pop_10min: 25801, pop_20min: 24103, pop_30min: 24103, pop_custom: 31539 },
    { id: '2445', name: 'Essentiel Granville', population: 17949, pop_10min: 17949, pop_20min: 32853, pop_30min: 33553, pop_custom: 31739 },
    { id: '3192', name: 'Urrugne - Saint Jean de L', population: 25130, pop_10min: 25130, pop_20min: 31501, pop_30min: 33357, pop_custom: 34766 },
    { id: '275', name: 'Digne Les Bains', population: 15891, pop_10min: 15891, pop_20min: 27917, pop_30min: 30529, pop_custom: 34771 },
    { id: '98', name: 'Toulouse Blagnac', population: 44140, pop_10min: 44140, pop_20min: 36970, pop_30min: 35865, pop_custom: 37561 },
    { id: '2861', name: 'Chambéry Contact Centre v', population: 46048, pop_10min: 46048, pop_20min: 54616, pop_30min: 62752, pop_custom: 38404 },
    { id: '518', name: 'Fitness Store', population: 42668, pop_10min: 42668, pop_20min: 46235, pop_30min: 48434, pop_custom: 40548 },
    { id: '2394', name: 'Chauvigny - Jardres', population: 12564, pop_10min: 12564, pop_20min: 28870, pop_30min: 39086, pop_custom: 42637 },
    { id: '1116', name: 'Essentiel Tulle', population: 16157, pop_10min: 16157, pop_20min: 31727, pop_30min: 47071, pop_custom: 43099 },
    { id: '259', name: 'Carhaix', population: 14261, pop_10min: 14261, pop_20min: 33912, pop_30min: 42894, pop_custom: 43784 },
    { id: '477', name: 'Cestas Solognac Caperlan', population: 39405, pop_10min: 39405, pop_20min: 56061, pop_30min: 58294, pop_custom: 43876 },
    { id: '762', name: 'Concarneau', population: 27977, pop_10min: 27977, pop_20min: 55648, pop_30min: 59747, pop_custom: 43899 },
    { id: '1940', name: 'Essentiel Sarlat-la-Canéd', population: 11977, pop_10min: 11977, pop_20min: 24042, pop_30min: 39361, pop_custom: 46751 },
    { id: '1112', name: 'Coutances Essentiel', population: 17347, pop_10min: 17347, pop_20min: 39236, pop_30min: 47202, pop_custom: 46864 },
    { id: '1971', name: 'Le Touquet', population: 9444, pop_10min: 9444, pop_20min: 21778, pop_30min: 47850, pop_custom: 48288 },
    { id: '1607', name: 'Annecy Seynod', population: 20370, pop_10min: 20370, pop_20min: 33426, pop_30min: 47845, pop_custom: 49424 },
    { id: '541', name: 'Aix les bains - Grésy Sur', population: 46303, pop_10min: 46303, pop_20min: 50167, pop_30min: 53145, pop_custom: 50353 },
    { id: '2485', name: 'Essentiel Guingamp Saint-', population: 26485, pop_10min: 26485, pop_20min: 52713, pop_30min: 67537, pop_custom: 50415 },
    { id: '2440', name: 'Essentiel Châteaubriant', population: 18932, pop_10min: 18932, pop_20min: 45841, pop_30min: 71858, pop_custom: 50551 },
    { id: '2773', name: 'Tribord Sailing Lab - La ', population: 23251, pop_10min: 23251, pop_20min: 39853, pop_30min: 51540, pop_custom: 51540 },
    { id: '253', name: 'Rochefort', population: 39017, pop_10min: 39017, pop_20min: 59799, pop_30min: 70770, pop_custom: 53016 },
    { id: '1107', name: 'Essentiel Chambéry', population: 26938, pop_10min: 26938, pop_20min: 39092, pop_30min: 52594, pop_custom: 53316 },
    { id: '1985', name: 'Royan Contact', population: 34345, pop_10min: 34345, pop_20min: 45248, pop_30min: 48329, pop_custom: 53586 },
    { id: '605', name: 'Chatellerault', population: 39748, pop_10min: 39748, pop_20min: 60397, pop_30min: 75050, pop_custom: 54116 },
    { id: '265', name: 'Pont Audemer', population: 18192, pop_10min: 18192, pop_20min: 47012, pop_30min: 62209, pop_custom: 54483 },
    { id: '481', name: 'Argentan Sarceaux', population: 18720, pop_10min: 18720, pop_20min: 41745, pop_30min: 53326, pop_custom: 54623 },
    { id: '486', name: 'Chateaudun', population: 21649, pop_10min: 21649, pop_20min: 37925, pop_30min: 51863, pop_custom: 56295 },
    { id: '610', name: 'Pornic', population: 33802, pop_10min: 33802, pop_20min: 44667, pop_30min: 45781, pop_custom: 56929 },
    { id: '1944', name: 'Essentiel Digoin', population: 18290, pop_10min: 18290, pop_20min: 42001, pop_30min: 69420, pop_custom: 57830 },
    { id: '192', name: 'Verdun Haudainville', population: 20875, pop_10min: 20875, pop_20min: 30231, pop_30min: 42687, pop_custom: 58359 },
    { id: '456', name: 'Perpignan Claira', population: 49014, pop_10min: 49014, pop_20min: 66238, pop_30min: 65210, pop_custom: 58631 },
    { id: '233', name: 'Lannion', population: 30725, pop_10min: 30725, pop_20min: 51684, pop_30min: 63159, pop_custom: 58824 },
    { id: '348', name: 'Aurillac', population: 27521, pop_10min: 27521, pop_20min: 41867, pop_30min: 50308, pop_custom: 59019 },
    { id: '2404', name: 'Manosque', population: 34355, pop_10min: 34355, pop_20min: 51740, pop_30min: 66619, pop_custom: 59599 },
    { id: '229', name: 'Cambrai', population: 41148, pop_10min: 41148, pop_20min: 89761, pop_30min: 112562, pop_custom: 59685 },
    { id: '76', name: 'Chambery St Alban Leysse', population: 28559, pop_10min: 28559, pop_20min: 45971, pop_30min: 49185, pop_custom: 60736 },
    { id: '255', name: 'Albertville', population: 36903, pop_10min: 36903, pop_20min: 47003, pop_30min: 73577, pop_custom: 61397 },
    { id: '251', name: 'Bordeaux Bouliac', population: 58818, pop_10min: 58818, pop_20min: 50947, pop_30min: 57681, pop_custom: 61726 },
    { id: '136', name: 'Gap', population: 31466, pop_10min: 31466, pop_20min: 42838, pop_30min: 53784, pop_custom: 63084 },
    { id: '899', name: 'Les Sables d\'Olonne - Olo', population: 38604, pop_10min: 38604, pop_20min: 58846, pop_30min: 65528, pop_custom: 63802 },
    { id: '264', name: 'Saint Lo', population: 36470, pop_10min: 36470, pop_20min: 65341, pop_30min: 88778, pop_custom: 64416 },
    { id: '227', name: 'Saint Die Des Vosges', population: 28598, pop_10min: 28598, pop_20min: 59296, pop_30min: 80000, pop_custom: 64471 },
    { id: '658', name: 'Oyonnax - Arbent', population: 30812, pop_10min: 30812, pop_20min: 45861, pop_30min: 65257, pop_custom: 64808 },
    { id: '694', name: 'Doubs Pontarlier', population: 22095, pop_10min: 22095, pop_20min: 34526, pop_30min: 62685, pop_custom: 64881 },
    { id: '237', name: 'Martigues', population: 32330, pop_10min: 32330, pop_20min: 59981, pop_30min: 66759, pop_custom: 65279 },
    { id: '51', name: 'Annecy Epagny', population: 28634, pop_10min: 28634, pop_20min: 45918, pop_30min: 57102, pop_custom: 65552 },
    { id: '1384', name: 'Moulins Avermes', population: 25958, pop_10min: 25958, pop_20min: 41870, pop_30min: 57692, pop_custom: 67042 },
    { id: '1937', name: 'Essentiel Saint-Gaudens', population: 15472, pop_10min: 15472, pop_20min: 35980, pop_30min: 62797, pop_custom: 67188 },
    { id: '720', name: 'Dinan', population: 36287, pop_10min: 36287, pop_20min: 56758, pop_30min: 79390, pop_custom: 67456 },
    { id: '211', name: 'Auch', population: 21664, pop_10min: 21664, pop_20min: 40340, pop_30min: 58206, pop_custom: 67544 },
    { id: '300', name: 'Romorantin', population: 19977, pop_10min: 19977, pop_20min: 42980, pop_30min: 66501, pop_custom: 67648 },
    { id: '301', name: 'Orange', population: 36318, pop_10min: 36318, pop_20min: 67948, pop_30min: 87634, pop_custom: 68404 },
    { id: '1109', name: 'Essentiel Laon - Chambry', population: 26536, pop_10min: 26536, pop_20min: 48411, pop_30min: 68763, pop_custom: 68610 },
    { id: '1126', name: 'Essentiel Trie-Château', population: 18999, pop_10min: 18999, pop_20min: 36169, pop_30min: 57889, pop_custom: 68773 },
    { id: '206', name: 'Angoulême Champniers', population: 36141, pop_10min: 36141, pop_20min: 69998, pop_30min: 95897, pop_custom: 69257 },
    { id: '641', name: 'Saintes', population: 28465, pop_10min: 28465, pop_20min: 55346, pop_30min: 84473, pop_custom: 69572 },
    { id: '1067', name: 'Ajaccio Sarrola Carcopino', population: 29621, pop_10min: 29621, pop_20min: 56592, pop_30min: 73759, pop_custom: 71093 },
    { id: '444', name: 'Thonon Les Bains Publier', population: 50220, pop_10min: 50220, pop_20min: 67085, pop_30min: 75916, pop_custom: 71288 },
    { id: '483', name: 'Longwy Mont Saint Martin', population: 57227, pop_10min: 57227, pop_20min: 91767, pop_30min: 155147, pop_custom: 71529 },
    { id: '183', name: 'La Teste de Buch', population: 35616, pop_10min: 35616, pop_20min: 56781, pop_30min: 70513, pop_custom: 71628 },
    { id: '774', name: 'Sens', population: 38346, pop_10min: 38346, pop_20min: 65656, pop_30min: 78244, pop_custom: 72046 },
    { id: '180', name: 'Montlucon', population: 40170, pop_10min: 40170, pop_20min: 58107, pop_30min: 75111, pop_custom: 72332 },
    { id: '1108', name: 'Essentiel Saint Didier So', population: 27530, pop_10min: 27530, pop_20min: 43945, pop_30min: 65587, pop_custom: 72483 },
    { id: '546', name: 'Dole', population: 34091, pop_10min: 34091, pop_20min: 55375, pop_30min: 78566, pop_custom: 74065 },
    { id: '15', name: 'Villeneuve D\'Ascq V2', population: 60824, pop_10min: 60824, pop_20min: 88078, pop_30min: 84039, pop_custom: 74371 },
    { id: '1302', name: 'Scionzier', population: 47637, pop_10min: 47637, pop_20min: 70025, pop_30min: 71219, pop_custom: 74496 },
    { id: '163', name: 'Grasse', population: 44117, pop_10min: 44117, pop_20min: 64948, pop_30min: 79556, pop_custom: 75368 },
    { id: '2403', name: 'Essentiel Agde', population: 22434, pop_10min: 22434, pop_20min: 38687, pop_30min: 86597, pop_custom: 75659 },
    { id: '1876', name: 'Essentiel Vernon - Saint-', population: 22574, pop_10min: 22574, pop_20min: 56553, pop_30min: 70298, pop_custom: 75756 },
    { id: '73', name: 'Rennes Betton', population: 26138, pop_10min: 26138, pop_20min: 63931, pop_30min: 83893, pop_custom: 76148 },
    { id: '279', name: 'Foix', population: 28004, pop_10min: 28004, pop_20min: 56586, pop_30min: 77620, pop_custom: 77211 },
    { id: '1611', name: 'Essentiel Saint-André De ', population: 46774, pop_10min: 46774, pop_20min: 66666, pop_30min: 94821, pop_custom: 77976 },
    { id: '242', name: 'Alençon Arçonnay', population: 35582, pop_10min: 35582, pop_20min: 55110, pop_30min: 74474, pop_custom: 78183 },
    { id: '177', name: 'Avranches', population: 19814, pop_10min: 19814, pop_20min: 56295, pop_30min: 79898, pop_custom: 78317 },
    { id: '2863', name: 'Essentiel Lons Le Saunier', population: 21151, pop_10min: 21151, pop_20min: 39531, pop_30min: 68765, pop_custom: 79512 },
    { id: '184', name: 'Saint Malo Saint Jouan De', population: 33892, pop_10min: 33892, pop_20min: 67093, pop_30min: 68052, pop_custom: 79586 },
    { id: '131', name: 'Lyon Limonest', population: 35875, pop_10min: 35875, pop_20min: 85142, pop_30min: 101545, pop_custom: 80015 },
    { id: '159', name: 'Morlaix Saint Martin Des ', population: 37408, pop_10min: 37408, pop_20min: 76451, pop_30min: 88810, pop_custom: 80056 },
    { id: '325', name: 'Marmande', population: 22962, pop_10min: 22962, pop_20min: 42406, pop_30min: 83950, pop_custom: 80057 },
    { id: '360', name: 'Flers', population: 25293, pop_10min: 25293, pop_20min: 46262, pop_30min: 71886, pop_custom: 80071 },
    { id: '461', name: 'Les Herbiers', population: 19797, pop_10min: 19797, pop_20min: 64722, pop_30min: 95772, pop_custom: 80518 },
    { id: '276', name: 'Sarrebourg', population: 21402, pop_10min: 21402, pop_20min: 47927, pop_30min: 80131, pop_custom: 81202 },
    { id: '172', name: 'Arles', population: 38521, pop_10min: 38521, pop_20min: 69768, pop_30min: 75287, pop_custom: 81725 },
    { id: '1115', name: 'Essentiel Château-Thierry', population: 22797, pop_10min: 22797, pop_20min: 43284, pop_30min: 69615, pop_custom: 81914 },
    { id: '1129', name: 'Essentiel Lempdes', population: 41698, pop_10min: 41698, pop_20min: 88561, pop_30min: 131076, pop_custom: 82244 },
    { id: '727', name: 'Provins', population: 16479, pop_10min: 16479, pop_20min: 39156, pop_30min: 79070, pop_custom: 82523 },
    { id: '522', name: 'Montélimar', population: 45498, pop_10min: 45498, pop_20min: 66312, pop_30min: 85781, pop_custom: 82627 },
    { id: '179', name: 'Dieppe', population: 38018, pop_10min: 38018, pop_20min: 60436, pop_30min: 78919, pop_custom: 82648 },
    { id: '554', name: 'Bergerac', population: 29793, pop_10min: 29793, pop_20min: 55886, pop_30min: 84770, pop_custom: 83252 },
    { id: '2531', name: 'City Annecy', population: 29297, pop_10min: 29297, pop_20min: 30147, pop_30min: 29297, pop_custom: 83965 },
    { id: '193', name: 'Nevers - Marzy', population: 39350, pop_10min: 39350, pop_20min: 61276, pop_30min: 83063, pop_custom: 84853 },
    { id: '208', name: 'Cavaillon', population: 34559, pop_10min: 34559, pop_20min: 105657, pop_30min: 102862, pop_custom: 85034 },
    { id: '812', name: 'Pontivy', population: 27444, pop_10min: 27444, pop_20min: 69301, pop_30min: 94457, pop_custom: 86162 },
    { id: '496', name: 'Châlons - Fagnières', population: 23900, pop_10min: 23900, pop_20min: 60809, pop_30min: 97298, pop_custom: 86207 },
    { id: '345', name: 'Le Puy En Velay', population: 28953, pop_10min: 28953, pop_20min: 48706, pop_30min: 64051, pop_custom: 86757 },
    { id: '154', name: 'Aulnoy-Lez-Valenciennes', population: 58493, pop_10min: 58493, pop_20min: 132417, pop_30min: 278951, pop_custom: 87958 },
    { id: '64', name: 'Angoulême La Couronne', population: 35833, pop_10min: 35833, pop_20min: 55308, pop_30min: 76147, pop_custom: 88393 },
    { id: '479', name: 'Bailleul', population: 38083, pop_10min: 38083, pop_20min: 95311, pop_30min: 139078, pop_custom: 89286 },
    { id: '603', name: 'Soissons', population: 40875, pop_10min: 40875, pop_20min: 70506, pop_30min: 94130, pop_custom: 90186 },
    { id: '363', name: 'Bollene', population: 31874, pop_10min: 31874, pop_20min: 66305, pop_30min: 85527, pop_custom: 91269 },
    { id: '778', name: 'Challans', population: 31421, pop_10min: 31421, pop_20min: 85460, pop_30min: 84125, pop_custom: 91379 },
    { id: '648', name: 'Cycle Lille', population: 64936, pop_10min: 64936, pop_20min: 95339, pop_30min: 92492, pop_custom: 91551 },
    { id: '1602', name: 'Val Thoiry', population: 26545, pop_10min: 26545, pop_20min: 59445, pop_30min: 90688, pop_custom: 92147 },
    { id: '662', name: 'Redon', population: 24611, pop_10min: 24611, pop_20min: 60959, pop_30min: 98870, pop_custom: 92322 },
    { id: '867', name: 'Mont De Marsan', population: 35130, pop_10min: 35130, pop_20min: 54469, pop_30min: 78573, pop_custom: 92434 },
    { id: '721', name: 'Ancenis - Saint Géréon', population: 23932, pop_10min: 23932, pop_20min: 58629, pop_30min: 79446, pop_custom: 92870 },
    { id: '298', name: 'Saumur', population: 36547, pop_10min: 36547, pop_20min: 73879, pop_30min: 105493, pop_custom: 93030 },
    { id: '408', name: 'Castres', population: 40502, pop_10min: 40502, pop_20min: 75971, pop_30min: 93320, pop_custom: 95117 },
    { id: '188', name: 'Toulouse Escalquens', population: 45707, pop_10min: 45707, pop_20min: 66578, pop_30min: 83236, pop_custom: 96135 },
    { id: '199', name: 'Perigueux Boulazac', population: 40852, pop_10min: 40852, pop_20min: 67095, pop_30min: 92169, pop_custom: 96759 },
    { id: '23', name: 'Grenoble Echirolles', population: 67588, pop_10min: 67588, pop_20min: 81124, pop_30min: 83569, pop_custom: 96918 },
    { id: '405', name: 'Frejus', population: 55354, pop_10min: 55354, pop_20min: 81034, pop_30min: 91686, pop_custom: 97855 },
    { id: '71', name: 'Grenoble Saint Egreve', population: 39675, pop_10min: 39675, pop_20min: 82406, pop_30min: 121464, pop_custom: 97883 },
    { id: '2129', name: 'Essentiel Libourne - Bord', population: 33070, pop_10min: 33070, pop_20min: 71336, pop_30min: 105130, pop_custom: 98241 },
    { id: '3257', name: 'City Nantes', population: 96856, pop_10min: 96856, pop_20min: 155168, pop_30min: 157410, pop_custom: 98674 },
    { id: '336', name: 'Vichy Bellerive Sur Allie', population: 40070, pop_10min: 40070, pop_20min: 71982, pop_30min: 97673, pop_custom: 98682 },
    { id: '155', name: 'Brive', population: 42982, pop_10min: 42982, pop_20min: 84878, pop_30min: 92146, pop_custom: 98957 },
    { id: '1128', name: 'Essentiel Nancy Frouard', population: 24707, pop_10min: 24707, pop_20min: 91009, pop_30min: 128568, pop_custom: 99663 },
    { id: '1609', name: 'Abbeville', population: 23951, pop_10min: 23951, pop_20min: 50356, pop_30min: 93527, pop_custom: 99873 },
    { id: '241', name: 'Auxerre', population: 38096, pop_10min: 38096, pop_20min: 72678, pop_30min: 101682, pop_custom: 100195 },
    { id: '204', name: 'Narbonne', population: 54899, pop_10min: 54899, pop_20min: 81507, pop_30min: 112422, pop_custom: 101460 },
    { id: '113', name: 'Avignon', population: 38921, pop_10min: 38921, pop_20min: 78313, pop_30min: 96428, pop_custom: 101544 },
    { id: '753', name: 'Bessoncourt', population: 35970, pop_10min: 35970, pop_20min: 81740, pop_30min: 99768, pop_custom: 102139 },
    { id: '36', name: 'La Rochelle Puilboreau', population: 80068, pop_10min: 80068, pop_20min: 93048, pop_30min: 94724, pop_custom: 103026 },
    { id: '349', name: 'Arras', population: 52226, pop_10min: 52226, pop_20min: 94556, pop_30min: 117917, pop_custom: 104424 },
    { id: '2428', name: 'Essentiel Vesoul - Pusey', population: 25988, pop_10min: 25988, pop_20min: 41447, pop_30min: 76042, pop_custom: 104851 },
    { id: '150', name: 'Lisieux', population: 26499, pop_10min: 26499, pop_20min: 61539, pop_30min: 88341, pop_custom: 105335 },
    { id: '219', name: 'Bordeaux Begles', population: 58047, pop_10min: 58047, pop_20min: 100860, pop_30min: 123430, pop_custom: 106226 },
    { id: '692', name: 'Calais', population: 67313, pop_10min: 67313, pop_20min: 102899, pop_30min: 105303, pop_custom: 106261 },
    { id: '218', name: 'Toulouse Nord Fenouillet', population: 57744, pop_10min: 57744, pop_20min: 101071, pop_30min: 120291, pop_custom: 106281 },
    { id: '779', name: 'Le Havre Les Docks', population: 61790, pop_10min: 61790, pop_20min: 105118, pop_30min: 115347, pop_custom: 106775 },
    { id: '37', name: 'Cannes Mandelieu', population: 63897, pop_10min: 63897, pop_20min: 104256, pop_30min: 99705, pop_custom: 107154 },
    { id: '171', name: 'Draguignan Trans En Prove', population: 43477, pop_10min: 43477, pop_20min: 69103, pop_30min: 98392, pop_custom: 107166 },
    { id: '29', name: 'Strasbourg Mundolsheim', population: 50352, pop_10min: 50352, pop_20min: 70454, pop_30min: 93562, pop_custom: 107773 },
    { id: '12', name: 'Lyon Ecully', population: 55777, pop_10min: 55777, pop_20min: 90256, pop_30min: 109828, pop_custom: 107825 },
    { id: '139', name: 'Saint Martin De Boulogne', population: 69336, pop_10min: 69336, pop_20min: 105299, pop_30min: 107690, pop_custom: 108298 },
    { id: '93', name: 'Marseille Bonneveine', population: 67956, pop_10min: 67956, pop_20min: 109091, pop_30min: 109091, pop_custom: 109091 },
    { id: '1933', name: 'Nice TNL', population: 72061, pop_10min: 72061, pop_20min: 108956, pop_30min: 148392, pop_custom: 110657 },
    { id: '277', name: 'Saint Dizier', population: 28094, pop_10min: 28094, pop_20min: 45937, pop_30min: 91675, pop_custom: 110915 },
    { id: '129', name: 'Caen Mondeville', population: 75934, pop_10min: 75934, pop_20min: 140868, pop_30min: 173637, pop_custom: 111066 },
    { id: '210', name: 'Roanne Mably', population: 56641, pop_10min: 56641, pop_20min: 89223, pop_30min: 118880, pop_custom: 111157 },
    { id: '427', name: 'Lyon Beynost', population: 34063, pop_10min: 34063, pop_20min: 94950, pop_30min: 122470, pop_custom: 111320 },
    { id: '84', name: 'Le Mans Nord - La Chapell', population: 99921, pop_10min: 99921, pop_20min: 109804, pop_30min: 132240, pop_custom: 111333 },
    { id: '2499', name: 'City Nice Jean-Médecin', population: 146205, pop_10min: 146205, pop_20min: 156192, pop_30min: 149370, pop_custom: 111559 },
    { id: '549', name: 'Varennes Sur Seine', population: 32298, pop_10min: 32298, pop_20min: 85049, pop_30min: 122022, pop_custom: 112078 },
    { id: '3263', name: 'Saran', population: 45521, pop_10min: 45521, pop_20min: 72257, pop_30min: 84143, pop_custom: 112779 },
    { id: '249', name: 'Saint Omer Longuenesse', population: 49830, pop_10min: 49830, pop_20min: 101640, pop_30min: 123182, pop_custom: 113146 },
    { id: '381', name: 'Saint Paul Les Dax', population: 35286, pop_10min: 35286, pop_20min: 72065, pop_30min: 106517, pop_custom: 113485 },
    { id: '366', name: 'Dreux', population: 39466, pop_10min: 39466, pop_20min: 73326, pop_30min: 100828, pop_custom: 113550 },
    { id: '504', name: 'City Lille', population: 116406, pop_10min: 116406, pop_20min: 147762, pop_30min: 147762, pop_custom: 114094 },
    { id: '498', name: 'Ales', population: 50271, pop_10min: 50271, pop_20min: 89186, pop_30min: 106097, pop_custom: 114436 },
    { id: '267', name: 'Evreux', population: 48841, pop_10min: 48841, pop_20min: 79489, pop_30min: 94096, pop_custom: 115337 },
    { id: '189', name: 'Paris La Madeleine', population: 110544, pop_10min: 110544, pop_20min: 114077, pop_30min: 114077, pop_custom: 115653 },
    { id: '54', name: 'Vitrolles', population: 55026, pop_10min: 55026, pop_20min: 112329, pop_30min: 112546, pop_custom: 115703 },
    { id: '178', name: 'Cherbourg', population: 32513, pop_10min: 32513, pop_20min: 87452, pop_30min: 118484, pop_custom: 116003 },
    { id: '292', name: 'Village Marseille Bouc Be', population: 54806, pop_10min: 54806, pop_20min: 70206, pop_30min: 81784, pop_custom: 116397 },
    { id: '110', name: 'Macon', population: 57229, pop_10min: 57229, pop_20min: 94103, pop_30min: 119980, pop_custom: 116984 },
    { id: '652', name: 'Amilly', population: 47490, pop_10min: 47490, pop_20min: 89739, pop_30min: 125806, pop_custom: 117208 },
    { id: '693', name: 'Istres', population: 32677, pop_10min: 32677, pop_20min: 81849, pop_30min: 113322, pop_custom: 117718 },
    { id: '691', name: 'Rodez Onet Le Chateau', population: 27607, pop_10min: 27607, pop_20min: 61040, pop_30min: 80325, pop_custom: 117887 },
    { id: '133', name: 'Charleville-Mézières', population: 51858, pop_10min: 51858, pop_20min: 100992, pop_30min: 131683, pop_custom: 119018 },
    { id: '254', name: 'Châteauroux Saint Maur', population: 33057, pop_10min: 33057, pop_20min: 69978, pop_30min: 90909, pop_custom: 121945 },
    { id: '724', name: 'Salaise Sur Sanne', population: 39184, pop_10min: 39184, pop_20min: 86864, pop_30min: 124786, pop_custom: 122128 },
    { id: '30', name: 'Grenoble La Tronche', population: 80021, pop_10min: 80021, pop_20min: 105750, pop_30min: 111291, pop_custom: 122624 },
    { id: '221', name: 'Maubeuge Hautmont', population: 51598, pop_10min: 51598, pop_20min: 113624, pop_30min: 189925, pop_custom: 123880 },
    { id: '40', name: 'Toulouse Colomiers', population: 67392, pop_10min: 67392, pop_20min: 116624, pop_30min: 134882, pop_custom: 124917 },
    { id: '1', name: 'Sequedin Englos', population: 100391, pop_10min: 100391, pop_20min: 123840, pop_30min: 124441, pop_custom: 124998 },
    { id: '4', name: 'Antibes', population: 60751, pop_10min: 60751, pop_20min: 122119, pop_30min: 128637, pop_custom: 125179 },
    { id: '151', name: 'Carcassonne', population: 55821, pop_10min: 55821, pop_20min: 85373, pop_30min: 114123, pop_custom: 125281 },
    { id: '57', name: 'Caen Rots', population: 56459, pop_10min: 56459, pop_20min: 115219, pop_30min: 152595, pop_custom: 126517 },
    { id: '167', name: 'La Roche-sur-Yon', population: 73913, pop_10min: 73913, pop_20min: 115797, pop_30min: 136347, pop_custom: 127019 },
    { id: '45', name: 'Montpellier Saint Jean De', population: 53884, pop_10min: 53884, pop_20min: 104786, pop_30min: 125815, pop_custom: 127094 },
    { id: '1608', name: 'Marseille La Valentine', population: 78768, pop_10min: 78768, pop_20min: 112297, pop_30min: 130673, pop_custom: 127207 },
    { id: '834', name: 'Villefranche Sur Saône', population: 70617, pop_10min: 70617, pop_20min: 113944, pop_30min: 137817, pop_custom: 127883 },
    { id: '10', name: 'Aubagne', population: 47870, pop_10min: 47870, pop_20min: 121280, pop_30min: 128864, pop_custom: 128304 },
    { id: '187', name: 'L\'Isle Adam', population: 76418, pop_10min: 76418, pop_20min: 135190, pop_30min: 119422, pop_custom: 128385 },
    { id: '201', name: 'Aix Les Milles', population: 72784, pop_10min: 72784, pop_20min: 139733, pop_30min: 172128, pop_custom: 128797 },
    { id: '77', name: 'Beauvais', population: 50825, pop_10min: 50825, pop_20min: 89237, pop_30min: 116878, pop_custom: 129552 },
    { id: '238', name: 'Agen Boe', population: 55199, pop_10min: 55199, pop_20min: 78302, pop_30min: 116229, pop_custom: 129759 },
    { id: '773', name: 'Grenoble Centre ville', population: 115629, pop_10min: 115629, pop_20min: 132393, pop_30min: 132393, pop_custom: 129926 },
    { id: '338', name: 'Quimper', population: 59763, pop_10min: 59763, pop_20min: 94372, pop_30min: 135907, pop_custom: 130520 },
    { id: '297', name: 'Blois', population: 35298, pop_10min: 35298, pop_20min: 80709, pop_30min: 123472, pop_custom: 130884 },
    { id: '239', name: 'Tarbes', population: 47319, pop_10min: 47319, pop_20min: 86900, pop_30min: 118595, pop_custom: 131049 },
    { id: '156', name: 'Bourges Saint Doulchard', population: 29827, pop_10min: 29827, pop_20min: 77254, pop_30min: 108406, pop_custom: 131771 },
    { id: '118', name: 'Villeneuve D\'Ascq - Campu', population: 56638, pop_10min: 56638, pop_20min: 69041, pop_30min: 132232, pop_custom: 133176 },
    { id: '158', name: 'Bourg En Bresse', population: 50409, pop_10min: 50409, pop_20min: 82512, pop_30min: 114417, pop_custom: 133191 },
    { id: '6', name: 'Rouen Barentin', population: 26135, pop_10min: 26135, pop_20min: 54122, pop_30min: 100660, pop_custom: 133474 },
    { id: '231', name: 'Montbeliard', population: 70689, pop_10min: 70689, pop_20min: 117418, pop_30min: 135593, pop_custom: 135516 },
    { id: '553', name: 'Angers - Les Ponts De Cé', population: 87467, pop_10min: 87467, pop_20min: 135781, pop_30min: 147752, pop_custom: 135546 },
    { id: '127', name: 'Montauban', population: 59354, pop_10min: 59354, pop_20min: 111679, pop_30min: 151640, pop_custom: 135607 },
    { id: '19', name: 'Avignon Nord Le Pontet', population: 74876, pop_10min: 74876, pop_20min: 130099, pop_30min: 140899, pop_custom: 135902 },
    { id: '198', name: 'Saint Brieuc Tregueux', population: 53086, pop_10min: 53086, pop_20min: 122968, pop_30min: 145908, pop_custom: 135930 },
    { id: '195', name: 'Metz Semécourt', population: 71141, pop_10min: 71141, pop_20min: 137723, pop_30min: 148846, pop_custom: 136204 },
    { id: '67', name: 'Mulhouse Wittenheim Kinge', population: 78853, pop_10min: 78853, pop_20min: 145272, pop_30min: 144675, pop_custom: 139072 },
    { id: '65', name: 'Nantes Paridis', population: 102456, pop_10min: 102456, pop_20min: 146450, pop_30min: 159947, pop_custom: 140095 },
    { id: '252', name: 'Épinal', population: 45021, pop_10min: 45021, pop_20min: 92311, pop_30min: 127873, pop_custom: 140291 },
    { id: '230', name: 'Douai - Lambres Lez Douai', population: 75603, pop_10min: 75603, pop_20min: 146718, pop_30min: 153736, pop_custom: 140473 },
    { id: '39', name: 'Bordeaux Mérignac', population: 112500, pop_10min: 112500, pop_20min: 140216, pop_30min: 142674, pop_custom: 140600 },
    { id: '119', name: 'Annemasse', population: 61487, pop_10min: 61487, pop_20min: 112426, pop_30min: 133093, pop_custom: 141137 },
    { id: '296', name: 'Laval', population: 57166, pop_10min: 57166, pop_20min: 102909, pop_30min: 165488, pop_custom: 141201 },
    { id: '72', name: 'Villiers en Bière', population: 36545, pop_10min: 36545, pop_20min: 108660, pop_30min: 136743, pop_custom: 141225 },
    { id: '55', name: 'Plaisir', population: 69709, pop_10min: 69709, pop_20min: 113997, pop_30min: 103099, pop_custom: 141378 },
    { id: '191', name: 'Chartres Mainvilliers', population: 55027, pop_10min: 55027, pop_20min: 100393, pop_30min: 129963, pop_custom: 142459 },
    { id: '97', name: 'Henin Beaumont', population: 63192, pop_10min: 63192, pop_20min: 135465, pop_30min: 137606, pop_custom: 144267 },
    { id: '92', name: 'Niort', population: 45886, pop_10min: 45886, pop_20min: 105362, pop_30min: 147028, pop_custom: 144864 },
    { id: '88', name: 'Troyes - Lavau', population: 78390, pop_10min: 78390, pop_20min: 124965, pop_30min: 151683, pop_custom: 147767 },
    { id: '282', name: 'Le Mans Sud Ruaudin', population: 58001, pop_10min: 58001, pop_20min: 120031, pop_30min: 154442, pop_custom: 147863 },
    { id: '100', name: 'Nantes - Atlantis Saint H', population: 97098, pop_10min: 97098, pop_20min: 159920, pop_30min: 171143, pop_custom: 147864 },
    { id: '236', name: 'Mulhouse - Dornach', population: 99951, pop_10min: 99951, pop_20min: 139264, pop_30min: 188836, pop_custom: 148169 },
    { id: '24', name: 'Valenciennes - Petite For', population: 48633, pop_10min: 48633, pop_20min: 128081, pop_30min: 187616, pop_custom: 148441 },
    { id: '14', name: 'Sainte Genevieve Des Bois', population: 68179, pop_10min: 68179, pop_20min: 147497, pop_30min: 148905, pop_custom: 148759 },
    { id: '344', name: 'Haguenau', population: 47422, pop_10min: 47422, pop_20min: 90631, pop_30min: 133701, pop_custom: 149183 },
    { id: '33', name: 'Compiègne - Jaux', population: 47342, pop_10min: 47342, pop_20min: 111023, pop_30min: 138781, pop_custom: 149869 },
    { id: '60', name: 'Le Havre Montivilliers', population: 63597, pop_10min: 63597, pop_20min: 78314, pop_30min: 115822, pop_custom: 151610 },
    { id: '74', name: 'Angers Beaucouzé', population: 101546, pop_10min: 101546, pop_20min: 130445, pop_30min: 167239, pop_custom: 155610 },
    { id: '81', name: 'Besançon', population: 57769, pop_10min: 57769, pop_20min: 134249, pop_30min: 171477, pop_custom: 155962 },
    { id: '162', name: 'Thionville Yutz', population: 77049, pop_10min: 77049, pop_20min: 152747, pop_30min: 170687, pop_custom: 158538 },
    { id: '403', name: 'Chalon Sur Saone', population: 48932, pop_10min: 48932, pop_20min: 93612, pop_30min: 148231, pop_custom: 158762 },
    { id: '149', name: 'Meaux', population: 67134, pop_10min: 67134, pop_20min: 148607, pop_30min: 187825, pop_custom: 158871 },
    { id: '1130', name: 'Essentiel Rennes', population: 66352, pop_10min: 66352, pop_20min: 113678, pop_30min: 122062, pop_custom: 158894 },
    { id: '640', name: 'Albi', population: 52005, pop_10min: 52005, pop_20min: 95537, pop_30min: 136759, pop_custom: 159034 },
    { id: '765', name: 'Chasse Sur Rhone', population: 53676, pop_10min: 53676, pop_20min: 124276, pop_30min: 142873, pop_custom: 159035 },
    { id: '83', name: 'Saint Etienne Villars', population: 57147, pop_10min: 57147, pop_20min: 126739, pop_30min: 192283, pop_custom: 159378 },
    { id: '53', name: 'Anglet', population: 63446, pop_10min: 63446, pop_20min: 135583, pop_30min: 165748, pop_custom: 159702 },
    { id: '13', name: 'Poitiers - Vouneuil Sous ', population: 53003, pop_10min: 53003, pop_20min: 131655, pop_30min: 158013, pop_custom: 160416 },
    { id: '17', name: 'Montpellier Odysseum', population: 37630, pop_10min: 37630, pop_20min: 112540, pop_30min: 150071, pop_custom: 160515 },
    { id: '22', name: 'Bordeaux Lac', population: 65239, pop_10min: 65239, pop_20min: 138103, pop_30min: 143159, pop_custom: 161857 },
    { id: '148', name: 'Cholet', population: 56429, pop_10min: 56429, pop_20min: 112167, pop_30min: 139965, pop_custom: 163081 },
    { id: '216', name: 'Lorient', population: 66578, pop_10min: 66578, pop_20min: 152454, pop_30min: 179708, pop_custom: 164806 },
    { id: '25', name: 'Chambray Les Tours', population: 93070, pop_10min: 93070, pop_20min: 144347, pop_30min: 165643, pop_custom: 165420 },
    { id: '96', name: 'Lens Vendin Le Vieil', population: 169329, pop_10min: 169329, pop_20min: 188919, pop_30min: 187940, pop_custom: 166553 },
    { id: '818', name: 'Coignières', population: 54395, pop_10min: 54395, pop_20min: 120238, pop_30min: 166300, pop_custom: 167587 },
    { id: '79', name: 'Fouquières lès Béthune', population: 92760, pop_10min: 92760, pop_20min: 176425, pop_30min: 185552, pop_custom: 168184 },
    { id: '18', name: 'Toulouse Portet Sur Garon', population: 85497, pop_10min: 85497, pop_20min: 136417, pop_30min: 169956, pop_custom: 168715 },
    { id: '63', name: 'Dunkerque - Grande Synthe', population: 73803, pop_10min: 73803, pop_20min: 162997, pop_30min: 174476, pop_custom: 168793 },
    { id: '308', name: 'Vannes', population: 66406, pop_10min: 66406, pop_20min: 143367, pop_30min: 193109, pop_custom: 169943 },
    { id: '42', name: 'Metz Augny', population: 73801, pop_10min: 73801, pop_20min: 141722, pop_30min: 157350, pop_custom: 170082 },
    { id: '152', name: 'Saint Nazaire', population: 70098, pop_10min: 70098, pop_20min: 130955, pop_30min: 160927, pop_custom: 172415 },
    { id: '3470', name: 'Montpellier Polygone', population: 125634, pop_10min: 125634, pop_20min: 190304, pop_30min: 212722, pop_custom: 172648 },
    { id: '450', name: 'Saint Quentin', population: 44228, pop_10min: 44228, pop_20min: 79773, pop_30min: 134547, pop_custom: 172689 },
    { id: '125', name: 'Mantes La Jolie Buchelay', population: 91920, pop_10min: 91920, pop_20min: 149576, pop_30min: 168129, pop_custom: 174670 },
    { id: '80', name: 'Tours Nord', population: 76195, pop_10min: 76195, pop_20min: 142553, pop_30min: 180130, pop_custom: 177040 },
    { id: '89', name: 'Rouen Tourville La Rivièr', population: 47557, pop_10min: 47557, pop_20min: 128128, pop_30min: 145709, pop_custom: 178181 },
    { id: '454', name: 'Colmar', population: 66169, pop_10min: 66169, pop_20min: 142063, pop_30min: 177571, pop_custom: 179002 },
    { id: '2', name: 'Neuville - en - Ferrain R', population: 71379, pop_10min: 71379, pop_20min: 239973, pop_30min: 483521, pop_custom: 179041 },
    { id: '115', name: 'Forbach', population: 62241, pop_10min: 62241, pop_20min: 114998, pop_30min: 181028, pop_custom: 179587 },
    { id: '35', name: 'Limoges', population: 45050, pop_10min: 45050, pop_20min: 169993, pop_30min: 220764, pop_custom: 180250 },
    { id: '354', name: 'City Bordeaux - Sainte Ca', population: 83407, pop_10min: 83407, pop_20min: 105151, pop_30min: 103160, pop_custom: 180748 },
    { id: '90', name: 'Paris Wagram', population: 177274, pop_10min: 177274, pop_20min: 173969, pop_30min: 173969, pop_custom: 181079 },
    { id: '48', name: 'Orléans', population: 116353, pop_10min: 116353, pop_20min: 181996, pop_30min: 227116, pop_custom: 182536 },
    { id: '1975', name: 'City Paris Bd Saint-Germa', population: 137134, pop_10min: 137134, pop_20min: 191267, pop_30min: 191267, pop_custom: 183763 },
    { id: '122', name: 'Rennes Chantepie', population: 68326, pop_10min: 68326, pop_20min: 116734, pop_30min: 147000, pop_custom: 184355 },
    { id: '66', name: 'Villeneuve les Béziers', population: 65026, pop_10min: 65026, pop_20min: 129303, pop_30min: 161249, pop_custom: 187586 },
    { id: '1994', name: 'City Lyon Grolée-Carnot', population: 183822, pop_10min: 183822, pop_20min: 269397, pop_30min: 253465, pop_custom: 188375 },
    { id: '95', name: 'Amiens', population: 35757, pop_10min: 35757, pop_20min: 120438, pop_30min: 184544, pop_custom: 188636 },
    { id: '116', name: 'Strasbourg Geispolsheim', population: 48803, pop_10min: 48803, pop_20min: 123050, pop_30min: 171569, pop_custom: 190253 },
    { id: '70', name: 'Nice Lingostière', population: 48621, pop_10min: 48621, pop_20min: 95423, pop_30min: 116694, pop_custom: 190922 },
    { id: '200', name: 'Saint-Denis Stade De Fran', population: 149133, pop_10min: 149133, pop_20min: 196314, pop_30min: 187077, pop_custom: 191016 },
    { id: '134', name: 'Pontault Combault', population: 110443, pop_10min: 110443, pop_20min: 168726, pop_30min: 166487, pop_custom: 192055 },
    { id: '2532', name: 'Rouen Centre Ville', population: 86697, pop_10min: 86697, pop_20min: 248394, pop_30min: 267647, pop_custom: 192338 },
    { id: '2534', name: 'Saint Etienne Monthieu', population: 128893, pop_10min: 128893, pop_20min: 185915, pop_30min: 199901, pop_custom: 192981 },
    { id: '1924', name: 'Strasbourg Les Halles', population: 152618, pop_10min: 152618, pop_20min: 248851, pop_30min: 249023, pop_custom: 197942 },
    { id: '5', name: 'Toulon La Garde', population: 95837, pop_10min: 95837, pop_20min: 165602, pop_30min: 192605, pop_custom: 198146 },
    { id: '289', name: 'Parly 2 Versailles Le Che', population: 130639, pop_10min: 130639, pop_20min: 255428, pop_30min: 256129, pop_custom: 198406 },
    { id: '212', name: 'Cergy-Pontoise Osny', population: 142766, pop_10min: 142766, pop_20min: 226949, pop_30min: 233897, pop_custom: 199675 },
    { id: '121', name: 'Lyon Bron Saint Exupery', population: 197048, pop_10min: 197048, pop_20min: 225951, pop_30min: 202035, pop_custom: 200765 },
    { id: '175', name: 'Perpignan', population: 73104, pop_10min: 73104, pop_20min: 193348, pop_30min: 229631, pop_custom: 200987 },
    { id: '82', name: 'Claye Souilly', population: 75862, pop_10min: 75862, pop_20min: 227536, pop_30min: 170966, pop_custom: 203261 },
    { id: '69', name: 'Toulon Ollioules', population: 145063, pop_10min: 145063, pop_20min: 207755, pop_30min: 213905, pop_custom: 206098 },
    { id: '34', name: 'Nantes - Vertou', population: 98700, pop_10min: 98700, pop_20min: 129352, pop_30min: 151232, pop_custom: 207331 },
    { id: '61', name: 'Creil - Saint Maximin', population: 67739, pop_10min: 67739, pop_20min: 159112, pop_30min: 202194, pop_custom: 208698 },
    { id: '225', name: 'Bretigny Sur Orge', population: 86613, pop_10min: 86613, pop_20min: 144107, pop_30min: 199663, pop_custom: 209616 },
    { id: '505', name: 'Croissy-Beaubourg', population: 95832, pop_10min: 95832, pop_20min: 190720, pop_30min: 202466, pop_custom: 212398 },
    { id: '214', name: 'Bourgoin Jallieu', population: 47489, pop_10min: 47489, pop_20min: 95872, pop_30min: 131048, pop_custom: 213987 },
    { id: '62', name: 'Clermont-Ferrand', population: 71150, pop_10min: 71150, pop_20min: 186929, pop_30min: 225977, pop_custom: 221148 },
    { id: '2361', name: 'Evry', population: 55656, pop_10min: 55656, pop_20min: 189676, pop_30min: 265189, pop_custom: 222387 },
    { id: '16', name: 'Vélizy', population: 191667, pop_10min: 191667, pop_20min: 246462, pop_30min: 219175, pop_custom: 222900 },
    { id: '52', name: 'Nimes', population: 85782, pop_10min: 85782, pop_20min: 205034, pop_30min: 243680, pop_custom: 227104 },
    { id: '353', name: 'Valence', population: 72648, pop_10min: 72648, pop_20min: 153241, pop_30min: 221296, pop_custom: 228440 },
    { id: '132', name: 'Nancy Houdemont', population: 100784, pop_10min: 100784, pop_20min: 183850, pop_30min: 222390, pop_custom: 229913 },
    { id: '27', name: 'Pau Lescar', population: 25488, pop_10min: 25488, pop_20min: 127388, pop_30min: 167310, pop_custom: 231984 },
    { id: '41', name: 'Chambourcy', population: 110522, pop_10min: 110522, pop_20min: 263164, pop_30min: 231905, pop_custom: 233368 },
    { id: '28', name: 'Dijon Quetigny', population: 71632, pop_10min: 71632, pop_20min: 209457, pop_30min: 249205, pop_custom: 241467 },
    { id: '32', name: 'Brest Guipavas', population: 85980, pop_10min: 85980, pop_20min: 188310, pop_30min: 251132, pop_custom: 242093 },
    { id: '3449', name: 'Paris Montparnasse City', population: 229587, pop_10min: 229587, pop_20min: 257993, pop_30min: 257993, pop_custom: 246645 },
    { id: '31', name: 'Reims Cormontreuil', population: 76012, pop_10min: 76012, pop_20min: 179661, pop_30min: 216755, pop_custom: 255735 },
    { id: '1125', name: 'Essentiel Villebon Sur Yv', population: 130637, pop_10min: 130637, pop_20min: 263185, pop_30min: 287201, pop_custom: 261027 },
    { id: '26', name: 'Bois Sénart', population: 61795, pop_10min: 61795, pop_20min: 178115, pop_30min: 173100, pop_custom: 263774 },
    { id: '186', name: 'Groslay Sarcelles', population: 186849, pop_10min: 186849, pop_20min: 322493, pop_30min: 304099, pop_custom: 276397 },
    { id: '426', name: 'Gennevilliers', population: 94998, pop_10min: 94998, pop_20min: 269280, pop_30min: 263770, pop_custom: 277198 },
    { id: '2329', name: 'City Batignolles', population: 275597, pop_10min: 275597, pop_20min: 288595, pop_30min: 288595, pop_custom: 288595 },
    { id: '49', name: 'Toulouse Centre Ville', population: 189519, pop_10min: 189519, pop_20min: 307739, pop_30min: 322149, pop_custom: 296868 },
    { id: '8', name: 'Creteil', population: 238361, pop_10min: 238361, pop_20min: 379452, pop_30min: 338155, pop_custom: 297836 },
    { id: '1601', name: 'Bry-Sur-Marne Les Armoiri', population: 159314, pop_10min: 159314, pop_20min: 357451, pop_30min: 374886, pop_custom: 312394 },
    { id: '1995', name: 'O\'Parinor', population: 49627, pop_10min: 49627, pop_20min: 268234, pop_30min: 340430, pop_custom: 320615 },
    { id: '429', name: 'Paris Rive Gauche', population: 331609, pop_10min: 331609, pop_20min: 389720, pop_30min: 396412, pop_custom: 334549 },
    { id: '846', name: 'Marseille Terrasses Du Po', population: 112090, pop_10min: 112090, pop_20min: 378943, pop_30min: 376998, pop_custom: 346164 },
    { id: '288', name: 'Lyon Part Dieu', population: 202071, pop_10min: 202071, pop_20min: 291051, pop_30min: 333209, pop_custom: 363059 },
    { id: '468', name: 'Thiais Village', population: 174189, pop_10min: 174189, pop_20min: 338360, pop_30min: 331706, pop_custom: 365532 },
    { id: '11', name: 'Herblay', population: 165891, pop_10min: 165891, pop_20min: 287557, pop_30min: 301842, pop_custom: 380238 },
    { id: '78', name: 'Domus - Rosny sous Bois', population: 52313, pop_10min: 52313, pop_20min: 306467, pop_30min: 382045, pop_custom: 392717 },
    { id: '1375', name: 'Paris 19 Rosa Parks', population: 322887, pop_10min: 322887, pop_20min: 391261, pop_30min: 389067, pop_custom: 397657 },
    { id: '243', name: 'Paris Porte De Montreuil', population: 447708, pop_10min: 447708, pop_20min: 476061, pop_30min: 432295, pop_custom: 415089 },
    { id: '539', name: 'Paris Cnit La Défense', population: 271366, pop_10min: 271366, pop_20min: 520557, pop_30min: 565268, pop_custom: 415616 },
    { id: '58', name: 'Paris Aquaboulevard', population: 382207, pop_10min: 382207, pop_20min: 526186, pop_30min: 550904, pop_custom: 526476 },
  ];
  const insertStore = db.prepare(`INSERT OR IGNORE INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom) VALUES (@id, @name, @population, @pop_10min, @pop_20min, @pop_30min, @pop_custom)`);
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
