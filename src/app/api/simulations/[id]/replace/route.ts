import { NextResponse } from 'next/server';
import sql, { NOW } from '@/lib/db/client';
import { getFullSimulation } from '@/lib/route-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const simId = (await params).id;
  const body = await request.json();
  const { name, startDate, endDate, profileId, hypotheses } = body;
  if (!Array.isArray(hypotheses)) {
    return NextResponse.json({ error: 'hypotheses[] required' }, { status: 400 });
  }

  await sql.begin(async tx => {
    const [existing] = await tx`SELECT id FROM simulations WHERE id = ${simId}`;
    if (existing) {
      await tx`
        UPDATE simulations SET
          name       = COALESCE(${name ?? null}, name),
          start_date = COALESCE(${startDate ?? null}, start_date),
          end_date   = COALESCE(${endDate ?? null}, end_date),
          profile_id = COALESCE(${profileId ?? null}, profile_id),
          updated_at = ${NOW}
        WHERE id = ${simId}
      `;
    } else {
      await tx`
        INSERT INTO simulations (id, name, start_date, end_date, profile_id)
        VALUES (${simId}, ${name ?? ''}, ${startDate ?? ''}, ${endDate ?? ''}, ${profileId ?? null})
      `;
    }

    await tx`DELETE FROM hypotheses WHERE simulation_id = ${simId}`;

    for (let i = 0; i < hypotheses.length; i++) {
      const h = hypotheses[i] as Record<string, unknown>;
      const incl = h.includedInHypothesis === false ? 0 : 1;
      await tx`
        INSERT INTO hypotheses (id, simulation_id, name, max_budget_per_store, objective_mode, budget_mode, total_budget, retrocommission_percent, collapsed, sort_order, store_distribution_mode, zone_id, included_in_hypothesis)
        VALUES (
          ${h.id as string}, ${simId}, ${(h.name as string) ?? ''},
          ${(h.maxBudgetPerStore as number) ?? 0}, ${(h.objectiveMode as string) ?? 'budget'},
          ${(h.budgetMode as string) ?? 'automatique'}, ${(h.totalBudget as number) ?? 0},
          ${(h.retrocommissionPercent as number) ?? 0}, ${h.collapsed ? 1 : 0}, ${i},
          ${(h.storeDistributionMode as string) ?? 'egal'}, ${(h.zoneId as string) ?? 'zone1'}, ${incl}
        )
      `;
      const levers: unknown[] = Array.isArray(h.levers) ? h.levers : [];
      for (let j = 0; j < levers.length; j++) {
        const l = levers[j] as Record<string, unknown>;
        await tx`
          INSERT INTO levers (id, hypothesis_id, type, cpm, purchase_cpm, min_budget_per_store, budget, budget_percent, repetition, coverage, max_coverage, impressions, start_date, end_date, collapsed, sort_order, included_in_hypothesis)
          VALUES (
            ${l.id as string}, ${h.id as string}, ${l.type as string},
            ${(l.cpm as number) ?? 0}, ${(l.purchaseCpm as number) ?? 0},
            ${(l.minBudgetPerStore as number) ?? 0}, ${(l.budget as number) ?? 0},
            ${(l.budgetPercent as number) ?? 0}, ${(l.repetition as number) ?? 0},
            ${(l.coverage as number) ?? 0}, ${(l.maxCoverage as number) ?? 0},
            ${(l.impressions as number) ?? 0}, ${(l.startDate as string) ?? ''},
            ${(l.endDate as string) ?? ''}, ${l.collapsed ? 1 : 0}, ${j},
            ${l.includedInHypothesis === false ? 0 : 1}
          )
        `;
      }
      const prestations: unknown[] = Array.isArray(h.prestations) ? h.prestations : [];
      for (let k = 0; k < prestations.length; k++) {
        const p = prestations[k] as Record<string, unknown>;
        await tx`
          INSERT INTO prestations (id, hypothesis_id, name, category, quantity, production_cost, price, offered, sort_order, from_preset)
          VALUES (
            ${p.id as string}, ${h.id as string}, ${(p.name as string) ?? ''},
            ${(p.category as string) ?? null}, ${(p.quantity as number) ?? 1},
            ${(p.productionCost as number) ?? 0}, ${(p.price as number) ?? 0},
            ${p.offered ? 1 : 0}, ${k}, ${p.fromPreset ? 1 : 0}
          )
        `;
      }
    }
  });

  return NextResponse.json(await getFullSimulation(simId));
}
