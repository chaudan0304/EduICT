# BÁO CÁO GIAI ĐOẠN 3 — QUẢN LÝ GIÁO VIÊN + TỔ/TEAM + THỜI KHÓA BIỂU + PHÒNG MÁY

> Dự án: **EduICT / EduMaster** — Ứng dụng dạy Tin học Tiểu học
> Nhánh: `feature/new-idea` · Ngày: **2026-09-29** · Phương pháp: **AUDIT → IMPLEMENT → TEST → REGRESSION → REPORT → STOP**
> Model: Opus 4.8 (`JDW/claude-opus-4-8`)

---

## 1. Tóm tắt điều hành

Giai đoạn 3 bổ sung **hồ sơ giáo viên sửa được** và **thời khóa biểu (TKB) sửa được + lưu bền + phát hiện xung đột**, hiển thị **viết tắt môn học** an toàn. Toàn bộ dữ liệu mới lưu dưới dạng **JSON trong bảng `app_settings`** — **KHÔNG tạo bảng mới, KHÔNG đổi schema, KHÔNG đổi khóa chính**.

- ✅ Hồ sơ giáo viên: **1 GV duy nhất**, sửa được, lưu bền (`teacher_profile`), có trạng thái active/inactive.
- ✅ TKB: sửa được, lưu bền (`timetable_data`), **phát hiện xung đột 2 lớp** (client + server độc lập, defense-in-depth), hiển thị viết tắt môn + tooltip tên đầy đủ.
- ⏸️ **Tổ/Team: NGOÀI PHẠM VI** theo quyết định đã khóa → ghi **nợ kỹ thuật TD-09**.
- ✅ Phòng máy: **giữ nguyên**; máy hỏng vẫn **GLOBAL**; không có chỗ hiển thị môn nên viết tắt không áp dụng (N/A).

**Kết quả kiểm thử tổng:** 67/67 test PASS · Lint **0 lỗi / 174 cảnh báo** (giữ nguyên baseline) · Build **exit 0** · Baseline `npm test` **9/9 không đổi**.

---

## 2. Phạm vi đã khóa (từ quyết định trước)

| Hạng mục | Quyết định đã khóa | Trạng thái |
|---|---|---|
| Giáo viên | "Chỉ 1 GV, hồ sơ sửa được (không Team)" — 1 GV, hồ sơ sửa+lưu, JSON trong `app_settings`, active/inactive | ✅ Hoàn tất |
| Tổ/Team | NGOÀI PHẠM VI → ghi TD-09 | ⏸️ TD-09 |
| TKB | "Sửa được + lưu + phát hiện xung đột" + viết tắt môn (giữ tên đầy đủ + tooltip) | ✅ Hoàn tất |
| Phòng máy | Giữ nguyên; viết tắt môn (chỉ hiển thị) nếu có; máy hỏng GLOBAL | ✅ Giữ nguyên |

---

## 3. STEP 1 — AUDIT (Kiểm toán trước khi làm)

- `app_settings` (key-value) đã tồn tại và được dùng cho `classroom_rules` (mẫu `getDbRules`/`saveDbRules`) → **tái sử dụng** cho `teacher_profile` + `timetable_data`, không cần bảng mới.
- Facade `server/db.js` → `server/db/index.js` `export * from './settings.js'` → export mới ở `settings.js` dùng được ngay qua `../db.js`.
- Router `server/routes/index.js:51` gọi `tryHandleClasses(...)` cho **mọi** path `/api` (không chỉ `/api/classes`) → thêm nhánh `/api/teacher-profile` + `/api/timetable` vào `classes.js` là đủ để định tuyến.
- `src/utils/timetable.js` **không có import** → test thuần chạy trực tiếp bằng Node, không cần loader.
- Nguồn chân lý: SQLite qua `/api/classes` → `App.jsx` → `currentClass.students`; localStorage chỉ là cache/seed.

---

## 4. STEP 2 — BASELINE (trước khi sửa)

