# Phase 4 — Lesson Library + Lesson Management + PowerPoint Original

## Báo cáo hoàn thành — EduICT / EduMaster GIAI ĐOẠN 4

**Ngày hoàn thành:** 2026-09-29
**Phiên bản codebase:** Trên nền Phase 1 → 2 → 3

---

## I. Tóm tắt Phase 4

Phase 4 hoàn thiện module **Lesson Library**, **Lesson Management**, và kiến trúc **PowerPoint Original (PPTX Gốc = Source of Truth)** cho EduMaster. Mọi thay đổi đều tuân thủ nguyên tắc **KHÔNG rewrite**, backward-compatible, và **KHÔNG hard-code đường dẫn Windows**.

### Nguyên tắc kiến trúc bắt buộc

> **PPTX GỐC = SOURCE OF TRUTH.**
> EduMaster không được coi ảnh render là file bài giảng gốc.

---

## II. Baseline trước khi thay đổi

| Tiêu chí | Kết quả |
|-----------|---------|
| `npm test` (smoke) | **9/9 PASS** |
| `npx oxlint` | **0 errors / 174 warnings** |
| `npm run build` | **exit 0**, ✓ built in 1.60s |
| Git status | Chỉ có thay đổi Phase 1-3 uncommitted |

---

## III. Audit Codebase

### A. Schema & Database (`server/db/schema.js`, `server/db/lessons.js`)

- Bảng `lessons`: Đã có đầy đủ các cột cho PPTX:
  - `type` (native/imported), `file_hash` (SHA-256), `source_file_name`, `source_file_path`, `source_file_size`
  - `render_status` (ready/processing/partial/failed), `import_status` (IMPORTING/IMPORTED)
  - `content_fingerprint`, `similarity_status`, `similarity_score`, `duplicate_of_id`
  - `slide_count`, `total_slides`, `rendered_slides`, `failed_slides`, `render_progress`
  - `thumbnail_url`, `thumbnail_path`
- Bảng `lesson_slides`: Đầy đủ `render_status`, `error_code`, `error_message`, `render_attempts`, `rendered_at`
- Bảng `classroom_sessions`: Đã có cột `lesson_id` liên kết bài học

### B. PPTX Service (`server/pptxService.js` — 1924 dòng)

- **Decoupled 2-Stage Pipeline**: PPTX → PDF (PowerPoint COM) → PNG (PyMuPDF)
- **COM Lock Chain**: Promise-based mutex ngăn race condition
- **SHA-256 Hash & Cache**: Kiểm tra trùng file trước render, cache kết quả
- **Background Queue**: `PptxBackgroundQueue` với concurrency control & deduplication
- **Fast Import Pipeline**: `fastImportPptx()` — phản hồi HTTP < 30ms
- **Auto-Retry**: Exponential backoff 1s → 3s → 7s, tối đa 3 lần
- **Single Slide Fallback**: PDF extract → PowerPoint COM single slide
- **Self-Healing Reconciliation**: Tự phục hồi bài cũ từ file trên đĩa
- **Backfill Metadata**: Tự bổ sung hash/fingerprint cho bài cũ thiếu metadata

### C. Duplicate Detection (`server/duplicateDetector.js`)

- Content fingerprint extraction từ ZIP entry thô
- So sánh đa tầng: SHA-256 exact → Content fingerprint → Slide count similarity
- Thresholds: Exact (100%), Near Duplicate (≥80%), Similar (≥60%)
- API: Scan toàn thư viện, so sánh 1-1, resolve duplicate

### D. Frontend Components

| Component | Dòng code | Mô tả |
|-----------|-----------|-------|
| `LessonLibrary.jsx` | ~2330 | Thư viện bài giảng: filter, search, sort, duplicate management |
| `ImportPptxModal.jsx` | ~2120 | Import PPTX: multi-file, preview, batch, duplicate check |
| `LessonEditor.jsx` | ~1100 | Soạn bài native: slide drag-drop, teacher notes |
| `PresentationView.jsx` | ~1370 | Trình chiếu: fullscreen, navigation, timer, tools |
| `SlideRenderer.jsx` | ~920 | Render slide: retry, fallback, error handling |
| `DuplicateComparisonModal.jsx` | ~900 | So sánh bài trùng: side-by-side, visual diff |
| `lessonStorage.js` | ~900 | API client + local cache fallback |

---

## IV. Các thay đổi Phase 4

### 1. Backend: Type Filter cho getAllLessons

**File:** `server/db/lessons.js`

