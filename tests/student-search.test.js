import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSearchText,matchesStudentSearch} from '../src/utils/studentSearch.js';

test('Vietnamese student search accepts alternate accent placement and unaccented names',()=>{
  const student={id:'hs_demo_21',name:'Bạn Thuỳ Linh',machineNumber:7};
  for(const query of ['Thùy Linh','Thuỳ Linh','thuy linh','BAN THUY LINH','  thùy   linh  ','Thùy Linh'.normalize('NFD')]){
    assert.equal(matchesStudentSearch(student,query),true,query);
  }
  assert.equal(matchesStudentSearch(student,'Tú Linh'),false);
  assert.equal(student.name,'Bạn Thuỳ Linh');
});

test('search preserves ID punctuation and supports đ, machine numbers, and empty queries',()=>{
  const student={id:'hs_demo-21',name:'Đặng Hải Đăng',machineNumber:7};
  for(const query of ['dang hai dang','ĐẶNG','hs_demo-21','may 7','máy 7','7','',null])assert.equal(matchesStudentSearch(student,query),true,String(query));
  assert.equal(matchesStudentSearch(student,'hs demo 21'),false);
  assert.equal(matchesStudentSearch({name:'An'},'máy undefined'),false);
  assert.equal(normalizeSearchText('  ĐIỂM\u00a0TỐT  '),'diem tot');
  assert.equal(normalizeSearchText(undefined),'');
});

test('history text and query use the same Vietnamese normalization',()=>{
  const query=normalizeSearchText('thùy linh');
  assert.equal(normalizeSearchText('Thuỳ Linh phát biểu').includes(query),true);
  assert.equal(normalizeSearchText('Giúp đỡ bạn').includes(normalizeSearchText('giup do')),true);
});
