import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function toClient(row) {
  return {
    type: row.type,
    defaultCpm: row.default_cpm,
    minBudgetPerStore: row.min_budget_per_store,
    maxCoverage: row.max_coverage,
    color: row.color,
    icon: row.icon,
    autoBudgetPercent: row.auto_budget_percent,
    logoUrl: row.logo_url != null ? row.logo_url : null,
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM lever_configs').all();
  res.json(rows.map(toClient));
});

router.put('/:type', (req, res) => {
  const { type } = req.params;
  const row = db.prepare('SELECT * FROM lever_configs WHERE type = ?').get(type);
  if (!row) {
    res.status(404).json({ error: 'Unknown lever type' });
    return;
  }

  const {
    defaultCpm,
    minBudgetPerStore,
    maxCoverage,
    color,
    icon,
    autoBudgetPercent,
  } = req.body;

  let logo_url = row.logo_url;
  if (Object.prototype.hasOwnProperty.call(req.body, 'logoUrl')) {
    logo_url = req.body.logoUrl;
  }

  db.prepare(`UPDATE lever_configs SET
    default_cpm = COALESCE(@defaultCpm, default_cpm),
    min_budget_per_store = COALESCE(@minBudgetPerStore, min_budget_per_store),
    max_coverage = COALESCE(@maxCoverage, max_coverage),
    color = COALESCE(@color, color),
    icon = COALESCE(@icon, icon),
    auto_budget_percent = COALESCE(@autoBudgetPercent, auto_budget_percent),
    logo_url = @logo_url
    WHERE type = @type`)
    .run({
      type,
      defaultCpm,
      minBudgetPerStore,
      maxCoverage,
      color,
      icon,
      autoBudgetPercent,
      logo_url,
    });

  const updated = db.prepare('SELECT * FROM lever_configs WHERE type = ?').get(type);
  res.json(toClient(updated));
});

export default router;
