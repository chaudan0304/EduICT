# Báo cáo Giai đoạn 1 — Core Refactor & Desktop Readiness

> Nhánh: `feature/new-idea` · Cập nhật: 2026-09-28
> Nguyên tắc áp dụng xuyên suốt: **AUDIT → REFACTOR → VERIFY → REPORT** (không REWRITE → BREAK → FIX).
> Ràng buộc cốt lõi: **giữ nguyên 100% hành vi hiện tại** — không đổi API contract, endpoint, định dạng response, engine/schema/dữ liệu DB; không chuyển sang Electron/Tauri; không xây PowerPoint Desktop Bridge; không gỡ PPTX renderer.

## 1. Tổng quan

Giai đoạn 1 refactor nội bộ EduICT để chuẩn bị kiến trúc cho "EduMaster Desktop" trong khi **bảo toàn toàn bộ chức năng**. Đây KHÔNG phải viết lại. Trọng tâm: tách phần phụ thuộc môi trường (đường dẫn, dialog, storage, vòng đời app, mạng) ra sau một lớp service để sau này Desktop có thể thay implementation mà không đụng vào logic nghiệp vụ.

Trạng thái: **các nhóm bổ sung (additive) + nhóm an toàn đã hoàn tất và verify**. Các thao tác cấu trúc rủi ro cao (tách `db.js`, `api-handler.js`) **được hoãn lại có chủ đích**, chờ quyết định — đúng mệnh lệnh "refactor từng bước, kiểm tra sau mỗi nhóm". **Chưa tự động chuyển sang Giai đoạn 2.**

## 2. Baseline (trước khi động vào code)

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | PASS (exit 0) |
| `npm run lint` (oxlint) | 0 lỗi, **177 warning** (đã có sẵn từ trước) |
| Kiểm chứng số warning | Đo bằng `git stash` → lint → so sánh: **177 (baseline) = 177 (sau refactor)** → 0 warning phát sinh mới |

Ghi chú: lần đo đầu bị **SIGPIPE cắt cụt** khi pipe oxlint qua `head/tail/grep -c` (cho ra 40/6/3 sai lệch). Cách đúng: ghi ra file trước rồi mới đếm.

## 3. File tài liệu tham chiếu bị thiếu

Task nhắc tới `eduict_full_audit_report.md` nhưng **file này không tồn tại** trong repo. Đã tiến hành dựa trên các phát hiện audit nhúng ngay trong đề bài — và chúng khớp thực tế đã kiểm chứng (db.js ~3764 dòng, api-handler ~1224 dòng, 16 `window.confirm`, 2 `reload`, GEMINI_API_KEY thật trong `.env`, bundle ~1.5MB).

## 4. Những gì ĐÃ hoàn tất

**Nhóm A — Lớp service bổ sung** (commit `59b3d90`):

| Service | Vai trò | Số điểm gọi đã nối |
|---|---|---|
| `src/services/DialogService.js` | Bao bọc `window.confirm/alert`; `confirm()` **đồng bộ** (drop-in) | 16 |
| `src/services/StorageService.js` | Bao bọc `localStorage/sessionStorage`; **pass-through chuỗi thô** (không tự JSON.parse/stringify → không đổi định dạng dữ liệu cũ) | 19 |
| `src/services/AppLifecycleService.js` | Bao bọc `window.location.reload` | 2 |
| `src/services/apiClient.js` | Hạ tầng `fetch` có timeout (AbortController) + `ApiError` | **Đã tạo, CHƯA nối** |
| `server/services/pathService.js` | Tập trung mọi phân giải đường dẫn; **nơi DUY NHẤT dùng `process.cwd()`** | 9 |

**Nhóm an toàn** (commit `be393e1`, `c95350c`):

- **Part 12 — CORS theo cấu hình**: `server/services/corsConfig.js`, đọc `EDUICT_CORS_ORIGIN`, **mặc định `*`** (giữ nguyên hành vi WEB). Hỗ trợ allowlist + `Vary: Origin`.
- **Part 16 — Smoke tests**: `tests/smoke.test.js` chạy bằng `node --test` tích hợp (**không thêm dependency**), thêm script `npm test`.
- **Part 11 — Chốt an toàn SQL import**: `validateSqlDump()` đặt tại `executeSqlDump()`.

## 5. Những gì CHƯA làm / hoãn có chủ đích

