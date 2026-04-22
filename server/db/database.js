import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