| Hạng mục | Baseline |
|---|---|
| `npm test` (smoke) | 9/9 PASS |
| Lint (oxlint 1.79) | 0 lỗi / ~174 cảnh báo (kiểu no-unused-vars & exhaustive-deps có sẵn) |
| Build (Vite/rolldown) | exit 0 (chỉ còn cảnh báo chunk > 500 kB — TD-06 có sẵn) |

---

## 5. STEP 3 — HỒ SƠ GIÁO VIÊN (1 GV, sửa được)

**Backend** (`server/db/settings.js`):
- `DEFAULT_TEACHER_PROFILE` = { name:'Nguyễn Văn Châu Đàn', shortName:'Châu Đàn', subject:'Tin học', role:'Giáo viên bộ môn', effectiveDate:'05/09/2026', schoolYear:'2026 - 2027', status:'active' }.
- `getDbTeacherProfile()` — đọc key `teacher_profile`; trả `{...DEFAULT, ...parsed}` hoặc mặc định; **không tự ghi khi đọc**.
- `saveDbTeacherProfile(profile)` — validate object (không mảng) + tên bắt buộc (trim, khác rỗng); chuẩn hóa `shortName` (rỗng→name), `subject/role/effectiveDate/schoolYear` (fallback mặc định), `status` (whitelist active/inactive); `INSERT OR REPLACE`; trả hồ sơ đã hợp nhất.

**API** (`server/routes/classes.js`): `/api/teacher-profile` — GET→200 hồ sơ; POST→200 `{success, profile}`; lỗi validate→400 `{error}` (dữ liệu người dùng).

**Client**: `storage.js` (`fetchTeacherProfileFromSqlite`/`saveTeacherProfileToSqlite`) → `App.jsx` nạp lúc khởi động → `setActiveTeacherInfo`; `TimetableModal` có **form sửa hồ sơ** (6 trường + select trạng thái), nút "Sửa Hồ Sơ Giáo Viên".

**Tổ/Team**: KHÔNG có bảng/UI Tổ → xem TD-09.

---

## 6. STEP 4 — TỔ / TEAM → NGOÀI PHẠM VI (TD-09)

Theo quyết định đã khóa "Chỉ 1 GV… (không Team)", chức năng Tổ/nhóm chuyên môn **không triển khai** ở Phase 3. Ghi **TD-09** (xem mục 15). Không tạo bảng, không thêm UI, không nợ ẩn.

---

## 7. STEP 5 — THỜI KHÓA BIỂU (sửa + lưu + phát hiện xung đột)

**Client thuần** (`src/utils/timetable.js`):
- Lớp active có thể ghi đè: `getActiveTeacherInfo/setActiveTeacherInfo`, `getActiveTimetable/getDefaultTimetable/setActiveTimetable` (chuẩn hóa qua `normalizeTimetableGrid`). `getCurrentPeriodStatus` đọc từ `getActiveTimetable()` → sửa TKB phản ánh trực tiếp lên banner "đang dạy".
- `SUBJECT_ABBREVIATIONS` + `abbreviateSubject` (Tin học→Tin, Công nghệ→CN, HĐTN, GDTC, Nhạc, MT; tên lạ → cắt an toàn ≤6 ký tự; giữ tên đầy đủ trong dữ liệu + tooltip).
- `flattenTimetable`, `normalizeTimetableGrid` (ngày 1–5 / sáng 1–4 / chiều 1–3), `detectTimetableConflicts` → `{type, severity, message}`: **SLOT_COLLISION** (error), **CLASS_SAME_DAY** (error), **CLASS_MULTI_DAY** (warning); `hasBlockingConflicts` = có bất kỳ `severity==='error'` → chặn lưu.

**Backend** (`server/db/settings.js`):
- `validateTimetableConflicts(grid)` — re-validate **độc lập** phía server (chỉ mức error: SLOT_COLLISION + CLASS_SAME_DAY).
- `getDbTimetable()` → grid đã lưu hoặc **null** (client fallback về TIMETABLE_DATA cứng — tránh nhân đôi dữ liệu mặc định lớn ở backend).
- `saveDbTimetable(grid)` — validate object; nếu có xung đột → **ném lỗi** `err.code='TIMETABLE_CONFLICT'` + `err.conflicts`; ngược lại `INSERT OR REPLACE`.

