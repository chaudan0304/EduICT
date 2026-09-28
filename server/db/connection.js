import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from '../ai/envLoader.js';
import * as pathService from '../services/pathService.js';
import { initSchema } from './schema.js';

export function getDatabasePath() {
  loadEnv();
  // Toàn bộ logic đường dẫn (EDUICT_DB_PATH / mặc định) đã gom về pathService.
  return pathService.getDatabasePath();
}

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    console.log(`[Database] Kết nối SQLite CSDL tại: ${dbPath}`);
    dbInstance = new DatabaseSync(dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}