```diff
+ if (filters.type && filters.type !== 'all') {
+   if (filters.type === 'native') {
+     conditions.push("(l.type = 'native' OR l.type IS NULL)");
+   } else if (filters.type === 'imported' || filters.type === 'powerpoint') {
+     conditions.push("l.type = 'imported'");
+   } else {
+     conditions.push('l.type = ?');
+     params.push(filters.type);
+   }
+ }
```

- Hỗ trợ `type=native` (bài soạn) và `type=imported`/`type=powerpoint` (PowerPoint)
- `type=all` hoặc không truyền → trả về tất cả
- `type=native` match cả `NULL` (bài cũ chưa có trường type)

### 2. Backend: Delete Lesson Safety Check

**File:** `server/db/lessons.js`

```diff
- export function deleteLesson(lessonId) {
-   const db = getDatabase();
-   db.prepare('DELETE FROM lessons WHERE id = ?;').run(lessonId);
-   return { success: true, id: lessonId };
- }
+ export function deleteLesson(lessonId) {
+   const db = getDatabase();
+   let referencedSessionCount = 0;
+   try {
+     const row = db.prepare('SELECT COUNT(*) as count FROM classroom_sessions WHERE lesson_id = ?;').get(lessonId);
+     referencedSessionCount = row ? row.count : 0;
+   } catch (e) { /* Cột lesson_id chưa tồn tại trong DB cũ */ }
+   db.prepare('DELETE FROM lessons WHERE id = ?;').run(lessonId);
+   return { success: true, id: lessonId, referencedSessions: referencedSessionCount };
+ }
```

- Kiểm tra số Classroom Session tham chiếu bài trước khi xóa
- Trả về `referencedSessions` count trong response
- Backward-compatible: vẫn cho xóa bình thường, chỉ thêm thông tin

### 3. Backend: Route nhận type parameter

**File:** `server/routes/lessons.js`

```diff
  const similarity_status = url.searchParams.get('similarity_status');
+ const type = url.searchParams.get('type');
- const lessons = getAllLessons({ grade, topic, search, similarity_status });
+ const lessons = getAllLessons({ grade, topic, search, similarity_status, type });
```

### 4. Frontend: Type Filter trong lessonStorage API

**File:** `src/components/LessonPresentation/lessonStorage.js`

```diff
+ if (filters.type && filters.type !== 'all') params.append('type', filters.type);
```

### 5. Frontend: Type Filter UI trong LessonLibrary

**File:** `src/components/LessonPresentation/LessonLibrary.jsx`

- Thêm state `typeFilter` (`'all' | 'native' | 'imported'`)
- Thêm dropdown `<select>` lọc theo loại bài:
  - 📋 Tất cả loại bài
  - 📝 Bài soạn (Native)
  - 📊 PowerPoint (PPTX)
- Truyền `typeFilter` vào `fetchLessonsApi()`
- Thêm `typeFilter` vào dependency array của useEffect

### 6. Frontend: DialogService thay thế alert()

**Files:**
- `src/components/LessonPresentation/LessonLibrary.jsx` — **7 alert() → DialogService.alert()**
- `src/components/LessonPresentation/ImportPptxModal.jsx` — **3 alert() → DialogService.alert()**
- `src/components/LessonPresentation/LessonEditor.jsx` — **3 alert() → DialogService.alert()**

> Tổng cộng: **13 call sites** đã được chuẩn hóa qua `DialogService`, sẵn sàng cho Desktop Bridge.

---

## V. Phase 4 Test Results

### Smoke Tests (Existing)

```
npm test → 9/9 PASS ✅
```

### Phase 4 Tests (`tests/phase4-lesson-pptx.test.js`)

```
node --test tests/phase4-lesson-pptx.test.js → 32/32 PASS ✅

Suite                                    | Tests | Pass
-----------------------------------------|-------|-----
Phase 4 — Lesson CRUD                    |   5   |  5
Phase 4 — Lesson Filtering               |   7   |  7
Phase 4 — PPTX Hash & Duplicate          |   5   |  5
Phase 4 — Render Status                  |   4   |  4
Phase 4 — Title & Sorting                |   5   |  5
Phase 4 — Session & Lesson Integration   |   2   |  2
Phase 4 — Khối 1-5                       |   2   |  2
Phase 4 — Security                       |   2   |  2
                                         |  32   | 32
```

### Build

```
npm run build → ✓ built in 1.30s, exit 0 ✅
```

### Lint

```
npx oxlint → 0 errors ✅ (174 warnings — unchanged from baseline)
```

---

## VI. Kiến trúc PowerPoint — Tổng quan

