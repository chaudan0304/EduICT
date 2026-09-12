import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import path from 'node:path';

/**
 * Cache dữ liệu bảng PPCT chuẩn (ppct-mapping.json)
 */
let cachedPpctMapping = null;
export function getPpctMappingData() {
  if (cachedPpctMapping) return cachedPpctMapping;
  try {
    const filePath = path.resolve(process.cwd(), 'server', 'data', 'ppct-mapping.json');
    if (fs.existsSync(filePath)) {
      cachedPpctMapping = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn('Không thể nạp server/data/ppct-mapping.json:', err.message);
  }
  return cachedPpctMapping || {};
}

/**
 * Bóc tách số/ký hiệu bài học (e.g. "3", "12B", "9A")
 */
export function extractLessonNumber(str = '') {
  if (!str) return null;
  const m = str.match(/(?:bài|bai|lesson|unit)\s*\(?(\d+[a-zA-Z]?)\)?/i);
  if (m) return m[1].toUpperCase();
  const m2 = str.match(/(?:^|[_\-\s])(\d+[a-zA-Z]?)(?:[_\-\s:]|$)/);
  if (m2) return m2[1].toUpperCase();
  return null;
}

/**
 * Tra cứu bài học chuẩn trong bảng PPCT chuẩn dựa theo Khối lớp và tên bài / tên file
 */
export function getCanonicalPpctLesson(grade = 3, titleOrFileName = '') {
  const gNum = Number(grade) || 3;
  const gradeKey = `K${gNum}`;
  const ppct = getPpctMappingData();
  const list = ppct[gradeKey] || [];
  if (!list.length) return null;

  const lessonNum = extractLessonNumber(titleOrFileName);
  if (lessonNum) {
    const matches = list.filter(l => extractLessonNumber(l.ten_bai) === lessonNum);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      let best = matches[0];
      let bestScore = -1;
      for (const cand of matches) {
        const score = diceBigramSimilarity(titleOrFileName, cand.ten_bai);
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
      return best;
    }
  }

  // Fuzzy match nếu không có số bài (e.g. "Ôn tập", "Kiểm tra")
  let bestMatch = null;
  let highestSim = 0;
  for (const item of list) {
    const sim = diceBigramSimilarity(titleOrFileName, item.ten_bai);
    if (sim > highestSim && sim >= 0.6) {
      highestSim = sim;
      bestMatch = item;
    }
  }

  return bestMatch;
}

/**
 * Cấu hình các ngưỡng phát hiện trùng lặp (Configurable Thresholds)
 */
export const DUPLICATE_THRESHOLDS = {
  EXACT_MATCH: 100,            // 95 - 100%: Trùng 100% (🔴 Cảnh báo)
  NEAR_DUPLICATE_HIGH: 95,     // 95 - 100%
  NEAR_DUPLICATE_LIKELY: 80,   // 80 - 95%: Trùng cao (🟠 Cảnh báo)
  NEAR_DUPLICATE_SIMILAR: 60,  // 60 - 80%: Gần giống (🟡 Tham khảo)
  SAFE_DIFFERENT: 60           // < 60%: Khác biệt an toàn
};

/**
 * Cấu hình 3 mức độ trùng lặp theo đúng thiết kế hệ thống
 */
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
    actionHint: 'Nên kiểm tra và xóa bản sao bị trùng'
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
    actionHint: 'Nội dung rất giống nhau, cân nhắc giữ lại hoặc gộp bài'
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
    actionHint: 'Có một số nội dung tương đồng để giáo viên tham khảo'
  }
};

/**
 * Trạng thái trùng lặp chuẩn hóa
 */
export const SIMILARITY_STATUS = {
  UNIQUE: 'unique',
  NEAR_SIMILAR: 'near_similar',       // 60 - 80% (🟡 Tham khảo)
  HIGH_DUPLICATE: 'high_duplicate',   // 80 - 95%: Trùng cao (🟠 Cảnh báo)
  EXACT_DUPLICATE: 'exact_duplicate', // 95 - 100%: Trùng 100% (🔴 Cảnh báo)
  NEAR_DUPLICATE: 'near_duplicate'    // tương thích ngược
};

/**
 * Tính mã băm SHA-256 trực tiếp từ file buffer
 * @param {Buffer} buffer
 * @returns {string} SHA-256 Hex string
 */
export function calculateFileHash(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Dữ liệu buffer không hợp lệ để tính SHA-256.');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Đọc danh sách file entries từ cấu trúc ZIP của PPTX bằng Node.js thuần (< 3ms)
 */
export function readZipEntries(buffer) {
  const entries = [];
  if (!buffer || buffer.length < 22) return entries;

  // Tìm EOCD (End of Central Directory)
  let eocdOffset = -1;
  const maxSearch = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= maxSearch; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) return entries;

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdEntries = buffer.readUInt16LE(eocdOffset + 10);
  let pos = cdOffset;

  for (let i = 0; i < cdEntries; i++) {
    if (pos + 46 > buffer.length) break;
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(pos + 10);
    const compSize = buffer.readUInt32LE(pos + 20);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);

    const filename = buffer.toString('utf8', pos + 46, pos + 46 + nameLen);
    entries.push({ filename, method, compSize, localOffset });

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Giải nén một entry cụ thể từ ZIP buffer
 */
export function decompressZipEntry(buffer, entry) {
  const { method, compSize, localOffset } = entry;
  if (localOffset + 30 > buffer.length) return null;
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) return null;

  const localNameLen = buffer.readUInt16LE(localOffset + 26);
  const localExtraLen = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLen + localExtraLen;

  if (dataStart + compSize > buffer.length) return null;
  const compData = buffer.subarray(dataStart, dataStart + compSize);

  try {
    if (method === 8) {
      return zlib.inflateRawSync(compData);
    } else if (method === 0) {
      return compData;
    }
  } catch (err) {
    console.warn('Lỗi giải nén ZIP entry:', entry.filename, err.message);
  }
  return null;
}

