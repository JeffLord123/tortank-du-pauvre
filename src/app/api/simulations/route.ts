import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { getFullSimulation } from '@/lib/route-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');

  let rows = profileId
    ? await sql`SELECT id, name, start_date, end_date, created_at FROM simulations WHERE profile_id = ${profileId} ORDER BY updated_at DESC`
    : await sql`SELECT id, name, start_date, end_date, created_at FROM simulations ORDER BY updated_at DESC`;

  // Fallback: no simulation for this profile → re-associate the most recent one
  if (rows.length === 0 && profileId) {
    rows = await sql`SELECT id, name, start_date, end_date, created_at FROM simulations ORDER BY updated_at DESC LIMIT 1`;
    if (rows.length > 0) {
      await sql`UPDATE simulations SET profile_id = ${profileId} WHERE id = ${rows[0].id}`;
    }
  }

  return NextResponse.json(
    rows.map(r => ({ id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at })),
  );
}

export async function POST(request: Request) {
  const { id, name, startDate, endDate, profileId } = await request.json();
  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ error: 'profileId requis pour rattacher la simulation au profil' }, { status: 400 });
  }
  await sql`
    INSERT INTO simulations (id, name, start_date, end_date, profile_id)
    VALUES (${id}, ${name}, ${startDate}, ${endDate}, ${profileId})
  `;
  return NextResponse.json(await getFullSimulation(id), { status: 201 });
}