| Part | Hạng mục | Lý do hoãn |
|---|---|---|
| 2 | Tách `server/db.js` (3764 dòng) → `server/db/` + facade | **Rủi ro cao nhất** — chờ quyết định, cần verify liên tục |
| 4 | Tách `server/api-handler.js` → `server/routes/` | Rủi ro trung bình-cao |
| 8 | Nối `apiClient` vào các điểm `fetch` hiện có | Phải giữ nguyên hành vi fallback-vs-throw |
| 9 | React.lazy code splitting (giảm bundle 1.5MB) | Chưa làm |
| 13 | Serial hóa COM PPTX (1 job/lần) | Hiện `MAX_CONCURRENT_PPTX_RENDER=2` |
| 17 | Verify đầy đủ 25 tính năng | Smoke test mới phủ phần lõi |

## 6. Kiến trúc lớp service & lý do Desktop-readiness

Mọi phụ thuộc môi trường giờ đi qua một điểm chốt duy nhất. Khi lên Desktop, chỉ cần thay implementation phía sau (ví dụ `PathService` trỏ vào thư mục dữ liệu của app đóng gói, `DialogService` dùng dialog native) mà **không sửa logic nghiệp vụ**. `pathService` là **module lá** (chỉ import `node:path`/`node:fs`) để tránh phụ thuộc vòng.

## 7. Sai lệch so với spec (deviations)

- **`PathService` đặt ở `server/services/` thay vì `src/services/`**: vì **toàn bộ** `process.cwd()` nằm phía server. Đây là lựa chọn có lý do, dùng đúng "escape hatch" của spec ("hoặc nếu architecture hiện tại phù hợp hơn").
## 8. Bảo mật (Part 10, 11, 12)

**Part 10 — GEMINI_API_KEY (audit, không lộ):**

| Kiểm tra | Kết quả |
|---|---|
| `.env` được gitignore | ✅ |
| `.env` từng bị commit vào lịch sử git | ❌ Chưa bao giờ |
| Key lọt vào bundle `dist/` | ❌ Không |
| Key trong backup/sqlite/json | ❌ Không |
| Frontend `src/` tham chiếu | Chỉ là **tên chuỗi** trong text UI + placeholder `AIzaSy...` (không phải key thật) |
| Điểm đọc key server-side | Duy nhất `server/ai/envLoader.js:36` |
| Endpoint status `getAiStatus()` | Trả `{enabled, configured, model}` — **KHÔNG** trả `apiKey` |
| Ghi key ra log | ❌ Không |

→ **Khuyến nghị ROTATE key**: mang tính **dự phòng** (key hiện chưa lộ ở đâu). Không hiển thị giá trị key trong báo cáo này.

**Part 11 — `/api/sql/import-script`:** endpoint gọi `executeSqlDump(sql)` → `db.exec(sql)` **raw, không auth**. Đã thêm `validateSqlDump()` chặn `ATTACH/DETACH DATABASE`, `load_extension()`, `VACUUM INTO`, `PRAGMA writable_schema/temp_store_directory`, và dump rỗng/`>50MB` — **vẫn cho restore hợp lệ** (CREATE/INSERT/UPDATE/DELETE/DROP). ⚠️ **Bảo vệ đầy đủ vẫn cần thêm auth cho endpoint** (một client vẫn có thể xóa/DROP dữ liệu) — ghi nhận cho Giai đoạn 2 / Desktop bridge (chạy local-only).

**Part 12 — CORS:** trước đây hardcode `Access-Control-Allow-Origin: *`. Nay đọc cấu hình, **mặc định vẫn `*`**.

## 9. Audit an toàn DB (Part 3 — KHÔNG migrate schema)

- `PRAGMA foreign_keys = ON` + `journal_mode = WAL` ✅ (`db.js:25-26`).
- FK cascade đầy đủ: `ON DELETE CASCADE` cho bản ghi con, `ON DELETE SET NULL` cho tham chiếu tùy chọn.
- ⚠️ **Orphan student_id**: `student_participation.student_id` và `quiz_student_results.student_id` là `TEXT NOT NULL` **không có FK**. Nguyên nhân: bảng `students` có PK ghép `(id, class_id)` nên không thể FK thẳng chỉ `student_id`. Nhiều khả năng **chủ ý** (giữ lịch sử thưởng sao / kết quả quiz kể cả khi học sinh rời lớp). → Chỉ báo cáo, **không sửa schema**.
- Sinh ID động dùng `Date.now()_Math.random()` — rủi ro trùng cực thấp, đang hoạt động ổn, không cần đổi.

## 10. Biến môi trường mới

