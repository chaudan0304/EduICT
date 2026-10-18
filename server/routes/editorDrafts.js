import {parseJsonBody,sendJson} from './helpers.js';
import {isLocalToolsRequest} from '../services/classroomTools.js';
import {readDraft,saveDraft,listDrafts} from '../services/editorDrafts.js';
export async function tryHandleEditorDrafts(req,res,{pathname,method,url}){
  if(!pathname.startsWith('/api/editor-drafts'))return false;
  res.setHeader('Cache-Control','no-store');
  if(!isLocalToolsRequest(req))return sendJson(res,403,{error:'Bản nháp chỉ dùng trên máy này qua localhost.'});
  try{
    if(pathname==='/api/editor-drafts'&&method==='GET')return sendJson(res,200,{drafts:listDrafts()});
    if(pathname==='/api/editor-drafts/item'&&method==='GET')return sendJson(res,200,readDraft(url.searchParams.get('scope')));
    if(pathname==='/api/editor-drafts/item'&&method==='POST')return sendJson(res,200,saveDraft(await parseJsonBody(req,{maxBytes:1.1*1024*1024})));
    return sendJson(res,404,{error:'Không tìm thấy bản nháp.'});
  }catch(error){return sendJson(res,error instanceof SyntaxError?400:error.statusCode||500,{error:error.statusCode?error.message:'Chưa đọc/lưu được bản nháp.',current:error.current});}
}