```
┌──────────────────────────────────────────────────────┐
│                     PPTX GỐC                         │
│                  (SOURCE OF TRUTH)                    │
│                                                      │
│   uploads/presentations/{lessonId}/original.pptx     │
│       ↓ (SHA-256 hash → duplicate check)             │
│       ↓ (ZIP parser → metadata extraction < 5ms)     │
│       ↓                                              │
│   ┌──────────────────────────────────┐               │
│   │ Decoupled 2-Stage Render Pipeline│               │
│   │  Stage 1: PPTX → PDF            │               │
│   │  Stage 2: PDF → PNG (PyMuPDF)   │               │
│   │  COM Lock Chain: Promise Mutex   │               │
│   │  Fallback: LibreOffice → COM     │               │
│   └──────────────────────────────────┘               │
│       ↓                                              │
│   uploads/presentations/{lessonId}/slides/           │
│       slide_01.png, slide_02.png, ...                │
│       ↓                                              │
│   uploads/cache/{sha256hash}/slides/                 │
│       (SHA-256 render cache for instant re-import)   │
└──────────────────────────────────────────────────────┘
```

---

## VII. Trạng thái các Requirement Phase 4

| # | Requirement | Status |
|---|------------|--------|
| 1 | Lesson Library hiển thị danh sách theo Khối/Chủ đề | ✅ Có sẵn + type filter mới |
| 2 | Thumbnail preview cho mỗi bài giảng | ✅ Có sẵn (ensureLessonThumbnail) |
| 3 | Import PPTX multi-file, batch, preview | ✅ Có sẵn (ImportPptxModal) |
| 4 | SHA-256 hash + duplicate detection | ✅ Có sẵn (fastImportPptx) |
| 5 | Background render queue + auto-retry | ✅ Có sẵn (PptxBackgroundQueue) |
| 6 | Render status: ready/processing/partial/failed | ✅ Có sẵn + test đầy đủ |
| 7 | Polling tự động cập nhật render status | ✅ Có sẵn (LessonLibrary polling) |
| 8 | PPTX gốc = source of truth (không xóa, giữ nguyên) | ✅ Kiến trúc enforced |
| 9 | Title extraction tự động từ slide 1 / filename | ✅ Có sẵn + PPCT matching |
| 10 | SHA-256 render cache | ✅ Có sẵn (checkRenderCache/applyCacheToLesson) |
| 11 | Type filter (native/PowerPoint) | ✅ **MỚI** — backend + frontend |
| 12 | Delete safety check (session references) | ✅ **MỚI** — backend |
| 13 | DialogService thay alert() | ✅ **MỚI** — 13 call sites |
| 14 | Grade 1-5 unified filtering | ✅ Có sẵn + test |
| 15 | Self-healing reconciliation | ✅ Có sẵn (reconcileImportedLessons) |
| 16 | Backward compatibility với Phase 1-3 | ✅ smoke test 9/9 pass |
| 17 | PathService — KHÔNG hard-code đường dẫn | ✅ Tuân thủ |

---

## VIII. Files đã thay đổi

| File | Loại thay đổi |
|------|--------------|
| `server/db/lessons.js` | ✏️ Thêm type filter + delete safety check |
| `server/routes/lessons.js` | ✏️ Thêm type query parameter |
| `src/components/LessonPresentation/lessonStorage.js` | ✏️ Thêm type param vào fetchLessonsApi |
| `src/components/LessonPresentation/LessonLibrary.jsx` | ✏️ Thêm type filter UI + DialogService |
| `src/components/LessonPresentation/ImportPptxModal.jsx` | ✏️ DialogService thay alert |
| `src/components/LessonPresentation/LessonEditor.jsx` | ✏️ DialogService thay alert |
| `tests/phase4-lesson-pptx.test.js` | 🆕 32 tests mới |
| `docs/phase-4-lesson-powerpoint-report.md` | 🆕 Báo cáo này |

---

## IX. Ghi chú kỹ thuật

1. **KHÔNG sử dụng AI/Gemini, Electron, Tauri, Desktop Bridge** trong Phase 4
2. **KHÔNG commit / push** — mọi thay đổi nằm trong working directory
3. **KHÔNG rewrite** module nào — chỉ thêm/sửa nhỏ
4. **Database backward-compatible**: type filter hỗ trợ `NULL` cho bài cũ
5. **Backfill/Reconciliation chạy tự động** khi nạp module pptxService
6. Phase 4 chỉ **chuẩn bị dữ liệu và kiến trúc** để sau này mở rộng sang Desktop Bridge

---

**Trạng thái:** ✅ **PHASE 4 HOÀN THÀNH**
