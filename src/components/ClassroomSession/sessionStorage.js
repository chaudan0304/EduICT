// Service layer kết nối API SQLite và Fallback LocalStorage cho Classroom Sessions

export const ACTIVITY_TYPES = {
  WARMUP: {
    id: 'WARMUP',
    label: 'Khởi động',
    icon: '🎮',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    defaultDuration: 5,
    description: 'Trò chơi, khởi động tinh thần, ôn bài cũ đầu tiết học'
  },
  PRESENTATION: {
    id: 'PRESENTATION',
    label: 'Hình thành kiến thức',
    icon: '📖',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    defaultDuration: 10,
    description: 'Giáo viên giảng bài mới, minh hoạ thao tác mẫu trên máy chiếu'
  },
  DISCUSSION: {
    id: 'DISCUSSION',
    label: 'Thảo luận & Hỏi đáp',
    icon: '💬',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    defaultDuration: 5,
    description: 'Trao đổi nhóm, thảo luận câu hỏi tư duy và phản biện'
  },
  ACTIVITY: {
    id: 'ACTIVITY',
    label: 'Luyện tập & Thực hành',
    icon: '🧩',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    defaultDuration: 10,
    description: 'Học sinh thực hành trực tiếp trên máy tính tại phòng máy'
  },
  QUIZ: {
    id: 'QUIZ',
    label: 'Quick Quiz / Đố vui',
    icon: '⚡',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    defaultDuration: 5,
    description: 'Câu hỏi trắc nghiệm nhanh, kiểm tra mức độ hiểu bài'
  },
  LUCKY_WHEEL: {
    id: 'LUCKY_WHEEL',
    label: 'Vòng quay gọi tên',
    icon: '🎡',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    defaultDuration: 5,
    description: 'Bốc thăm ngẫu nhiên học sinh lên bảng hoặc nhận câu hỏi'
  },
  DUCK_RACE: {
    id: 'DUCK_RACE',
    label: 'Đua vịt thi đua',
    icon: '🦆',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    defaultDuration: 5,
    description: 'Mini-game đua vịt sôi động, kích thích tinh thần lớp học'
  },
  TIMER: {
    id: 'TIMER',
    label: 'Thử thách đếm giờ',
    icon: '⏱️',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    defaultDuration: 5,
    description: 'Làm bài nhanh có giới hạn thời gian kèm chuông báo'
  },
  EXIT_TICKET: {
    id: 'EXIT_TICKET',
    label: 'Vé ra cổng / Phiếu bài',
    icon: '🎫',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    defaultDuration: 3,
    description: 'Học sinh trả lời 1 câu hỏi cốt lõi trước khi kết thúc tiết'
  },
  SUMMARY: {
    id: 'SUMMARY',
    label: 'Tổng kết & Tuyên dương',
    icon: '🏁',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    defaultDuration: 5,
    description: 'Đánh giá tiết học, tổng kết sao thi đua và dặn dò'
  }
};

