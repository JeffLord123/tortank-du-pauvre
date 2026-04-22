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
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const nameKey = keys.find(k => /^location_name$/i.test(k))
    || keys.find(k => /nom|name|magasin|store/i.test(k))
    || keys[1]  // fallback: second column (first is often an ID)
    || keys[0];
  const idKey = keys.find(k => /^location_id$/i.test(k))
    || keys.find(k => /^id$/i.test(k));
  const popKey = keys.find(k => /pop|population|hab/i.test(k));

  // Pre-validate rows before touching the DB
  const newStores = [];
  for (const row of rows) {
    const name = String(row[nameKey] || '').trim();
    if (!name) continue;
    const population = popKey ? (parseInt(row[popKey]) || 140000) : 140000;
    const id = idKey && row[idKey] ? String(row[idKey]).trim() : randomUUID();
    newStores.push({ id, name, population });
  }

  if (newStores.length === 0) {
    return res.status(400).json({ error: `Aucun magasin trouvé. Colonnes détectées : ${keys.join(', ')}` });
  }

  const mode = req.query.mode === 'append' ? 'append' : 'replace';

  const insertStore = db.prepare('INSERT OR REPLACE INTO stores (id, name, population) VALUES (?, ?, ?)');
  const insertUpload = db.prepare('INSERT INTO excel_uploads (id, filename, row_count, replace_all) VALUES (?, ?, ?, ?)');

  // Only touch the DB once all rows are validated
  const run = db.transaction(() => {
    if (mode === 'replace') db.prepare('DELETE FROM stores').run();
    for (const s of newStores) insertStore.run(s.id, s.name, s.population);
    insertUpload.run(randomUUID(), req.file.originalname, newStores.length, mode === 'replace' ? 1 : 0);
  });

  run();
  res.json({ count: newStores.length, stores: newStores.map(s => ({ ...s, budget: 0 })) });
});

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM stores ORDER BY rowid').all();
  res.json(rows.map(r => ({ id: r.id, name: r.name, population: r.population })));
});

router.post('/', (req, res) => {
  const { id, name, population } = req.body;
  const storeId = id || randomUUID();
  db.prepare('INSERT INTO stores (id, name, population) VALUES (?, ?, ?)').run(storeId, name, population ?? 140000);
  res.status(201).json({ id: storeId, name, population: population ?? 140000 });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, population } = req.body;
  db.prepare('UPDATE stores SET name = COALESCE(?, name), population = COALESCE(?, population) WHERE id = ?')
    .run(name, population, id);
  const row = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Store not found' });
  res.json({ id: row.id, name: row.name, population: row.population });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
