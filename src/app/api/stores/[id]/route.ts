import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { rowToStore } from '@/lib/route-utils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, population, pop10min, pop20min, pop30min, popCustom, budgetWeightPercent } = await request.json();
  const w =
    budgetWeightPercent != null && !Number.isNaN(Number(budgetWeightPercent))
      ? Number(budgetWeightPercent)
      : null;

  await sql`
    UPDATE stores SET
      name                  = COALESCE(${name ?? null}, name),
      population            = COALESCE(${population ?? null}, population),
      pop_10min             = COALESCE(${pop10min ?? null}, pop_10min),
      pop_20min             = COALESCE(${pop20min ?? null}, pop_20min),
      pop_30min             = COALESCE(${pop30min ?? null}, pop_30min),
      pop_custom            = COALESCE(${popCustom ?? null}, pop_custom),
      budget_weight_percent = COALESCE(${w}, budget_weight_percent)
    WHERE id = ${id}
  `;

  const [row] = await sql`SELECT * FROM stores WHERE id = ${id}`;
  if (!row) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  return NextResponse.json(rowToStore(row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await sql`DELETE FROM stores WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
