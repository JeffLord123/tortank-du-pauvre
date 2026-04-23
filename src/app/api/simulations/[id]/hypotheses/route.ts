import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const simId = (await params).id;
  const {
    id, name, maxBudgetPerStore, objectiveMode, budgetMode, totalBudget,
    retrocommissionPercent, collapsed, sort_order, storeDistributionMode, zoneId,
  } = await request.json();

  await sql`
    INSERT INTO hypotheses (id, simulation_id, name, max_budget_per_store, objective_mode, budget_mode, total_budget, retrocommission_percent, collapsed, sort_order, store_distribution_mode, zone_id)
    VALUES (
      ${id}, ${simId}, ${name},
      ${maxBudgetPerStore ?? 0}, ${objectiveMode ?? 'budget'}, ${budgetMode ?? 'automatique'},
      ${totalBudget ?? 0}, ${retrocommissionPercent ?? 0}, ${collapsed ? 1 : 0},
      ${sort_order ?? 0}, ${storeDistributionMode ?? 'egal'}, ${zoneId ?? 'zone1'}
    )
  `;
  return NextResponse.json({ id }, { status: 201 });
}
