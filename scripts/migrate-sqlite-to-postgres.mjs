#!/usr/bin/env node
/**
 * Migrates data from the local SQLite database (server/data.db) to a PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tortank node scripts/migrate-sqlite-to-postgres.mjs
 *
 * The script is idempotent: re-running it won't duplicate data (ON CONFLICT DO NOTHING).
 * It does NOT touch or modify the SQLite file (opened read-only).
 */

import Database from 'better-sqlite3';
import postgres from 'postgres';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tortank';
const SQLITE_PATH = resolve(ROOT, 'server/data.db');

console.log(`Source:      ${SQLITE_PATH}`);
console.log(`Destination: ${DATABASE_URL.replace(/:([^@]+)@/, ':***@')}`);

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const sql = postgres(DATABASE_URL, { onnotice: () => {} });

// ── Apply schema ────────────────────────────────────────────────────────────
console.log('\nApplying schema...');
const schema = readFileSync(resolve(ROOT, 'src/lib/db/schema.sql'), 'utf8');
await sql.unsafe(schema);
console.log('Schema ready.');

// ── Helpers ─────────────────────────────────────────────────────────────────
function count(table) {
  const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  return row.c;
}

// ── global_params ────────────────────────────────────────────────────────────
console.log('\nMigrating global_params...');
const gpRows = sqlite.prepare('SELECT * FROM global_params').all();
for (const r of gpRows) {
  await sql`
    INSERT INTO global_params (id, default_population, max_budget_per_store, default_total_budget, max_budget_slider, max_repetition_slider)
    VALUES (${r.id}, ${r.default_population}, ${r.max_budget_per_store}, ${r.default_total_budget ?? 1500}, ${r.max_budget_slider ?? 3000}, ${r.max_repetition_slider ?? 20})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  global_params: ${gpRows.length} rows`);

// ── lever_configs ────────────────────────────────────────────────────────────
console.log('Migrating lever_configs...');
const lcRows = sqlite.prepare('SELECT * FROM lever_configs').all();
for (const r of lcRows) {
  await sql`
    INSERT INTO lever_configs (type, label, family, default_cpm, purchase_cpm, min_budget_per_store, max_coverage, color, icon, auto_budget_percent, logo_url, hidden)
    VALUES (${r.type}, ${r.label ?? null}, ${r.family ?? null}, ${r.default_cpm}, ${r.purchase_cpm ?? 0}, ${r.min_budget_per_store}, ${r.max_coverage}, ${r.color}, ${r.icon}, ${r.auto_budget_percent}, ${r.logo_url ?? null}, ${r.hidden ?? 0})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  lever_configs: ${lcRows.length} rows`);

// ── stores (sort_order from rowid) ────────────────────────────────────────────
console.log('Migrating stores...');
const storeRows = sqlite.prepare('SELECT *, rowid FROM stores ORDER BY rowid').all();
for (let i = 0; i < storeRows.length; i++) {
  const r = storeRows[i];
  await sql`
    INSERT INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom, budget_weight_percent, sort_order)
    VALUES (${r.id}, ${r.name}, ${r.population ?? 0}, ${r.pop_10min ?? 0}, ${r.pop_20min ?? 0}, ${r.pop_30min ?? 0}, ${r.pop_custom ?? 0}, ${r.budget_weight_percent ?? null}, ${i})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  stores: ${storeRows.length} rows`);

// ── presets ──────────────────────────────────────────────────────────────────
console.log('Migrating presets...');
const presetRows = sqlite.prepare('SELECT * FROM presets ORDER BY sort_order').all();
for (const r of presetRows) {
  await sql`
    INSERT INTO presets (id, name, description, objective_mode, budget_mode, scope, owner_profile_id, sort_order, total_budget, max_budget_per_store)
    VALUES (${r.id}, ${r.name}, ${r.description ?? ''}, ${r.objective_mode ?? 'budget'}, ${r.budget_mode ?? 'automatique'}, ${r.scope ?? 'admin'}, ${r.owner_profile_id ?? null}, ${r.sort_order ?? 0}, ${r.total_budget ?? null}, ${r.max_budget_per_store ?? null})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  presets: ${presetRows.length} rows`);

// ── preset_levers ─────────────────────────────────────────────────────────────
console.log('Migrating preset_levers...');
const plRows = sqlite.prepare('SELECT * FROM preset_levers ORDER BY sort_order').all();
for (const r of plRows) {
  await sql`
    INSERT INTO preset_levers (id, preset_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, sort_order)
    VALUES (${r.id}, ${r.preset_id}, ${r.type}, ${r.cpm ?? 0}, ${r.purchase_cpm ?? 0}, ${r.min_budget_per_store ?? 0}, ${r.budget ?? 0}, ${r.budget_percent ?? 0}, ${r.repetition ?? 3}, ${r.coverage ?? 30}, ${r.max_coverage ?? 65}, ${r.impressions ?? 0}, ${r.start_date ?? ''}, ${r.end_date ?? ''}, ${r.sort_order ?? 0})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  preset_levers: ${plRows.length} rows`);