/**
 * Nhận diện khối lớp từ tên file
 */
export function detectGradeFromFileName(fileName = '', fallbackGrade = 3) {
  if (!fileName) return Number(fallbackGrade) || 3;
  const fn = fileName.toUpperCase();

  for (let g = 1; g <= 5; g++) {
    const tinHocPattern = new RegExp(`(?:TIN\\s*HỌC|TIN\\s*HOC|TINHOC|TIN|TH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (tinHocPattern.test(fn)) return g;

    const lopPattern = new RegExp(`(?:LỚP|LOP|LP)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lopPattern.test(fn)) return g;

    const khoiPattern = new RegExp(`(?:KHỐI|KHOI|KH)[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (khoiPattern.test(fn)) return g;

    const lqthPattern = new RegExp(`LQTH[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (lqthPattern.test(fn)) return g;

    const kPattern = new RegExp(`(^|[^a-zA-Z0-9])K[\\s_.-]*${g}(?=[^0-9]|$)`, 'i');
    if (kPattern.test(fn)) return g;
  }

  return Number(fallbackGrade) || 3;
}

/**
 * Chuẩn hóa chuỗi văn bản phục vụ so sánh (bỏ dấu tiếng Việt, loại bỏ ký tự lạ, chuẩn khoảng trắng)
 */
export function normalizeText(str = '') {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trích xuất tiêu đề bài học từ nội dung XML của slide 1
 * Hỗ trợ gộp đa đoạn văn, đa text box (ví dụ text box 1: "BÀI", text box 2: "13", text box 3: "CẤU TRÚC RẼ NHÁNH")
 * hoặc tiêu đề dài chia làm 2 dòng liên tiếp.
 */
export function extractTitleFromSlide1Xml(xml = '') {
  if (!xml) return null;
  const pMatches = xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/gi) || [];
  const lines = [];

  for (const pXml of pMatches) {
    const texts = [];
    const re = /<a:t>([^<]+)<\/a:t>/g;
    let m;
    while ((m = re.exec(pXml)) !== null) {
      texts.push(m[1]);
    }
    if (texts.length === 0) continue;

    // Ghép thông minh các text run để tránh dính chữ giữa các run
    let joined = '';
    for (let j = 0; j < texts.length; j++) {
      const t = texts[j];
      if (!t) continue;
      if (joined.length > 0) {
        const lastChar = joined[joined.length - 1];
        const firstChar = t[0];
        if (/[A-Za-z0-9À-ỹ]/.test(lastChar) && /[A-Za-z0-9À-ỹ]/.test(firstChar)) {
          joined += ' ';
        }
      }
      joined += t;
    }
    joined = joined.replace(/\s+/g, ' ').trim();
    if (!joined) continue;

    // Lấy font size lớn nhất của paragraph
    let maxSz = 0;
    const szMatches = [...pXml.matchAll(/sz="(\d+)"/g)].map(x => parseInt(x[1], 10));
    for (const s of szMatches) {
      if (s > maxSz) maxSz = s;
    }

    lines.push({ text: joined, size: maxSz });
  }

  if (lines.length === 0) return null;

  // Ghép các dòng bị tách rời: "BÀI" / "Bai" và số "13" -> "Bài 13"
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^(?:bài|bai)\s*$/i.test(lines[i].text) && /^\d+[a-zA-Z]?$/i.test(lines[i + 1].text)) {
      lines[i].text = `Bài ${lines[i + 1].text.toUpperCase()}`;
      lines[i + 1].text = '';
    }
  }

  const validLines = lines.filter(l => l.text.length > 0);

  // 1. Tìm dòng tiêu đề chính bắt đầu bằng "Bài X"
  for (let i = 0; i < validLines.length; i++) {
    const l = validLines[i];
    const matchWithRest = l.text.match(/^(?:bài|bai)\s*(\d+[a-zA-Z]?)(?:\s*[:\-–—\.]\s*|\s+)(.*)$/i);
    const matchOnlyBai = l.text.match(/^(?:bài|bai)\s*(\d+[a-zA-Z]?)\s*$/i);

    if (matchWithRest) {
      let fullTitle = l.text;
      const rest = matchWithRest[2]?.trim() || '';

      // Kiểm tra dòng kế tiếp: nếu dòng kế tiếp không phải metadata và phần rest còn ngắn hoặc dòng kế tiếp có cỡ chữ tương đương -> ghép vào
      if (i + 1 < validLines.length) {
        const nextLine = validLines[i + 1];
        const isNotMeta = !/^(?:chủ\s*đề|tin\s*học|giáo\s*viên|trường|năm\s*học|kế\s*hoạch)/i.test(nextLine.text);
        if (isNotMeta && (rest.length < 15 || nextLine.size >= l.size * 0.7)) {
          fullTitle = `${fullTitle} ${nextLine.text}`;
        }
      }
      return fullTitle.replace(/\s+/g, ' ').trim();
    } else if (matchOnlyBai) {
      const baiPart = matchOnlyBai[0];
      // Trường hợp "BÀI 13" ở 1 text box và "CẤU TRÚC RẼ NHÁNH" ở text box kế tiếp
      if (i + 1 < validLines.length) {
        const nextLine = validLines[i + 1];
        const isNotMeta = !/^(?:chủ\s*đề|tin\s*học|giáo\s*viên|trường|năm\s*học|kế\s*hoạch)/i.test(nextLine.text);
        if (isNotMeta) {
          return `${baiPart}: ${nextLine.text}`.replace(/\s+/g, ' ').trim();
        }
      }
      return baiPart;
    }
  }

  // 2. Trường hợp tiêu đề nằm trước hoặc sau (ví dụ: "THỰC HÀNH TẠO ĐỒ DÙNG..." và ở dưới có "Bài 9B")
  const baiLine = validLines.find(l => /^(?:bài|bai)\s*\d+[a-zA-Z]?/i.test(l.text));
  if (baiLine) {
    const contentLines = validLines.filter(l => 
      l !== baiLine && 
      !/^(?:chủ\s*đề|tin\s*học|giáo\s*viên|trường|năm\s*học|kế\s*hoạch|\d+$)/i.test(l.text)
    );
    if (contentLines.length > 0) {
      contentLines.sort((a, b) => b.size - a.size);
      return `${baiLine.text}: ${contentLines[0].text}`.replace(/\s+/g, ' ').trim();
    }
    return baiLine.text;
  }

  return null;
}