| Biến | Mặc định (giữ hành vi WEB) | Dùng cho |
|---|---|---|
| `EDUICT_APP_ROOT` | `process.cwd()` | Gốc app (Desktop trỏ vào thư mục cài đặt) |
| `EDUICT_DATA_DIR` | `<app root>` | Thư mục dữ liệu (DB, uploads...) |
| `EDUICT_DB_PATH` | (đã có sẵn) | Đường dẫn file SQLite |
| `EDUICT_CORS_ORIGIN` | `*` | Allowlist origin cho CORS |

## 11. Kiểm thử (Part 16)

`tests/smoke.test.js` — **7/7 PASS**: corsConfig (mặc định + allowlist), pathService (`EDUICT_DB_PATH`), khởi tạo schema + `foreign_keys` ON, CRUD roundtrip + FK CASCADE (trên **DB tạm** qua `EDUICT_DB_PATH`, không đụng DB thật), `validateSqlDump` (cho dump hợp lệ / chặn lệnh nguy hiểm).

> **⚠️ ĐÍNH CHÍNH (Giai đoạn 1B, 2026-09-28):** Khẳng định "trên DB tạm ... không
> đụng DB thật" ở trên **SAI vào thời điểm viết (Giai đoạn 1A)**. Thực tế test khi
> đó ghi vào **CSDL THẬT** vì `envLoader.loadEnv()` ghi đè `process.env.EDUICT_DB_PATH`
> bằng giá trị trong `.env`, nuốt mất đường dẫn tạm. Đã khắc phục trong Giai đoạn 1B
> (cô lập `EDUICT_APP_ROOT`/`EDUICT_DATA_DIR` sang thư mục tạm không có `.env`). Chi
> tiết: xem `docs/phase-1-pre-refactor-verification.md` và mục Phase 1B §1 bên dưới.
> Sau khi vá, test THỰC SỰ chạy trên DB tạm.

## 12. Kết quả VERIFY tổng hợp

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ PASS (exit 0) |
| `npm run lint` | ✅ 0 lỗi, 177 warning (= baseline, 0 mới) |
| `npm test` | ✅ 7/7 PASS |
| Smoke 3 endpoint HTTP | ✅ 200 + JSON hợp lệ (phiên trước) |
| API contract / endpoint / response | ✅ Không đổi |
| DB engine / schema / dữ liệu | ✅ Không đổi |

## 13. Rủi ro & khuyến nghị

1. **ROTATE `GEMINI_API_KEY`** (dự phòng) — không commit key mới.
2. **Thêm auth cho `/api/sql/import-script`** ở Giai đoạn 2 (validateSqlDump chưa chống được xóa/DROP dữ liệu bởi client có quyền gọi).
3. Tách `db.js`/`api-handler.js` là bước rủi ro cao — làm từng bước, verify + smoke test sau mỗi bước, có facade tương thích.
4. Cân nhắc dọn dữ liệu orphan (`student_participation`, `quiz_student_results`) ở tầng ứng dụng nếu muốn — **không** đổi schema trong Giai đoạn 1.

## 14. Bước tiếp theo (Giai đoạn 2)

**KHÔNG tự động chuyển sang Giai đoạn 2.** Các ứng viên kế tiếp trong Giai đoạn 1 (chờ duyệt): Part 2 (tách db.js), Part 4 (tách api-handler), Part 8 (nối apiClient), Part 9 (React.lazy), Part 13 (serial hóa COM PPTX), Part 17 (verify đủ 25 tính năng).

### Nhật ký commit Giai đoạn 1

- `59b3d90` — refactor: lớp service trừu tượng (Nhóm A)
- `be393e1` — feat: CORS theo cấu hình + smoke tests
- `c95350c` — feat(security): validateSqlDump cho SQL import

---

# Phase 1B Completion

> Cập nhật: 2026-09-28 · Nhánh `feature/new-idea`. Tiếp nối Giai đoạn 1A. Nguyên
> tắc: **AUDIT → REFACTOR → VERIFY → REPORT**, verify (`lint`/`build`/`test`) sau
> MỖI nhóm thay đổi, DỪNG nếu fail. **Chưa chuyển sang Giai đoạn 2.**
>
> **Trạng thái tại thời điểm cập nhật:** ✅ = xong & verify · ⏳ = đang thực hiện/chờ.

## 1B·1 — Pre-refactor verification (Phần A) ✅

