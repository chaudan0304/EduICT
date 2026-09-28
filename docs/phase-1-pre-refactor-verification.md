# Phase 1 — Pre-Refactor Verification (Giai đoạn 1B · Phần A)

> **Mục đích:** Kiểm tra (read-only) toàn bộ chức năng TRƯỚC khi refactor rủi ro
> cao (tách `db.js`, tách `api-handler.js`). **Không sửa chức năng ở bước này.**
> Phương pháp: đọc mã tĩnh (static read) + đối chiếu endpoint trong
> `server/api-handler.js` + audit toàn bộ call-site `fetch()`.
>
> - Ngày: 2026-09-28
> - Nhánh: `feature/new-idea`
> - Baseline xanh: `npm run lint` = 0, `npm run build` = 0, `npm test` = 0 (7/7 → 9/9 sau Phần B).
> - Trạng thái ("Trạng thái") ở đây = **đã xác minh tĩnh** (mã tồn tại, endpoint
>   khớp, luồng dữ liệu mạch lạc). KHÔNG phải kiểm thử runtime từng thao tác UI.

## ⚠️ Phát hiện AN TOÀN DỮ LIỆU nghiêm trọng (đã khắc phục)

**Smoke test TRƯỚC khi sửa đã ghi vào CSDL THẬT của người dùng.**