/**
 * Trích xuất tiêu đề bài học từ tên file PowerPoint (fallback)
 * Nhận diện mẫu "BaiN" / "BàiN" (ví dụ: Bai2, Bai7, Bai12, Bai9A)
 */
export function extractTitleFromFileName(originalName = '') {
  if (!originalName) return 'Bài giảng PowerPoint';
  const ext = path.extname(originalName);
  let base = path.basename(originalName, ext);

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

/**
 * Làm sạch tiêu đề (bỏ các hậu tố bản sao, tiền tố KHBD_...)
 * KHÔNG xóa tiền tố BaiN/BàiN để tránh mất thông tin bài học
 */
export function cleanLessonTitle(title = '') {
  let cleaned = (title || '')
    .replace(/\.pptx$/i, '')
    .replace(/^KHBD[_-](?:LQTH\d+[_-])?/i, '')
    .replace(/^GA[_-]/i, '')
    .replace(/\s*\(copy\)/gi, '')
    .replace(/\s*\(bản sao\)/gi, '')
    .replace(/\s*\(bản copy\)/gi, '')
    .replace(/\s*\(mới\)/gi, '')
    .replace(/\s*\(new\)/gi, '')
    .replace(/\s*\((\d+)\)$/g, '') // Bỏ (1), (2), (3)...
    .replace(/\s*-\s*copy$/gi, '')
    .trim();

  return cleaned || title;
}

/**
 * Độ tương đồng giữa 2 chuỗi theo Dice Coefficient trên Character Bigrams (0.0 -> 1.0)
 */
export function diceBigramSimilarity(s1, s2) {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (n1 === n2) return 1;
  if (!n1 || !n2) return 0;
  if (n1.length < 2 || n2.length < 2) {
    return n1 === n2 ? 1 : 0;
  }

  const getBigrams = (str) => {
    const bg = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const pair = str.slice(i, i + 2);
      bg.set(pair, (bg.get(pair) || 0) + 1);
    }
    return bg;
  };

  const bg1 = getBigrams(n1);
  const bg2 = getBigrams(n2);

  let intersection = 0;
  for (const [pair, count1] of bg1.entries()) {
    if (bg2.has(pair)) {
      intersection += Math.min(count1, bg2.get(pair));
    }
  }

  const total = (n1.length - 1) + (n2.length - 1);
  return total > 0 ? (2 * intersection) / total : 0;
}

/**
 * Trích xuất tập từ khóa (Tokens) từ văn bản
 */
export function extractWordTokens(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return new Set();
  const words = normalized.split(' ').filter(w => w.length > 1);
  return new Set(words);
}

/**
 * Tính độ tương đồng Jaccard giữa 2 tập hợp từ khóa: |A ∩ B| / |A ∪ B|
 */
