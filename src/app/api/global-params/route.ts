import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET() {
  const [row] = await sql`SELECT * FROM global_params WHERE id = 1`;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    defaultPopulation: row.default_population,
    maxBudgetPerStore: row.max_budget_per_store,
    typicalBudgetPerStore: row.default_total_budget ?? 1500,
    maxBudgetSliderPerStore: row.max_budget_slider ?? 3000,
    maxRepetitionSlider: row.max_repetition_slider ?? 10,
  });
}

export async function PUT(request: Request) {
  const { defaultPopulation, maxBudgetPerStore, typicalBudgetPerStore, maxBudgetSliderPerStore, maxRepetitionSlider } =
    await request.json();
  await sql`
    INSERT INTO global_params (id, default_population, max_budget_per_store, default_total_budget, max_budget_slider, max_repetition_slider)
    VALUES (1, ${defaultPopulation}, ${maxBudgetPerStore}, ${typicalBudgetPerStore ?? 1500}, ${maxBudgetSliderPerStore ?? 3000}, ${maxRepetitionSlider ?? 10})
    ON CONFLICT (id) DO UPDATE SET
      default_population    = EXCLUDED.default_population,
      max_budget_per_store  = EXCLUDED.max_budget_per_store,
      default_total_budget  = EXCLUDED.default_total_budget,
      max_budget_slider     = EXCLUDED.max_budget_slider,
      max_repetition_slider = EXCLUDED.max_repetition_slider
  `;
  return NextResponse.json({ defaultPopulation, maxBudgetPerStore, typicalBudgetPerStore, maxBudgetSliderPerStore, maxRepetitionSlider });
}
