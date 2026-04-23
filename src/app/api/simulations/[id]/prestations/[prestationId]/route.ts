import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; prestationId: string }> },
) {
  const { id: simId, prestationId } = await params;
  const { name, category, quantity, productionCost, price, offered } = await request.json();
  await sql`
    UPDATE prestations SET
      name            = COALESCE(${name ?? null}, name),
      category        = COALESCE(${category ?? null}, category),
      quantity        = COALESCE(${quantity ?? null}, quantity),
      production_cost = COALESCE(${productionCost ?? null}, production_cost),
      price           = COALESCE(${price ?? null}, price),
      offered         = COALESCE(${offered !== undefined ? (offered ? 1 : 0) : null}, offered)
    WHERE id = ${prestationId} AND simulation_id = ${simId}
  `;
  return NextResponse.json({ id: prestationId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; prestationId: string }> },
) {
  const { id: simId, prestationId } = await params;
  await sql`DELETE FROM prestations WHERE id = ${prestationId} AND simulation_id = ${simId}`;
  return new NextResponse(null, { status: 204 });
}
