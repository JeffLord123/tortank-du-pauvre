import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function PATCH(request: Request) {
  const { ids } = await request.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });

  await sql.begin(async tx => {
    for (let i = 0; i < ids.length; i++) {
      await tx`UPDATE presets SET sort_order = ${i} WHERE id = ${ids[i]}`;
    }
  });

  return new NextResponse(null, { status: 204 });
}
