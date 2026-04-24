import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ hypId: string; prestationId: string }> },
) {
  const { hypId, prestationId } = await params;
  const { name, category, quantity, productionCost, price, offered, fromPreset } = await request.json();
  await sql`
    UPDATE prestations SET
      name            = COALESCE(${name ?? null}, name),
      category        = COALESCE(${category ?? null}, category),
      quantity        = COALESCE(${quantity ?? null}, quantity),
      production_cost = COALESCE(${productionCost ?? null}, production_cost),
      price           = COALESCE(${price ?? null}, price),
      offered         = COALESCE(${offered !== undefined ? (offered ? 1 : 0) : null}, offered),
      from_preset     = COALESCE(${fromPreset !== undefined ? (fromPreset ? 1 : 0) : null}, from_preset)
    WHERE id = ${prestationId} AND hypothesis_id = ${hypId}
  `;
  return NextResponse.json({ id: prestationId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ hypId: string; prestationId: string }> },
) {
  const { hypId, prestationId } = await params;
  await sql`DELETE FROM prestations WHERE id = ${prestationId} AND hypothesis_id = ${hypId}`;
  return new NextResponse(null, { status: 204 });
}
