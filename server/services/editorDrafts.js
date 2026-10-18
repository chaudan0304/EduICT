import {randomUUID} from 'node:crypto';
import {getDatabase} from '../db/connection.js';
const PREFIX='editor_draft:';
const fail=(message,statusCode=400,current)=>Object.assign(new Error(message),{statusCode,current});
function key(scope){
  if(typeof scope!=='string'||scope.length>300||!(/^(question-form:|ai-questions:|ai-flow:|session-create:|flow-editor:|session-conflict:).+/.test(scope)||scope==='timetable-editor')||/[\0\r\n]/.test(scope))throw fail('Phạm vi bản nháp không hợp lệ.');
  return PREFIX+scope;
}
export function readDraft(scope){
  const row=getDatabase().prepare('SELECT value FROM app_settings WHERE key=?').get(key(scope));
  return row?JSON.parse(row.value):{scope,version:null,updatedAt:null,data:null,archived:false};
}
export function listDrafts(){
  return getDatabase().prepare(`SELECT json_extract(value,'$.scope') AS scope, json_extract(value,'$.version') AS version,
    json_extract(value,'$.updatedAt') AS updatedAt, json_extract(value,'$.archived') AS archived,
    json_extract(value,'$.title') AS title, json_extract(value,'$.sizeBytes') AS sizeBytes
    FROM app_settings WHERE substr(key,1,?)=? ORDER BY updatedAt DESC`).all(PREFIX.length,PREFIX).map(row=>({...row,archived:Boolean(row.archived)}));
}
export function saveDraft(body){
  const draftKey=key(body?.scope);
  if(body.expectedVersion!==null&&(typeof body.expectedVersion!=='string'||body.expectedVersion.length>80))throw fail('Thiếu phiên bản bản nháp trước khi lưu.');
  const db=getDatabase();db.exec('BEGIN IMMEDIATE;');
  try{
    const current=readDraft(body.scope),archived=body.archived===true;
    const data=archived&&body.data===undefined?current.data:body.data;
    if(!data||typeof data!=='object'||Array.isArray(data))throw fail('Nội dung bản nháp không hợp lệ.');
    const serialized=JSON.stringify(data);
    if(Buffer.byteLength(serialized)>1024*1024)throw fail('Bản nháp vượt 1 MB. Hãy giảm nội dung nguồn trước khi lưu.',413);
    if(current.version!==body.expectedVersion){
      if(current.archived===archived&&JSON.stringify(current.data)===serialized){db.exec('COMMIT;');return current;}
      throw fail('Bản nháp đã đổi ở cửa sổ khác. Nội dung tại đây vẫn được giữ để bạn đối chiếu.',409,current);
    }
    if((!current.version||current.archived)&&!archived&&listDrafts().filter(draft=>!draft.archived).length>=500)throw fail('Đã có 500 bản nháp đang soạn. Hãy lưu hoặc bỏ tạm các bản không dùng trước.',413);
    const title=data.lessonTitle||data.formData?.question||data.editForm?.title||data.newActivity?.title||data.batch?.title||data.selectedLessonId||'Bản nháp chưa đặt tên';
    const saved={scope:body.scope,version:randomUUID(),updatedAt:new Date().toISOString(),data,archived,title:String(title).slice(0,180),sizeBytes:Buffer.byteLength(serialized)};
    db.prepare('INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)').run(draftKey,JSON.stringify(saved));
    db.exec('COMMIT;');return saved;
  }catch(error){db.exec('ROLLBACK;');throw error;}
}
