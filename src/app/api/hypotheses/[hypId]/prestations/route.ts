import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hypId: string }> },
) {
  const { hypId } = await params;
  const [hyp] = await sql`SELECT id FROM hypotheses WHERE id = ${hypId}`;
  if (!hyp) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });

  const { id, name, category, quantity, productionCost, price, offered, fromPreset } = await request.json();
  const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM prestations WHERE hypothesis_id = ${hypId}`;
  await sql`
    INSERT INTO prestations (id, hypothesis_id, name, category, quantity, production_cost, price, offered, sort_order, from_preset)
    VALUES (${id}, ${hypId}, ${name ?? ''}, ${category ?? null}, ${quantity ?? 1}, ${productionCost ?? 0}, ${price ?? 0}, ${offered ? 1 : 0}, ${Number(c)}, ${fromPreset ? 1 : 0})
  `;
  return NextResponse.json({ id }, { status: 201 });
}