Tạo `docs/phase-1-pre-refactor-verification.md`: xác minh tĩnh **25/25 nhóm chức
năng** (file · API · trạng thái · vấn đề), đối chiếu endpoint với `api-handler.js`,
và audit toàn bộ call-site `fetch()` (chỉ **6 file** dưới `src/` chạm mạng).

**Phát hiện an toàn dữ liệu nghiêm trọng (đã vá):** smoke test Giai đoạn 1A **ghi
vào CSDL THẬT** vì `envLoader.loadEnv()` ghi đè `process.env.EDUICT_DB_PATH` từ
`.env`. Vá trong `tests/smoke.test.js`: trỏ `EDUICT_APP_ROOT`/`EDUICT_DATA_DIR`
sang thư mục tạm (không có `.env`) TRƯỚC mọi import chạm DB → `loadEnv()` không
tìm thấy `.env` nên không ghi đè. Đã đính chính §11 báo cáo 1A. Kiểm chứng: log
kết nối tới `...Temp\eduict_smoke_*\smoke_*.sqlite`, `TEST_EXIT=0`.

## 1B·2 — PPTX COM serialization (Phần B) ✅

Thêm COM mutex kiểu promise-chain `withComLock(fn)` trong `server/pptxService.js`
(kèm `getComLockStats()`). Chỉ **1 job COM PowerPoint** chạy tại một thời điểm;
job thứ 2 chờ; lỗi/timeout không làm đứng hàng đợi (chain nối ở cả 2 nhánh).
Bọc đúng **3 hàm sinh COM**: `renderPptxToPdf`, nhánh COM của
`renderSingleSlideFallback` (Phương án 2 — GIỮ nhánh Python/PDF Phương án 1 chạy
song song), `renderPptxWithPowerPoint`. LibreOffice/PyMuPDF/Python **giữ nguyên
concurrency** (`MAX_CONCURRENT_PPTX_RENDER` không đổi). `renderPptxMultiEngine`
gọi các bước COM **tuần tự, không lồng nhau** → mutex an toàn deadlock.

Kiểm thử: thêm 2 test đơn vị kiểm chứng tính loại trừ tương hỗ (không cần
PowerPoint thật) — `maxActive === 1`, thứ tự FIFO, lỗi 1 job không kẹt hàng đợi.
Kiểm thử tích hợp COM thật (1 PPTX / 2 tuần tự / 2 gần đồng thời / 1 lỗi / retry)
cần Windows + PowerPoint + file `.pptx` → **xác minh thủ công** (ghi nhận).

## 1B·3 — Tách db.js (Phần C) ✅

`server/db.js` (~3787 dòng) → `server/db/` (11 module: `connection, schema, seed,
settings, classes, backup, sessions, lessons, quiz, ai, index`). `db.js` nay chỉ
là **shim** `export * from './db/index.js'` → mọi import của consumer giữ nguyên.

- **Di chuyển verbatim** (cắt theo dải byte của bản gốc, không gõ tay lại): không
  đổi SQL, return shape, transaction, comment, seed data. Thay đổi duy nhất ngoài
  dòng import/export: thêm từ khóa `export` cho 4 hàm trước đây private
  (`initSchema`, `seedInitialData/Lessons/Questions`).
- Import chéo giữa module là **runtime call** (vd `classes.js` ↔ `settings.js`
  vòng nhau) — hợp lệ trong ESM, đã kiểm chứng chạy thật.
- **Verify độc lập (tự chạy lại, không chỉ tin agent):** `lint` exit 0 (182
  warning, = baseline), `build` exit 0, `test` exit 0 (**9/9**); 69/69 named
  export resolve từ `db.js`; `getDatabase()→initSchema()→seed/sort` + các hàm đọc
  chạy không `ReferenceError`.

## 1B·4 — Tách api-handler.js (Phần D) ✅

`server/api-handler.js` (~1224 dòng) → `server/routes/` (**9 module**: `helpers,
classes, schoolYear, backup, sessions, lessons, pptx, quiz, index`);
`api-handler.js` nay chỉ là **shim** `export { handleApiRequest } from './routes/index.js'`
→ mọi import của consumer giữ nguyên. Ràng buộc đã giữ: endpoint/method/body/
query/response/status/error **không đổi**.

- **helpers.js** = `sendJson` + `parseRequestBodyBuffer` + `parseJsonBody` +
  `parseMultipart` (dùng chung cho mọi route module).
- Mỗi route module export `tryHandleX(req, res, ctx)` → trả `true` nếu đã xử lý,
  `false` nếu không khớp (thay cho `return;`/`return true;` của bản gốc).
