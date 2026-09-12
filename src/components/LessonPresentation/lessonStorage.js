/**
 * lessonStorage.js
 * Quản lý dữ liệu Bài học (Lessons) & Slides cho module Lesson Library + Presentation
 * Hỗ trợ đồng bộ SQLite REST API và fallback an toàn sang LocalStorage
 */

// Danh mục các chủ đề bộ môn Tin học chuẩn GDPT 2018
export const INFORMATICS_TOPICS = [
  { id: 'all', label: 'Tất Cả Chủ Đề', icon: '📂' },
  { id: 'Máy tính & Em', label: 'Chủ đề A: Máy tính và Em', icon: '🖥️' },
  { id: 'Mạng máy tính & Internet', label: 'Chủ đề B: Mạng máy tính & Internet', icon: '🌐' },
  { id: 'Tổ chức lưu trữ & Tìm kiếm', label: 'Chủ đề C: Tổ chức lưu trữ & Tìm kiếm', icon: '📁' },
  { id: 'Đạo đức & Văn hóa số', label: 'Chủ đề D: Đạo đức & Văn hóa số', icon: '🛡️' },
  { id: 'Ứng dụng Tin học', label: 'Chủ đề E: Ứng dụng Tin học', icon: '🎨' },
  { id: 'Giải quyết vấn đề & Lập trình', label: 'Chủ đề F: Lập trình & Thuật toán', icon: '🧩' },
];

/**
 * So sánh tên bài học tự nhiên (Natural Lesson Sorting)
 * Tự động nhận diện và sắp xếp chuẩn: "Bài 1", "Bài 2", ..., "Bài 9", "Bài 10", "Bài 11"...
 * Hỗ trợ tiếng Việt có dấu và các tiền tố Tiết, Tuần, Chủ đề, Lesson, Unit.
 */
export function compareLessonTitles(titleA = '', titleB = '') {
  const cleanA = (titleA || '').trim();
  const cleanB = (titleB || '').trim();

  const extractLessonNum = (str) => {
    const match = str.match(/(?:bài|tiết|tuần|chủ đề|lesson|unit)\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);
    const generalMatch = str.match(/(?:^|[_\-\s])(\d+)(?:[_\-\s:]|$)/);
    if (generalMatch) return parseInt(generalMatch[1], 10);
    return null;
  };

  const numA = extractLessonNum(cleanA);
  const numB = extractLessonNum(cleanB);

  if (numA !== null && numB !== null) {
    if (numA !== numB) {
      return numA - numB;
    }
  } else if (numA !== null && numB === null) {
    return -1;
  } else if (numA === null && numB !== null) {
    return 1;
  }

  return cleanA.localeCompare(cleanB, 'vi', { numeric: true, sensitivity: 'base' });
}

/**
 * Tự động nhận diện Khối lớp (1 - 5) từ tên file PowerPoint hoặc tiêu đề
 * Hỗ trợ các định dạng:
 * - TIN HOC 3, TIN HỌC 3, TINHOC3, TIN 3, TH3, TH 3
 * - LỚP 3, LOP 3, LP 3
 * - KHỐI 3, KHOI 3, KH 3
 * - LQTH3, LQTH 3 (Làm quen tin học)
 * - K3 (K3_Bai 1, K3-...)
 */
