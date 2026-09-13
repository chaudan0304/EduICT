/**
 * ppctMapping.js
 * Bảng Phân Phối Chương Trình (PPCT) Chuẩn Môn Tin Học Khối 1 - Khối 5 (GDPT)
 * Dùng để chuẩn hóa danh mục Chương/Chủ đề và tự động nhận diện chủ đề khi import PowerPoint
 */

import PPCT_DATA from '../../server/data/ppct-mapping.json' with { type: 'json' };

export const PPCT_MAPPING = PPCT_DATA;

// Map biểu tượng emoji cho từng tên chương nhằm tăng tính trực quan
const TOPIC_ICONS = {
  'Chương 1: Máy tính - Người bạn mới': '🖥️',
  'Chương 2: Vui học cùng máy tính': '🎮',
  'Chương 3: Học tập trực tuyến': '🌐',
  'Chương 4: Tập làm họa sĩ cùng Paint': '🎨',
  'Chương 1: Trở lại với máy tính': '⌨️',
  'Chương 4: Trải nghiệm cùng Wordpad': '📝',
  'Chương 5: Ứng dụng trong Windows': '🪟',
  'Chương 1: Máy tính và em': '🖥️',
  'Chương 2: Mạng máy tính và Internet': '🌐',
  'Chương 3: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin': '📁',
  'Chương 4: Đạo đức, pháp luật và văn hóa trong môi trường số': '🛡️',
  'Chương 5: Ứng dụng tin học': '🎨',
  'Chương 6: Giải quyết vấn đề với sự trợ giúp của máy tính': '🧩'
};

/**
 * Lấy danh sách các Chương/Chủ đề duy nhất của một Khối lớp theo PPCT
 * @param {number|string} grade Khối lớp (1, 2, 3, 4, 5)
 * @returns {Array<{ id: string, label: string, icon: string }>}
 */
export function getTopicsByGrade(grade) {
  const gNum = Number(grade) || 3;
  const gradeKey = `K${gNum}`;
  const lessons = PPCT_MAPPING[gradeKey] || [];

  const uniqueTopicNames = [];
  lessons.forEach(item => {
    if (item.chuong_chu_de && !uniqueTopicNames.includes(item.chuong_chu_de)) {
      uniqueTopicNames.push(item.chuong_chu_de);
    }
  });

  return uniqueTopicNames.map(topicName => ({
    id: topicName,
    label: topicName,
    icon: TOPIC_ICONS[topicName] || '📂'
  }));
}

/**
 * Chuẩn hóa text tiếng Việt phục vụ so khớp mờ
 */
