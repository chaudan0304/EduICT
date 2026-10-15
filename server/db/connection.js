import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from '../ai/envLoader.js';
import * as pathService from '../services/pathService.js';
import { initSchema } from './schema.js';
import databaseAccess from '../services/databaseAccess.cjs';

export function getDatabasePath() {
  loadEnv();
  // Toàn bộ logic đường dẫn (EDUICT_DB_PATH / mặc định) đã gom về pathService.
  return pathService.getDatabasePath();
}

let dbInstance = null;
let releaseDatabaseUser = null;

export function getDatabase() {
  if (!dbInstance) {
    const dbPath = getDatabasePath();
    console.log(`[Database] Kết nối SQLite CSDL tại: ${dbPath}`);
    releaseDatabaseUser = databaseAccess.registerDatabaseUser(dbPath);
    try {
      dbInstance = new DatabaseSync(dbPath, { timeout: 5000 });
      initSchema(dbInstance);
    } catch (error) {
      try { dbInstance?.close(); } catch { /* Initialization failed. */ }
      dbInstance = null;
      releaseDatabaseUser(); releaseDatabaseUser = null;
      throw error;
    }
  }
  return dbInstance;
}

export function closeConnection() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    releaseDatabaseUser?.(); releaseDatabaseUser = null;
  }
}
