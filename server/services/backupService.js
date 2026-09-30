import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDatabasePath } from './pathService.js';
import * as pathService from './pathService.js';
import { getDatabase, closeConnection } from '../db/connection.js';

function getBackupDir() {
  const dir = path.join(pathService.getAppDataDir(), 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function calculateFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('close', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

export function listBackups() {
  const dir = getBackupDir();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('EduMaster-Backup-') && !entry.name.endsWith('.tmp')) {
      const manifestPath = path.join(dir, entry.name, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const stat = fs.statSync(path.join(dir, entry.name));
          backups.push({
            id: entry.name,
            createdAt: manifest.createdAt,
            schoolYear: manifest.schoolYear,
            fileCount: manifest.fileCount,
            sizeBytes: stat.size
          });
        } catch (e) {}
      }
    }
  }
  backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return backups;
}

export async function createBackup() {
  const db = getDatabase();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${now.getMilliseconds()}`;
  const backupId = `EduMaster-Backup-${timestamp}`;
  const tmpDir = path.join(getBackupDir(), `${backupId}.tmp`);
  const finalDir = path.join(getBackupDir(), backupId);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    const dbBackupPath = path.join(tmpDir, 'database.sqlite');
    db.exec(`VACUUM INTO '${dbBackupPath}'`);

    const schoolYearRow = db.prepare("SELECT value FROM app_settings WHERE key = 'school_year'").get();
    const schoolYear = schoolYearRow ? schoolYearRow.value : '2025 - 2026';
    let stats = { classes: 0, students: 0, lessons: 0, questions: 0 };
    try {
      stats.classes = db.prepare("SELECT COUNT(*) as c FROM classes").get().c;
      stats.students = db.prepare("SELECT COUNT(*) as c FROM students").get().c;
      stats.lessons = db.prepare("SELECT COUNT(*) as c FROM lessons").get().c;
      stats.questions = db.prepare("SELECT COUNT(*) as c FROM question_bank").get().c;
    } catch(e) {}


    let fileCount = 0;
    const presentationsSrc = path.join(pathService.getUploadsDir(), 'presentations');
    const presentationsDest = path.join(tmpDir, 'files', 'presentations');
    if (fs.existsSync(presentationsSrc)) {
      copyDirSync(presentationsSrc, presentationsDest);
      const countFiles = (dir) => {
        let count = 0;
        if (!fs.existsSync(dir)) return 0;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory()) count += countFiles(path.join(dir, item.name));
          else count++;
        }
        return count;
      };
      fileCount = countFiles(presentationsDest);
    }

    const dbChecksum = await calculateFileChecksum(dbBackupPath);
    const manifest = {
      formatVersion: 1,
      appName: "EduMaster",
      backupId: backupId,
      createdAt: now.toISOString(),
      schoolYear: schoolYear,
      fileCount: fileCount,
      databaseChecksum: dbChecksum,
      stats
    };

    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.renameSync(tmpDir, finalDir);
    cleanupOldBackups(10);
    return { success: true, backupId, manifest };
  } catch (err) {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`BACKUP_CREATE_FAILED: ${err.message}`);
  }
}

export function deleteBackup(backupId) {
  if (backupId.includes('/') || backupId.includes('\\') || backupId.includes('..')) {
    throw new Error('INVALID_BACKUP_PATH');
  }
  const targetDir = path.join(getBackupDir(), backupId);
  if (!fs.existsSync(targetDir)) throw new Error('BACKUP_NOT_FOUND');
  fs.rmSync(targetDir, { recursive: true, force: true });
  return { success: true };
}

function cleanupOldBackups(keepLimit = 10) {
  const backups = listBackups();
  if (backups.length > keepLimit) {
    const toDelete = backups.slice(keepLimit);
    for (const b of toDelete) deleteBackup(b.id);
  }
}

export async function verifyBackup(backupId) {
  if (backupId.includes('/') || backupId.includes('\\') || backupId.includes('..')) throw new Error('INVALID_BACKUP_PATH');
  const targetDir = path.join(getBackupDir(), backupId);
  if (!fs.existsSync(targetDir)) throw new Error('BACKUP_NOT_FOUND');
  
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('BACKUP_CORRUPTED: Missing manifest.json');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.formatVersion !== 1) throw new Error('BACKUP_INCOMPATIBLE: Unsupported formatVersion');
  
  const dbPath = path.join(targetDir, 'database.sqlite');
  if (!fs.existsSync(dbPath)) throw new Error('BACKUP_CORRUPTED: Missing database.sqlite');
  
  const dbChecksum = await calculateFileChecksum(dbPath);
  if (dbChecksum !== manifest.databaseChecksum) throw new Error('BACKUP_CORRUPTED: Database checksum mismatch');
  
  let integrityOk = false;
  try {
    const backupDb = await import('node:sqlite').then(m => new m.DatabaseSync(dbPath));
    const checkRow = backupDb.prepare("PRAGMA integrity_check").get();
    if (checkRow && checkRow.integrity_check === 'ok') integrityOk = true;
    backupDb.close();
  } catch (e) {
    throw new Error(`DATABASE_INTEGRITY_FAILED: ${e.message}`);
  }
  
  if (!integrityOk) throw new Error('DATABASE_INTEGRITY_FAILED: Integrity check returned not ok');
  return { success: true, manifest };
}

export async function restoreBackup(backupId) {
  await verifyBackup(backupId);
  
  const targetDir = path.join(getBackupDir(), backupId);
  const dbBackupPath = path.join(targetDir, 'database.sqlite');
  const filesBackupPath = path.join(targetDir, 'files');
  const currentDbPath = getDatabasePath();
  const uploadsPath = pathService.getUploadsDir();
  
  const safetyBackupId = `EduMaster-Safety-${Date.now()}`;
  const safetyDir = path.join(getBackupDir(), safetyBackupId);
  
  try {
    fs.mkdirSync(safetyDir, { recursive: true });
    const currentDb = getDatabase();
    currentDb.exec(`VACUUM INTO '${path.join(safetyDir, 'database.sqlite')}'`);
    if (fs.existsSync(uploadsPath)) copyDirSync(uploadsPath, path.join(safetyDir, 'files'));
  } catch (err) {
    throw new Error(`RESTORE_FAILED: Cannot create safety backup: ${err.message}`);
  }
  
  try {
    closeConnection();
    
    fs.rmSync(currentDbPath, { force: true });
    if (fs.existsSync(`${currentDbPath}-wal`)) fs.rmSync(`${currentDbPath}-wal`, { force: true });
    if (fs.existsSync(`${currentDbPath}-shm`)) fs.rmSync(`${currentDbPath}-shm`, { force: true });
    
    fs.copyFileSync(dbBackupPath, currentDbPath);
    
    if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });
    if (fs.existsSync(filesBackupPath)) copyDirSync(filesBackupPath, uploadsPath);
    
    return { success: true, requireRestart: true };
  } catch (err) {
    try {
      if (fs.existsSync(currentDbPath)) fs.rmSync(currentDbPath, { force: true });
      fs.copyFileSync(path.join(safetyDir, 'database.sqlite'), currentDbPath);
      if (fs.existsSync(uploadsPath)) fs.rmSync(uploadsPath, { recursive: true, force: true });
      copyDirSync(path.join(safetyDir, 'files'), uploadsPath);
    } catch(e2) {
      throw new Error(`RESTORE_ROLLBACK_FAILED: System corrupted. Please manually restore from ${safetyDir}`);
    }
    throw new Error(`RESTORE_FAILED: ${err.message}`);
  }
}
