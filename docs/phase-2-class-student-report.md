# EDUICT — PHASE 2 REPORT

> GIAI ĐOẠN 2 — CLASS & STUDENT MANAGEMENT + IMPORT EXCEL
> Tài liệu này KHÔNG thay thế `docs/phase-1-refactor-report.md` và
> `docs/phase-1c-final-verification.md` (cả hai vẫn giữ nguyên).
> Phương pháp: **AUDIT → IMPLEMENT → TEST → REGRESSION → REPORT → STOP**.
> Nguyên tắc chủ đạo: **KEEP IT** — không rewrite; chỉ sửa khi có bug/thiếu sót thực sự.

## 1. Thông tin phiên

| Mục | Giá trị |
|---|---|
| Ngày | 2026-09-28 |
| Nhánh | `feature/new-idea` |
| HEAD | `387d43e` |
| Node / npm | v22.19.0 / 10.9.3 |
| React / Vite | 19.2.8 / 8.2.2 (rolldown) · oxlint 1.79 |
| DB engine | `node:sqlite` `DatabaseSync` (KHÔNG đổi) |
| Phạm vi | Class/Student management + Import Excel đa sheet + đồng bộ module |

## 2. Kết luận điều hành

Toàn bộ hạ tầng Class/Student + Import Excel **đã có sẵn và hoạt động đúng**. Kiểm tra
xác nhận không cần rewrite. Việc của Giai đoạn 2 chủ yếu là **AUDIT + TEST** để chứng minh
tính đúng đắn, và xác minh hai bug lịch sử (XXVIII, XXIX). **Không sửa mã ứng dụng nào**;
chỉ thêm test (không thêm dependency). Baseline giữ nguyên: smoke 9/9, lint 0 error/180
warning, build exit 0. Thêm 26 test Giai đoạn 2 (16 backend + 10 parse) — tất cả PASS.

## 3. Phương pháp & ràng buộc tuân thủ

- KHÔNG rewrite; KHÔNG đổi framework/React/Vite/SQLite/node:sqlite; KHÔNG ORM; KHÔNG DB mới.
- KHÔNG đổi API contract / response shape / schema / PK / FK.
- KHÔNG commit; KHÔNG push; KHÔNG tự chuyển sang Giai đoạn 3.
- KHÔNG chạy `git reset --hard` / `git clean -fd` / `git checkout .`.
- Test cô lập trên DB TẠM (`EDUICT_DB_PATH` → `os.tmpdir()`), KHÔNG chạm `edumaster.sqlite` thật.

## 4. Schema thực tế (AUTHORITATIVE — không đổi)

- `classes`: `id TEXT PRIMARY KEY, name TEXT NOT NULL, grade INTEGER, subject TEXT, school_year TEXT, created_at, good_scores TEXT`. **PK = `id` (KHÔNG unique theo `name`).**
- `students`: `PRIMARY KEY (id, class_id)`, `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`.
- Không thay đổi schema trong Giai đoạn 2 (không cần thiết).

## 5. API surface thực tế (`server/routes/classes.js`)

| Method / Path | Handler | Ghi chú |
|---|---|---|
| `GET /api/classes?schoolYear=` | `getAllClassesWithStudents` | Lớp + học sinh (đã sort A–Z) |
| `GET /api/statistics/students` | `getStudentStatistics` | Sĩ số theo năm |
| `POST /api/classes` | `saveOrUpdateClass` | **Upsert theo `id`** |
| `POST /api/classes/batch-import` | `batchImportClassesAndStudents` | Import Excel (1 transaction) |
| `DELETE /api/classes/:id` | `deleteClassById` | Dựa FK CASCADE |
| `PUT /api/classes/:id/students` | `saveStudentsForClass` | Thay thế danh sách HS |

Không có `/api/students` (học sinh luôn theo lớp). Response shape KHÔNG đổi.

## 6. Quản lý lớp (Class Management)

UI ở modal trong `src/components/Navbar.jsx` (`showAddModal`). Danh sách lớp lấy từ DB
(state `App.jsx` → `fetchClassesFromSqlite`), có sĩ số (`studentCount ?? students.length`).
**Verdict: KEEP IT** — đúng yêu cầu, không hard-code.

