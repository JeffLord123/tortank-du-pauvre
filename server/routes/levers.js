import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.post('/:hypId/levers', (req, res) => {
  const { id, type, cpm, purchaseCpm, minBudgetPerStore, budget, budgetPercent, repetition, coverage, maxCoverage, impressions, startDate, endDate, collapsed, sort_order } = req.body;
  db.prepare(`INSERT INTO levers (id, hypothesis_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, collapsed, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.hypId, type, cpm ?? 0, purchaseCpm ?? 0, minBudgetPerStore ?? 0, budget ?? 0, budgetPercent ?? 0, repetition ?? 3, coverage ?? 30, maxCoverage ?? 65, impressions ?? 0, startDate || '', endDate || '', collapsed ? 1 : 0, sort_order ?? 0);
  res.status(201).json({ id });
});

router.put('/:hypId/levers/:id', (req, res) => {
  const { type, cpm, purchaseCpm, minBudgetPerStore, budget, budgetPercent, repetition, coverage, maxCoverage, impressions, startDate, endDate, collapsed } = req.body;
  db.prepare(`UPDATE levers SET
    type = COALESCE(?, type),
    cpm = COALESCE(?, cpm),
    purchase_cpm = COALESCE(?, purchase_cpm),
    min_budget_per_store = COALESCE(?, min_budget_per_store),
    budget = COALESCE(?, budget),
    budget_percent = COALESCE(?, budget_percent),
    repetition = COALESCE(?, repetition),
    coverage = COALESCE(?, coverage),
    max_coverage = COALESCE(?, max_coverage),
    impressions = COALESCE(?, impressions),
    start_date = COALESCE(?, start_date),
    end_date = COALESCE(?, end_date),
    collapsed = COALESCE(?, collapsed)
    WHERE id = ? AND hypothesis_id = ?`)
    .run(type, cpm, purchaseCpm, minBudgetPerStore, budget, budgetPercent, repetition, coverage, maxCoverage, impressions, startDate, endDate,
      collapsed !== undefined ? (collapsed ? 1 : 0) : undefined,
      req.params.id, req.params.hypId);
  res.json({ id: req.params.id });
});

router.delete('/:hypId/levers/:id', (req, res) => {
  db.prepare('DELETE FROM levers WHERE id = ? AND hypothesis_id = ?').run(req.params.id, req.params.hypId);
  res.status(204).end();
});

export default router;
