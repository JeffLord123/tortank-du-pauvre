import sql from '@/lib/db/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function leverConfigToClient(row: Record<string, any>) {
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
    logoUrl: row.logo_url ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToStore(r: Record<string, any>) {
  return {
    id: r.id,
    name: r.name,
    population: r.population ?? r.pop_10min ?? 0,
    pop10min: r.pop_10min ?? 0,
    pop20min: r.pop_20min ?? 0,
    pop30min: r.pop_30min ?? 0,
    popCustom: r.pop_custom ?? 0,
    budgetWeightPercent: r.budget_weight_percent ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFullSimulation(id: string): Promise<Record<string, any> | null> {
  const [sim] = await sql`SELECT * FROM simulations WHERE id = ${id}`;
  if (!sim) return null;

  const hypotheses = await sql`SELECT * FROM hypotheses WHERE simulation_id = ${id} ORDER BY sort_order`;
  const allLevers = await sql`
    SELECT l.* FROM levers l
    JOIN hypotheses h ON l.hypothesis_id = h.id
    WHERE h.simulation_id = ${id}
    ORDER BY l.sort_order
  `;
  const prestations = await sql`SELECT * FROM prestations WHERE simulation_id = ${id} ORDER BY sort_order`;

  return {
    id: sim.id,
    name: sim.name,
    startDate: sim.start_date,
    endDate: sim.end_date,
    prestations: prestations.map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? undefined,
      quantity: p.quantity,
      productionCost: p.production_cost,
      price: p.price,
      offered: p.offered === 1,
    })),
    hypotheses: hypotheses.map((h: Record<string, unknown>) => ({
      id: h.id,
      name: h.name,
      maxBudgetPerStore: h.max_budget_per_store,
      objectiveMode: h.objective_mode,
      budgetMode: h.budget_mode,
      totalBudget: h.total_budget,
      retrocommissionPercent: h.retrocommission_percent ?? 0,
      storeDistributionMode: h.store_distribution_mode ?? 'egal',
      zoneId: h.zone_id ?? 'zone1',
      collapsed: h.collapsed === 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      levers: (allLevers as any[])
        .filter((l: Record<string, unknown>) => l.hypothesis_id === h.id)
        .map((l: Record<string, unknown>) => ({
          id: l.id,
          type: l.type,
          cpm: l.cpm,
          purchaseCpm: l.purchase_cpm ?? 0,
          minBudgetPerStore: l.min_budget_per_store,
          budget: l.budget,
          budgetPercent: l.budget_percent,
          repetition: l.repetition,
          coverage: l.coverage,
          maxCoverage: l.max_coverage,
          impressions: l.impressions,
          startDate: l.start_date,
          endDate: l.end_date,
          collapsed: l.collapsed === 1,
        })),
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPresetsWithLevers(): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presets = await sql`SELECT * FROM presets ORDER BY sort_order` as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const levers = await sql`SELECT * FROM preset_levers ORDER BY sort_order` as any[];
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    objectiveMode: p.objective_mode,
    budgetMode: p.budget_mode,
    totalBudget: p.total_budget ?? undefined,
    maxBudgetPerStore: p.max_budget_per_store ?? undefined,
    scope: p.scope || 'admin',
    ownerProfileId: p.owner_profile_id ?? null,
    levers: levers
      .filter((l: Record<string, unknown>) => l.preset_id === p.id)
      .map((l: Record<string, unknown>) => ({
        type: l.type,
        cpm: l.cpm,
        purchaseCpm: l.purchase_cpm ?? 0,
        minBudgetPerStore: l.min_budget_per_store,
        budget: l.budget,
        budgetPercent: l.budget_percent,
        repetition: l.repetition,
        coverage: l.coverage,
        maxCoverage: l.max_coverage,
        impressions: l.impressions,
        startDate: l.start_date,
        endDate: l.end_date,
      })),
  }));
}