export function normalizeVietnamese(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[_\-\(\)\[\]:.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trích xuất mã/số hiệu bài học từ tên file hoặc tiêu đề bài học
 * Ví dụ:
 *  - "Bài 1: Làm quen với máy tính" -> "1"
 *  - "TIN HOC 3 - BAI (12)" -> "12"
 *  - "BAI 12B_Phan mem" -> "12B"
 *  - "Bai9A_TinHoc5" -> "9A"
 *  - "KHBD_LQTH2_Bài 3-Hàng phím trên" -> "3"
 */
export function extractLessonIdentifier(titleOrFileName = '') {
  if (!titleOrFileName) return null;

  // Loại bỏ phần mở rộng file nếu có
  const cleanStr = String(titleOrFileName)
    .replace(/\.pptx$/i, '')
    .replace(/\.ppt$/i, '')
    .trim();

  // Pattern 1: Tìm "Bài", "Bai", "B" theo sau là số và ký tự chữ cái phụ (12A, 12B, 8A, 9B...)
  const matchWithPrefix = cleanStr.match(/(?:bài|bai|b)\s*\(?(\d+[a-zA-Z]?)\)?/i);
  if (matchWithPrefix) {
    return matchWithPrefix[1].toUpperCase();
  }

  // Pattern 2: Dạng gạch nối hoặc gạch dưới "Bai_1" hoặc "Bai-1"
  const matchSeparator = cleanStr.match(/(?:bài|bai)[_\-\s]+(\d+[a-zA-Z]?)/i);
  if (matchSeparator) {
    return matchSeparator[1].toUpperCase();
  }

  // Pattern 3: Số nằm độc lập trong ngoặc đơn hoặc sau chữ BAI
  const matchParen = cleanStr.match(/\((\d+[a-zA-Z]?)\)/);
  if (matchParen) {
    return matchParen[1].toUpperCase();
  }

  return null;
}

/**
 * Tính điểm tương đồng Dice Bigram giữa 2 chuỗi (0 -> 1)
 */
function diceSimilarity(s1, s2) {
  const norm1 = normalizeVietnamese(s1).replace(/\s+/g, '');
  const norm2 = normalizeVietnamese(s2).replace(/\s+/g, '');
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(norm1);
  const bg2 = getBigrams(norm2);
  let intersection = 0;
  bg1.forEach(b => {
    if (bg2.has(b)) intersection++;
  });

  return (2 * intersection) / (bg1.size + bg2.size);
}

/**
 * Tự động tra cứu và so khớp Chương/Chủ đề chuẩn theo PPCT cho một bài giảng
 * @param {number|string} grade Khối lớp (1 - 5)
 * @param {string} titleOrFileName Tiêu đề bài học hoặc tên file PPTX
 * @returns {{ topic: string, matchedLesson: object, confidence: number, matchType: string } | null}
 */
export function matchLessonTopic(grade, titleOrFileName) {
  if (!titleOrFileName) return null;

  const gNum = Number(grade) || 3;
  const gradeKey = `K${gNum}`;
  const lessons = PPCT_MAPPING[gradeKey];
  if (!lessons || lessons.length === 0) return null;

  const cleanInput = String(titleOrFileName)
    .replace(/\.pptx$/i, '')
    .replace(/\.ppt$/i, '')
    .trim();

  // 1. Thử bóc tách số hiệu bài học (Bài 1, Bài 12B...)
  const lessonId = extractLessonIdentifier(cleanInput);

  if (lessonId) {
    // Tìm các bài trong PPCT của khối này có cùng số hiệu bài học
    const candidates = lessons.filter(l => {
      const pId = extractLessonIdentifier(l.ten_bai);
      return pId === lessonId;
    });

    if (candidates.length === 1) {
      return {
        topic: candidates[0].chuong_chu_de,
        matchedLesson: candidates[0],
        confidence: 0.95,
        matchType: 'exact_lesson_number'
      };
    }

    if (candidates.length > 1) {
      // Trường hợp như Bài 9 (tiết 1), Bài 9 (tiết 2): chọn theo tương đồng tên
      let bestCandidate = candidates[0];
      let maxScore = -1;
      candidates.forEach(c => {
        const score = diceSimilarity(cleanInput, c.ten_bai);
        if (score > maxScore) {
          maxScore = score;
          bestCandidate = c;
        }
      });
      return {
        topic: bestCandidate.chuong_chu_de,
        matchedLesson: bestCandidate,
        confidence: 0.9,
        matchType: 'multiple_lesson_number'
      };
    }
  }

  // 2. So khớp mờ (Fuzzy matching) theo tên bài
  // Hữu ích cho các bài "Ôn tập", "Kiểm tra", hoặc tiêu đề không chứa chữ "Bài"
  const normInput = normalizeVietnamese(cleanInput);
  let bestMatch = null;
  let highestScore = 0;

  lessons.forEach(l => {
    const normPpct = normalizeVietnamese(l.ten_bai);
    
    // Nếu tiêu đề chứa nguyên vẹn tên bài PPCT hoặc ngược lại
    if (normInput.includes(normPpct) || normPpct.includes(normInput)) {
      const score = 0.85;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = l;
      }
      return;
    }

    const score = diceSimilarity(cleanInput, l.ten_bai);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = l;
    }
  });

  // Ngưỡng tin cậy tối thiểu: 55%
  if (highestScore >= 0.55 && bestMatch) {
    return {
      topic: bestMatch.chuong_chu_de,
      matchedLesson: bestMatch,
      confidence: Math.round(highestScore * 100) / 100,
      matchType: 'fuzzy_name'
    };
  }

  // Không tìm thấy match đáng tin cậy -> trả về null để caller ĐỂ TRỐNG
  return null;
}

/**
 * Lấy tiêu đề đầy đủ chính thức từ bảng PPCT chuẩn dựa vào Khối lớp và tên file/tiêu đề
 * Giúp tự động phục hồi các tiêu đề bị cụt hoặc rút gọn như "Bài 3", "Bai13", "Bai12"
 * @param {number|string} grade Khối lớp (1 - 5)
 * @param {string} titleOrFileName Tên bài hoặc tên file PowerPoint
 * @returns {string|null} Tiêu đề đầy đủ chuẩn theo PPCT GDPT
 */
export function getCanonicalLessonTitle(grade, titleOrFileName) {
  const match = matchLessonTopic(grade, titleOrFileName);
  if (match && match.matchedLesson && match.matchedLesson.ten_bai) {
    return match.matchedLesson.ten_bai;
  }
  return null;
}

