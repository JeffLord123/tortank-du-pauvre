import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const simId = (await params).id;
  const { id, name, category, quantity, productionCost, price, offered } = await request.json();

  const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM prestations WHERE simulation_id = ${simId}`;
  await sql`
    INSERT INTO prestations (id, simulation_id, name, category, quantity, production_cost, price, offered, sort_order)
    VALUES (${id}, ${simId}, ${name ?? ''}, ${category ?? null}, ${quantity ?? 1}, ${productionCost ?? 0}, ${price ?? 0}, ${offered ? 1 : 0}, ${Number(c)})
  `;
  return NextResponse.json({ id }, { status: 201 });
}
