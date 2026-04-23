import { NextResponse } from 'next/server';
import sql, { NOW } from '@/lib/db/client';
import { getFullSimulation } from '@/lib/route-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sim = await getFullSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  return NextResponse.json(sim);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, startDate, endDate } = await request.json();
  await sql`
    UPDATE simulations SET
      name       = COALESCE(${name ?? null}, name),
      start_date = COALESCE(${startDate ?? null}, start_date),
      end_date   = COALESCE(${endDate ?? null}, end_date),
      updated_at = ${NOW}
    WHERE id = ${id}
  `;
  return NextResponse.json(await getFullSimulation(id));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await sql`DELETE FROM simulations WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
