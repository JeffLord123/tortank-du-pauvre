-- Final PostgreSQL schema (no migrations — full clean state)

CREATE TABLE IF NOT EXISTS global_params (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  default_population    INTEGER NOT NULL DEFAULT 140000,
  max_budget_per_store  INTEGER NOT NULL DEFAULT 10000,
  default_total_budget  INTEGER NOT NULL DEFAULT 1500,
  max_budget_slider     INTEGER NOT NULL DEFAULT 3000,
  max_repetition_slider INTEGER NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS lever_configs (
  type                 TEXT PRIMARY KEY,
  label                TEXT,
  family               TEXT,
  default_cpm          DOUBLE PRECISION NOT NULL,
  purchase_cpm         DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_budget_per_store INTEGER NOT NULL,
  max_coverage         INTEGER NOT NULL,
  color                TEXT NOT NULL,
  icon                 TEXT NOT NULL,
  auto_budget_percent  INTEGER NOT NULL,
  logo_url             TEXT,
  hidden               INTEGER NOT NULL DEFAULT 0
);

-- sort_order preserves insertion / rowid order from SQLite
CREATE TABLE IF NOT EXISTS stores (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  population            INTEGER NOT NULL DEFAULT 0,
  pop_10min             INTEGER NOT NULL DEFAULT 0,
  pop_20min             INTEGER NOT NULL DEFAULT 0,
  pop_30min             INTEGER NOT NULL DEFAULT 0,
  pop_custom            INTEGER NOT NULL DEFAULT 0,
  budget_weight_percent DOUBLE PRECISION,
  sort_order            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS presets (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  objective_mode       TEXT NOT NULL DEFAULT 'budget',
  budget_mode          TEXT NOT NULL DEFAULT 'automatique',
  scope                TEXT NOT NULL DEFAULT 'admin',
  owner_profile_id     TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  total_budget         DOUBLE PRECISION,
  max_budget_per_store DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS preset_levers (
  id                   TEXT PRIMARY KEY,
  preset_id            TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  cpm                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  purchase_cpm         DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_budget_per_store INTEGER NOT NULL DEFAULT 0,
  budget               DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget_percent       DOUBLE PRECISION NOT NULL DEFAULT 0,
  repetition           DOUBLE PRECISION NOT NULL DEFAULT 3,
  coverage             DOUBLE PRECISION NOT NULL DEFAULT 30,
  max_coverage         DOUBLE PRECISION NOT NULL DEFAULT 65,
  impressions          DOUBLE PRECISION NOT NULL DEFAULT 0,
  start_date           TEXT NOT NULL DEFAULT '',
  end_date             TEXT NOT NULL DEFAULT '',
  sort_order           INTEGER NOT NULL DEFAULT 0
);

-- Timestamps stored as TEXT matching SQLite's datetime('now') format: 'YYYY-MM-DD HH24:MI:SS'
CREATE TABLE IF NOT EXISTS simulations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
  profile_id TEXT
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id                      TEXT PRIMARY KEY,
  simulation_id           TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  max_budget_per_store    DOUBLE PRECISION NOT NULL DEFAULT 0,
  objective_mode          TEXT NOT NULL DEFAULT 'budget',
  budget_mode             TEXT NOT NULL DEFAULT 'automatique',
  total_budget            DOUBLE PRECISION NOT NULL DEFAULT 0,
  retrocommission_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  collapsed               INTEGER NOT NULL DEFAULT 0,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  store_distribution_mode TEXT NOT NULL DEFAULT 'egal',
  zone_id                 TEXT NOT NULL DEFAULT 'zone1'
);

CREATE TABLE IF NOT EXISTS levers (
  id                   TEXT PRIMARY KEY,
  hypothesis_id        TEXT NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  cpm                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  purchase_cpm         DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_budget_per_store DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget               DOUBLE PRECISION NOT NULL DEFAULT 0,
  budget_percent       DOUBLE PRECISION NOT NULL DEFAULT 0,
  repetition           DOUBLE PRECISION NOT NULL DEFAULT 3,
  coverage             DOUBLE PRECISION NOT NULL DEFAULT 30,
  max_coverage         DOUBLE PRECISION NOT NULL DEFAULT 65,
  impressions          DOUBLE PRECISION NOT NULL DEFAULT 0,
  start_date           TEXT NOT NULL DEFAULT '',
  end_date             TEXT NOT NULL DEFAULT '',
  collapsed            INTEGER NOT NULL DEFAULT 0,
  sort_order           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prestations (
  id              TEXT PRIMARY KEY,
  simulation_id   TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  category        TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  production_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  price           DOUBLE PRECISION NOT NULL DEFAULT 0,
  offered         INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS excel_uploads (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
  row_count   INTEGER NOT NULL DEFAULT 0,
  replace_all INTEGER NOT NULL DEFAULT 1
);

-- BIGSERIAL: auto-increment, migration inserts explicit IDs then resets the sequence
CREATE TABLE IF NOT EXISTS history (
  id            BIGSERIAL PRIMARY KEY,
  ts            TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'),
  profile_id    TEXT,
  actor_pseudo  TEXT,
  simulation_id TEXT,
  action_label  TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts DESC);
CREATE INDEX IF NOT EXISTS idx_history_profile ON history(profile_id);
