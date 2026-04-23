import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { rowToStore } from '@/lib/route-utils';
import { randomUUID } from 'crypto';

export async function GET() {
  const rows = await sql`SELECT * FROM stores ORDER BY sort_order, id`;
  return NextResponse.json(rows.map(rowToStore));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { id, name, population, pop10min, pop20min, pop30min, popCustom, budgetWeightPercent } = body;
  const storeId: string = id || randomUUID();
  const p10 = pop10min ?? population ?? 0;
  const p20 = pop20min ?? population ?? 0;
  const p30 = pop30min ?? population ?? 0;
  const pCrm = popCustom ?? 0;
  const pop = population ?? p10;
  const w = budgetWeightPercent != null && !Number.isNaN(Number(budgetWeightPercent)) ? Number(budgetWeightPercent) : null;

  const [{ max_order }] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM stores`;
  const sortOrder = Number(max_order) + 1;

  await sql`
    INSERT INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom, budget_weight_percent, sort_order)
    VALUES (${storeId}, ${name}, ${pop}, ${p10}, ${p20}, ${p30}, ${pCrm}, ${w}, ${sortOrder})
  `;
  const [row] = await sql`SELECT * FROM stores WHERE id = ${storeId}`;
  return NextResponse.json(rowToStore(row), { status: 201 });
}
