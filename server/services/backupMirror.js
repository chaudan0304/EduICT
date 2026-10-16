import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {getDatabase} from '../db/connection.js';
import {getAppDataDir} from './pathService.js';
import {downloadBackupPackage} from './backupPackage.js';

const KEY='backup_mirror_v1';
const invalid=message=>Object.assign(new Error(message),{statusCode:400});
function read(){try{return JSON.parse(getDatabase().prepare('SELECT value FROM app_settings WHERE key=?').get(KEY)?.value||'{}');}catch{return {};}}
function write(value){getDatabase().prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)').run(KEY,JSON.stringify(value));return value;}
export function getBackupMirrorStatus(){const value=read();return {enabled:Boolean(value.folder),folder:value.folder||'',lastCopiedAt:value.lastCopiedAt||null,lastBackupId:value.lastBackupId||null,lastError:value.lastError||''};}
function validateFolder(input){
  if(typeof input!=='string'||input.length>1024||/[\0\r\n]/.test(input)||!path.isAbsolute(input)||input.startsWith('\\\\')||input.startsWith('//'))throw invalid('Hãy chọn thư mục trên máy hoặc thư mục OneDrive đã đồng bộ trên máy.');
  let folder;try{folder=fs.realpathSync(input);if(!fs.statSync(folder).isDirectory())throw new Error();}catch{throw invalid('Không đọc được thư mục. Hãy chọn một thư mục có sẵn.');}
  if(folder.startsWith('\\\\')||folder.startsWith('//'))throw invalid('Hãy dùng thư mục được đồng bộ trên máy.');
  const relative=path.relative(path.resolve(getAppDataDir()),folder);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw invalid('Chọn thư mục ngoài kho dữ liệu EduMaster để có bản dự phòng riêng.');
  return folder;
}
export function setBackupMirrorDestination(folder){
  if(folder===''){write({});return getBackupMirrorStatus();}
  write({folder:validateFolder(folder),lastCopiedAt:null,lastBackupId:null,lastError:''});return getBackupMirrorStatus();
}
async function checksum(file){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function mirrorBackupIfConfigured(backupId,{force=false}={}){
  const config=read();if(!config.folder)return {ok:true,skipped:true};
  if(!force&&config.lastBackupId===backupId)return {ok:true,skipped:true};
  let temporary;
  try{
    if(!/^EduMaster-Backup-[A-Za-z0-9-]+$/.test(backupId))throw invalid('Bản sao lưu không hợp lệ.');
    const root=validateFolder(config.folder);
    if(root!==config.folder)throw invalid('Thư mục đã thay đổi vị trí. Hãy chọn lại.');
    const directory=path.join(root,'EduMaster-backups');fs.mkdirSync(directory,{recursive:true});
    if(fs.lstatSync(directory).isSymbolicLink()||path.dirname(fs.realpathSync(directory))!==root)throw invalid('Thư mục dự phòng không hợp lệ. Hãy chọn lại.');
    const target=path.join(directory,`${backupId}.eduict`);
    temporary=path.join(directory,`.partial-${randomUUID()}`);
    const output=fs.createWriteStream(temporary,{flags:'wx'});output.setHeader=()=>{};
    await downloadBackupPackage(backupId,output);
    try{await fs.promises.copyFile(temporary,target,fs.constants.COPYFILE_EXCL);}
    catch(error){if(error.code!=='EEXIST'||fs.lstatSync(target).isSymbolicLink()||await checksum(temporary)!==await checksum(target))throw new Error('Chưa tạo được gói dự phòng: thiếu quyền/dung lượng hoặc tệp đích đã có nội dung khác.');}
    if(await checksum(temporary)!==await checksum(target))throw new Error('Gói dự phòng chưa khớp mã kiểm tra. Hãy thử lại.');
    if(read().folder===config.folder)write({...config,lastBackupId:backupId,lastCopiedAt:new Date().toISOString(),lastError:''});
    return {ok:true};
  }catch(error){
    // A mirror/status failure must not hide the successful primary snapshot.
    try{if(read().folder===config.folder)write({...config,lastError:error.message});}catch{/* Keep the copy error available in the response. */}
    return {ok:false,error:error.message};
  }
  finally{try{if(temporary)fs.unlinkSync(temporary);}catch{/* Best effort: never remove an existing final package. */}}
}
