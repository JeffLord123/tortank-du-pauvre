import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { leverConfigToClient } from '@/lib/route-utils';

export async function GET() {
  const rows = await sql`SELECT * FROM lever_configs`;
  return NextResponse.json(rows.map(leverConfigToClient));
}
