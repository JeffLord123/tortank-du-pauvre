import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { getPresetsWithLevers } from '@/lib/route-utils';
import { randomUUID } from 'crypto';

export async function GET() {
  return NextResponse.json(await getPresetsWithLevers());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, objectiveMode, budgetMode, totalBudget, maxBudgetPerStore, levers, prestations, scope, ownerProfileId } = body;
  const presetId: string = body.id || randomUUID();
  const presetScope = scope === 'user' ? 'user' : 'admin';
  const ownerId = presetScope === 'user' ? (ownerProfileId ?? null) : null;
  const tb = typeof totalBudget === 'number' && isFinite(totalBudget) ? totalBudget : null;
  const mbps = typeof maxBudgetPerStore === 'number' && isFinite(maxBudgetPerStore) ? maxBudgetPerStore : null;

  const [{ m }] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS m FROM presets`;
  const nextOrder = Number(m ?? -1) + 1;

  await sql.begin(async tx => {
    await tx`
      INSERT INTO presets (id, name, description, objective_mode, budget_mode, scope, owner_profile_id, sort_order, total_budget, max_budget_per_store)
      VALUES (${presetId}, ${name}, ${description || ''}, ${objectiveMode || 'budget'}, ${budgetMode || 'automatique'}, ${presetScope}, ${ownerId}, ${nextOrder}, ${tb}, ${mbps})
    `;
    const leverList: unknown[] = Array.isArray(levers) ? levers : [];
    for (let i = 0; i < leverList.length; i++) {
      const l = leverList[i] as Record<string, unknown>;
      await tx`
        INSERT INTO preset_levers (id, preset_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, sort_order)
        VALUES (${randomUUID()}, ${presetId}, ${l.type as string}, ${l.cpm as number}, ${(l.purchaseCpm as number) ?? 0}, ${l.minBudgetPerStore as number}, ${l.budget as number}, ${l.budgetPercent as number}, ${l.repetition as number}, ${l.coverage as number}, ${l.maxCoverage as number}, ${l.impressions as number}, ${(l.startDate as string) || ''}, ${(l.endDate as string) || ''}, ${i})
      `;
    }
    const prestList: unknown[] = Array.isArray(prestations) ? prestations : [];
    for (let i = 0; i < prestList.length; i++) {
      const p = prestList[i] as Record<string, unknown>;
      await tx`
        INSERT INTO preset_prestations (id, preset_id, name, category, quantity, production_cost, price, offered, sort_order)
        VALUES (${randomUUID()}, ${presetId}, ${(p.name as string) ?? ''}, ${(p.category as string) ?? null}, ${(p.quantity as number) ?? 1}, ${(p.productionCost as number) ?? 0}, ${(p.price as number) ?? 0}, ${p.offered ? 1 : 0}, ${i})
      `;
    }
  });

  const all = await getPresetsWithLevers();
  const created = all.find(p => p.id === presetId);
  return NextResponse.json(created, { status: 201 });
}
