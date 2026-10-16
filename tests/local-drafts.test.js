import {test} from 'node:test';
import assert from 'node:assert/strict';
test('drafts restore per editor scope, tolerate corrupt storage and report quota failures without clearing the old draft', async()=>{
  const store=new Map();
  global.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
  const {readLocalDraft,saveLocalDraft,clearLocalDraft}=await import('../src/services/localDrafts.js');
  try {
    assert.equal(readLocalDraft('questions:new'),null);
    assert.equal(saveLocalDraft('questions:new',{question:'Fixture'}).ok,true);
    assert.equal(readLocalDraft('questions:new').data.question,'Fixture');
    assert.equal(readLocalDraft('flow:new'),null);
    global.window.localStorage.setItem=()=>{throw new Error('quota');};
    assert.equal(saveLocalDraft('questions:new',{question:'Edited'}).ok,false);
    assert.equal(readLocalDraft('questions:new').data.question,'Fixture');
    clearLocalDraft('questions:new'); assert.equal(readLocalDraft('questions:new'),null);
    store.set('eduict_draft_v1:bad','not json'); assert.equal(readLocalDraft('bad'),null);
  }finally{delete global.window;}
});
