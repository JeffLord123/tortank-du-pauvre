import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import db from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Excel upload MUST be declared before /:id routes
// POST /api/stores/upload-excel?mode=replace|append
router.post('/upload-excel', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch {
    return res.status(400).json({ error: 'Fichier illisible. Vérifiez que le fichier est bien un .xlsx ou .xls valide.' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) return res.status(400).json({ error: 'Feuille vide ou non reconnue.' });

  // Detect column names (case-insensitive)
  // Supports: location_name, nom, name, magasin, store (in that priority order)
  // Also supports Decathlon format: store_id, store_name, Pop 10 min, Pop 20 min, Pop 30 min, Pop Zone CRM
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const nameKey = keys.find(k => /^store_name$/i.test(k))
    || keys.find(k => /^location_name$/i.test(k))
    || keys.find(k => /nom|name|magasin|store/i.test(k))
    || keys[1]
    || keys[0];
  const idKey = keys.find(k => /^store_id$/i.test(k))
    || keys.find(k => /^location_id$/i.test(k))
    || keys.find(k => /^id$/i.test(k));
  const pop10Key = keys.find(k => /pop.*10|10.*min/i.test(k));
  const pop20Key = keys.find(k => /pop.*20|20.*min/i.test(k));
  const pop30Key = keys.find(k => /pop.*30|30.*min/i.test(k));
  const popCrmKey = keys.find(k => /crm|custom|zone crm/i.test(k));
  const popKey = keys.find(k => /^pop$|^population$|^hab$/i.test(k))
    || (pop10Key ? undefined : keys.find(k => /pop|population|hab/i.test(k)));

  // Pre-validate rows before touching the DB
  const newStores = [];
  for (const row of rows) {
    const name = String(row[nameKey] || '').trim();
    if (!name) continue;
    const id = idKey && row[idKey] ? String(row[idKey]).trim() : randomUUID();
    const p10 = pop10Key ? (parseInt(row[pop10Key]) || 0) : (popKey ? (parseInt(row[popKey]) || 0) : 0);
    const p20 = pop20Key ? (parseInt(row[pop20Key]) || 0) : p10;
    const p30 = pop30Key ? (parseInt(row[pop30Key]) || 0) : p20;
    const pCrm = popCrmKey ? (parseInt(row[popCrmKey]) || 0) : 0;
    const population = p10 || p20 || p30 || 0;
    newStores.push({ id, name, population, pop_10min: p10, pop_20min: p20, pop_30min: p30, pop_custom: pCrm });
  }

  if (newStores.length === 0) {
    return res.status(400).json({ error: `Aucun magasin trouvé. Colonnes détectées : ${keys.join(', ')}` });
  }

  const mode = req.query.mode === 'append' ? 'append' : 'replace';

  const insertStore = db.prepare(
    'INSERT OR REPLACE INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom, budget_weight_percent) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
  );
  const insertUpload = db.prepare('INSERT INTO excel_uploads (id, filename, row_count, replace_all) VALUES (?, ?, ?, ?)');

  // Only touch the DB once all rows are validated
  const run = db.transaction(() => {
    if (mode === 'replace') db.prepare('DELETE FROM stores').run();
    for (const s of newStores) insertStore.run(s.id, s.name, s.population, s.pop_10min, s.pop_20min, s.pop_30min, s.pop_custom);
    insertUpload.run(randomUUID(), req.file.originalname, newStores.length, mode === 'replace' ? 1 : 0);
  });

  run();
  const inserted = db.prepare('SELECT * FROM stores WHERE id IN (' + newStores.map(() => '?').join(',') + ')').all(newStores.map(s => s.id));
  res.json({ count: newStores.length, stores: inserted.map(rowToStore) });
});

function rowToStore(r) {
  return {
    id: r.id,
    name: r.name,
    population: r.population ?? r.pop_10min ?? 0,
    pop10min: r.pop_10min ?? 0,
    pop20min: r.pop_20min ?? 0,
    pop30min: r.pop_30min ?? 0,
    popCustom: r.pop_custom ?? 0,
    budgetWeightPercent: r.budget_weight_percent ?? undefined,
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM stores ORDER BY rowid').all();
  res.json(rows.map(rowToStore));
});

router.post('/', (req, res) => {
  const { id, name, population, pop10min, pop20min, pop30min, popCustom, budgetWeightPercent } = req.body;
  const storeId = id || randomUUID();
  const p10 = pop10min ?? population ?? 0;
  const p20 = pop20min ?? population ?? 0;
  const p30 = pop30min ?? population ?? 0;
  const pCrm = popCustom ?? 0;
  const pop = population ?? p10;
  const w = budgetWeightPercent != null && !Number.isNaN(Number(budgetWeightPercent)) ? Number(budgetWeightPercent) : null;
  db.prepare('INSERT INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom, budget_weight_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    storeId, name, pop, p10, p20, p30, pCrm, w,
  );
  const row = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
  res.status(201).json(rowToStore(row));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, population, pop10min, pop20min, pop30min, popCustom, budgetWeightPercent } = req.body;
  db.prepare(`UPDATE stores SET
    name = COALESCE(?, name),
    population = COALESCE(?, population),
    pop_10min = COALESCE(?, pop_10min),
    pop_20min = COALESCE(?, pop_20min),
    pop_30min = COALESCE(?, pop_30min),
    pop_custom = COALESCE(?, pop_custom),
    budget_weight_percent = COALESCE(?, budget_weight_percent)
    WHERE id = ?`).run(
    name ?? null,
    population ?? null,
    pop10min ?? null,
    pop20min ?? null,
    pop30min ?? null,
    popCustom ?? null,
    budgetWeightPercent != null && !Number.isNaN(Number(budgetWeightPercent)) ? Number(budgetWeightPercent) : null,
    id,
  );
  const row = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Store not found' });
  res.json(rowToStore(row));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
