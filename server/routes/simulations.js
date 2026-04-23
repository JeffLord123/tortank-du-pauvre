import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function getFullSimulation(id) {
  const sim = db.prepare('SELECT * FROM simulations WHERE id = ?').get(id);
  if (!sim) return null;

  const hypotheses = db.prepare('SELECT * FROM hypotheses WHERE simulation_id = ? ORDER BY sort_order').all(id);
  const allLevers = db.prepare(`
    SELECT l.* FROM levers l
    JOIN hypotheses h ON l.hypothesis_id = h.id
    WHERE h.simulation_id = ?
    ORDER BY l.sort_order
  `).all(id);
  const prestations = db.prepare('SELECT * FROM prestations WHERE simulation_id = ? ORDER BY sort_order').all(id);

  return {
    id: sim.id,
    name: sim.name,
    startDate: sim.start_date,
    endDate: sim.end_date,
    prestations: prestations.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category ?? undefined,
      quantity: p.quantity,
      productionCost: p.production_cost,
      price: p.price,
      offered: p.offered === 1,
    })),
    hypotheses: hypotheses.map(h => ({
      id: h.id,
      name: h.name,
      maxBudgetPerStore: h.max_budget_per_store,
      objectiveMode: h.objective_mode,
      budgetMode: h.budget_mode,
      totalBudget: h.total_budget,
      retrocommissionPercent: h.retrocommission_percent ?? 0,
      storeDistributionMode: h.store_distribution_mode ?? 'egal',
      collapsed: h.collapsed === 1,
      levers: allLevers
        .filter(l => l.hypothesis_id === h.id)
        .map(l => ({
          id: l.id,
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
          collapsed: l.collapsed === 1,
        })),
    })),
  };
}

// List simulations — filtrées par `profileId`, avec fallback sur la plus récente toutes simulations
router.get('/', (req, res) => {
  const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : null;
  let rows = profileId
    ? db.prepare(
        'SELECT id, name, start_date, end_date, created_at FROM simulations WHERE profile_id = ? ORDER BY updated_at DESC',
      ).all(profileId)
    : db.prepare('SELECT id, name, start_date, end_date, created_at FROM simulations ORDER BY updated_at DESC').all();

  // Fallback: if no simulation found for this profile, return the most recent one globally
  // and re-associate it to this profile so future loads work correctly
  if (rows.length === 0 && profileId) {
    rows = db.prepare('SELECT id, name, start_date, end_date, created_at FROM simulations ORDER BY updated_at DESC LIMIT 1').all();
    if (rows.length > 0) {
      db.prepare('UPDATE simulations SET profile_id = ? WHERE id = ?').run(profileId, rows[0].id);
    }
  }

  res.json(rows.map(r => ({ id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at })));
});

// Get single simulation with full nested data
router.get('/:id', (req, res) => {
  const sim = getFullSimulation(req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  res.json(sim);
});

// Create simulation
router.post('/', (req, res) => {
  const { id, name, startDate, endDate, profileId } = req.body;
  if (!profileId || typeof profileId !== 'string') {
    return res.status(400).json({ error: 'profileId requis pour rattacher la simulation au profil' });
  }
  db.prepare('INSERT INTO simulations (id, name, start_date, end_date, profile_id) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name,
    startDate,
    endDate,
    profileId,
  );
  res.status(201).json(getFullSimulation(id));
});

// Update simulation
router.put('/:id', (req, res) => {
  const { name, startDate, endDate } = req.body;
  db.prepare(`UPDATE simulations SET
    name = COALESCE(?, name),
    start_date = COALESCE(?, start_date),
    end_date = COALESCE(?, end_date),
    updated_at = datetime('now')
    WHERE id = ?`).run(name, startDate, endDate, req.params.id);
  res.json(getFullSimulation(req.params.id));
});

// Delete simulation
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM simulations WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Replace a simulation (full snapshot): upserts simulation, wipes and re-inserts
// hypotheses + levers. Used by undo/redo to restore historical state atomically.
router.put('/:id/replace', (req, res) => {
  const simId = req.params.id;
  const body = req.body ?? {};
  const { name, startDate, endDate, profileId, hypotheses } = body;
  if (!Array.isArray(hypotheses)) {
    return res.status(400).json({ error: 'hypotheses[] required' });
  }

  const tx = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM simulations WHERE id = ?').get(simId);
    if (existing) {
      db.prepare(`UPDATE simulations SET
        name = COALESCE(?, name),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        profile_id = COALESCE(?, profile_id),
        updated_at = datetime('now')
        WHERE id = ?`).run(name ?? null, startDate ?? null, endDate ?? null, profileId ?? null, simId);
    } else {
      db.prepare('INSERT INTO simulations (id, name, start_date, end_date, profile_id) VALUES (?, ?, ?, ?, ?)').run(
        simId, name ?? '', startDate ?? '', endDate ?? '', profileId ?? null,
      );
    }
    // Cascade delete hypotheses (which cascades levers)
    db.prepare('DELETE FROM hypotheses WHERE simulation_id = ?').run(simId);

    const insertHyp = db.prepare(`INSERT INTO hypotheses (id, simulation_id, name, max_budget_per_store, objective_mode, budget_mode, total_budget, retrocommission_percent, collapsed, sort_order, store_distribution_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertLever = db.prepare(`INSERT INTO levers (id, hypothesis_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, collapsed, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < hypotheses.length; i++) {
      const h = hypotheses[i];
      insertHyp.run(
        h.id,
        simId,
        h.name ?? '',
        h.maxBudgetPerStore ?? 0,
        h.objectiveMode ?? 'budget',
        h.budgetMode ?? 'automatique',
        h.totalBudget ?? 0,
        h.retrocommissionPercent ?? 0,
        h.collapsed ? 1 : 0,
        i,
        h.storeDistributionMode ?? 'egal',
      );
      const levers = Array.isArray(h.levers) ? h.levers : [];
      for (let j = 0; j < levers.length; j++) {
        const l = levers[j];
        insertLever.run(
          l.id, h.id, l.type, l.cpm ?? 0, l.purchaseCpm ?? 0, l.minBudgetPerStore ?? 0, l.budget ?? 0,
          l.budgetPercent ?? 0, l.repetition ?? 0, l.coverage ?? 0, l.maxCoverage ?? 0,
          l.impressions ?? 0, l.startDate ?? '', l.endDate ?? '', l.collapsed ? 1 : 0, j,
        );
      }
    }
  });
  tx();
  res.json(getFullSimulation(simId));
});