// ── simulations ───────────────────────────────────────────────────────────────
console.log('Migrating simulations...');
const simRows = sqlite.prepare('SELECT * FROM simulations').all();
for (const r of simRows) {
  await sql`
    INSERT INTO simulations (id, name, start_date, end_date, created_at, updated_at, profile_id)
    VALUES (${r.id}, ${r.name}, ${r.start_date}, ${r.end_date}, ${r.created_at}, ${r.updated_at}, ${r.profile_id ?? null})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  simulations: ${simRows.length} rows`);

// ── hypotheses ────────────────────────────────────────────────────────────────
console.log('Migrating hypotheses...');
const hypRows = sqlite.prepare('SELECT * FROM hypotheses ORDER BY sort_order').all();
for (const r of hypRows) {
  await sql`
    INSERT INTO hypotheses (id, simulation_id, name, max_budget_per_store, objective_mode, budget_mode, total_budget, retrocommission_percent, collapsed, sort_order, store_distribution_mode, zone_id)
    VALUES (${r.id}, ${r.simulation_id}, ${r.name}, ${r.max_budget_per_store ?? 0}, ${r.objective_mode ?? 'budget'}, ${r.budget_mode ?? 'automatique'}, ${r.total_budget ?? 0}, ${r.retrocommission_percent ?? 0}, ${r.collapsed ?? 0}, ${r.sort_order ?? 0}, ${r.store_distribution_mode ?? 'egal'}, ${r.zone_id ?? 'zone1'})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  hypotheses: ${hypRows.length} rows`);

// ── levers ────────────────────────────────────────────────────────────────────
console.log('Migrating levers...');
const leverRows = sqlite.prepare('SELECT * FROM levers ORDER BY sort_order').all();
for (const r of leverRows) {
  await sql`
    INSERT INTO levers (id, hypothesis_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, collapsed, sort_order)
    VALUES (${r.id}, ${r.hypothesis_id}, ${r.type}, ${r.cpm ?? 0}, ${r.purchase_cpm ?? 0}, ${r.min_budget_per_store ?? 0}, ${r.budget ?? 0}, ${r.budget_percent ?? 0}, ${r.repetition ?? 3}, ${r.coverage ?? 30}, ${r.max_coverage ?? 65}, ${r.impressions ?? 0}, ${r.start_date ?? ''}, ${r.end_date ?? ''}, ${r.collapsed ?? 0}, ${r.sort_order ?? 0})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  levers: ${leverRows.length} rows`);

// ── prestations ───────────────────────────────────────────────────────────────
console.log('Migrating prestations...');
const presRows = sqlite.prepare('SELECT * FROM prestations ORDER BY sort_order').all();
for (const r of presRows) {
  await sql`
    INSERT INTO prestations (id, simulation_id, name, category, quantity, production_cost, price, offered, sort_order)
    VALUES (${r.id}, ${r.simulation_id}, ${r.name ?? ''}, ${r.category ?? null}, ${r.quantity ?? 1}, ${r.production_cost ?? 0}, ${r.price ?? 0}, ${r.offered ?? 0}, ${r.sort_order ?? 0})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  prestations: ${presRows.length} rows`);

// ── excel_uploads ─────────────────────────────────────────────────────────────
console.log('Migrating excel_uploads...');
const uploadRows = sqlite.prepare('SELECT * FROM excel_uploads').all();
for (const r of uploadRows) {
  await sql`
    INSERT INTO excel_uploads (id, filename, uploaded_at, row_count, replace_all)
    VALUES (${r.id}, ${r.filename}, ${r.uploaded_at}, ${r.row_count ?? 0}, ${r.replace_all ?? 1})
    ON CONFLICT DO NOTHING
  `;
}
console.log(`  excel_uploads: ${uploadRows.length} rows`);

// ── history (explicit IDs, then reset sequence) ───────────────────────────────
console.log('Migrating history...');
const historyTotal = count('history');
const historyRows = sqlite.prepare('SELECT * FROM history ORDER BY id').all();
for (const r of historyRows) {
  await sql`
    INSERT INTO history (id, ts, profile_id, actor_pseudo, simulation_id, action_label, snapshot_json)
    VALUES (${r.id}, ${r.ts}, ${r.profile_id ?? null}, ${r.actor_pseudo ?? null}, ${r.simulation_id ?? null}, ${r.action_label}, ${r.snapshot_json})
    ON CONFLICT DO NOTHING
  `;
}
// Reset the BIGSERIAL sequence so next INSERT gets a fresh id
await sql`SELECT setval('history_id_seq', COALESCE((SELECT MAX(id) FROM history), 0))`;
console.log(`  history: ${historyRows.length} / ${historyTotal} rows`);

sqlite.close();
await sql.end();

console.log('\nMigration complete.');
