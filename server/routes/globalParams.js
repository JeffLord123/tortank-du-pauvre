import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM global_params WHERE id = 1').get();
  res.json({
    defaultPopulation: row.default_population,
    maxBudgetPerStore: row.max_budget_per_store,
    typicalBudgetPerStore: row.default_total_budget ?? 1500,
    maxBudgetSliderPerStore: row.max_budget_slider ?? 3000,
    maxRepetitionSlider: row.max_repetition_slider ?? 10,
  });
});

router.put('/', (req, res) => {
  const { defaultPopulation, maxBudgetPerStore, typicalBudgetPerStore, maxBudgetSliderPerStore, maxRepetitionSlider } = req.body;
  db.prepare(`INSERT INTO global_params (id, default_population, max_budget_per_store, default_total_budget, max_budget_slider, max_repetition_slider) VALUES (1, @dp, @mb, @dtb, @mbs, @mrs)
    ON CONFLICT(id) DO UPDATE SET default_population = @dp, max_budget_per_store = @mb, default_total_budget = @dtb, max_budget_slider = @mbs, max_repetition_slider = @mrs`)
    .run({ dp: defaultPopulation, mb: maxBudgetPerStore, dtb: typicalBudgetPerStore ?? 1500, mbs: maxBudgetSliderPerStore ?? 3000, mrs: maxRepetitionSlider ?? 10 });
  res.json({ defaultPopulation, maxBudgetPerStore, typicalBudgetPerStore, maxBudgetSliderPerStore, maxRepetitionSlider });
});

export default router;
