import { ACTIVITY_TYPES } from '../ClassroomSession/sessionStorage';

export function flowType(type) {
  if (type === 'LESSON') return 'PRESENTATION';
  if (type === 'PRACTICE') return 'ACTIVITY';
  return typeof type === 'string' && Object.hasOwn(ACTIVITY_TYPES, type) ? type : 'PRESENTATION';
}

export function readFlowDraft(data) {
  if (!Array.isArray(data?.activities) || !data.activities.length || data.activities.length > 12) {
    throw new Error('AI chưa trả về danh sách hoạt động hợp lệ (1–12 hoạt động). Hãy tạo lại đề xuất.');
  }
  return data.activities.map(activity => ({
    type: flowType(activity?.type), title: typeof activity?.title === 'string' ? activity.title.slice(0, 200) : '',
    duration: Number.isFinite(Number(activity?.duration)) ? String(Number(activity.duration)) : '',
    description: typeof activity?.description === 'string' ? activity.description.slice(0, 3000) : '',
  }));
}

export function reviewFlow(activities, targetDuration) {
  const total = activities.reduce((sum, activity) => sum + (Number(activity.duration) || 0), 0);
  const errors = [];
  if (!activities.length) errors.push('Chưa có hoạt động để áp dụng.');
  activities.forEach((activity, index) => {
    if (!activity.title.trim()) errors.push(`Hoạt động ${index + 1} cần có tên.`);
    if (!Number.isInteger(Number(activity.duration)) || Number(activity.duration) < 1 || Number(activity.duration) > 60) errors.push(`Thời lượng hoạt động ${index + 1} phải là số nguyên từ 1 đến 60 phút.`);
  });
  if (activities.length && total !== targetDuration) errors.push(`Tổng đang là ${total} phút. Điều chỉnh các hoạt động để đủ ${targetDuration} phút trước khi áp dụng.`);
  return { total, errors };
}

export function formatFlowActivities(draft) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return draft.map((activity, index) => ({ id: `act_ai_${id}_${index}`, order_index: index, type: flowType(activity.type),
    title: activity.title.trim(), duration_minutes: Number(activity.duration), status: 'PENDING', description: activity.description.trim(), notes: '' }));
}
