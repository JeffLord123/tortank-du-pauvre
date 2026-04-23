import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

const MAX_GLOBAL = 2000;
const MAX_PER_PROFILE = 200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  const limit = Math.min(Number(searchParams.get('limit')) || 500, 2000);

  const rows = profileId
    ? await sql`SELECT id, ts, profile_id, actor_pseudo, simulation_id, action_label, snapshot_json FROM history WHERE profile_id = ${profileId} ORDER BY id DESC LIMIT ${limit}`
    : await sql`SELECT id, ts, profile_id, actor_pseudo, simulation_id, action_label, snapshot_json FROM history ORDER BY id DESC LIMIT ${limit}`;

  return NextResponse.json(
    rows.map(r => ({
      id: Number(r.id),
      ts: r.ts,
      profileId: r.profile_id,
      actorPseudo: r.actor_pseudo,
      simulationId: r.simulation_id,
      actionLabel: r.action_label,
      snapshot: JSON.parse(r.snapshot_json as string),
    })),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { profileId, actorPseudo, simulationId, actionLabel, snapshot } = body ?? {};
  if (!actionLabel || snapshot === undefined) {
    return NextResponse.json({ error: 'actionLabel and snapshot required' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO history (profile_id, actor_pseudo, simulation_id, action_label, snapshot_json)
    VALUES (${profileId ?? null}, ${actorPseudo ?? null}, ${simulationId ?? null}, ${String(actionLabel)}, ${JSON.stringify(snapshot)})
    RETURNING id, ts
  `;

  // Rolling per-profile cap
  if (profileId) {
    const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM history WHERE profile_id = ${profileId}`;
    if (Number(c) > MAX_PER_PROFILE) {
      await sql`
        DELETE FROM history
        WHERE profile_id = ${profileId}
          AND id NOT IN (
            SELECT id FROM history WHERE profile_id = ${profileId} ORDER BY id DESC LIMIT ${MAX_PER_PROFILE}
          )
      `;
    }
  }

  // Rolling global cap (safety net)
  const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM history`;
  if (Number(total) > MAX_GLOBAL) {
    await sql`
      DELETE FROM history WHERE id IN (
        SELECT id FROM history ORDER BY id ASC LIMIT ${Number(total) - MAX_GLOBAL}
      )
    `;
  }

  return NextResponse.json({ id: Number(row.id), ts: row.ts }, { status: 201 });
}
