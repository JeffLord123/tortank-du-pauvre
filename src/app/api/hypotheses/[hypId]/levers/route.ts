import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hypId: string }> },
) {
  const hypId = (await params).hypId;
  const {
    id, type, cpm, purchaseCpm, minBudgetPerStore, budget, budgetPercent,
    repetition, coverage, maxCoverage, impressions, startDate, endDate, collapsed, sort_order,
    includedInHypothesis,
  } = await request.json();
  const incl = includedInHypothesis === false ? 0 : 1;

  await sql`
    INSERT INTO levers (id, hypothesis_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, collapsed, sort_order, included_in_hypothesis)
    VALUES (
      ${id}, ${hypId}, ${type},
      ${cpm ?? 0}, ${purchaseCpm ?? 0}, ${minBudgetPerStore ?? 0},
      ${budget ?? 0}, ${budgetPercent ?? 0}, ${repetition ?? 3},
      ${coverage ?? 30}, ${maxCoverage ?? 65}, ${impressions ?? 0},
      ${startDate || ''}, ${endDate || ''}, ${collapsed ? 1 : 0}, ${sort_order ?? 0}, ${incl}
    )
  `;
  return NextResponse.json({ id }, { status: 201 });
}