- **Thêm lớp:** `handleCreateClass` → `syncClassToSqlite` (POST). ✓
- **Sửa lớp (đổi tên):** `saveOrUpdateClass` dùng `ON CONFLICT(id) DO UPDATE` → **classId giữ nguyên**
  khi đổi tên (1A1 → 1A01). Kiểm chứng test **T13**. ✓
- **Xóa lớp:** `App.jsx:handleDeleteClass` dùng **`DialogService.confirm(...)`** (KHÔNG `window.confirm`),
  có cảnh báo mất điểm/sao/sơ đồ, chặn xóa khi còn 1 lớp; dựa FK CASCADE. Kiểm chứng cascade test **T14**. ✓

## 7. Quản lý học sinh (Student Management)

Học sinh gắn lớp qua `class_id`; khóa định danh là `id` (không dùng tên làm khóa). Gradebook /
RewardShop / GoodScoresBoard thêm-sửa học sinh trên `currentClass.students`. **Verdict: KEEP IT.**

## 8. Import Excel — Client parse (`src/utils/excelImport.js`)

| Yêu cầu | Trạng thái | Test |
|---|---|---|
| Đọc TOÀN BỘ workbook (nhiều sheet) | ✓ | P1 |
| Bỏ sheet hướng dẫn (HUONG_DAN/template/mẫu) | ✓ | P2 |
| Tự dò header (quét ≤30 dòng, Họ tên + ≥1 cột) | ✓ | P3 |
| Bỏ dòng chữ ký/chân trang (GVCN, Hiệu trưởng) | ✓ | P4 |
| Ngày sinh: serial / dd-mm-yyyy / yyyy-mm-dd, UTC-safe | ✓ | P8 |
| Giới tính: Nam/Nữ/M/F/Male/Female → chuẩn hóa; lạ → invalid | ✓ | P5, P9 |
| Thiếu ngày sinh → cảnh báo (không chặn) | ✓ | P6 |
| Chống trùng cùng sheet + cùng tên khác ngày sinh vẫn nhận | ✓ | P7 |
| Đối soát lớp/HS đã tồn tại trong DB | ✓ | P10 |

## 9. Import Excel — UI preview (`src/components/ImportExcelModal.jsx`)

- Preview theo từng sheet + checkbox chọn/bỏ từng sheet + "Chọn/Bỏ tất cả". ✓
- **Đổi tên lớp lúc import** qua ô input editable (`handleClassNameChange`), tự dò lại khối &
  đối soát lớp tồn tại. Kiểm chứng backend test **T7**. ✓
- Validate trước import: tên lớp không trống + không trùng giữa các sheet được chọn. ✓
- Chỉ gửi sheet `selected` và bỏ dòng `status === 'error'` khỏi payload. ✓
- Bảng tổng kết sau import (tổng sheet / xử lý / bỏ qua / tạo mới / HS mới / đã có / dòng lỗi)
  + chi tiết từng lớp (đã thêm, trùng, lỗi). **Verdict: KEEP IT.**

## 10. Import Excel — Backend transaction (`server/db/classes.js:290`)

`batchImportClassesAndStudents(payload)` — **một transaction cho cả workbook** (all-or-nothing):
`BEGIN` → nạp lớp hiện có → mỗi sheet: đối soát lớp theo (school_year + tên/tên chuẩn hóa) →
tái dùng `classId` HOẶC tạo lớp mới `class_<ts>_<rand>` (nếu `autoCreateClasses`) → dựng map
chống trùng `normName|normDob` → validate tên/giới tính → gán máy 1..31 → sinh `studentId` →
`INSERT` (prepared statement, tham số hóa) → `sortAllStudentsInDatabase` → `COMMIT`
(`ROLLBACK` nếu lỗi). **Verdict: KEEP IT.** Kiểm chứng: T1–T6, T10, T15, T16.

## 11. BUG XXVIII — Import lần 2/3 không ghi dữ liệu