**API**: `/api/timetable` — GET→200 `{timetable}`; POST (nhận `body.timetable` hoặc `body`)→200 `{success}`; xung đột→**409** `{success:false, error, conflicts}`; lỗi khác→500.

**UI** (`TimetableModal.jsx`): chế độ sửa (`<select>` mỗi ô, viền đỏ ô xung đột), banner cảnh báo liệt kê lỗi/cảnh báo, nút "Lưu TKB" (khóa khi có lỗi chặn), "Khôi phục mặc định", "Hủy". Chế độ xem: ô hiển thị **viết tắt** + `title` tên đầy đủ, giữ tô xanh tiết hiện tại + cột "hôm nay".

---

## 8. STEP 6 — PHÒNG MÁY

- **Giữ nguyên** `SeatingChart.jsx` / `SeatingDisplayMode.jsx`; **máy hỏng vẫn GLOBAL**.
- Rà soát: phòng máy **không hiển thị tên môn học** → viết tắt môn (chỉ hiển thị) **không áp dụng (N/A)** ở đây; viết tắt chỉ dùng nơi thực sự render môn (TKB). Không sửa gì → không phát sinh rủi ro.

---

## 9. Kiến trúc lưu trữ

- Bảng **`app_settings` (key, value)** có sẵn — thêm 2 khóa: `teacher_profile`, `timetable_data` (giá trị JSON).
- **KHÔNG** bảng mới · **KHÔNG** đổi schema · **KHÔNG** đổi PK · **KHÔNG** migration framework.
- `INSERT OR REPLACE` idempotent; đọc bọc `try/catch JSON.parse`, từ chối mảng/không-object → fallback mặc định.

---

## 10. STEP 7 — TÍCH HỢP (Integration, HTTP end-to-end)

Kiểm thử `handleApiRequest` (router thật) với req/res mock trên **DB tạm** (`tests/phase3-timetable-http.test.js`, 6/6 PASS):

| Test | Kịch bản | Kết quả |
|---|---|---|
| H1 | GET `/api/teacher-profile` trống | 200 + hồ sơ mặc định |
| H2 | POST hồ sơ hợp lệ → GET lại | 200 `{success, profile}` + đọc lại đúng |
| H3 | POST tên rỗng | 400 `{error}` |
| H4 | GET `/api/timetable` trống | 200 `{timetable:null}` |
| H5 | POST `{timetable: grid}` hợp lệ → GET lại | 200 `{success}` + đọc lại đúng |
| H6 | POST grid xung đột (1 lớp 2 tiết/ngày) | **409** `{success:false, conflicts}` + KHÔNG ghi |

Xác nhận: định tuyến (index.js:51 → tryHandleClasses), mở gói `{timetable}`, ánh xạ status (200/400/409/500) và chặn ghi khi xung đột đều hoạt động đúng end-to-end.

> Ghi chú: khi teardown DB tạm, hai tác vụ nền PPTX (`backfill`/`reconcile`) in cảnh báo "database is not open" — **vô hại**, xảy ra do module server tự lên lịch tác vụ nền khi import; không ảnh hưởng kết quả test, không chạm DB thật. (Không phải lỗi Phase 3.)

---

## 11. STEP 8 — HỒI QUY PHASE 2

- `tests/phase2-import.test.js` + `tests/phase2-parse.test.js`: **26/26 PASS** (chạy kèm loader extensionless `--import ./tests/register-hooks.mjs`).
- **Không có hồi quy**. Lưu ý vận hành: `phase2-parse.test.js` gián tiếp import `excelImport.js` → `./vietnameseSort` (không đuôi) nên **phải chạy kèm loader**; chạy `node --test` trần sẽ báo `ERR_MODULE_NOT_FOUND` (đây là chi tiết chạy test có sẵn của Phase 2, **không** phải lỗi Phase 3).

---

## 12. STEP 9 — AN NINH