// ── Prestations ─────────────────────────────────────────────────
router.post('/:simId/prestations', (req, res) => {
  const { id, name, category, quantity, productionCost, price, offered } = req.body;
  const sortOrder = db.prepare('SELECT COUNT(*) as c FROM prestations WHERE simulation_id = ?').get(req.params.simId).c;
  db.prepare(`INSERT INTO prestations (id, simulation_id, name, category, quantity, production_cost, price, offered, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.simId, name ?? '', category ?? null, quantity ?? 1, productionCost ?? 0, price ?? 0, offered ? 1 : 0, sortOrder);
  res.status(201).json({ id });
});

router.put('/:simId/prestations/:id', (req, res) => {
  const { name, category, quantity, productionCost, price, offered } = req.body;
  db.prepare(`UPDATE prestations SET
    name = COALESCE(?, name),
    category = COALESCE(?, category),
    quantity = COALESCE(?, quantity),
    production_cost = COALESCE(?, production_cost),
    price = COALESCE(?, price),
    offered = COALESCE(?, offered)
    WHERE id = ? AND simulation_id = ?`)
    .run(name ?? null, category ?? null, quantity ?? null, productionCost ?? null, price ?? null, offered !== undefined ? (offered ? 1 : 0) : null, req.params.id, req.params.simId);
  res.json({ id: req.params.id });
});

router.delete('/:simId/prestations/:id', (req, res) => {
  db.prepare('DELETE FROM prestations WHERE id = ? AND simulation_id = ?').run(req.params.id, req.params.simId);
  res.status(204).end();
});

// ── Hypotheses ──────────────────────────────────────────────────
router.post('/:simId/hypotheses', (req, res) => {
  const {
    id,
    name,
    maxBudgetPerStore,
    objectiveMode,
    budgetMode,
    totalBudget,
    retrocommissionPercent,
    collapsed,
    sort_order,
    storeDistributionMode,
  } = req.body;
  db.prepare(`INSERT INTO hypotheses (id, simulation_id, name, max_budget_per_store, objective_mode, budget_mode, total_budget, retrocommission_percent, collapsed, sort_order, store_distribution_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      req.params.simId,
      name,
      maxBudgetPerStore ?? 0,
      objectiveMode ?? 'budget',
      budgetMode ?? 'automatique',
      totalBudget ?? 0,
      retrocommissionPercent ?? 0,
      collapsed ? 1 : 0,
      sort_order ?? 0,
      storeDistributionMode ?? 'egal',
    );
  res.status(201).json({ id });
});

router.put('/:simId/hypotheses/:id', (req, res) => {
  const { name, maxBudgetPerStore, objectiveMode, budgetMode, totalBudget, retrocommissionPercent, collapsed, storeDistributionMode } = req.body;
  db.prepare(`UPDATE hypotheses SET
    name = COALESCE(?, name),
    max_budget_per_store = COALESCE(?, max_budget_per_store),
    objective_mode = COALESCE(?, objective_mode),
    budget_mode = COALESCE(?, budget_mode),
    total_budget = COALESCE(?, total_budget),
    retrocommission_percent = COALESCE(?, retrocommission_percent),
    collapsed = COALESCE(?, collapsed),
    store_distribution_mode = COALESCE(?, store_distribution_mode)
    WHERE id = ? AND simulation_id = ?`)
    .run(
      name,
      maxBudgetPerStore,
      objectiveMode,
      budgetMode,
      totalBudget,
      retrocommissionPercent,
      collapsed !== undefined ? (collapsed ? 1 : 0) : undefined,
      storeDistributionMode,
      req.params.id,
      req.params.simId,
    );
  res.json({ id: req.params.id });
});

router.delete('/:simId/hypotheses/:id', (req, res) => {
  db.prepare('DELETE FROM hypotheses WHERE id = ? AND simulation_id = ?').run(req.params.id, req.params.simId);
  res.status(204).end();
});

export default router;
