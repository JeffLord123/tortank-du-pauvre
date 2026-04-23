import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import sql from '@/lib/db/client';
import { randomUUID } from 'crypto';
import { rowToStore } from '@/lib/route-utils';

// Note: Vercel Hobby caps request body at 4.5 MB; the original multer limit was 10 MB.
// Upgrade to Vercel Pro for larger Excel files.
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'append' ? 'append' : 'replace';

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    return NextResponse.json(
      { error: 'Fichier illisible. Vérifiez que le fichier est bien un .xlsx ou .xls valide.' },
      { status: 400 },
    );
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: 'Feuille vide ou non reconnue.' }, { status: 400 });

  const keys = Object.keys(rows[0]);
  const nameKey =
    keys.find(k => /^store_name$/i.test(k)) ||
    keys.find(k => /^location_name$/i.test(k)) ||
    keys.find(k => /nom|name|magasin|store/i.test(k)) ||
    keys[1] ||
    keys[0];
  const idKey =
    keys.find(k => /^store_id$/i.test(k)) ||
    keys.find(k => /^location_id$/i.test(k)) ||
    keys.find(k => /^id$/i.test(k));
  const pop10Key = keys.find(k => /pop.*10|10.*min/i.test(k));
  const pop20Key = keys.find(k => /pop.*20|20.*min/i.test(k));
  const pop30Key = keys.find(k => /pop.*30|30.*min/i.test(k));
  const popCrmKey = keys.find(k => /crm|custom|zone crm/i.test(k));
  const popKey =
    keys.find(k => /^pop$|^population$|^hab$/i.test(k)) ||
    (pop10Key ? undefined : keys.find(k => /pop|population|hab/i.test(k)));

  const newStores: {
    id: string; name: string; population: number;
    pop_10min: number; pop_20min: number; pop_30min: number; pop_custom: number;
  }[] = [];

  for (const row of rows) {
    const name = String(row[nameKey!] || '').trim();
    if (!name) continue;
    const id = idKey && row[idKey] ? String(row[idKey]).trim() : randomUUID();
    const p10 = pop10Key ? parseInt(String(row[pop10Key])) || 0 : popKey ? parseInt(String(row[popKey])) || 0 : 0;
    const p20 = pop20Key ? parseInt(String(row[pop20Key])) || 0 : p10;
    const p30 = pop30Key ? parseInt(String(row[pop30Key])) || 0 : p20;
    const pCrm = popCrmKey ? parseInt(String(row[popCrmKey])) || 0 : 0;
    const population = p10 || p20 || p30 || 0;
    newStores.push({ id, name, population, pop_10min: p10, pop_20min: p20, pop_30min: p30, pop_custom: pCrm });
  }

  if (newStores.length === 0) {
    return NextResponse.json({ error: `Aucun magasin trouvé. Colonnes détectées : ${keys.join(', ')}` }, { status: 400 });
  }

  await sql.begin(async tx => {
    if (mode === 'replace') await tx`DELETE FROM stores`;
    for (let i = 0; i < newStores.length; i++) {
      const s = newStores[i];
      await tx`
        INSERT INTO stores (id, name, population, pop_10min, pop_20min, pop_30min, pop_custom, budget_weight_percent, sort_order)
        VALUES (${s.id}, ${s.name}, ${s.population}, ${s.pop_10min}, ${s.pop_20min}, ${s.pop_30min}, ${s.pop_custom}, NULL, ${i})
        ON CONFLICT (id) DO UPDATE SET
          name       = EXCLUDED.name,
          population = EXCLUDED.population,
          pop_10min  = EXCLUDED.pop_10min,
          pop_20min  = EXCLUDED.pop_20min,
          pop_30min  = EXCLUDED.pop_30min,
          pop_custom = EXCLUDED.pop_custom,
          sort_order = EXCLUDED.sort_order
      `;
    }
    await tx`
      INSERT INTO excel_uploads (id, filename, row_count, replace_all)
      VALUES (${randomUUID()}, ${file.name}, ${newStores.length}, ${mode === 'replace' ? 1 : 0})
    `;
  });

  const ids = newStores.map(s => s.id);
  const inserted = await sql`SELECT * FROM stores WHERE id = ANY(${ids})`;
  return NextResponse.json({ count: newStores.length, stores: inserted.map(rowToStore) });
}
