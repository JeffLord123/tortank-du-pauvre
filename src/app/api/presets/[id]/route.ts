import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { getPresetsWithLevers } from '@/lib/route-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, description } = await request.json();
  const [row] = await sql`SELECT * FROM presets WHERE id = ${id}`;
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (name === undefined && description === undefined) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }
  let newName = row.name as string;
  let newDesc = row.description as string;
  if (name !== undefined) {
    const t = String(name).trim();
    if (!t) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    newName = t;
  }
  if (description !== undefined) newDesc = String(description);
  await sql`UPDATE presets SET name = ${newName}, description = ${newDesc ?? ''} WHERE id = ${id}`;
  const all = await getPresetsWithLevers();
  return NextResponse.json(all.find(p => p.id === id));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await sql`DELETE FROM presets WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
