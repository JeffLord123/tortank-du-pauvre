import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> },
) {
  const { id: simId, hypothesisId } = await params;
  const {
    name, maxBudgetPerStore, objectiveMode, budgetMode, totalBudget,
    retrocommissionPercent, collapsed, storeDistributionMode, zoneId,
  } = await request.json();

  await sql`
    UPDATE hypotheses SET
      name                    = COALESCE(${name ?? null}, name),
      max_budget_per_store    = COALESCE(${maxBudgetPerStore ?? null}, max_budget_per_store),
      objective_mode          = COALESCE(${objectiveMode ?? null}, objective_mode),
      budget_mode             = COALESCE(${budgetMode ?? null}, budget_mode),
      total_budget            = COALESCE(${totalBudget ?? null}, total_budget),
      retrocommission_percent = COALESCE(${retrocommissionPercent ?? null}, retrocommission_percent),
      collapsed               = COALESCE(${collapsed !== undefined ? (collapsed ? 1 : 0) : null}, collapsed),
      store_distribution_mode = COALESCE(${storeDistributionMode ?? null}, store_distribution_mode),
      zone_id                 = COALESCE(${zoneId ?? null}, zone_id)
    WHERE id = ${hypothesisId} AND simulation_id = ${simId}
  `;
  return NextResponse.json({ id: hypothesisId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> },
) {
  const { id: simId, hypothesisId } = await params;
  await sql`DELETE FROM hypotheses WHERE id = ${hypothesisId} AND simulation_id = ${simId}`;
  return new NextResponse(null, { status: 204 });
}