// Cấu trúc bài học mẫu chuẩn GDPT 2018 (35 phút)
export const LESSON_FLOW_PRESETS = [
  {
    id: 'standard_35',
    name: 'Mẫu 1: Tiết Lý Thuyết & Thực Hành Chuẩn (35 Phút)',
    description: 'Cấu trúc 5 bước bài bản cho tiết học Tin học Tiểu học',
    activities: [
      { type: 'WARMUP', title: '🎮 Khởi động & Ôn bài cũ', duration: 5, description: 'Trò chơi mini khơi gợi hứng thú đầu giờ' },
      { type: 'PRESENTATION', title: '📖 Hình thành kiến thức mới', duration: 10, description: 'Giáo viên giảng giải và thao tác mẫu trên máy tính' },
      { type: 'ACTIVITY', title: '🧩 Thực hành trên phòng máy', duration: 10, description: 'Học sinh thao tác trực tiếp trên máy được phân công' },
      { type: 'QUIZ', title: '⚡ Quick Quiz / Củng cố nhanh', duration: 5, description: 'Đố vui trắc nghiệm kiểm tra mức độ nắm kiến thức' },
      { type: 'SUMMARY', title: '🏁 Tổng kết & Tuyên dương', duration: 5, description: 'Khen thưởng cá nhân/máy xuất sắc, dặn dò về nhà' }
    ]
  },
  {
    id: 'practice_focused_35',
    name: 'Mẫu 2: Tiết Thực Hành Trọng Tâm (35 Phút)',
    description: 'Dành cho các bài thực hành gõ 10 ngón, vẽ Paint, làm Scratch',
    activities: [
      { type: 'WARMUP', title: '🎮 Nhắc quy tắc an toàn & Giao đề bài', duration: 5, description: 'Kiểm tra máy móc, phổ biến yêu cầu sản phẩm' },
      { type: 'ACTIVITY', title: '🧩 Thực hành cá nhân / Nhóm đôi', duration: 20, description: 'Học sinh làm bài, giáo viên quan sát hỗ trợ từng máy' },
      { type: 'LUCKY_WHEEL', title: '🎡 Bốc thăm báo cáo sản phẩm', duration: 5, description: 'Quay ngẫu nhiên 2-3 bạn trình chiếu sản phẩm lên màn hình' },
      { type: 'SUMMARY', title: '🏁 Đánh giá & Tắt máy đúng cách', duration: 5, description: 'Cộng sao cho các bạn hoàn thành bài, xếp ghế gọn gàng' }
    ]
  },
  {
    id: 'gamified_review_35',
    name: 'Mẫu 3: Tiết Ôn Tập & Gamification (35 Phút)',
    description: 'Thi đua sôi nổi qua các trò chơi tương tác',
    activities: [
      { type: 'WARMUP', title: '🎮 Chia đội & Giới thiệu luật thi đua', duration: 5, description: 'Chia các dãy máy tính thành các đội thi đua' },
      { type: 'DUCK_RACE', title: '🦆 Đua vịt giải đố câu hỏi nhanh', duration: 10, description: 'Cuộc đua vịt kịch tính để chọn bạn trả lời gỡ điểm' },
      { type: 'ACTIVITY', title: '🧩 Thử thách thực hành tốc độ', duration: 10, description: 'Làm bài tập trắc nghiệm và gõ văn bản nhanh' },
      { type: 'QUIZ', title: '⚡ Đấu trường trí tuệ cuối giờ', duration: 5, description: 'Bộ câu hỏi nhanh tính điểm sao thần tốc' },
      { type: 'SUMMARY', title: '🏁 Trao thưởng & Vinh danh bục vinh quang', duration: 5, description: 'Bảng vàng vinh danh đội/học sinh dẫn đầu' }
    ]
  }
];

// Các loại huy hiệu tương tác trong tiết học
export const PARTICIPATION_BADGES = {
  PARTICIPATION: {
    id: 'PARTICIPATION',
    label: 'Xung phong',
    icon: '🙋',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    points: 0,
    title: 'Hăng hái giơ tay phát biểu'
  },
  CREATIVE: {
    id: 'CREATIVE',
    label: 'Sáng tạo',
    icon: '💡',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    points: 1,
    title: 'Đóng góp ý kiến mới lạ, sáng tạo'
  },
  CORRECT: {
    id: 'CORRECT',
    label: 'Trả lời đúng',
    icon: '🏆',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    points: 1,
    title: 'Trả lời chính xác câu hỏi'
  },
  HELPING: {
    id: 'HELPING',
    label: 'Giúp bạn',
    icon: '🤝',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    points: 1,
    title: 'Hỗ trợ bạn cùng máy vượt qua khó khăn'
  },
  STAR: {
    id: 'STAR',
    label: 'Thưởng Sao',
    icon: '⭐',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.18)',
    points: 1,
    title: 'Thưởng 1 sao thi đua'
  }
};