**Phân tích:** (a) Backend — mỗi lần gọi mở transaction mới, dựng payload mới, `INSERT` học
sinh mới; import lại cùng file → tất cả là trùng → `studentsAdded=0`/`studentsExisting=n`
(hành vi idempotent ĐÚNG, không phải mất dữ liệu). Import file khác ở lần 2/3 → ghi bình thường.
(b) Client — `resetImportState()` xóa sạch `workbookData/importResult/selectedSheetIndex` **và**
`fileInputRef.current.value`; prop `existingClasses` được parent làm mới sau mỗi import
(`setClasses`). → **Không tái hiện trên mã hiện tại; coi như đã được khắc phục.**

**Kiểm chứng:** T8 (import #2 ghi dữ liệu), T9 (import #3 ghi dữ liệu), T4 (idempotent khi trùng).
⚠️ *Giới hạn:* xác minh ở mức logic backend + đọc mã client; **chưa** chạy click-through trình
duyệt thật (không có E2E harness, không thêm dependency).

## 12. BUG XXIX — Danh sách lớp không refresh sau import

`ImportExcelModal` sau import gọi `fetchClassesFromSqlite()` → `onImportSuccess` →
`Navbar.onBatchImportSuccess` → `App.handleBatchImportSuccess` = `setClasses(updated)` +
`saveClasses` + `refreshStudentStats`. **Refresh bằng state, KHÔNG `window.location.reload`.**
(`reloadApplication` chỉ dùng cho khôi phục JSON backup & import SQL script — luồng khác.)
→ **Đã được khắc phục trong mã hiện tại. Verdict: KEEP IT.**

## 13. Đồng bộ module (Integration)

Audit (kèm subagent) xác nhận **nguồn dữ liệu duy nhất**: mọi module đọc học sinh từ
`currentClass.students` do `App.jsx` cấp, nạp từ `/api/classes` (localStorage chỉ là cache/seed).
Không module nào có danh sách học sinh hard-code/song song.

| Module | Nguồn học sinh | Lọc theo classId |
|---|---|---|
| Classroom Session | `currentClass` (session gắn `class_id`) | ✓ (API + App) |
| Practice Room / Seating | `currentClass.students` | ✓ (App) |
| Gradebook | `currentClass.students` | ✓ (App) |
| Stars / RewardShop / GoodScores | `currentClass.students` | ✓ (App) |
| Quick Quiz | `currentClass.students` (quiz gắn `class_id`) | ✓ (API + App) |

*Ghi chú:* `StarExchangeModal.jsx` là **dead code** (không được import ở đâu) — không ảnh hưởng.
Chênh lệch sĩ số (nếu có, vd Class Mgmt vs Gradebook) đến từ dữ liệu (HS không hợp lệ/thiếu),
KHÔNG từ nguồn dữ liệu khác nhau.

## 14. Bảo mật

- **Excel là DATA, không phải SQL:** toàn bộ import dùng prepared statement tham số hóa
  (`insertStudentStmt.run(...)`), KHÔNG nối chuỗi vào `db.exec()`. Kiểm chứng T12 (tên chứa `'`
  vẫn an toàn & nguyên vẹn). Không có path traversal (không đọc đường dẫn từ Excel).
- **TD-02** (`POST /api/sql/import-script` không auth) — GIỮ NGUYÊN (không mở rộng auth ở Phase 2).
- **TD-03** (backup thiếu `app_settings/school_years/*sessions*`) — không ảnh hưởng trực tiếp
  Class/Student → GIỮ NGUYÊN.

## 15. Ánh xạ 18 test bắt buộc → 26 test đã viết

| # | Yêu cầu test bắt buộc | Test | Trạng thái |
|---|---|---|---|
| 1 | Import đa sheet → nhiều lớp | T1, P1 | ✓ |
| 2 | Bỏ sheet hướng dẫn (HUONG_DAN) | P2, T15 | ✓ |
| 3 | Dò header thông minh (dòng rác phía trên) | P3 | ✓ |
| 4 | Bỏ dòng chữ ký/chân trang (GVCN, Hiệu trưởng) | P4 | ✓ |
| 5 | Ngày sinh serial / dd-mm-yyyy / yyyy-mm-dd không lệch TZ | P8 | ✓ |
| 6 | Giới tính Nam/Nữ/M/F/Male/Female; lạ → invalid | P9, P5, T6 | ✓ |
| 7 | Thiếu ngày sinh → cảnh báo (không chặn) | P6 | ✓ |
| 8 | Lớp mới → CREATE → lấy classId → import | T3, P1 | ✓ |
| 9 | Lớp đã có → tái dùng classId (không tạo mới) | T2, P10 | ✓ |
| 10 | Đổi tên lớp lúc import (bắt buộc, editable) | T7 | ✓ |
| 11 | Dedup (A) DB, (B) cùng sheet | T4, P7 | ✓ |
| 12 | Cùng tên + khác ngày sinh = KHÔNG trùng | T5, P7 | ✓ |
| 13 | Transaction BEGIN→…→COMMIT/ROLLBACK | T10 | ✓ |
| 14 | Đổi tên lớp giữ nguyên classId (1A1→1A01) | T13, T7 | ✓ |
| 15 | Xóa lớp → CASCADE học sinh | T14 | ✓ |
| 16 | BUG XXVIII: import #2/#3 vẫn ghi | T8, T9 | ✓ |
| 17 | Excel là DATA (an toàn SQL injection) | T12 | ✓ |
| 18 | Unicode tiếng Việt giữ nguyên | T11 | ✓ |

**Bổ sung ngoài danh sách:** T16 (autoCreate=false → lỗi, không tạo lớp).
**Giới hạn có chủ đích:** các module Session/Gradebook/Practice Room được xác minh bằng
**audit tĩnh** (mục 13), không phải unit test (không có E2E harness; không thêm dependency).
"Ngày sinh không parse được" → app giữ chuỗi gốc + cảnh báo (lenient theo thiết kế hiện tại),
không coi là lỗi chặn — đây là hành vi hiện có được GIỮ NGUYÊN.

## 16. Kết quả Regression

| Hạng mục | Lệnh | Baseline | Kết quả |
|---|---|---|---|
| Smoke test | `npm test` | 9/9 | **9/9 PASS** (không đổi) |
| Backend Phase 2 | `node --test tests/phase2-import.test.js` | — | **16/16 PASS** |
| Client parse Phase 2 | `node --import ./tests/register-hooks.mjs --test tests/phase2-parse.test.js` | — | **10/10 PASS** |
| Lint | `npm run lint` | 0 error / 180 warning | **0 error / 180 warning** (không đổi) |
| Build | `npm run build` | exit 0 | **exit 0** (chỉ còn cảnh báo chunk-size TD-06 có sẵn) |

Test Phase 2 để **file riêng**, không nằm trong `npm test`, nên baseline 9/9 được bảo toàn nguyên vẹn.

## 17. Technical Debt (đều CÓ SẴN — không phát sinh ở Phase 2)

| ID | Mô tả | Trạng thái Phase 2 |
|---|---|---|
| TD-01 | localStorage vẫn giữ vai trò cache/seed song song với SQLite | Giữ nguyên (không phá vỡ luồng) |
| TD-02 | `POST /api/sql/import-script` không xác thực | Giữ nguyên (ngoài phạm vi) |
| TD-03 | Backup JSON thiếu `app_settings`/`school_years`/sessions | Giữ nguyên (không liên quan Class/Student) |
| TD-04 | Backend không nhận M/F/Male/Female (client chuẩn hóa trước khi gửi) | Giữ nguyên — client đã che phủ (P9) |
| TD-05 | Không có E2E harness cho import UI (chỉ unit + audit tĩnh) | Giữ nguyên (không thêm dependency) |
| TD-06 | Cảnh báo chunk-size khi build (>500 kB) | Giữ nguyên (pre-existing) |
| TD-07 | `StarExchangeModal.jsx` là dead code | Giữ nguyên (không import ở đâu) |
| TD-08 | Import lenient với ngày sinh không parse được (giữ chuỗi gốc) | Giữ nguyên (hành vi thiết kế) |

## 18. Git audit

- `git status`: **sạch** về file nhạy cảm — chỉ có file mới: `docs/phase-1c-final-verification.md`,
  `docs/phase-2-class-student-report.md`, `tests/extensionless-loader.mjs`,
  `tests/phase2-import.test.js`, `tests/phase2-parse.test.js`, `tests/register-hooks.mjs`.
- KHÔNG có `.env` / `*.sqlite` / `uploads/` / `dist/` / `*.log` / secret trong danh sách thay đổi.
- KHÔNG chạy `git reset --hard` / `git clean -fd` / `git checkout .`.
- **KHÔNG commit, KHÔNG push** (theo yêu cầu).

## 19. Checklist nghiệm thu

- [x] Danh sách lớp lấy từ DB (không hard-code), có sĩ số
- [x] Thêm/sửa/xóa lớp (xóa qua DialogService, cảnh báo dữ liệu liên quan)
- [x] Đổi tên lớp giữ nguyên classId
- [x] Quản lý học sinh theo `id` (không dùng tên làm khóa)
- [x] Import đọc toàn bộ workbook, 1 sheet = 1 lớp, bỏ sheet hướng dẫn
- [x] Dò header thông minh + bỏ dòng rác/chữ ký
- [x] Ngày sinh & giới tính chuẩn hóa đúng
- [x] Preview theo sheet + checkbox + đổi tên lớp bắt buộc
- [x] Transaction tạo/tái dùng lớp → chèn HS → COMMIT/ROLLBACK
- [x] Dedup (DB + cùng sheet); cùng tên khác ngày sinh không trùng
- [x] BUG XXVIII & XXIX xác minh đã khắc phục
- [x] Excel là DATA (an toàn SQL injection)
- [x] Đồng bộ module qua nguồn dữ liệu duy nhất
- [x] Regression xanh; KHÔNG commit/push; KHÔNG sang Giai đoạn 3
- [ ] E2E click-through trình duyệt (không có harness — nợ kỹ thuật TD-05)

## 20. FINAL STATUS

**B — READY WITH TECHNICAL DEBT.**

Toàn bộ tính năng Class/Student + Import Excel đa sheet đã hiện diện, đúng đắn và được
**26 test tự động** chứng minh; hai bug lịch sử (XXVIII, XXIX) được xác minh đã khắc phục
bằng phân tích mã + test. Không sửa mã ứng dụng (KEEP IT). Nợ kỹ thuật TD-01…TD-08 đều
**có sẵn từ trước**, không phát sinh mới. Điểm duy nhất chưa phủ: **E2E click-through trên
trình duyệt thật** (TD-05 — không có harness, không thêm dependency), nên chưa đạt hạng A.

## 21. EDUICT — PHASE 2 REPORT (số liệu)

```
EDUICT — PHASE 2 REPORT
=======================
Tests:        35/35 PASS  (smoke 9 + backend 16 + parse 10)
Lint:         0 errors / 180 warnings   (baseline giữ nguyên)
Build:        PASS (exit 0)             (chỉ cảnh báo chunk-size TD-06 có sẵn)

Import Excel (kiểm chứng qua test)
  Sheets đọc:            toàn bộ workbook (đa sheet)        [T1, P1]
  Sheets bỏ qua:         HUONG_DAN / Template / mẫu         [P2, T15]
  Lớp tạo mới:           class_<ts>_<rand> + grade tự dò    [T1, T3]
  Lớp tái dùng:          theo classId (không tạo trùng)     [T2, P10]
  Học sinh tạo mới:      chèn qua prepared statement        [T1, T5]
  Trùng (dedup):         normName|normDob (DB + cùng sheet) [T4, P7]
  Cùng tên khác DOB:     KHÔNG coi là trùng                 [T5, P7]
  Lỗi validation:        giới tính lạ → rowsError           [T6, P5]
  Transaction:           BEGIN → COMMIT / ROLLBACK          [T10]
  SQL injection:         Excel = DATA (an toàn)             [T12]

BUG XXVIII (import #2/#3 không ghi):   ĐÃ KHẮC PHỤC   [T8, T9]
BUG XXIX  (list không refresh):        ĐÃ KHẮC PHỤC   [state, không reload]

Git:          sạch (không .env/sqlite/uploads/dist/log/secret)
Commit/Push:  KHÔNG (theo yêu cầu)
Mã ứng dụng:  KHÔNG sửa (KEEP IT) — chỉ thêm test + báo cáo

FINAL STATUS: B — READY WITH TECHNICAL DEBT
```