export function detectGradeFromFileName(fileName = '', fallbackGrade = 3) {
  if (!fileName) return Number(fallbackGrade) || 3;
  const fn = fileName.toUpperCase();

  for (let g = 1; g <= 5; g++) {
    // 1. Cụm từ môn học: TIN HOC 3, TIN HỌC 3, TINHOC 3, TIN 3, TH3, TH 3
    const tinHocPattern = new RegExp(`(?:TIN\\s*HỌC|TIN\\s*HOC|TINHOC|TIN|TH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (tinHocPattern.test(fn)) return g;

    // 2. Cụm từ lớp học: LỚP 3, LOP 3, LP 3
    const lopPattern = new RegExp(`(?:LỚP|LOP|LP)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lopPattern.test(fn)) return g;

    // 3. Cụm từ khối: KHỐI 3, KHOI 3, KH 3
    const khoiPattern = new RegExp(`(?:KHỐI|KHOI|KH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (khoiPattern.test(fn)) return g;

    // 4. LQTH (Làm quen tin học): LQTH3, LQTH 3
    const lqthPattern = new RegExp(`LQTH[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lqthPattern.test(fn)) return g;

    // 5. K3 (ví dụ K3-Bai 1, K3_...)
    const kPattern = new RegExp(`(^|[^a-zA-Z0-9])K[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (kPattern.test(fn)) return g;
  }

  return Number(fallbackGrade) || 3;
}

/**
 * Trích xuất tiêu đề bài học từ tên file PowerPoint (fallback phía client)
 * Nhận diện mẫu "BaiN" / "BàiN" (ví dụ: Bai2, Bai7, Bai12, Bai9A)
 */
export function extractTitleFromFileName(originalName = '') {
  if (!originalName) return 'Bài giảng PowerPoint';
  const ext = originalName.lastIndexOf('.') !== -1 ? originalName.slice(originalName.lastIndexOf('.')) : '';
  let base = ext ? originalName.slice(0, originalName.lastIndexOf('.')) : originalName;

  // Bỏ tiền tố KHBD_LQTH1_, KHBD_, GA_, v.v.
  base = base.replace(/^KHBD[_-](?:LQTH\d+[_-])?/i, '')
             .replace(/^GA[_-]/i, '');

  // Chuẩn hóa các dạng:
  // Bai2_TinHoc5 -> Bài 2
  // TIN HOC 3 - BAI (1) -> Bài 1
  // TIN HOC 4 - BAI 12B -> Bài 12B
  const m1 = base.match(/^(?:bài|bai)[_\-\s]*(\d+[a-zA-Z]?)(?:[_\-\s]*(?:tinhoc|tin\s*học)[_\-\s]*\d*)?$/i);
  if (m1) {
    return `Bài ${m1[1].toUpperCase()}`;
  }

  const m2 = base.match(/^(?:tin\s*học|tinhoc)\s*\d+\s*[-_:]\s*(?:bài|bai)\s*\(?(\d+[a-zA-Z]?)\)?$/i);
  if (m2) {
    return `Bài ${m2[1].toUpperCase()}`;
  }

  const m3 = base.match(/^(?:bài|bai)[_\-\s]*(\d+[a-zA-Z]?)[_\-\s]+(.*)$/i);
  if (m3) {
    return `Bài ${m3[1].toUpperCase()} - ${m3[2].trim()}`;
  }

  return base.trim() || 'Bài giảng PowerPoint';
}

// Định nghĩa 7 loại Slide hỗ trợ trong giảng dạy Tin học
export const SLIDE_TYPES = [
  {
    type: 'TITLE',
    label: 'Tiêu Đề / Trang Bìa',
    icon: '🏷️',
    color: '#3b82f6',
    description: 'Trang bìa bài dạy, tên bài, khối lớp, phân môn và thông tin giáo viên.'
  },
  {
    type: 'CONTENT',
    label: 'Nội Dung / Khái Niệm',
    icon: '📝',
    color: '#06b6d4',
    description: 'Nội dung kiến thức mới, gạch đầu dòng và giải thích bài học.'
  },
  {
    type: 'IMAGE',
    label: 'Hình Ảnh Minh Họa',
    icon: '🖼️',
    color: '#10b981',
    description: 'Hình ảnh linh kiện, mô hình mạng hoặc sơ đồ thao tác kèm chú thích.'
  },
  {
    type: 'VIDEO',
    label: 'Video Thực Hành',
    icon: '🎥',
    color: '#8b5cf6',
    description: 'Clip hướng dẫn thao tác phần mềm, liên kết video hoặc hình minh họa thao tác.'
  },
  {
    type: 'QUESTION',
    label: 'Câu Hỏi Trắc Nghiệm',
    icon: '❓',
    color: '#f59e0b',
    description: 'Câu hỏi tương tác 4 đáp án A, B, C, D có bấm hiển thị đáp án đúng & giải thích.'
  },
  {
    type: 'ACTIVITY',
    label: 'Nhiệm Vụ Thực Hành',
    icon: '💻',
    color: '#ec4899',
    description: 'Giao nhiệm vụ cá nhân/theo cặp trên máy tính kèm đồng hồ đếm giờ.'
  },
  {
    type: 'SUMMARY',
    label: 'Ghi Nhớ Cốt Lõi',
    icon: '⭐',
    color: '#6366f1',
    description: 'Tổng kết nội dung trọng tâm bài học và nhắc nhở an toàn phòng máy.'
  }
];

// Các tùy chọn bố cục (Layouts)
export const SLIDE_LAYOUTS = [
  { id: 'STANDARD', label: 'Chuẩn (Trên - Dưới)', icon: '⬆️' },
  { id: 'SPLIT_RIGHT', label: 'Chia đôi (Ảnh bên Trái - Chữ bên Phải)', icon: '⬅️' },
  { id: 'SPLIT_LEFT', label: 'Chia đôi (Chữ bên Trái - Ảnh bên Phải)', icon: '➡️' },
  { id: 'CENTERED', label: 'Căn giữa nổi bật', icon: '🎯' },
];

const LOCAL_LESSONS_KEY = 'eduict_lessons_cache_v1';

// Mẫu tạo Slide mới theo loại
export function createDefaultSlide(type = 'CONTENT', orderIndex = 0) {
  const baseId = `slide_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  
  switch (type) {
    case 'TITLE':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'TITLE',
        title: 'TÊN BÀI DẠY MỚI',
        content: 'Môn Tin học • Thời lượng 35 phút\nGiáo viên: Thầy/Cô bộ môn Tin học',
        layout: 'STANDARD',
        image_url: '',
        video_url: '',
        question_data: '',
        activity_data: '',
        teacher_notes: 'Ổn định trật tự học sinh, kiểm tra sĩ số và giới thiệu bài.'
      };
    case 'IMAGE':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'IMAGE',
        title: 'Quan sát hình ảnh minh họa',
        content: 'Chú thích: Quan sát kỹ các thành phần trên hình để nhận biết thao tác.',
        layout: 'SPLIT_RIGHT',
        image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60',
        video_url: '',
        question_data: '',
        activity_data: '',
        teacher_notes: 'Chỉ vào các chi tiết then chốt trên hình ảnh và đặt câu hỏi gợi mở cho học sinh.'
      };
    case 'VIDEO':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'VIDEO',
        title: 'Xem video hướng dẫn thực hành',
        content: 'Quan sát các bước thao tác trên màn hình trước khi bắt đầu thực hành trên máy.',
        layout: 'STANDARD',
        image_url: '',
        video_url: 'https://www.youtube.com',
        question_data: '',
        activity_data: '',
        teacher_notes: 'Nhắc học sinh quan sát kỹ con trỏ chuột và phím tắt trong video.'
      };
    case 'QUESTION':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'QUESTION',
        title: 'Câu hỏi thử tài Tin học',
        content: 'Em hãy chọn câu trả lời đúng nhất:',
        layout: 'CENTERED',
        image_url: '',
        video_url: '',
        question_data: JSON.stringify({
          question: 'Em hãy cho biết đáp án nào dưới đây là chính xác?',
          options: [
            'A. Phương án thứ nhất',
            'B. Phương án thứ hai',
            'C. Phương án thứ ba',
            'D. Phương án thứ tư'
          ],
          correct_index: 0,
          explanation: 'Giải thích chi tiết vì sao phương án A là chính xác.'
        }),
        activity_data: '',
        teacher_notes: 'Gọi học sinh đứng tại chỗ trả lời hoặc dùng Vòng quay may mắn bốc thăm.'
      };
    case 'ACTIVITY':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'ACTIVITY',
        title: 'Nhiệm vụ thực hành trên máy tính',
        content: 'Yêu cầu: Mở phần mềm thực hành và hoàn thành bài tập theo hướng dẫn.',
        layout: 'STANDARD',
        image_url: '',
        video_url: '',
        question_data: '',
        activity_data: JSON.stringify({
          format: 'pair',
          duration: 10,
          task: 'Ngồi ghép đôi 2 bạn/máy: 1 bạn thao tác máy, 1 bạn kiểm tra kết quả.'
        }),
        teacher_notes: 'Bật đồng hồ đếm giờ 10 phút và đi quan sát, khích lệ các em học sinh.'
      };
    case 'SUMMARY':
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'SUMMARY',
        title: 'Em cần ghi nhớ',
        content: '1. Nắm vững thao tác cơ bản đã học.\n2. Thực hành đúng quy trình an toàn phòng máy.\n3. Luôn lưu bài và thoát ứng dụng trước khi tắt máy.',
        layout: 'STANDARD',
        image_url: '',
        video_url: '',
        question_data: '',
        activity_data: '',
        teacher_notes: 'Củng cố lại kiến thức trước khi cả lớp nghỉ.'
      };
    case 'CONTENT':
    default:
      return {
        id: baseId,
        order_index: orderIndex,
        type: 'CONTENT',
        title: 'Nội dung bài học',
        content: '• Ý chính 1: Giới thiệu nội dung trọng tâm.\n• Ý chính 2: Phân tích và ví dụ thực tế.\n• Ý chính 3: Thảo luận cùng bạn bè.',
        layout: 'STANDARD',
        image_url: '',
        video_url: '',
        question_data: '',
        activity_data: '',
        teacher_notes: 'Nhấn mạnh các khái niệm quan trọng để học sinh ghi nhớ.'
      };
  }
}

