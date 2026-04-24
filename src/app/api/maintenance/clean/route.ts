import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST() {
  const tables = ['simulations', 'hypotheses', 'levers'];
  await sql.begin(async tx => {
    for (const t of tables) {
      await tx.unsafe(`DELETE FROM ${t}`);
    }
  });
  return NextResponse.json({ ok: true, cleaned: tables });
}
