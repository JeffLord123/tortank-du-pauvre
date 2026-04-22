import { Router } from 'express';
import db from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();

function getPresetsWithLevers() {
  const presets = db.prepare('SELECT * FROM presets ORDER BY sort_order').all();
  const levers = db.prepare('SELECT * FROM preset_levers ORDER BY sort_order').all();
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    objectiveMode: p.objective_mode,
    budgetMode: p.budget_mode,
    totalBudget: p.total_budget ?? undefined,
    maxBudgetPerStore: p.max_budget_per_store ?? undefined,
    scope: p.scope || 'admin',
    ownerProfileId: p.owner_profile_id ?? null,
    levers: levers
      .filter(l => l.preset_id === p.id)
      .map(l => ({
        type: l.type,
        cpm: l.cpm,
        purchaseCpm: l.purchase_cpm ?? 0,
        minBudgetPerStore: l.min_budget_per_store,
        budget: l.budget,
        budgetPercent: l.budget_percent,
        repetition: l.repetition,
        coverage: l.coverage,
        maxCoverage: l.max_coverage,
        impressions: l.impressions,
        startDate: l.start_date,
        endDate: l.end_date,
      })),
  }));
}

router.get('/', (_req, res) => {
  res.json(getPresetsWithLevers());
});

router.post('/', (req, res) => {
  const { name, description, objectiveMode, budgetMode, totalBudget, maxBudgetPerStore, levers, scope, ownerProfileId } = req.body;
  const id = req.body.id || randomUUID();
  const presetScope = scope === 'user' ? 'user' : 'admin';
  const ownerId = presetScope === 'user' ? (ownerProfileId || null) : null;
  const tb = (typeof totalBudget === 'number' && isFinite(totalBudget)) ? totalBudget : null;
  const mbps = (typeof maxBudgetPerStore === 'number' && isFinite(maxBudgetPerStore)) ? maxBudgetPerStore : null;

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM presets').get();
  const nextOrder = (maxOrder?.m ?? -1) + 1;

  const insertPreset = db.prepare(`INSERT INTO presets (id, name, description, objective_mode, budget_mode, scope, owner_profile_id, sort_order, total_budget, max_budget_per_store) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertLever = db.prepare(`INSERT INTO preset_levers (id, preset_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  db.transaction(() => {
    insertPreset.run(id, name, description || '', objectiveMode || 'budget', budgetMode || 'automatique', presetScope, ownerId, nextOrder, tb, mbps);
    (levers || []).forEach((l, i) => {
      insertLever.run(randomUUID(), id, l.type, l.cpm, l.purchaseCpm ?? 0, l.minBudgetPerStore, l.budget, l.budgetPercent, l.repetition, l.coverage, l.maxCoverage, l.impressions, l.startDate || '', l.endDate || '', i);
    });
  })();

  const created = getPresetsWithLevers().find(p => p.id === id);
  res.status(201).json(created);
});

router.patch('/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const update = db.prepare('UPDATE presets SET sort_order = ? WHERE id = ?');
  db.transaction(() => {
    ids.forEach((id, i) => update.run(i, id));
  })();
  res.status(204).end();
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM presets WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