// ----------------------------------------------------
// LOCAL STORAGE CACHE HELPERS
// ----------------------------------------------------
export function getLocalLessonsCache() {
  try {
    const raw = localStorage.getItem(LOCAL_LESSONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalLessonsCache(lessons) {
  try {
    localStorage.setItem(LOCAL_LESSONS_KEY, JSON.stringify(lessons));
  } catch {}
}

// ----------------------------------------------------
// REST API INTEGRATION WITH FALLBACK
// ----------------------------------------------------

// 1. Lấy danh sách bài học
export async function fetchLessonsApi(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.grade && filters.grade !== 'all') params.append('grade', filters.grade);
    if (filters.topic && filters.topic !== 'all') params.append('topic', filters.topic);
    if (filters.similarity_status && filters.similarity_status !== 'all') params.append('similarity_status', filters.similarity_status);
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

    const res = await fetch(`/api/lessons?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      saveLocalLessonsCache(data);
      return data;
    }
  } catch (err) {
    console.warn('API /api/lessons không khả dụng, sử dụng cache local:', err.message);
  }

  // Fallback sang local cache
  let cached = getLocalLessonsCache();
  if (filters.grade && filters.grade !== 'all') {
    cached = cached.filter(l => Number(l.grade) === Number(filters.grade));
  }
  if (filters.topic && filters.topic !== 'all') {
    cached = cached.filter(l => l.topic === filters.topic);
  }
  if (filters.similarity_status && filters.similarity_status !== 'all') {
    cached = cached.filter(l => l.similarity_status === filters.similarity_status);
  }
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    cached = cached.filter(l => 
      (l.title && l.title.toLowerCase().includes(s)) ||
      (l.keywords && l.keywords.toLowerCase().includes(s))
    );
  }
  return cached;
}

// 2. Lấy chi tiết bài học kèm slides
export async function fetchLessonDetailApi(lessonId) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi lấy chi tiết bài học ${lessonId}:`, err.message);
  }

  const cachedList = getLocalLessonsCache();
  return cachedList.find(l => l.id === lessonId) || null;
}

// 3. Tạo mới bài học
export async function createLessonApi(lessonData) {
  try {
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lessonData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Lỗi tạo bài học qua API:', err.message);
  }

  // Fallback local
  const newLesson = {
    ...lessonData,
    id: lessonData.id || `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slides: lessonData.slides || [createDefaultSlide('TITLE', 0), createDefaultSlide('CONTENT', 1)]
  };
  const list = getLocalLessonsCache();
  const updated = [newLesson, ...list];
  saveLocalLessonsCache(updated);
  return newLesson;
}

// 4. Cập nhật bài học
export async function updateLessonApi(lessonId, lessonData) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lessonData)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi cập nhật bài học ${lessonId}:`, err.message);
  }

  // Fallback local
  const list = getLocalLessonsCache();
  const idx = list.findIndex(l => l.id === lessonId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...lessonData, updated_at: new Date().toISOString() };
    saveLocalLessonsCache(list);
    return list[idx];
  }
  return null;
}

