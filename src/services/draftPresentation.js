export function draftLabel(scope=''){
  if(scope==='timetable-editor')return 'Thời khóa biểu';
  const labels={'question-form':'Câu hỏi','ai-questions':'AI tạo câu hỏi','ai-flow':'AI đề xuất tiến trình','session-create':'Tiết học mới','flow-editor':'Sửa hoạt động','session-conflict':'Phục hồi tiết học'};
  return labels[scope.split(':')[0]]||'Bản nháp';
}
export function draftReadableText(data={}){
  const lines=[];
  const add=(label,value)=>{if(value!==undefined&&value!==null&&value!=='')lines.push(`${label}: ${value}`);};
  add('Tên bài',data.lessonTitle);add('Mục tiêu',data.objectives);add('Ghi chú',data.teacherNotes);add('Kiến thức nguồn',data.sourceContent);add('Yêu cầu',data.instructions);
  const question=data.formData;
  if(question){add('Câu hỏi',question.question);(question.options||[]).forEach((option,index)=>add(`Phương án ${index+1}`,option));add('Đáp án',question.options?.[question.correct_index]);add('Giải thích',question.explanation);}
  for(const [index,item] of (data.questions||[]).entries()){add(`Câu ${index+1}`,item.questionText||item.question);add('Phương án',(item.options||[]).join(' | '));add('Giải thích',item.explanation);}
  for(const [index,item] of (data.draft||data.activities||[]).entries()){add(`Hoạt động ${index+1}`,item.title);add('Thời lượng',item.duration_minutes||item.duration);add('Nội dung',item.description);add('Ghi chú',item.notes);}
  for(const [label,item] of [['Đang sửa',data.editForm],['Đang thêm',data.newActivity]]){if(item){add(label,item.title);add('Mô tả',item.description);}}
  if(data.patch){add('Tên bài',data.patch.lesson_title);add('Ghi chú',data.patch.teacher_notes);add('Trạng thái',data.patch.status);}
  for(const slot of data.periods||[])add(slot.label||slot.id,`${slot.startTime} – ${slot.endTime}`);
  if(data.grid)for(const [day,row]of Object.entries(data.grid)){for(const session of ['morning','afternoon'])for(const[period,cell]of Object.entries(row[session]||{}))if(cell)add(`Thứ ${Number(day)+1}, ${session==='morning'?'sáng':'chiều'} tiết ${period}`,cell.isOff?'Nghỉ':cell.className);}
  return lines.join('\n')||'Chưa có nội dung văn bản để xem trước.';
}
