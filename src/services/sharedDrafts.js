import apiClient from './apiClient';
export const DRAFTS_UPDATED='eduict-drafts-updated';
export const readSharedDraft=scope=>apiClient.get(`/api/editor-drafts/item?scope=${encodeURIComponent(scope)}`,{timeout:8000});
export const listSharedDrafts=()=>apiClient.get('/api/editor-drafts',{timeout:8000});
export async function writeSharedDraft(scope,data,expectedVersion,archived=false){
  const saved=await apiClient.post('/api/editor-drafts/item',{scope,data,expectedVersion,archived},{timeout:8000});
  window.dispatchEvent(new Event(DRAFTS_UPDATED));return saved;
}
let requested=null;
export const DRAFT_OPEN='eduict-open-draft';
export const requestedDraft=()=>requested;
export function openDraft(request){requested=request;window.dispatchEvent(new CustomEvent(DRAFT_OPEN,{detail:request}));}
export function consumeDraft(request){if(requested===request)requested=null;}