// 5. Xóa bài học
export async function deleteLessonApi(lessonId) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi xóa bài học ${lessonId}:`, err.message);
  }

  const list = getLocalLessonsCache().filter(l => l.id !== lessonId);
  saveLocalLessonsCache(list);
  return { success: true, id: lessonId };
}

// 6. Nhân bản bài học (Duplicate)
export async function duplicateLessonApi(lessonId) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}/duplicate`, { method: 'POST' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi nhân bản bài học ${lessonId}:`, err.message);
  }

  const original = await fetchLessonDetailApi(lessonId);
  if (!original) throw new Error('Không tìm thấy bài học gốc để nhân bản');

  const cloned = {
    ...original,
    id: `les_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title: `${original.title} (Bản sao)`,
    slides: (original.slides || []).map((s, idx) => ({
      ...s,
      id: `slide_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 3)}`
    }))
  };
  return createLessonApi(cloned);
}

// 7. Cập nhật danh sách slides
export async function saveLessonSlidesApi(lessonId, slides) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}/slides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slides)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi lưu slides cho bài học ${lessonId}:`, err.message);
  }

  const list = getLocalLessonsCache();
  const target = list.find(l => l.id === lessonId);
  if (target) {
    target.slides = slides;
    saveLocalLessonsCache(list);
  }
  return slides;
}

// 8. Upload file PowerPoint (.pptx) để xử lý và trích xuất slide xem trước
export async function uploadPptxPreviewApi(file) {
  // Đọc file thành base64 để gửi an toàn qua JSON
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.substring(commaIdx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/lessons/upload-pptx-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileBase64: base64
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể xử lý file PowerPoint.');
  }
  return data;
}

// 9. Xác nhận lưu bài học PowerPoint đã import vào Thư viện bài học
export async function confirmImportPptxApi(importData) {
  const res = await fetch('/api/lessons/confirm-import-pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(importData)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể lưu bài giảng vào thư viện.');
  }
  return data.lesson;
}

// 10. Hủy bỏ phiên import PowerPoint tạm thời
export async function cancelImportPptxApi(tempId) {
  if (!tempId) return;
  try {
    await fetch('/api/lessons/cancel-import-pptx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempId })
    });
  } catch (err) {
    console.warn('Lỗi hủy phiên import tạm thời:', err.message);
  }
}

// 11. Import nhanh bài giảng PowerPoint (Giai đoạn A: phản hồi < 30ms, trích xuất metadata và render nền)
export async function fastImportPptxApi(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (options.title) formData.append('title', options.title);
  if (options.grade) formData.append('grade', options.grade);
  if (options.topic) formData.append('topic', options.topic);
  if (options.durationMinutes) formData.append('durationMinutes', options.durationMinutes);
  if (options.description) formData.append('description', options.description);
  if (options.allowDuplicate) formData.append('allowDuplicate', 'true');
  if (options.similarity_status) formData.append('similarity_status', options.similarity_status);
  if (options.similarity_score !== undefined) formData.append('similarity_score', options.similarity_score);
  if (options.duplicate_of_id) formData.append('duplicate_of_id', options.duplicate_of_id);

  const res = await fetch('/api/lessons/import-fast', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Không thể import nhanh file PowerPoint.');
    err.status = res.status;
    err.isDuplicate = data.isDuplicate;
    err.matchedLesson = data.matchedLesson;
    throw err;
  }
  return data; // { success: true, lesson, isCached }
}

// 12. Kiểm tra tiến độ/trạng thái render slide nền của bài học
export async function fetchLessonRenderStatusApi(lessonId) {
  try {
    const res = await fetch(`/api/lessons/${lessonId}/render-status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Lỗi kiểm tra render status cho bài học ${lessonId}:`, err.message);
  }
  return null;
}

// 12b. Thử lại kết xuất hình ảnh cho một slide đơn lẻ (Retry Pipeline - Requirement 13)
export async function retrySlideRenderApi(lessonId, slideId, slideNumber) {
  const targetSlideNum = Number(slideNumber) || 1;
  try {
    const res = await fetch(`/api/lessons/${lessonId}/slides/${targetSlideNum}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slideId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Fallback sang /api/lessons/retry-slide:', err.message);
  }

  // Fallback endpoint
  const resFallback = await fetch('/api/lessons/retry-slide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, slideId, slideNumber: targetSlideNum })
  });
  const data = await resFallback.json();
  if (!resFallback.ok) {
    throw new Error(data.error || 'Không thể thử lại kết xuất slide.');
  }
  return data; // { success: true, slide, lessonStatus }
}

