import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function toClient(row) {
  return {
    type: row.type,
    label: row.label ?? undefined,
    family: row.family ?? undefined,
    defaultCpm: row.default_cpm,
    purchaseCpm: row.purchase_cpm ?? 0,
    minBudgetPerStore: row.min_budget_per_store,
    maxCoverage: row.max_coverage,
    color: row.color,
    icon: row.icon,
    autoBudgetPercent: row.auto_budget_percent,
    hidden: !!row.hidden,
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
    purchaseCpm,
    minBudgetPerStore,
    maxCoverage,
    color,
    icon,
    autoBudgetPercent,
    hidden,
    label,
    family,
  } = req.body;

  let logo_url = row.logo_url;
  if (Object.prototype.hasOwnProperty.call(req.body, 'logoUrl')) {
    logo_url = req.body.logoUrl;
  }

  db.prepare(`UPDATE lever_configs SET
    label = COALESCE(@label, label),
    family = COALESCE(@family, family),
    default_cpm = COALESCE(@defaultCpm, default_cpm),
    purchase_cpm = COALESCE(@purchaseCpm, purchase_cpm),
    min_budget_per_store = COALESCE(@minBudgetPerStore, min_budget_per_store),
    max_coverage = COALESCE(@maxCoverage, max_coverage),
    color = COALESCE(@color, color),
    icon = COALESCE(@icon, icon),
    auto_budget_percent = COALESCE(@autoBudgetPercent, auto_budget_percent),
    hidden = COALESCE(@hidden, hidden),
    logo_url = @logo_url
    WHERE type = @type`)
    .run({
      type,
      label: label ?? null,
      family: family ?? null,
      defaultCpm: defaultCpm ?? null,
      purchaseCpm: purchaseCpm ?? null,
      minBudgetPerStore: minBudgetPerStore ?? null,
      maxCoverage: maxCoverage ?? null,
      color: color ?? null,
      icon: icon ?? null,
      autoBudgetPercent: autoBudgetPercent ?? null,
      hidden: hidden != null ? (hidden ? 1 : 0) : null,
      logo_url,
    });

  const updated = db.prepare('SELECT * FROM lever_configs WHERE type = ?').get(type);
  res.json(toClient(updated));
});

export default router;