export function jaccardSetSimilarity(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Trích xuất dấu vân tay nội dung (Fingerprint), slide headings và text từ buffer PPTX (< 5ms)
 * @param {Buffer} buffer
 * @param {string} originalName
 */
export function extractPptxContentFingerprint(buffer, originalName = '') {
  const fileHash = calculateFileHash(buffer);
  const fileSizeBytes = buffer.length;
  const entries = readZipEntries(buffer);

  let slideCount = 0;
  let appXmlBuffer = null;
  let coreXmlBuffer = null;
  const slideXmlEntries = [];

  for (const entry of entries) {
    if (entry.filename === 'docProps/app.xml') {
      appXmlBuffer = decompressZipEntry(buffer, entry);
    } else if (entry.filename === 'docProps/core.xml') {
      coreXmlBuffer = decompressZipEntry(buffer, entry);
    } else if (/^ppt\/slides\/slide[0-9]+\.xml$/i.test(entry.filename)) {
      slideXmlEntries.push(entry);
    }
  }

  // Sắp xếp các slide XML theo thứ tự số
  slideXmlEntries.sort((a, b) => {
    const numA = parseInt(a.filename.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.filename.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  if (appXmlBuffer) {
    const xml = appXmlBuffer.toString('utf8');
    const m = xml.match(/<Slides>(\d+)<\/Slides>/i);
    if (m) slideCount = parseInt(m[1], 10);
  }
  if (!slideCount && slideXmlEntries.length > 0) {
    slideCount = slideXmlEntries.length;
  }
  if (!slideCount) {
    slideCount = 1;
  }

  // Xác định tiêu đề gợi ý
  let suggestedTitle = '';

  // 1. Ưu tiên đọc từ Slide 1
  if (slideXmlEntries.length > 0) {
    try {
      const slide1Buffer = decompressZipEntry(buffer, slideXmlEntries[0]);
      if (slide1Buffer) {
        suggestedTitle = extractTitleFromSlide1Xml(slide1Buffer.toString('utf8')) || '';
      }
    } catch (err) {
      // Bỏ qua lỗi decompress slide 1
    }
  }

  // 2. Fallback trích xuất từ tên file nhận diện mẫu BaiN/BàiN
  if (!suggestedTitle && originalName) {
    suggestedTitle = extractTitleFromFileName(originalName);
  }

  // 3. Fallback core.xml nếu tiêu đề còn rỗng hoặc quá chung chung
  if (!suggestedTitle || /^(presentation|slide|document|untitled|bai_giang)$/i.test(suggestedTitle)) {
    if (coreXmlBuffer) {
      const xml = coreXmlBuffer.toString('utf8');
      const titleMatch = xml.match(/<dc:title>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim()) {
        suggestedTitle = titleMatch[1].trim();
      }
    }
  }
  if (!suggestedTitle) {
    suggestedTitle = path.basename(originalName, path.extname(originalName)) || 'Bài giảng PowerPoint';
  }

  const detectedGrade = detectGradeFromFileName(originalName, 3);

  // 4. Đối chiếu chuẩn hóa với bảng PPCT Chuẩn (ppct-mapping.json)
  const canonicalPpct = getCanonicalPpctLesson(detectedGrade, suggestedTitle || originalName);
  let canonicalTopic = '';
  if (canonicalPpct && canonicalPpct.ten_bai) {
    canonicalTopic = canonicalPpct.chuong_chu_de || '';
    // Nếu tiêu đề hiện tại quá ngắn (ví dụ chỉ có số bài: "Bài 3", "Bài 10", "Bai13") hoặc trích xuất chưa đầy đủ
    const isTruncatedOrShort = !suggestedTitle || 
                               suggestedTitle.length < 15 || 
                               /^(?:bài|bai)\s*\(?(\d+[a-zA-Z]?)\)?$/i.test(suggestedTitle.trim());
    if (isTruncatedOrShort) {
      suggestedTitle = canonicalPpct.ten_bai;
    }
  }

  // Trích xuất text và tiêu đề slide từ các slide XML (tối đa 30 slide đầu để tối ưu tốc độ < 5ms)
  const slideHeadings = [];
  const allTexts = [];
  const limitSlides = slideXmlEntries.slice(0, 30);

  for (const se of limitSlides) {
    const xmlBuf = decompressZipEntry(buffer, se);
    if (!xmlBuf) continue;
    const xml = xmlBuf.toString('utf8');

    const texts = [];
    const re = /<a:t>([^<]+)<\/a:t>/g;
    let match;
    while ((match = re.exec(xml)) !== null) {
      const t = match[1].trim();
      if (t) texts.push(t);
    }

    if (texts.length > 0) {
      slideHeadings.push(texts[0]);
      allTexts.push(texts.join(' '));
    }
  }

  const fullText = allTexts.join(' ');
  const textTokens = extractWordTokens(fullText);
  // Fingerprint rút gọn: 1000 ký tự đầu chuẩn hóa
  const contentFingerprint = normalizeText(fullText).slice(0, 1000);

  return {
    fileHash,
    fileSizeBytes,
    slideCount,
    suggestedTitle,
    detectedGrade,
    canonicalTopic,
    slideHeadings,
    fullText,
    contentFingerprint,
    textTokens
  };
}

/**
 * Tính toán độ tương đồng chi tiết giữa 2 bài học (0% - 100%)
 * @param {Object} itemA - { title, slideCount, grade, slideHeadings, fullText, textTokens }
 * @param {Object} itemB - { title, slideCount, grade, slideHeadings, fullText, textTokens }
 * @returns {Object} { similarityScore, details: { titleSimilarity, countMatch, headingsSimilarity, textSimilarity } }
 */
export function calculateSimilarity(itemA, itemB) {
  // 1. So khớp tiêu đề (Title Similarity - Trọng số 30%)
  const cleanA = cleanLessonTitle(itemA.title || itemA.suggestedTitle);
  const cleanB = cleanLessonTitle(itemB.title || itemB.suggestedTitle);
  const titleSim = diceBigramSimilarity(cleanA, cleanB);

  // 2. So khớp số lượng slide (Slide Count Match - Trọng số 20%)
  const countA = Number(itemA.slideCount || itemA.slide_count) || 0;
  const countB = Number(itemB.slideCount || itemB.slide_count) || 0;
  let countMatch = 0;
  if (countA > 0 && countB > 0) {
    const maxCount = Math.max(countA, countB);
    const diff = Math.abs(countA - countB);
    countMatch = Math.max(0, 1 - (diff / maxCount));
  } else if (countA === countB) {
    countMatch = 1;
  }

  // 3. So khớp tiêu đề các slide (Headings Similarity - Trọng số 20%)
  const headingsA = Array.isArray(itemA.slideHeadings) ? itemA.slideHeadings.join(' ') : (itemA.slideHeadings || '');
  const headingsB = Array.isArray(itemB.slideHeadings) ? itemB.slideHeadings.join(' ') : (itemB.slideHeadings || '');
  let headingsSim = 0;
  if (headingsA && headingsB) {
    headingsSim = diceBigramSimilarity(headingsA, headingsB);
  } else {
    headingsSim = titleSim; // Fallback vào tiêu đề bài nếu không có danh sách heading
  }

  // 4. So khớp nội dung slide text (Body Text Similarity - Trọng số 30%)
  const tokensA = itemA.textTokens || extractWordTokens(itemA.fullText || itemA.content_fingerprint);
  const tokensB = itemB.textTokens || extractWordTokens(itemB.fullText || itemB.content_fingerprint);
  let textSim = 0;
  if (tokensA && tokensB && tokensA.size > 0 && tokensB.size > 0) {
    textSim = jaccardSetSimilarity(tokensA, tokensB);
  } else if (itemA.content_fingerprint && itemB.content_fingerprint) {
    textSim = diceBigramSimilarity(itemA.content_fingerprint, itemB.content_fingerprint);
  } else {
    // Nếu cả 2 chưa có text trích xuất, cân bằng trọng số giữa title và slide count
    textSim = (titleSim + countMatch) / 2;
  }

  // 5. Tính điểm tổng hợp (Composite Score)
  let composite = (titleSim * 0.30) + (countMatch * 0.20) + (headingsSim * 0.20) + (textSim * 0.30);

  // Nếu tiêu đề gần như tuyệt đối giống nhau (>= 0.95) và số slide khớp hoàn toàn (countMatch === 1)
  // và nội dung text khớp cao (>= 0.80), nâng thang điểm vào vùng 95% - 100%
  if (titleSim >= 0.95 && countMatch >= 0.95 && textSim >= 0.80) {
    composite = Math.max(composite, 0.95 + (textSim * 0.05));
  }

  // Phạt điểm nếu khối lớp khác nhau hoàn toàn (ví dụ lớp 3 so với lớp 5)
  const gradeA = Number(itemA.grade || itemA.detectedGrade) || 0;
  const gradeB = Number(itemB.grade || itemB.detectedGrade) || 0;
  if (gradeA > 0 && gradeB > 0 && Math.abs(gradeA - gradeB) >= 2) {
    composite *= 0.6;
  }

  const scorePercent = Math.min(100, Math.max(0, Math.round(composite * 1000) / 10));

  return {
    similarityScore: scorePercent,
    details: {
      titleSimilarity: Math.round(titleSim * 100),
      countMatch: Math.round(countMatch * 100),
      headingsSimilarity: Math.round(headingsSim * 100),
      textSimilarity: Math.round(textSim * 100)
    }
  };
}

/**
 * Kiểm tra trùng lặp cho một mảng file (hỗ trợ phát hiện cả in-batch duplicate và database duplicate)
 * @param {Object} options
 * @param {Array<{ name: string, buffer: Buffer, size?: number }>} options.files
 * @param {Array<Object>} options.existingLessons - Danh sách các bài học hiện có trong database
 * @returns {Array<Object>} Danh sách kết quả phân tích từng file
 */
export function checkDuplicateBatch({ files, existingLessons = [] }) {
  if (!Array.isArray(files) || files.length === 0) return [];

  // Tạo map tra cứu nhanh các bài học trong database theo SHA-256
  const hashToLessonMap = new Map();
  existingLessons.forEach(l => {
    if (l.file_hash) {
      hashToLessonMap.set(l.file_hash.toLowerCase(), l);
    }
  });

  const results = [];
  const batchHashes = new Map(); // Lưu hash của các file đã xử lý trong cùng batch này: hash -> { fileName, index }

  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i];
    const fileName = fileItem.name || fileItem.originalname || fileItem.filename || `file_${i + 1}.pptx`;
    const buffer = fileItem.buffer;

    if (!buffer || buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
      results.push({
        index: i,
        fileName,
        isValid: false,
        error: 'File không phải là định dạng .pptx hợp lệ hoặc bị hỏng.',
        status: SIMILARITY_STATUS.UNIQUE,
        similarityScore: 0
      });
      continue;
    }

    const fileHash = calculateFileHash(buffer);
    const fileSizeBytes = buffer.length;

    // 1. Kiểm tra trùng lặp trong cùng đợt import (In-batch duplicate check)
    if (batchHashes.has(fileHash)) {
      const originalBatchItem = batchHashes.get(fileHash);
      results.push({
        index: i,
        fileName,
        fileHash,
        fileSizeBytes,
        isValid: true,
        status: SIMILARITY_STATUS.EXACT_DUPLICATE,
        similarityScore: 100,
        inBatchDuplicate: true,
        duplicateOfFileName: originalBatchItem.fileName,
        message: `Trùng hoàn toàn với file "${originalBatchItem.fileName}" trong cùng danh sách tải lên`,
        matchedLesson: null,
        shouldImportDefault: false
      });
      continue;
    }

    // Ghi nhận hash vào batch
    batchHashes.set(fileHash, { fileName, index: i });

    // 2. Trích xuất metadata & content fingerprint siêu nhanh (< 5ms)
    const meta = extractPptxContentFingerprint(buffer, fileName);

    // 3. Kiểm tra trùng file hoàn toàn với database qua SHA-256 (O(1))
    const existingExact = hashToLessonMap.get(fileHash.toLowerCase());
    if (existingExact) {
      results.push({
        index: i,
        fileName,
        fileHash,
        fileSizeBytes,
        slideCount: meta.slideCount,
        suggestedTitle: meta.suggestedTitle,
        detectedGrade: meta.detectedGrade,
        isValid: true,
        status: SIMILARITY_STATUS.EXACT_DUPLICATE,
        similarityScore: 100,
        inBatchDuplicate: false,
        message: `Bài giảng đã tồn tại trong thư viện (Trùng file với "${existingExact.title || existingExact.source_file_name}")`,
        matchedLesson: {
          id: existingExact.id,
          title: existingExact.title,
          source_file_name: existingExact.source_file_name || existingExact.source_filename,
          slide_count: existingExact.slide_count,
          grade: existingExact.grade,
          thumbnail_url: existingExact.thumbnail_url,
          created_at: existingExact.created_at
        },
        shouldImportDefault: false
      });
      continue;
    }

    // 4. Kiểm tra trùng gần giống nội dung (Near-duplicate content check)
    // Sàng lọc các ứng viên tiềm năng: Cùng khối lớp hoặc số slide chênh lệch <= 40%
    let bestMatch = null;
    let highestScore = 0;
    let bestDetails = null;

    for (const cand of existingLessons) {
      const candSlideCount = Number(cand.slide_count) || 0;
      if (candSlideCount > 0 && meta.slideCount > 0) {
        const countRatio = Math.abs(candSlideCount - meta.slideCount) / Math.max(candSlideCount, meta.slideCount);
        if (countRatio > 0.40) {
          // Bỏ qua các bài có số slide chênh lệch quá 40% để tiết kiệm thời gian
          continue;
        }
      }

      const { similarityScore, details } = calculateSimilarity(meta, cand);
      if (similarityScore > highestScore) {
        highestScore = similarityScore;
        bestDetails = details;
        bestMatch = cand;
      }
    }

    // 5. Đánh giá theo 3 mức độ trùng lặp: Trùng 100%, Trùng cao, Gần giống
    if (highestScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_SIMILAR && bestMatch) {
      let tier = 'reference';
      let tierBadge = '🟡 Tham khảo';
      let tierLabel = 'Gần giống (60-80%)';
      let tierColor = '#eab308';
      let status = SIMILARITY_STATUS.NEAR_SIMILAR;
      let shouldImportDefault = true;

      if (highestScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_HIGH) {
        tier = 'exact';
        tierBadge = '🔴 Cảnh báo';
        tierLabel = 'Trùng 100% (95-100%)';
        tierColor = '#ef4444';
        status = SIMILARITY_STATUS.EXACT_DUPLICATE;
        shouldImportDefault = false;
      } else if (highestScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_LIKELY) {
        tier = 'high';
        tierBadge = '🟠 Cảnh báo';
        tierLabel = 'Trùng cao (80-95%)';
        tierColor = '#f97316';
        status = SIMILARITY_STATUS.HIGH_DUPLICATE;
        shouldImportDefault = true;
      }

      results.push({
        index: i,
        fileName,
        fileHash,
        fileSizeBytes,
        slideCount: meta.slideCount,
        suggestedTitle: meta.suggestedTitle,
        detectedGrade: meta.detectedGrade,
        slideHeadings: meta.slideHeadings,
        contentFingerprint: meta.contentFingerprint,
        isValid: true,
        status,
        tier,
        tierBadge,
        tierLabel,
        tierColor,
        similarityScore: highestScore,
        details: bestDetails,
        inBatchDuplicate: false,
        message: `${tierLabel}: ${tierBadge} với "${bestMatch.title}" (${highestScore}%)`,
        matchedLesson: {
          id: bestMatch.id,
          title: bestMatch.title,
          source_file_name: bestMatch.source_file_name || bestMatch.source_filename,
          slide_count: bestMatch.slide_count,
          grade: bestMatch.grade,
          thumbnail_url: bestMatch.thumbnail_url,
          created_at: bestMatch.created_at
        },
        shouldImportDefault
      });
    } else {
      // Bài mới hoàn toàn (< 60%)
      results.push({
        index: i,
        fileName,
        fileHash,
        fileSizeBytes,
        slideCount: meta.slideCount,
        suggestedTitle: meta.suggestedTitle,
        detectedGrade: meta.detectedGrade,
        slideHeadings: meta.slideHeadings,
        contentFingerprint: meta.contentFingerprint,
        isValid: true,
        status: SIMILARITY_STATUS.UNIQUE,
        tier: 'unique',
        tierBadge: '✓ Bài mới',
        tierLabel: 'Bài mới',
        tierColor: '#10b981',
        similarityScore: highestScore,
        inBatchDuplicate: false,
        message: 'Bài mới',
        matchedLesson: null,
        shouldImportDefault: true
      });
    }
  }

  return results;
}

/**
 * Tự động quét toàn bộ thư viện bài giảng để phát hiện các cặp bài giảng trùng lặp
 * Phân loại thành 3 cấp độ:
 * 1. Trùng 100% (95 - 100% hoặc trùng SHA-256): 🔴 Cảnh báo
 * 2. Trùng cao (80 - 95%): 🟠 Cảnh báo
 * 3. Gần giống (60 - 80%): 🟡 Tham khảo
 * @param {Array<Object>} lessons - Danh sách bài học từ database
 * @returns {Object} Báo cáo quét toàn diện và danh sách các cặp bài trùng lặp
 */
export function scanLibraryDuplicates(lessons = [], classStats = null) {
  const totalClasses = (classStats && typeof classStats.totalClasses === 'number')
    ? classStats.totalClasses
    : 23; // Mặc định 23 lớp trong cơ sở dữ liệu EduICT

  const initGradeBuckets = () => ({
    1: { gradeKey: '1', gradeNumber: 1, label: 'Lớp 1', subLabel: 'Khối 1', classCount: classStats?.classCountByGrade?.[1] || 4, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] },
    2: { gradeKey: '2', gradeNumber: 2, label: 'Lớp 2', subLabel: 'Khối 2', classCount: classStats?.classCountByGrade?.[2] || 5, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] },
    3: { gradeKey: '3', gradeNumber: 3, label: 'Lớp 3', subLabel: 'Khối 3', classCount: classStats?.classCountByGrade?.[3] || 4, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] },
    4: { gradeKey: '4', gradeNumber: 4, label: 'Lớp 4', subLabel: 'Khối 4', classCount: classStats?.classCountByGrade?.[4] || 5, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] },
    5: { gradeKey: '5', gradeNumber: 5, label: 'Lớp 5', subLabel: 'Khối 5', classCount: classStats?.classCountByGrade?.[5] || 5, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] },
    unassigned: { gradeKey: 'unassigned', gradeNumber: null, label: 'Chưa phân loại', subLabel: 'Chưa gán lớp/khối', classCount: 0, total: 0, exactCount: 0, highCount: 0, referenceCount: 0, needReviewCount: 0, uniqueCount: 0, warningLessonIds: [] }
  });

  if (!Array.isArray(lessons) || lessons.length === 0) {
    const emptyBuckets = initGradeBuckets();
    const byGrade = [1, 2, 3, 4, 5].map(g => ({ ...emptyBuckets[g], percentOfTotal: 0 }));
    return {
      scannedCount: 0,
      totalLessons: 0,
      totalClasses,
      totalDuplicates: 0,
      exactCount: 0,
      highCount: 0,
      referenceCount: 0,
      suggestedDeleteCount: 0,
      lessonsByClass: { 'Lớp 1': 0, 'Lớp 2': 0, 'Lớp 3': 0, 'Lớp 4': 0, 'Lớp 5': 0 },
      byGrade,
      pairs: [],
      lessonDuplicateMap: {}
    };
  }

  const pairs = [];
  const processedPairs = new Set();
  const lessonDuplicateMap = new Map(); // lessonId -> highest duplicate info

  for (let i = 0; i < lessons.length; i++) {
    for (let j = i + 1; j < lessons.length; j++) {
      const a = lessons[i];
      const b = lessons[j];

      const pairKey = `${a.id}_${b.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      // 1. Kiểm tra mã băm SHA-256
      let isExactHash = false;
      if (a.file_hash && b.file_hash && a.file_hash.toLowerCase() === b.file_hash.toLowerCase()) {
        isExactHash = true;
      }

      // 2. Tính điểm tương đồng
      const sim = calculateSimilarity(a, b);
      let finalScore = isExactHash ? 100 : sim.similarityScore;

      if (finalScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_SIMILAR || isExactHash) {
        let tier = 'reference';
        let tierBadge = '🟡 Tham khảo';
        let tierLabel = 'Gần giống (60-80%)';
        let tierColor = '#eab308';
        let status = SIMILARITY_STATUS.NEAR_SIMILAR;

        if (finalScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_HIGH || isExactHash) {
          tier = 'exact';
          tierBadge = '🔴 Cảnh báo';
          tierLabel = isExactHash ? 'Trùng 100% (SHA-256)' : 'Trùng 100% (95-100%)';
          tierColor = '#ef4444';
          status = SIMILARITY_STATUS.EXACT_DUPLICATE;
        } else if (finalScore >= DUPLICATE_THRESHOLDS.NEAR_DUPLICATE_LIKELY) {
          tier = 'high';
          tierBadge = '🟠 Cảnh báo';
          tierLabel = 'Trùng cao (80-95%)';
          tierColor = '#f97316';
          status = SIMILARITY_STATUS.HIGH_DUPLICATE;
        }

        pairs.push({
          id: `pair_${a.id}_${b.id}`,
          tier,
          tierBadge,
          tierLabel,
          tierColor,
          status,
          score: finalScore,
          isExactHash,
          details: sim.details,
          lessonA: {
            id: a.id,
            title: a.title,
            grade: a.grade,
            topic: a.topic,
            slide_count: a.slide_count,
            thumbnail_url: a.thumbnail_url,
            created_at: a.created_at,
            updated_at: a.updated_at,
            source_filename: a.source_filename
          },
          lessonB: {
            id: b.id,
            title: b.title,
            grade: b.grade,
            topic: b.topic,
            slide_count: b.slide_count,
            thumbnail_url: b.thumbnail_url,
            created_at: b.created_at,
            updated_at: b.updated_at,
            source_filename: b.source_filename
          }
        });

        // Ghi nhận liên kết trùng lặp cho từng bài
        const recordMatch = (main, other) => {
          const prev = lessonDuplicateMap.get(main.id);
          if (!prev || finalScore > prev.score) {
            lessonDuplicateMap.set(main.id, {
              tier,
              tierBadge,
              tierLabel,
              tierColor,
              status,
              score: finalScore,
              matchedId: other.id,
              matchedTitle: other.title,
              matchedLesson: {
                id: other.id,
                title: other.title,
                grade: other.grade,
                slide_count: other.slide_count,
                thumbnail_url: other.thumbnail_url
              }
            });
          }
        };
        recordMatch(a, b);
        recordMatch(b, a);
      }
    }
  }

  // Sắp xếp theo điểm số giảm dần
  pairs.sort((a, b) => b.score - a.score);

  const exactCount = pairs.filter(p => p.tier === 'exact').length;
  const highCount = pairs.filter(p => p.tier === 'high').length;
  const referenceCount = pairs.filter(p => p.tier === 'reference').length;

  // Tính số lượng bài đề xuất xem xét xóa từ các cặp trùng 100%
  const exactDuplicateLessonIds = new Set();
  for (const p of pairs) {
    if (p.tier === 'exact') {
      exactDuplicateLessonIds.add(p.lessonB.id);
    }
  }
  const suggestedDeleteCount = exactDuplicateLessonIds.size;

  // Thống kê chi tiết theo Lớp / Khối
  const gradeBuckets = initGradeBuckets();

  for (const l of lessons) {
    const gNum = Number(l.grade);
    const bucketKey = (!isNaN(gNum) && gradeBuckets[gNum]) ? gNum : 'unassigned';
    const b = gradeBuckets[bucketKey];
    b.total += 1;

    const dup = lessonDuplicateMap.get(l.id);
    if (dup) {
      if (dup.tier === 'exact') {
        b.exactCount += 1;
      } else if (dup.tier === 'high') {
        b.highCount += 1;
      } else if (dup.tier === 'reference') {
        b.referenceCount += 1;
      }
      b.needReviewCount = b.highCount + b.referenceCount;
      b.warningLessonIds.push({
        lessonId: l.id,
        title: l.title,
        tier: dup.tier,
        tierBadge: dup.tierBadge,
        tierColor: dup.tierColor,
        score: dup.score,
        matchedTitle: dup.matchedTitle
      });
    } else {
      b.uniqueCount += 1;
    }
  }

  // Tạo đối tượng lessonsByClass gọn gàng
  const lessonsByClass = {
    'Lớp 1': gradeBuckets[1].total,
    'Lớp 2': gradeBuckets[2].total,
    'Lớp 3': gradeBuckets[3].total,
    'Lớp 4': gradeBuckets[4].total,
    'Lớp 5': gradeBuckets[5].total
  };
  if (gradeBuckets.unassigned.total > 0) {
    lessonsByClass['Chưa phân loại'] = gradeBuckets.unassigned.total;
  }

  // Danh sách mảng byGrade để giao diện dễ duyệt
  const byGrade = [1, 2, 3, 4, 5].map(g => {
    const b = gradeBuckets[g];
    const percentOfTotal = lessons.length > 0 ? Math.round((b.total / lessons.length) * 1000) / 10 : 0;
    return {
      ...b,
      percentOfTotal
    };
  });

  // Nếu có bài chưa phân loại, bổ sung vào danh sách
  if (gradeBuckets.unassigned.total > 0) {
    const b = gradeBuckets.unassigned;
    const percentOfTotal = lessons.length > 0 ? Math.round((b.total / lessons.length) * 1000) / 10 : 0;
    byGrade.push({
      ...b,
      percentOfTotal
    });
  }

  return {
    scannedCount: lessons.length,
    totalLessons: lessons.length,
    totalClasses,
    totalDuplicates: pairs.length,
    exactCount,
    highCount,
    referenceCount,
    suggestedDeleteCount,
    lessonsByClass,
    byGrade,
    pairs,
    lessonDuplicateMap: Object.fromEntries(lessonDuplicateMap)
  };
}

