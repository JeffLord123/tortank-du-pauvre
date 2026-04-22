import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM global_params WHERE id = 1').get();
  res.json({
    defaultPopulation: row.default_population,
    maxBudgetPerStore: row.max_budget_per_store,
    defaultTotalBudget: row.default_total_budget ?? 500000,
    maxBudgetSlider: row.max_budget_slider ?? 500000,
    maxRepetitionSlider: row.max_repetition_slider ?? 10,
  });
});

router.put('/', (req, res) => {
  const { defaultPopulation, maxBudgetPerStore, defaultTotalBudget, maxBudgetSlider, maxRepetitionSlider } = req.body;
  db.prepare(`INSERT INTO global_params (id, default_population, max_budget_per_store, default_total_budget, max_budget_slider, max_repetition_slider) VALUES (1, @dp, @mb, @dtb, @mbs, @mrs)
    ON CONFLICT(id) DO UPDATE SET default_population = @dp, max_budget_per_store = @mb, default_total_budget = @dtb, max_budget_slider = @mbs, max_repetition_slider = @mrs`)
    .run({ dp: defaultPopulation, mb: maxBudgetPerStore, dtb: defaultTotalBudget ?? 500000, mbs: maxBudgetSlider ?? 500000, mrs: maxRepetitionSlider ?? 10 });
  res.json({ defaultPopulation, maxBudgetPerStore, defaultTotalBudget, maxBudgetSlider, maxRepetitionSlider });
});

export default router;