- **SQL tham số hóa 100%**: mọi truy vấn dùng `?` + `.get()/.run()`; không nội suy chuỗi người dùng vào SQL. Test TP5 xác nhận nháy đơn (`O'Brien`) & dấu tiếng Việt round-trip an toàn.
- **Dữ liệu là dữ liệu**: hồ sơ & grid lưu bằng `JSON.stringify`, đọc bằng `JSON.parse` trong `try/catch` (từ chối mảng/không-object). Không có đường thực thi mã.
- **Validate đầu vào**: tên GV bắt buộc; `status` whitelist; grid re-validate xung đột **phía server độc lập** với client (defense-in-depth).
- **Bề mặt xác thực**: 2 endpoint mới **kế thừa nguyên trạng thái không-auth cục bộ** của toàn bộ `/api` (giống `/api/classes`…) — không mở bề mặt auth mới, không nới rộng TD-02. Dữ liệu là cấu hình không nhạy cảm (hồ sơ 1 GV, lưới TKB), rủi ro thấp.

---

## 13. STEP 10 — HIỆU NĂNG

- Phát hiện xung đột: **O(số ô)** ≤ 5 ngày × 7 tiết = 35 ô, 2 lượt duyệt Map → không đáng kể.
- Blob JSON trong `app_settings` rất nhỏ (hồ sơ ~200 B, grid vài KB); đọc/ghi 1 dòng.
- Client: đồng hồ 1 giây **chỉ chạy khi modal mở** (`isOpen`); `cloneGrid` JSON trên lưới nhỏ. Không N+1, không vòng lặp nặng, không bão re-render.

---

## 14. STEP 11 — KẾT QUẢ KIỂM THỬ (tổng hợp)

| Bộ test | Số test | Kết quả |
|---|---|---|
| `smoke.test.js` (baseline `npm test`) | 9 | ✅ 9/9 |
| `phase2-import.test.js` | 16 | ✅ 16/16 |
| `phase2-parse.test.js` (kèm loader) | 10 | ✅ 10/10 |
| `phase3-teacher-timetable.test.js` (backend) | 11 | ✅ 11/11 |
| `phase3-timetable-utils.test.js` (client thuần) | 15 | ✅ 15/15 |
| `phase3-timetable-http.test.js` (tích hợp HTTP) | 6 | ✅ 6/6 |
| **TỔNG** | **67** | ✅ **67/67 PASS · 0 FAIL** |

- **Lint**: `0 lỗi / 174 cảnh báo` — **giữ nguyên baseline** (Phase 3 thêm 0 cảnh báo ròng; nhánh `catch (e) {}` mới theo đúng phong cách sẵn có của file).
- **Build**: `exit 0` (chỉ còn cảnh báo chunk-size TD-06 có sẵn).
- **Cô lập DB**: mọi test backend/tích hợp trỏ `EDUICT_APP_ROOT/DATA_DIR/DB_PATH` sang `os.tmpdir()` **trước** khi import server → **không chạm `edumaster.sqlite` thật**.

---

## 15. Sổ nợ kỹ thuật (Technical Debt Registry)

TD-01…TD-08 có từ trước (Phase 1/2) — **giữ nguyên**. Phase 3 thêm **TD-09**.

| ID | Mô tả | Vị trí | Mức | Trạng thái Phase 3 |
|---|---|---|---|---|
| TD-01 | localStorage vẫn là cache/seed song song SQLite | `src/…` | Thấp | Giữ nguyên |
| TD-02 | `POST /api/sql/import-script` không xác thực | `server/routes/backup.js` | Trung bình | Giữ nguyên (ngoài phạm vi) |
| TD-03 | Backup JSON thiếu `app_settings`/`school_years`/sessions | `server/db/backup.js` | Trung bình | Giữ nguyên |
| TD-04 | Backend không nhận M/F/Male/Female (client chuẩn hóa trước) | `server` | Thấp | Giữ nguyên |
| TD-05 | Không có E2E harness cho import UI | `tests` | Thấp | Giữ nguyên |
| TD-06 | Cảnh báo chunk-size khi build (>500 kB) | build rolldown | Thấp | Giữ nguyên |
| TD-07 | `StarExchangeModal.jsx` là dead code | `src/components` | Thấp | Giữ nguyên |
| TD-08 | Import lenient với ngày sinh không parse được | `src/utils` | Thấp | Giữ nguyên |
| **TD-09** | **Tổ/Team (nhóm chuyên môn) chưa triển khai** — theo quyết định "chỉ 1 GV, không Team". Nếu sau này cần nhiều GV/tổ trưởng: bổ sung bảng/khóa `teacher_*` trong `app_settings` hoặc bảng riêng (kèm quy trình đổi schema an toàn). | `server/db/settings.js` + UI | Thấp | **Ghi nợ (chủ ý, ngoài phạm vi)** |