- **Triệu chứng:** log baseline hiện `[Database] Kết nối SQLite CSDL tại: D:\DU_AN\EduICT_PRIVATE_DATA_BACKUP\edumaster.sqlite` (đường dẫn DB thật trong `.env`).
- **Căn nguyên:** `tests/smoke.test.js` chỉ set `process.env.EDUICT_DB_PATH = TMP_DB`. Nhưng `db.getDatabasePath()` gọi `envLoader.loadEnv()`, và `loadEnv()` **ghi đè vô điều kiện** `process.env` bằng giá trị trong `.env` (kể cả `EDUICT_DB_PATH`) tại [server/ai/envLoader.js:25](../server/ai/envLoader.js#L25). → biến `TMP_DB` bị nuốt, test 4 (init schema) và test 5 (CRUD INSERT/DELETE classes + students) chạy trên DB THẬT.
- **Khắc phục (trong test, KHÔNG đổi hành vi production):** trỏ `EDUICT_APP_ROOT` + `EDUICT_DATA_DIR` sang một thư mục tạm mới (không chứa `.env`) TRƯỚC mọi import chạm DB → `loadEnv()` không tìm thấy `.env` nên không ghi đè. Xem [tests/smoke.test.js:20-31](../tests/smoke.test.js#L20-L31).
- **Đã xác minh:** chạy lại → `[Database] Kết nối SQLite CSDL tại: ...Temp\eduict_smoke_*\smoke_*.sqlite`, `TEST_EXIT=0`.
- **Ghi chú báo cáo:** mục 11 của `docs/phase-1-refactor-report.md` (Phase 1A) khẳng định test chạy "trên DB tạm ... không đụng DB thật" — khẳng định này **SAI trước bản vá này**; sẽ đính chính trong Phần J.
- **Nợ kỹ thuật (desktop-readiness):** `loadEnv()` ghi đè `process.env` vô điều kiện là hành vi rủi ro; nên chuyển sang "chỉ set khi chưa có" (opt-in) ở Giai đoạn sau — KHÔNG đổi ở Giai đoạn 1 (rủi ro trung-cao, là cơ chế cấu hình dùng chung).

## Sự thật kiến trúc (ảnh hưởng Phần E)

Chỉ **6 file** dưới `src/` chứa `fetch(`. Toàn bộ view gamification / gradebook /
dashboard KHÔNG gọi fetch trực tiếp — nhận `currentClass` qua props và lưu qua
callback trong `App.jsx` (`onUpdateStudents` → `syncStudentsToSqlite` = `PUT /api/classes/:id/students`; `onUpdateGoodScores` → `syncClassToSqlite` = `POST /api/classes`).
`src/services/apiClient.js` đã tồn tại nhưng **chưa được import ở đâu** (đích migration Phần E).

## 25 nhóm chức năng

| # | Chức năng | File liên quan | API liên quan | Trạng thái | Vấn đề phát hiện |
|---|-----------|----------------|---------------|-----------|------------------|
| 1 | Dashboard | `HomeDashboard.jsx` (tab `home`) | (gián tiếp) `GET /api/statistics/students` | ✅ Tĩnh OK | Thuần presentational, chỉ props |
| 2 | Quản lý lớp | `Navbar.jsx` + handlers `App.jsx`; `utils/storage.js` | `GET/POST /api/classes`, `DELETE /api/classes/:id`, `POST /api/classes/sort-students` | ✅ Tĩnh OK | `sortClassStudentsInSqlite` không thấy call-site (export chết) |
| 3 | Học sinh | `App.jsx` (`handleUpdateStudents`) + editor trong Navbar/Gradebook/SeatingChart | `PUT /api/classes/:id/students` (`syncStudentsToSqlite`) | ✅ Tĩnh OK | Ghi fire-and-forget: lỗi chỉ `console.warn` (mất dữ liệu âm thầm) |
| 4 | Import Excel nhiều sheet | `ImportExcelModal.jsx`, `utils/excelImport.js` | `POST /api/classes/batch-import`, `GET /api/classes` | ✅ Tĩnh OK | Parse phía client (XLSX); `batchImportClassesToSqlite` có throw lỗi |
| 5 | Đổi tên lớp khi import | `ImportExcelModal.jsx` (`className` sửa được, `targetClassId`) | như #4 | ✅ Tĩnh OK | Map sheet→lớp qua `normalizeClassName` |
| 6 | Bỏ qua sheet | `utils/excelImport.js` (`IGNORED_SHEET_NAMES`, cờ `selected`) | như #4 | ✅ Tĩnh OK | Tự bỏ sheet hướng dẫn/mẫu; user cũng bỏ chọn được |
| 7 | TKB (thời khóa biểu) | `utils/timetable.js`; `ClassroomSession/TimetableModal.jsx` | (không) — hằng số cục bộ | ✅ Tĩnh OK | Không có persistence/API |
| 8 | Phòng máy / seating | `SeatingChart.jsx`, `SeatingDisplayMode.jsx` | `GET/POST /api/broken-machines` | ✅ Tĩnh OK | Máy hỏng lưu kép (localStorage + SQLite) |
| 9 | Lesson Library | `LessonPresentation/LessonLibrary.jsx`, `lessonStorage.js` | `GET /api/lessons`, `GET/PUT/DELETE /api/lessons/:id`, `POST /api/lessons/:id/duplicate` | ✅ Tĩnh OK | Fallback cache localStorage mọi call |
| 10 | Native Lesson editor | `LessonEditor.jsx`, `LessonManager.jsx` | `POST /api/lessons`, `PUT /api/lessons/:id`, `PUT /api/lessons/:id/slides` | ✅ Tĩnh OK | — |
| 11 | PowerPoint Import | `ImportPptxModal.jsx`, `lessonStorage.js`, `data/ppctMapping.js` | `POST /api/lessons/import-fast` (FormData), `upload-pptx-preview`, `confirm-import-pptx`, `cancel-import-pptx`, `GET /api/lessons/:id/render-status`, retry | ✅ Tĩnh OK | Upload FormData — Phần E KHÔNG được ép về JSON |
| 12 | Presentation | `PresentationView.jsx`, `SlideRenderer.jsx` | `GET /api/lessons/:id`, `GET /api/lessons/:id/render-status`, `retry-slide` | ✅ Tĩnh OK | Giữ state khi code-split (Phần F) |
| 13 | Classroom Session | `ClassroomSession/SessionManager.jsx` (+ List/Dashboard/Create/Summary), `sessionStorage.js` | `GET/POST /api/sessions`, `GET/PUT/DELETE /api/sessions/:id`, `PUT .../activities`, `POST .../events`, `POST .../participation` | ✅ Tĩnh OK | Mọi helper cache localStorage + merge; giữ state khi code-split |
| 14 | Lesson Flow | `ClassroomSession/LessonFlowList.jsx`, `AI/AiLessonFlowModal.jsx` | `POST /api/ai/generate-lesson-flow`; lessons; lưu qua `activities` | ✅ Tĩnh OK | Preset trong `sessionStorage.js` |
| 15 | Quick Quiz | `QuickQuiz/QuickQuizManager.jsx` (+ Create/Player/Result), `quizStorage.js` | `POST /api/quiz-sessions`, `POST /api/quiz-sessions/:id/results`, `POST /api/ai/analyze-quiz` | ✅ Tĩnh OK | `fetchQuizSessionDetailApi` (GET :id) export nhưng không import (chết); `PUT /api/quiz-sessions/:id` FE không dùng |
| 16 | Question Bank | `QuickQuiz/QuestionBankView.jsx`, `quizStorage.js` | `GET/POST /api/questions`, `GET/PUT/DELETE /api/questions/:id`, `POST /api/questions/:id/duplicate` | ✅ Tĩnh OK | Fallback cache localStorage |
| 17 | Gradebook | `Gradebook.jsx`, `AI/AiClassAnalysisModal.jsx` | (qua App) `PUT /api/classes/:id/students`; `POST /api/ai/analyze-class` | ✅ Tĩnh OK | TB/xếp hạng tính phía client (`storage.js`) |
| 18 | Stars | lưu ở `student.stars`; sửa từ Seating/Gradebook/RewardShop/GoodScoresBoard | (qua App) `PUT /api/classes/:id/students` | ✅ Tĩnh OK | ⚠️ `StarExchangeModal.jsx` **mồ côi** — không import ở đâu |
| 19 | Lucky Wheel | `LuckyWheel.jsx` (tab `luckywheel`) | (không trực tiếp); stars qua App | ✅ Tĩnh OK | Chỉ props |
| 20 | Duck Race | `DuckRace.jsx` (tab `duckrace`) | (không trực tiếp); stars qua App | ✅ Tĩnh OK | Chỉ props |
| 21 | Reward Shop | `RewardShop.jsx` | (không trực tiếp); tiêu sao qua App | ✅ Tĩnh OK | Catalog là hằng `REWARD_CARDS` cục bộ |
| 22 | Backup/Restore | `Navbar.jsx`, `utils/storage.js` | `POST /api/sql/import-script`; `GET /api/sql/download-db` & `export-script` (tải qua anchor, không fetch); JSON backup (Blob client) | ✅ Tĩnh OK | ⚠️ `importSqlScriptFile` gọi `res.json()` **không kiểm `res.ok`** — nuốt body lỗi server |
| 23 | Gemini AI | `AI/AiAssistantModal.jsx` (+ 4 modal), `AI/aiService.js` | `GET /api/ai/status`, `POST /api/ai/{analyze-lesson,generate-questions,generate-lesson-flow,analyze-quiz,analyze-class}` | ✅ Tĩnh OK | Route AI ở `server/ai/aiHandler.js` (không nằm trong `api-handler.js` — đúng thiết kế) |
| 24 | Duplicate Detection | `DuplicateComparisonModal.jsx`, `LessonLibrary.jsx`, `lessonStorage.js` | `POST /api/lessons/check-duplicates` (FormData), `GET /api/lessons/scan-duplicates`, `POST /api/lessons/resolve-duplicate` | ✅ Tĩnh OK | `near_duplicate` & `high_duplicate` map về nhãn/badge trùng nhau (dư thừa) |
| 25 | School Year / Settings / Projector | `SchoolYearTransitionModal.jsx`, `AcademicYearSettingsModal.jsx`, `NewSchoolYearDetectedModal.jsx`; Projector: `App.jsx` (`isProjector`) | `GET /api/school-years`, `GET/POST /api/school-year/current`, `POST /api/school-year/transition`, `GET/POST /api/school-year/settings`, `GET /api/school-year/check-new` | ✅ Tĩnh OK | Projector là thuộc tính DOM thuần, không API |

## Đối chiếu tồn tại endpoint

Không component nào gọi endpoint thực sự thiếu. Hai call bị thiếu trong danh
sách endpoint sơ bộ nhưng **CÓ tồn tại** trong `server/api-handler.js`:
`POST /api/lessons/:id/retry-thumbnail` (~L958, regex `generate-thumbnail|retry-thumbnail`)
và `POST /api/lessons/retry-slide` (route tương thích, ~L972). Danh sách endpoint
sơ bộ hơi thiếu, KHÔNG phải mã sai.

## Phân loại call-site fetch (phạm vi Phần E — apiClient)

| File | Mẫu fetch (phân loại) |
|------|------------------------|
| `utils/storage.js` | ~18 call. **Đọc** → try/catch, `res.json()` khi ok, ngược lại **trả default/null**. **Ghi fire-and-forget** (`sync*ToSqlite`, `delete*`) → không return, nuốt lỗi `console.warn`. **Ghi có throw** (`saveAcademicYearSettings`, `transitionSchoolYearInSqlite`, `batchImportClassesToSqlite`). `setCurrentSchoolYearToSqlite` trả `res.ok`. `importSqlScriptFile` → `res.json()` **không kiểm ok**. Tải file qua anchor (không fetch). |
| `QuickQuiz/quizStorage.js` | 8 call. Đồng nhất: `if(!res.ok) throw`, trả json; **catch → fallback cache localStorage**. `saveQuizResultsApi` trả `{success,offline:true}` khi lỗi. |
| `ClassroomSession/sessionStorage.js` | 8 call. Trả json khi ok; **catch → cache localStorage** merge/read. `addStudentParticipationApi` ghi cache trước (optimistic) rồi POST. |
| `LessonPresentation/lessonStorage.js` | 15+ call. Đọc/CRUD → fallback cache. **Upload FormData** (`fastImportPptxApi`, `checkLessonsDuplicateApi`), JSON base64 (`uploadPptxPreviewApi`). `retrySlideRenderApi` → thử `/slides/:n/retry`, catch **fallback endpoint thứ 2** `/api/lessons/retry-slide`. |
| `services/apiClient.js` | Wrapper `request()`: `AbortController` timeout 30s, `res.text()` → `JSON.parse`, **throw `ApiError`** (status+data). Có `get/post/put/delete`. **Chưa có importer** — đích migration. |
| `AI/aiService.js` | 6 call. `fetchAiStatus` → default `{enabled:false}` khi lỗi. POST khác → `if(!res.ok || !data.success) throw` (mang `err.errorCode`). |

> **Kết luận Phần E:** KHÔNG được ép mọi fetch về một hành vi. Tối thiểu 7 lớp
> hành vi: (1) fallback default, (2) throw, (3) fire-and-forget, (4) `res.ok`
> boolean, (5) fallback cache localStorage, (6) upload FormData, (7) tải Blob/anchor.

## Vấn đề khác đã ghi nhận (KHÔNG sửa ở bước này)

- **Component mồ côi:** `src/components/StarExchangeModal.jsx` — không import ở đâu.
- **Export chết:** `fetchQuizSessionDetailApi` (`quizStorage.js`); có thể cả `sortClassStudentsInSqlite` (`storage.js`).
- **Chưa dùng:** `src/services/apiClient.js` (không importer) — chờ Phần E.
- **Rủi ro mất dữ liệu âm thầm:** mọi `sync*ToSqlite` chỉ `console.warn` khi lỗi → ghi hỏng nhưng UI không biết. Cần theo dõi khi migration.
- **Thiếu guard `res.ok`:** `importSqlScriptFile` (`storage.js`).
- **Không có marker** TODO/FIXME/HACK/@deprecated nào dưới `src/`.
- **Comment lỗi thời:** `storage.js:145` viết "23 lớp" nhưng `INITIAL_CLASSES` chỉ seed 5.
- **Trùng logic:** `detectGradeFromName` định nghĩa độc lập ở cả `utils/storage.js` và `utils/excelImport.js`.
- **Config dư thừa:** `SIMILARITY_STATUS_LABELS` — `near_duplicate` và `high_duplicate` giống hệt nhau.

## Kết luận Phần A

Toàn bộ 25 nhóm chức năng **xác minh tĩnh đạt**: mã tồn tại, endpoint khớp
`api-handler.js`, luồng dữ liệu mạch lạc. Một lỗi an toàn dữ liệu (test ghi DB
thật) đã được phát hiện và khắc phục trong test. Các vấn đề còn lại là nợ kỹ
thuật/dọn dẹp, KHÔNG chặn refactor. → Đủ điều kiện tiến hành Phần B trở đi.
