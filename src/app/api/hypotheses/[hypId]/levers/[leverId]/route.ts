import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ hypId: string; leverId: string }> },
) {
  const { hypId, leverId } = await params;
  const {
    type, cpm, purchaseCpm, minBudgetPerStore, budget, budgetPercent,
    repetition, coverage, maxCoverage, impressions, startDate, endDate, collapsed,
  } = await request.json();

  await sql`
    UPDATE levers SET
      type                 = COALESCE(${type ?? null}, type),
      cpm                  = COALESCE(${cpm ?? null}, cpm),
      purchase_cpm         = COALESCE(${purchaseCpm ?? null}, purchase_cpm),
      min_budget_per_store = COALESCE(${minBudgetPerStore ?? null}, min_budget_per_store),
      budget               = COALESCE(${budget ?? null}, budget),
      budget_percent       = COALESCE(${budgetPercent ?? null}, budget_percent),
      repetition           = COALESCE(${repetition ?? null}, repetition),
      coverage             = COALESCE(${coverage ?? null}, coverage),
      max_coverage         = COALESCE(${maxCoverage ?? null}, max_coverage),
      impressions          = COALESCE(${impressions ?? null}, impressions),
      start_date           = COALESCE(${startDate ?? null}, start_date),
      end_date             = COALESCE(${endDate ?? null}, end_date),
      collapsed            = COALESCE(${collapsed !== undefined ? (collapsed ? 1 : 0) : null}, collapsed)
    WHERE id = ${leverId} AND hypothesis_id = ${hypId}
  `;
  return NextResponse.json({ id: leverId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ hypId: string; leverId: string }> },
) {
  const { hypId, leverId } = await params;
  await sql`DELETE FROM levers WHERE id = ${leverId} AND hypothesis_id = ${hypId}`;
  return new NextResponse(null, { status: 204 });
}