- **Bảo toàn thứ tự first-match** trong `index.js`: `tryHandleClasses →
  tryHandleSchoolYear → tryHandleBackup → tryHandleSessions →
  tryHandleLessonsCollection → tryHandlePptx → tryHandleLessonsCrud →
  tryHandleQuiz → handleAiApiRequest`. `lessons.js` **tách đôi** collection
  (`/api/lessons` khớp chính xác) và crud (`/api/lessons/:id`), chèn **pptx ở
  giữa** để route PPTX cụ thể (vd `/api/lessons/scan-duplicates`) không bị
  `:id` nuốt mất.
- `lessons.js` import `deleteLessonPresentationsDir` từ `pptxService.js`
  (`server/pptxService.js:88`). Bỏ 2 import chết (`calculateNextSchoolYear`,
  `calculateAcademicYear`) → warning **182 → 180** (0 warning phát sinh mới).
- **Verify độc lập (tự chạy lại):** `lint` exit 0 (**180 warning**), `build`
  exit 0, `test` exit 0 (**9/9**). Hành vi HTTP thực tế của route (đi qua đúng
  `server/routes/`) đã được xác minh end-to-end ở **§1B·11** (5 endpoint GET trả
  200 + JSON hợp lệ) — đây là bằng chứng behavioral mà unit smoke chưa phủ.

## 1B·5 — Migration apiClient (Phần E) ✅

**Nguyên tắc:** KHÔNG ép mọi `fetch` về một hành vi. Audit Phần A phân loại **7
lớp hành vi** call-site; chỉ nối `apiClient` vào lớp **"JSON thuần, throw-on-error,
KHÔNG có fallback cache"** — đúng ngữ nghĩa mà `apiClient.request()` cung cấp.

**Đã nối (3 hàm trong `src/utils/storage.js`):**

| Hàm | Endpoint | Vì sao an toàn |
|---|---|---|
| `saveAcademicYearSettings` | `POST /api/school-year/settings` | Không fallback; message ném ra `data.error \|\| "Lỗi máy chủ (<status>)"` **trùng khít** với `ApiError` |
| `transitionSchoolYearInSqlite` | `POST /api/school-year/transition` | Như trên; call-site (`App.jsx`, modal) chỉ đọc `err.message` |
| `batchImportClassesToSqlite` | `POST /api/classes/batch-import` | Giữ nguyên wrapper `try/catch` (log + rethrow); message trùng khít |

`ApiError` **kế thừa `Error`** nên call-site đọc `err.message` giữ nguyên trải
nghiệm. Bảo toàn cả trường hợp body rỗng (`?? {}` = hành vi `.catch(()=>({}))` cũ).

**CỐ Ý KHÔNG nối (giữ nguyên hành vi):**
- **Fallback-default reads** (`fetchClasses/SchoolYears/Statistics...`) — trả giá
  trị mặc định khi lỗi, `apiClient` sẽ throw → khác hành vi.
- **Fallback-cache localStorage** (toàn bộ `quizStorage.js`, `sessionStorage.js`,
  `lessonStorage.js`) — catch → đọc/ghi cache; đổi sẽ mất offline-mode.
- **Fire-and-forget writes** (`sync*ToSqlite`, `delete*`) — nuốt lỗi `console.warn`.
- **`res.ok` boolean** (`setCurrentSchoolYearToSqlite`).
- **Upload FormData** (`fastImportPptxApi`, `checkLessonsDuplicateApi`) & **tải
  Blob/anchor** (`downloadSqlite/SqlScriptFile`) — không phải JSON.
- **`aiService.js` POST**: ném lỗi kèm `err.errorCode` (đọc trực tiếp trên error);
  `apiClient` để dữ liệu dưới `err.data` → đổi shape lỗi. **Hoãn** (nợ kỹ thuật).
- **`importSqlScriptFile`**: thiếu guard `res.ok` (đã ghi Phần A) — nối `apiClient`
  sẽ *đổi* hành vi (throw thay vì trả body lỗi). Hoãn để không đổi contract.

**Verify:** `lint` 0 (**180 warning**), `build` 0, `test` **9/9**. `apiClient`
từ chỗ *chưa có importer* nay đã được import & sử dụng thật.

## 1B·6 — React code splitting (Phần F) ✅

`src/App.jsx`: chuyển **9 manager nặng** sang `React.lazy(() => import(...))` và
bọc vùng render tab trong `<Suspense fallback={…}>` (spinner "Đang tải chức năng…").
Giữ **eager** phần vỏ tải-ngay: `Navbar`, `Sidebar`, `HomeDashboard`,
`ClassroomTimer`, `NewSchoolYearDetectedModal`, `ErrorBoundary`.