const LOCAL_SESSIONS_KEY = 'edumaster_classroom_sessions_cache';
const ACTIVE_SESSION_ID_KEY = 'edumaster_active_session_id';

// Quản lý Active Session ID (để F5 không bị mất phiên đang chạy)
export function getStoredActiveSessionId() {
  return localStorage.getItem(ACTIVE_SESSION_ID_KEY) || null;
}

export function setStoredActiveSessionId(sessionId) {
  if (sessionId) {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  }
}

// Lưu cache sessions cục bộ
function getCachedSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCachedSessions(sessions) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

// API Calls với Fallback LocalStorage
export async function fetchSessionsFromApi(classId = null) {
  try {
    const url = classId ? `/api/sessions?classId=${encodeURIComponent(classId)}` : '/api/sessions';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setCachedSessions(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend SQLite not available for sessions, using localStorage cache', e);
  }

  const cached = getCachedSessions();
  if (classId) {
    return cached.filter(s => s.class_id === classId || s.classId === classId);
  }
  return cached;
}

export async function fetchSessionDetailFromApi(sessionId) {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('Backend SQLite error fetching session detail:', e);
  }

  const cached = getCachedSessions().find(s => s.id === sessionId);
  return cached || null;
}

export async function createSessionApi(sessionData) {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    if (res.ok) {
      const created = await res.json();
      const cached = getCachedSessions();
      setCachedSessions([created, ...cached.filter(s => s.id !== created.id)]);
      return created;
    }
  } catch (e) {
    console.warn('Backend SQLite error creating session, saving locally:', e);
  }

  // Fallback offline
  const newId = sessionData.id || `sess_${Date.now()}`;
  const localSession = {
    ...sessionData,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: sessionData.status || 'DRAFT',
    activities: (sessionData.activities || []).map((a, idx) => ({
      ...a,
      id: a.id || `act_${Date.now()}_${idx}`,
      session_id: newId,
      order_index: idx,
      status: a.status || 'PENDING'
    })),
    events: [],
    participation: []
  };

  const cached = getCachedSessions();
  setCachedSessions([localSession, ...cached]);
  return localSession;
}

export async function updateSessionApi(sessionId, updateData) {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (res.ok) {
      const updated = await res.json();
      const cached = getCachedSessions().map(s => s.id === sessionId ? { ...s, ...updated } : s);
      setCachedSessions(cached);
      return updated;
    }
  } catch (e) {
    console.warn('Backend SQLite error updating session:', e);
  }

  // Fallback
  const cached = getCachedSessions().map(s => {
    if (s.id === sessionId) {
      return { ...s, ...updateData, updated_at: new Date().toISOString() };
    }
    return s;
  });
  setCachedSessions(cached);
  return cached.find(s => s.id === sessionId);
}

export async function deleteSessionApi(sessionId) {
  try {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Backend SQLite error deleting session:', e);
  }

  const cached = getCachedSessions().filter(s => s.id !== sessionId);
  setCachedSessions(cached);
  if (getStoredActiveSessionId() === sessionId) {
    setStoredActiveSessionId(null);
  }
  return { success: true };
}

export async function saveActivitiesApi(sessionId, activities) {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/activities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend SQLite error saving activities:', e);
  }

  const cached = getCachedSessions().map(s => {
    if (s.id === sessionId) {
      return { ...s, activities };
    }
    return s;
  });
  setCachedSessions(cached);
  return activities;
}

export async function addSessionEventApi(sessionId, eventData) {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend SQLite error logging session event:', e);
  }
  return { id: `ev_${Date.now()}`, success: true };
}

export async function addStudentParticipationApi(sessionId, participationData) {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/participation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participationData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend SQLite error recording participation:', e);
  }
  return { id: `part_${Date.now()}`, success: true };
}