// 12c. Thử lại hoặc tạo ảnh xem trước cho bài giảng (Thumbnail Pipeline - Requirement 2)
export async function retryLessonThumbnailApi(lessonId) {
  const res = await fetch(`/api/lessons/${lessonId}/retry-thumbnail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tạo ảnh xem trước bài học.');
  }
  return data;
}

// 13. Kiểm tra bài giảng trùng lặp (Batch pre-check < 25ms không render)
export async function checkLessonsDuplicateApi(files) {
  const formData = new FormData();
  const fileList = Array.isArray(files) ? files : [files];
  fileList.forEach(f => {
    formData.append('files', f);
  });

  const res = await fetch('/api/lessons/check-duplicates', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi kiểm tra bài giảng trùng lặp.');
  }
  return data.results || [];
}

// 14. Tự động quét toàn bộ thư viện bài giảng để tìm bài trùng lặp
export async function scanLibraryDuplicatesApi() {
  const res = await fetch('/api/lessons/scan-duplicates');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi quét trùng lặp thư viện bài giảng.');
  }
  return data;
}

// 15. Giáo viên xác nhận giữ lại bài giảng (bỏ qua cảnh báo trùng)
export async function resolveDuplicateApi(lessonId) {
  const res = await fetch('/api/lessons/resolve-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể xác nhận giữ lại bài giảng.');
  }
  return data;
}

// Cấu hình các ngưỡng phát hiện trùng lặp
export const DUPLICATE_THRESHOLDS = {
  EXACT_MATCH: 100,            // 95 - 100%: Trùng 100% (🔴 Cảnh báo)
  NEAR_DUPLICATE_HIGH: 95,     // 95 - 100%
  NEAR_DUPLICATE_LIKELY: 80,   // 80 - 95%: Trùng cao (🟠 Cảnh báo)
  NEAR_DUPLICATE_SIMILAR: 60,  // 60 - 80%: Gần giống (🟡 Tham khảo)
  SAFE_DIFFERENT: 60           // < 60%: Khác biệt an toàn
};

// Cấu hình 3 mức độ trùng lặp theo sơ đồ kiến trúc
export const DUPLICATE_TIERS = {
  exact: {
    id: 'exact',
    range: '95-100%',
    title: 'Trùng 100%',
    badge: '🔴 Cảnh báo',
    badgeText: '🔴 Trùng 100%',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    actionHint: 'Nên kiểm tra và xóa bài trùng'
  },
  high: {
    id: 'high',
    range: '80-95%',
    title: 'Trùng cao',
    badge: '🟠 Cảnh báo',
    badgeText: '🟠 Trùng cao',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    actionHint: 'Có thể cân nhắc giữ lại hoặc xóa bớt'
  },
  reference: {
    id: 'reference',
    range: '60-80%',
    title: 'Gần giống',
    badge: '🟡 Tham khảo',
    badgeText: '🟡 Gần giống',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.35)',
    actionHint: 'Nội dung tương tự để tham khảo'
  }
};

// Nhãn và màu sắc hiển thị trạng thái trùng lặp trên giao diện
export const SIMILARITY_STATUS_LABELS = {
  unique: { 
    label: 'Bài mới', 
    badgeText: '✓ Bài mới',
    color: '#10b981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    border: 'rgba(16, 185, 129, 0.35)', 
    icon: '✓' 
  },
  exact_duplicate: { 
    label: 'Trùng 100%', 
    badgeText: '🔴 Trùng 100%',
    badgeAlert: '🔴 Cảnh báo',
    color: '#ef4444', 
    bg: 'rgba(239, 68, 68, 0.14)', 
    border: 'rgba(239, 68, 68, 0.4)', 
    icon: '🔴' 
  },
  high_duplicate: { 
    label: 'Trùng cao', 
    badgeText: '🟠 Trùng cao',
    badgeAlert: '🟠 Cảnh báo',
    color: '#f97316', 
    bg: 'rgba(249, 115, 22, 0.14)', 
    border: 'rgba(249, 115, 22, 0.4)', 
    icon: '🟠' 
  },
  near_similar: { 
    label: 'Gần giống', 
    badgeText: '🟡 Gần giống',
    badgeAlert: '🟡 Tham khảo',
    color: '#eab308', 
    bg: 'rgba(234, 179, 8, 0.14)', 
    border: 'rgba(234, 179, 8, 0.4)', 
    icon: '🟡' 
  },
  near_duplicate: { 
    label: 'Có khả năng trùng', 
    badgeText: '🟠 Trùng cao',
    badgeAlert: '🟠 Cảnh báo',
    color: '#f97316', 
    bg: 'rgba(249, 115, 22, 0.14)', 
    border: 'rgba(249, 115, 22, 0.4)', 
    icon: '🟠' 
  }
};