Lazy: `SessionManager`, `LessonManager`, `QuickQuizManager`, `Gradebook`,
`GoodScoresBoard`, `SeatingChart`, `DuckRace`, `LuckyWheel`, `RewardShop`
(tất cả đều `export default` — đã kiểm chứng trước khi `lazy()`).

**Kết quả build (chunk tách riêng, tải theo yêu cầu):**

| Chunk | Kích thước | gzip |
|---|---|---|
| `index` (khởi động) | 835.34 kB | 253.43 kB |
| `LessonManager` | 182.91 kB | 34.59 kB |
| `SessionManager` | 111.76 kB | 25.83 kB |
| `SeatingChart` | 71.32 kB | 15.30 kB |
| `PresentationView` (con của lessons) | 55.59 kB | 13.29 kB |
| `GoodScoresBoard` | 54.05 kB | 10.87 kB |
| `Gradebook` | 33.19 kB | 8.23 kB |
| `QuickQuizManager` | 29.47 kB | 7.36 kB |
| `DuckRace` / `LuckyWheel` | 18.06 / 13.64 kB | 6.00 / 4.27 kB |

Trước Phần F các manager này nằm trong bundle khởi động; nay **~500+ kB** chỉ tải
khi mở tab tương ứng. `ErrorBoundary` (đã có) bắt lỗi tải chunk; điều hướng/refresh
hoạt động (state tab do `App.jsx` giữ qua props → Presentation/Session **không mất
state** khi code-split). **Verify:** `lint` 0 (180 warning), `build` 0, `test` 9/9.

## 1B·7 — Bảo mật (Phần G) ✅ (audit, không lộ)

| Ràng buộc | Trạng thái |
|---|---|
| KHÔNG commit `.env` | ✅ `.gitignore` chặn `.env`, `.env.*` (giữ `!.env.example`); chưa từng vào lịch sử git |
| Không log `GEMINI_API_KEY` | ✅ Không có điểm ghi key ra log |
| Key không vào SQLite/JSON/backup/frontend/dist | ✅ Chỉ đọc server-side tại `server/ai/envLoader.js`; `src/` chỉ có **tên chuỗi** + placeholder `AIzaSy...` |
| `getAiStatus()` không trả key | ✅ Smoke §1B·11: `/api/ai/status` → `{enabled, configured, model}`, **KHÔNG** có `apiKey` |
| `validateSqlDump()` | ✅ Đã có, giữ nguyên (chặn `ATTACH/DETACH`, `load_extension`, `VACUUM INTO`, `PRAGMA writable_schema/temp_store_directory`, dump rỗng/>50MB), vẫn cho restore hợp lệ |
| Không đổi hành vi backup/restore ngoài validation | ✅ Không đụng |
| Auth cho SQL import | ⏳ **CHƯA có kiến trúc authentication** → KHÔNG triển khai (đúng chỉ thị); ghi nợ kỹ thuật §1B·13 |

→ **ROTATE RECOMMENDED (dự phòng):** key hiện chưa lộ ở đâu; không tự rotate;
không hiển thị giá trị key trong báo cáo. Không đưa secret vào bất kỳ artifact nào.

## 1B·8 — Build ✅

`npm run build` (vite 8 rolldown) **exit 0**. Sau Phần F: bundle được **code-split**
thành nhiều chunk (xem §1B·6). Cảnh báo "chunk > 500 kB" cho `index` là **thông tin**
(không phải lỗi) — đã giảm đáng kể so với trước nhờ tách lazy; tối ưu sâu hơn (vendor
splitting) để Giai đoạn sau.

## 1B·9 — Lint ✅

`npm run lint` (oxlint 1.79) **exit 0 lỗi**. Warning: **180** (đã đo bằng cách ghi
ra file rồi đếm, tránh SIGPIPE). Diễn biến qua Giai đoạn 1B: 182 (sau tách db.js) →
**180** (tách api-handler bỏ 2 import chết) → **180** (Phần E, F: 0 warning phát sinh
mới). Không có warning mới do refactor 1B.

## 1B·10 — Kiểm thử đơn vị ✅

