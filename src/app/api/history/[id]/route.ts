import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await sql`DELETE FROM history WHERE id = ${Number(id)}`;
  return new NextResponse(null, { status: 204 });
}