- Cảnh báo nền PPTX "database is not open" khi teardown test tạm: **không nâng thành TD** — chỉ là hệ quả đóng DB tạm trong `after()`; không xảy ra ở runtime thật.

---

## 16. Kiểm toán Git

- `git status`: chỉ có **sửa mã Phase 3** + **file test/report mới**; **không** có `.env` / `*.sqlite` / `uploads/` / `dist/` / `*.log` / secret.
- File Phase 3 chạm: `server/db/settings.js`, `server/routes/classes.js`, `src/App.jsx`, `src/components/Navbar.jsx`, `src/components/ClassroomSession/TimetableModal.jsx`, `src/utils/storage.js`, `src/utils/timetable.js`.
- File mới: `docs/phase-3-teacher-team-timetable-report.md`, `tests/phase3-teacher-timetable.test.js`, `tests/phase3-timetable-utils.test.js`, `tests/phase3-timetable-http.test.js`.
- **KHÔNG** `git reset --hard` / `git clean -fd` / `git checkout -- .`. **KHÔNG commit, KHÔNG push** (theo yêu cầu). Không xóa thay đổi chưa commit sẵn có của người dùng.

---

## 17. Checklist nghiệm thu

- [x] Hồ sơ 1 GV sửa được + lưu bền + trạng thái active/inactive.
- [x] TKB sửa được + lưu bền + phát hiện xung đột (client chặn + server re-validate → 409).
- [x] Viết tắt môn (chỉ hiển thị) + giữ tên đầy đủ + tooltip.
- [x] Phòng máy giữ nguyên; máy hỏng GLOBAL.
- [x] Tổ/Team ghi TD-09 (không triển khai).
- [x] Không bảng mới / không đổi schema / không đổi PK.
- [x] SQL tham số hóa; validate đầu vào; dữ liệu là dữ liệu.
- [x] Test dùng DB tạm, không chạm DB thật.
- [x] 67/67 test PASS; `npm test` 9/9 không đổi; lint 0 lỗi/174 cảnh báo; build exit 0.
- [x] Không commit/push; không tự chuyển Phase 4.

---

## 18. Lệnh tái lập kiểm thử

```bash
# Baseline chính thức (không đổi)
npm test                                   # 9/9

# Phase 3 (chạy trần được — không import không-đuôi)
node --test tests/phase3-teacher-timetable.test.js      # 11/11
node --test tests/phase3-timetable-utils.test.js        # 15/15
node --test tests/phase3-timetable-http.test.js         # 6/6

# Hồi quy Phase 2 (CẦN loader vì excelImport → ./vietnameseSort)
node --import ./tests/register-hooks.mjs --test tests/phase2-import.test.js tests/phase2-parse.test.js   # 26/26

# Chất lượng
npm run lint     # 0 lỗi / 174 cảnh báo
npm run build    # exit 0
```

---

## 19. TRẠNG THÁI CUỐI CÙNG

> **KẾT LUẬN: A — HOÀN TẤT & XANH (green), sẵn sàng nghiệm thu.**

- **A (Hoàn tất & xanh):** Toàn bộ phạm vi đã khóa của Phase 3 (Giáo viên 1-GV sửa được + TKB sửa/lưu/xung đột + viết tắt + Phòng máy giữ nguyên) đã triển khai, kiểm thử (67/67), hồi quy sạch, lint/build đạt baseline. ✅ **← Trạng thái hiện tại**
- B (Hoàn tất có điều kiện): _không áp dụng_.
- C (Chưa đạt): _không áp dụng_.

**Việc CHƯA làm (chủ ý):** Tổ/Team (TD-09). **DỪNG tại đây** — không commit, không push, không tự chuyển sang Phase 4.