`npm test` (`node --test`) **9/9 PASS** (từ 7 → 9 sau khi thêm 2 test COM mutex ở
Phần B). Bao gồm: corsConfig (default + allowlist), pathService, init schema +
`foreign_keys` ON, CRUD roundtrip + FK CASCADE **trên DB tạm** (đã vá cô lập ở
§1B·1), `validateSqlDump` (hợp lệ/chặn), và **COM mutex** (loại trừ tương hỗ FIFO +
lỗi-không-kẹt-hàng-đợi). Zero dependency mới; chạy trên DB tạm, không đụng DB thật.

## 1B·11 — Regression tổng hợp (Phần H) ✅

Toàn bộ `lint` (0/180) + `build` (0) + `test` (9/9) xanh sau MỖI nhóm thay đổi
(B→C→D→E→F). **HTTP smoke thực tế** (khởi động `server.js` trên **DB tạm cô lập**
`EDUICT_APP_ROOT/DATA_DIR/DB_PATH` → thư mục `Temp`, PORT=5199, KHÔNG đụng DB thật):

| Endpoint | HTTP | Kết quả |
|---|---|---|
| `GET /api/status` | **200** | `{"status":"ok","engine":"SQLite (Node.js 22 Native)","dbFile":"http_smoke.sqlite",...}` |
| `GET /api/classes` | **200** | Mảng lớp seed (`class_1a1` "Lớp 1A1"...) |
| `GET /api/lessons` | **200** | Mảng bài học seed (`les_k3_computer`...) |
| `GET /api/questions` | **200** | Mảng câu hỏi seed (`qb_k1_01`...) |
| `GET /api/ai/status` | **200** | `{"enabled":true,"configured":false,"model":"gemini-3.5-flash-lite"}` — **KHÔNG** lộ key |

→ Xác nhận **routing đi qua đúng `server/routes/` mới** end-to-end, response JSON
giữ nguyên hình dạng, và facade `db.js`/`api-handler.js` hoạt động thật. API
contract / endpoint / response / DB engine / schema / dữ liệu: **không đổi**.

## 1B·12 — Desktop readiness (Phần I) ✅ (audit)

Không gỡ API trình duyệt hợp lệ; chỉ xác nhận **mọi phụ thuộc môi trường đã đi qua
lớp abstraction** (điểm chốt duy nhất để Desktop thay implementation):

| Phụ thuộc | Điểm chốt | Kiểm chứng |
|---|---|---|
| `process.cwd()` | `server/services/pathService.js` (dòng 22) | grep server: **chỉ 1 nơi** |
| `window.confirm/alert` | `DialogService` | grep `src/`: raw chỉ còn trong `DialogService.js` |
| `window.location.reload` | `AppLifecycleService` | raw chỉ còn trong `AppLifecycleService.js` |
| `localStorage/sessionStorage` | `StorageService` | raw chỉ còn trong `StorageService.js` |
| Đường dẫn tuyệt đối hard-code (`C:\…`) | — | grep `src/`: **không có** |
| DB path / data dir / app root | `EDUICT_DB_PATH / EDUICT_DATA_DIR / EDUICT_APP_ROOT` | smoke §1B·11 chạy được trên thư mục tạm bất kỳ |

→ Frontend đã "sạch" phụ thuộc môi trường trực tiếp; server tập trung path ở
`pathService`. Đủ điều kiện để lớp Desktop sau này thay backing store mà không sửa
logic nghiệp vụ.

## 1B·13 — Nợ kỹ thuật (ghi nhận, KHÔNG sửa trong Giai đoạn 1)

1. **`envLoader.loadEnv()` ghi đè `process.env` vô điều kiện** (`server/ai/envLoader.js`)
   — nguồn gốc lỗi test-ghi-DB-thật (đã cô lập trong test). Nên đổi sang "chỉ set
   khi chưa có" (opt-in) ở Giai đoạn sau; rủi ro trung-cao, là cơ chế cấu hình
   dùng chung → không đổi ở Giai đoạn 1.
2. **Auth cho `/api/sql/import-script`** — `validateSqlDump` chặn lệnh nguy hiểm
   nhưng client có quyền gọi vẫn `DROP/DELETE` được. Chờ kiến trúc authentication.
3. **`importSqlScriptFile` thiếu guard `res.ok`** (`utils/storage.js`) — nuốt body
   lỗi server. Chưa nối `apiClient` để không đổi contract.
4. **`aiService.js` dùng `err.errorCode`** trực tiếp trên error → chưa migrate sang
   `apiClient` (sẽ đổi shape lỗi sang `err.data.errorCode`).
