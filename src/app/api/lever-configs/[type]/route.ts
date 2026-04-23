import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { leverConfigToClient } from '@/lib/route-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const [row] = await sql`SELECT * FROM lever_configs WHERE type = ${type}`;
  if (!row) return NextResponse.json({ error: 'Unknown lever type' }, { status: 404 });

  const body = await request.json();
  const { defaultCpm, purchaseCpm, minBudgetPerStore, maxCoverage, color, icon, autoBudgetPercent, hidden, label, family } = body;
  const logo_url = Object.prototype.hasOwnProperty.call(body, 'logoUrl') ? body.logoUrl : row.logo_url;

  await sql`
    UPDATE lever_configs SET
      label                = COALESCE(${label ?? null}, label),
      family               = COALESCE(${family ?? null}, family),
      default_cpm          = COALESCE(${defaultCpm ?? null}, default_cpm),
      purchase_cpm         = COALESCE(${purchaseCpm ?? null}, purchase_cpm),
      min_budget_per_store = COALESCE(${minBudgetPerStore ?? null}, min_budget_per_store),
      max_coverage         = COALESCE(${maxCoverage ?? null}, max_coverage),
      color                = COALESCE(${color ?? null}, color),
      icon                 = COALESCE(${icon ?? null}, icon),
      auto_budget_percent  = COALESCE(${autoBudgetPercent ?? null}, auto_budget_percent),
      hidden               = COALESCE(${hidden != null ? (hidden ? 1 : 0) : null}, hidden),
      logo_url             = ${logo_url ?? null}
    WHERE type = ${type}
  `;

  const [updated] = await sql`SELECT * FROM lever_configs WHERE type = ${type}`;
  return NextResponse.json(leverConfigToClient(updated));
}
