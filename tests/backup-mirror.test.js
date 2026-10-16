import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('backup mirror creates a portable package in an approved existing folder; rejects internal/remote paths; never overwrites a conflicting package',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'eduict-mirror-'));
  const data=path.join(root,'data'),offsite=path.join(root,'offsite');fs.mkdirSync(data);fs.mkdirSync(offsite);
  process.env.EDUICT_APP_ROOT=data;process.env.EDUICT_DATA_DIR=data;process.env.EDUICT_DB_PATH=path.join(data,'fixture.sqlite');
  const {closeConnection}=await import('../server/db/connection.js');
  const {setBackupMirrorDestination,getBackupMirrorStatus,mirrorBackupIfConfigured}=await import('../server/services/backupMirror.js');
  const {createBackup,verifyBackup}=await import('../server/services/backupService.js');
  const {importBackupPackage}=await import('../server/services/backupPackage.js');
  try{
    assert.throws(()=>setBackupMirrorDestination(data),/kho dữ liệu/);
    assert.throws(()=>setBackupMirrorDestination('\\\\server\\share'),/thư mục/);
    setBackupMirrorDestination(offsite);
    const backup=await createBackup();
    assert.equal(backup.mirror.ok,true);
    const file=path.join(offsite,'EduMaster-backups',`${backup.backupId}.eduict`);
    assert.ok(fs.statSync(file).size>0);
    const imported=await importBackupPackage(fs.createReadStream(file));await verifyBackup(imported.backupId);
    assert.equal(getBackupMirrorStatus().lastBackupId,backup.backupId);
    fs.writeFileSync(file,'user-owned conflicting data');
    const result=await mirrorBackupIfConfigured(backup.backupId,{force:true});
    assert.equal(result.ok,false);assert.equal(fs.readFileSync(file,'utf8'),'user-owned conflicting data');
    await verifyBackup(backup.backupId);
    assert.equal(fs.readdirSync(path.dirname(file)).filter(name=>name.includes('.partial')).length,0);
    setBackupMirrorDestination('');assert.equal(getBackupMirrorStatus().enabled,false);
  }finally{closeConnection();fs.rmSync(root,{recursive:true,force:true});}
});
