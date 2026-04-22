import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

const MAX_GLOBAL = 2000;
const MAX_PER_PROFILE = 200;

router.get('/', (req, res) => {
  const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : null;
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const rows = profileId
    ? db.prepare('SELECT id, ts, profile_id, actor_pseudo, simulation_id, action_label, snapshot_json FROM history WHERE profile_id = ? ORDER BY id DESC LIMIT ?').all(profileId, limit)
    : db.prepare('SELECT id, ts, profile_id, actor_pseudo, simulation_id, action_label, snapshot_json FROM history ORDER BY id DESC LIMIT ?').all(limit);
  res.json(rows.map(r => ({
    id: r.id,
    ts: r.ts,
    profileId: r.profile_id,
    actorPseudo: r.actor_pseudo,
    simulationId: r.simulation_id,
    actionLabel: r.action_label,
    snapshot: JSON.parse(r.snapshot_json),
  })));
});

router.post('/', (req, res) => {
  const { profileId, actorPseudo, simulationId, actionLabel, snapshot } = req.body ?? {};
  if (!actionLabel || snapshot === undefined) {
    return res.status(400).json({ error: 'actionLabel and snapshot required' });
  }
  const info = db.prepare(
    'INSERT INTO history (profile_id, actor_pseudo, simulation_id, action_label, snapshot_json) VALUES (?, ?, ?, ?, ?)'
  ).run(
    profileId ?? null,
    actorPseudo ?? null,
    simulationId ?? null,
    String(actionLabel),
    JSON.stringify(snapshot),
  );

  // Rolling per-profile cap
  if (profileId) {
    const profileCount = db.prepare('SELECT COUNT(*) as c FROM history WHERE profile_id = ?').get(profileId).c;
    if (profileCount > MAX_PER_PROFILE) {
      const keep = db.prepare('SELECT id FROM history WHERE profile_id = ? ORDER BY id DESC LIMIT ?').all(profileId, MAX_PER_PROFILE);
      const keepIds = new Set(keep.map(r => r.id));
      const rows = db.prepare('SELECT id FROM history WHERE profile_id = ?').all(profileId);
      const del = db.prepare('DELETE FROM history WHERE id = ?');
      for (const row of rows) if (!keepIds.has(row.id)) del.run(row.id);
    }
  }

  // Rolling global cap (safety)
  const total = db.prepare('SELECT COUNT(*) as c FROM history').get().c;
  if (total > MAX_GLOBAL) {
    const excess = total - MAX_GLOBAL;
    db.prepare('DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY id ASC LIMIT ?)').run(excess);
  }

  const row = db.prepare('SELECT id, ts FROM history WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ id: row.id, ts: row.ts });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM history WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

export default router;