5. **Ghi fire-and-forget im lặng** (`sync*ToSqlite` chỉ `console.warn`) → UI không
   biết khi ghi hỏng. Cân nhắc cơ chế báo lỗi ở Giai đoạn sau.
6. **Dọn dẹp:** component mồ côi `StarExchangeModal.jsx`; export chết
   `fetchQuizSessionDetailApi`, có thể `sortClassStudentsInSqlite`; comment lỗi
   thời "23 lớp" (`storage.js`); `detectGradeFromName` trùng ở 2 file;
   `SIMILARITY_STATUS_LABELS` `near_duplicate`≡`high_duplicate`.

## 1B·14 — Những gì CHƯA làm trong phạm vi Giai đoạn 1

- **Kiểm thử COM PowerPoint thật** (1 PPTX / 2 tuần tự / 2 gần đồng thời / lỗi /
  retry) cần Windows + PowerPoint + file `.pptx` → **xác minh thủ công** (unit test
  chỉ phủ tính chất mutex). Không có runner tự động cho COM trong CI.
- **Runtime UI từng thao tác của 25 nhóm chức năng**: mới xác minh **tĩnh** (Phần A)
  + HTTP smoke 5 endpoint đọc. Chưa có e2e bấm UI từng luồng.
- **Migrate `apiClient` cho các lớp fetch còn lại** (fallback-cache, aiService,
  upload FormData) — cố ý hoãn để không đổi hành vi (xem §1B·5, §1B·13).
- **Tối ưu bundle sâu** (tách vendor `react`/`xlsx`, giảm `index` < 500 kB).
- Các mục dọn dẹp ở §1B·13.6.

## 1B·15 — Đề xuất Giai đoạn 2 (KHÔNG tự động chuyển)

1. **Authentication + phân quyền** rồi mới siết `/api/sql/import-script`, backup/
   restore, và các ghi phá hủy dữ liệu.
2. **`loadEnv()` opt-in** ("chỉ set khi chưa có") + tách cấu hình test/prod rõ ràng.
3. **Desktop packaging** (thay backing store qua các service đã có: `pathService`,
   `DialogService`, `StorageService`, `AppLifecycleService`) — vẫn KHÔNG chuyển
   Electron/Tauri trong Giai đoạn 1.
4. **Hoàn tất migration `apiClient`** cho fallback-cache & aiService (chuẩn hóa lỗi
   `err.data.errorCode`), thêm retry/timeout thống nhất.
5. **E2E test** các luồng UI trọng yếu + **CI COM render** (self-hosted Windows).
6. **Tối ưu bundle** (vendor chunk, prefetch tab hay dùng).
7. Dọn nợ kỹ thuật §1B·13.6.

---

## Kết luận Giai đoạn 1B

Tất cả nhóm thay đổi (**A→B→C→D→E→F**) đã **hoàn tất & verify xanh** theo đúng
nguyên tắc AUDIT→REFACTOR→VERIFY→REPORT, verify sau mỗi nhóm:

| Phần | Nội dung | Trạng thái |
|---|---|---|
| A | Pre-refactor verification (25 nhóm) | ✅ |
| B | PPTX COM serialization | ✅ |
| C | Tách `db.js` → `server/db/` (facade) | ✅ |
| D | Tách `api-handler.js` → `server/routes/` (facade) | ✅ |
| E | Nối `apiClient` (3 call-site JSON throw) | ✅ |
| F | React.lazy code splitting | ✅ |
| G | Bảo mật (audit, không lộ) | ✅ |
| H | Regression + HTTP smoke 5 endpoint | ✅ |
| I | Desktop readiness (audit) | ✅ |
| J | Báo cáo này | ✅ |

**Trạng thái cuối:** `lint` 0 lỗi / 180 warning · `build` exit 0 (code-split) ·
`test` **9/9** · HTTP smoke 5/5 **200 + JSON hợp lệ** trên DB tạm cô lập · API
contract / endpoint / response / DB engine / schema / dữ liệu **KHÔNG đổi** ·
KHÔNG chuyển Electron/Tauri · KHÔNG gỡ PPTX renderer · **chưa commit**.

> **GIAI ĐOẠN 1 HOÀN THÀNH** — tất cả hạng mục checklist đã pass & verify. **KHÔNG**
> tự động chuyển sang Giai đoạn 2; chờ chỉ thị. Các kiểm thử cần môi trường thật
> (COM PowerPoint, e2e UI) được ghi rõ là **xác minh thủ công / hoãn** ở §1B·14 —
> không nằm trong phạm vi tự động hóa của Giai đoạn 1.





