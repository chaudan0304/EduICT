# TÀI LIỆU THIẾT KẾ GIAO DIỆN & ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG (UI/UX DESIGN BLUEPRINT)
## DỰ ÁN: EDUMASTER (EduICT) — NỀN TẢNG DẠY HỌC & QUẢN LÝ TIN HỌC TIỂU HỌC

> **MỤC TIÊU CỦA TÀI LIỆU NÀY**:
> Tài liệu này là **Bản Thiết Kế Chi Tiết Tuyệt Đối (1:1 UI/UX Blueprint)** của toàn bộ dự án EduMaster.
> Bất kỳ Trí tuệ Nhân tạo (AI) hoặc Lập trình viên nào khi đọc tài liệu này đều có thể tái tạo lại **chính xác 100%** toàn bộ giao diện, bố cục DOM, bảng màu, phông chữ, thành phần giao diện, hiệu ứng chuyển động và tương tác người dùng mà không cần mở mã nguồn gốc.

---

# MỤC LỤC
1. [Kiến Trúc Công Nghệ & Nền Tảng Giao Diện](#1-kiến-trúc-công-nghệ--nền-tảng-giao-diện)
2. [Hệ Thống Design Tokens & CSS Variables Chuẩn](#2-hệ-thống-design-tokens--css-variables-chuẩn)
3. [Khung Bố Cục Toàn Cục (App Shell Architecture)](#3-khung-bố-cục-toàn-cục-app-shell-architecture)
4. [Đặc Tả Chi Tiết Thanh Điều Hướng (Navbar)](#4-đặc-tả-chi-tiết-thanh-điều-hướng-navbar)
5. [Đặc Tả Chi Tiết Thanh Bên (Sidebar)](#5-đặc-tả-chi-tiết-thanh-bên-sidebar)
6. [Đặc Tả 10 Phân Hệ Màn Hình Chính (Main Views)](#6-đặc-tả-10-phân-hệ-màn-hình-chính-main-views)
   - 6.1. [Trang Chủ (HomeDashboard)](#61-trang-chủ-homedashboard)
   - 6.2. [Trung Tâm Tiết Học (SessionDashboard)](#62-trung-tâm-tiết-học-sessiondashboard)
   - 6.3. [Bài Học & Trình Chiếu (LessonLibrary & PresentationView)](#63-bài-học--trình-chiếu-lessonlibrary--presentationview)
   - 6.4. [Đố Vui Nhanh (QuickQuizManager & QuizPlayer)](#64-đố-vui-nhanh-quickquizmanager--quizplayer)
   - 6.5. [Sơ Đồ Phòng Máy Thực Hành (SeatingChart & SeatingDisplayMode)](#65-sơ-đồ-phòng-máy-thực-hành-seatingchart--seatingdisplaymode)
   - 6.6. [Sổ Điểm & Đánh Giá Kỹ Năng (Gradebook)](#66-sổ-điểm--đánh-giá-kỹ-năng-gradebook)
   - 6.7. [Bảng Điểm Tốt, Nội Quy & Cửa Hàng (GoodScoresBoard & RewardShop)](#67-bảng-điểm-tốt-nội-quy--cửa-hàng-goodscoresboard--rewardshop)
   - 6.8. [Trò Chơi Đua Vịt (DuckRace)](#68-trò-chơi-đua-vịt-duckrace)
   - 6.9. [Vòng Quay May Mắn (LuckyWheel)](#69-vòng-quay-may-mắn-luckywheel)
   - 6.10. [Đồng Hồ Đếm Giờ Lớp Học (ClassroomTimer)](#610-đồng-hồ-đếm-giờ-lớp-học-classroomtimer)
7. [Đặc Tả Toàn Bộ Các Cửa Sổ Hộp Thoại (Modals & Drawers)](#7-đặc-tả-toàn-bộ-các-cửa-sổ-hộp-thoại-modals--drawers)
8. [Hệ Thống Phản Hồi Âm Thanh & Hiệu Ứng Trực Quan](#8-hệ-thống-phản-hồi-âm-thanh--hiệu-ứng-trực-quan)
9. [Chế Độ Máy Chiếu Đặc Biệt (Projector Mode)](#9-chế-độ-máy-chiếu-đặc-biệt-projector-mode)
10. [Quy Chuẩn Viết Code Giao Diện (Component Catalog & CSS Checklist)](#10-quy-chuẩn-viết-code-giao-diện-component-catalog--css-checklist)

---

# 1. KIẾN TRÚC CÔNG NGHỆ & NỀN TẢNG GIAO DIỆN

- **Framework cốt lõi**: `React 19.x` (sử dụng Functional Components, React Hooks: `useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`, `React.lazy`, `Suspense`, `createPortal`).
- **Thư viện biểu tượng**: `lucide-react` (tất cả icon có `strokeWidth: 2`, kích thước chuẩn từ `14px` đến `24px`).
- **Phông chữ đóng gói ngoại tuyến**: 
  - `@fontsource/outfit`: Dành cho các tiêu đề (Heading), chữ số lớn, bảng xếp hạng.
  - `@fontsource/plus-jakarta-sans`: Dành cho nội dung văn bản (Body), danh sách học sinh, bảng điểm, thông số kỹ thuật.
  - Cả 2 phông chữ được import trực tiếp trong `main.jsx` từ file tĩnh local, không kết nối internet Google Fonts.
- **Phong cách tạo kiểu (Styling Pattern)**:
  - Hệ thống biến toàn cục CSS (`CSS Custom Properties`) trong `src/index.css`.
  - Kết hợp linh hoạt giữa các class tiện ích chuẩn (`glass-panel`, `btn`, `badge`, `data-table`) và Inline Styles để điều khiển trạng thái động chính xác đến từng pixel (`style={{ ... }}`).
- **Hiệu ứng đồ họa phụ trợ**:
  - `canvas-confetti`: Bắn pháo hoa ăn mừng khi trao thưởng / vịt về đích.
  - HTML5 Canvas 2D API: Vẽ đường đua vịt dòng sông và vẽ vòng quay may mắn bánh xe nhiều nan.

---

# 2. HỆ THỐNG DESIGN TOKENS & CSS VARIABLES CHUẨN

Toàn bộ giao diện được điều phối qua tập CSS Variables được định nghĩa tại `:root`, `[data-theme='dark']` và `[data-projector='true']` trong `src/index.css`.

### 2.1. Tokens Màu Sắc & Ngữ Nghĩa (Color Tokens)

```css
:root {
  /* Phông chữ */
  --font-primary: 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  
  /* Màu chủ đạo (Brand Primary) */
  --primary: #4f46e5;                 /* Indigo 600 - Nút chính, viền active, tab đang chọn */
  --primary-hover: #4338ca;           /* Indigo 700 - Hover nút chính */
  --primary-light: #eef2ff;           /* Indigo 50 - Nền thẻ đang chọn, viền sáng */
  --primary-glow: rgba(79, 70, 229, 0.25); /* Bóng phát sáng nút bấm */

  /* Màu thứ cấp (Secondary) */
  --secondary: #0ea5e9;               /* Sky 500 - Phòng máy tính, thiết bị */

  /* Màu điểm nhấn & Sao thi đua (Accent / Gamification) */
  --accent: #f59e0b;                  /* Amber 500 - Sao thưởng ⭐, Cúp vinh danh 🏆 */
  --accent-glow: rgba(245, 158, 11, 0.3);  /* Bóng phát sáng sao */

  /* Màu trạng thái chức năng (Status Colors) */
  --success: #10b981;                 /* Emerald 500 - Đang dạy, hoàn thành, có mặt */
  --success-bg: #ecfdf5;              /* Nền nhãn Tốt / Đạt */
  --warning: #f59e0b;                 /* Amber 500 - Cảnh báo, còn 5 phút, Cần cố gắng */
  --warning-bg: #fffbeb;
  --danger: #ef4444;                  /* Rose 500 - Báo máy hỏng ⚠️, trừ điểm, Chưa hoàn thành */
  --danger-bg: #fef2f2;
  --purple: #8b5cf6;                  /* Purple 500 - Bài giảng & Slide GDPT 2018 */
  --pink: #ec4899;                    /* Pink 500 - Đố vui Quick Quiz, Đua vịt */

  /* Bảng màu trung tính Chế độ Sáng (Light Mode Default) */
  --bg-main: #f8fafc;                 /* Nền màn hình chính */
  --bg-mesh: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
             radial-gradient(at 100% 0%, rgba(14, 165, 233, 0.08) 0px, transparent 50%),
             radial-gradient(at 50% 100%, rgba(245, 158, 11, 0.06) 0px, transparent 50%);
  --surface: #ffffff;                 /* Bề mặt trắng tinh của các modal, input */
  --surface-secondary: #f1f5f9;       /* Nền tiêu đề bảng, thanh xám nhạt */
  --surface-border: #e2e8f0;          /* Đường viền thẻ mặc định */
  --surface-card: rgba(255, 255, 255, 0.95); /* Thẻ kính mờ Glassmorphism */
  
  --text-main: #0f172a;               /* Chữ đen tuyền sắc nét (Slate 900) */
  --text-muted: #64748b;              /* Chữ chú thích, nhãn phụ (Slate 500) */
  --text-dim: #94a3b8;                /* Chữ mờ, thanh cuộn */

  /* Đổ bóng (Shadows) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Bán kính bo góc (Border Radius) */
  --radius-sm: 8px;                   /* Ô nhập điểm, ô số máy */
  --radius-md: 12px;                  /* Nút bấm, thẻ học sinh */
  --radius-lg: 16px;                  /* Panel màn hình, cửa sổ Modal */
  --radius-full: 9999px;              /* Huy hiệu tròn, nút icon tròn */

  /* Tốc độ chuyển động (Transitions) */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2.2. Chế độ Tối (Dark Mode: `[data-theme='dark']`)
```css
[data-theme='dark'] {
  --bg-main: #0b0f19;
  --bg-mesh: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
             radial-gradient(at 100% 0%, rgba(14, 165, 233, 0.12) 0px, transparent 50%),
             radial-gradient(at 50% 100%, rgba(245, 158, 11, 0.1) 0px, transparent 50%);
  --surface: #131b2e;
  --surface-secondary: #1e293b;
  --surface-border: #2e3c54;
  --surface-card: rgba(19, 27, 46, 0.95);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --primary-light: #1e2540;
  --shadow-md: 0 4px 10px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 30px rgba(0, 0, 0, 0.6);
}
```

### 2.3. Chế độ Máy Chiếu Tương Phản Cực Hạn (Projector Mode: `[data-projector='true']`)
Khi người dùng bấm nút `Projector Mode` trên Navbar, thẻ `<body>` hoặc `<html>` nhận thuộc tính `data-projector="true"`. Toàn bộ giao diện chuyển sang tương phản cực hạn:
```css
[data-projector='true'] {
  font-size: 18px !important;
  --bg-main: #f1f5f9 !important;
  --surface-card: #ffffff !important;
  --surface-border: #94a3b8 !important; /* Viền xám đậm 2px rõ nét */
  --text-main: #000000 !important;       /* Đen 100% không bóng mờ */
  --text-muted: #334155 !important;      /* Chữ phụ cũng phải sẫm màu */
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

---

# 3. KHUNG BỐ CỤC TOÀN CỤC (APP SHELL ARCHITECTURE)

Khung giao diện của EduMaster được chia thành 3 phần cố định:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. NAVBAR (Header Cố Định - Cao 58px - Z-Index 100)                                                         │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. SIDEBAR        │ 3. MAIN WORKSPACE (Không Gian Làm Việc Chính)                                           │
│ (Thanh Bên)       │ Container: max-width 1440px, margin: 0 auto, padding: 1.25rem 1.5rem 3rem               │
│                   │                                                                                         │
│ Thu gọn: 70px     │ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ Mở rộng: 240px    │ │ BANNER TRẠNG THÁI TIẾT HỌC HOẶC THÔNG TIN LỚP HỌC                                   │ │
│                   │ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│ Sticky 100vh      │ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ Z-Index 90        │ │ NỘI DUNG VIEW HIỆN TẠI (Tải lười React.lazy + Suspense Fallback Loader)              │ │
│                   │ │                                                                                     │ │
│                   │ │                                                                                     │ │
│                   │ └─────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Root Element (`#root`)**:
  `display: flex; flex-direction: column; min-height: 100vh; width: 100%;`
- **Thân trang (`app-layout-body`)**:
  `display: flex; flex-direction: row; min-height: calc(100vh - 58px); width: 100%;`
- **Vùng nội dung chính (`main.app-content`)**:
  `flex: 1; min-width: 0; overflow-y: auto; background-color: var(--bg-main); background-image: var(--bg-mesh);`

---

# 4. ĐẶC TẢ CHI TIẾT THANH ĐIỀU HƯỚNG (NAVBAR)

Thanh Navbar nằm ở vị trí đỉnh trang, chiều cao chính xác `58px`, `border-bottom: 1px solid var(--surface-border)`, `background: var(--surface-card)`, `backdrop-filter: blur(12px)`.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🎓 EduMaster] [📅 2026-2027 ▼] [🏫 Khối 3 ▼] [👥 Lớp 3A1 (32 HS) ▼] ─ [⏱️ Tiết 2] ─ [🖥️ Chiếu] [🔊] [⚙️] [💾] [🟢]│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Nhóm 1: Logo Thương Hiệu (Brand Identity) - Góc Trái
- **Icon**: `GraduationCap` (màu `#4f46e5`, size `24px`).
- **Tên phần mềm**: `EduMaster` (`font-family: Outfit; font-weight: 800; font-size: 1.25rem; color: var(--text-main)`).
- **Huy hiệu phụ**: `DESKTOP` (`font-size: 0.65rem; font-weight: 700; padding: 2px 6px; background: #eef2ff; color: #4f46e5; border-radius: 9999px`).

### 4.2. Nhóm 2: Năm Học (Academic School Year Selector)
- **Nút bấm hiển thị**: Icon `Calendar` + Tên năm học (VD: `2026 - 2027`) + Icon `ChevronDown`.
- **Menu thả xuống (Dropdown)**:
  - Danh sách năm học có trong hệ thống (`2025 - 2026`, `2026 - 2027`).
  - Dòng ngăn cách (Divider).
  - Lựa chọn: `+ Chuyển giao năm học mới (Lên lớp tự động)` ➔ Mở `SchoolYearTransitionModal`.
  - Lựa chọn: `⚙️ Cấu hình ngày khai giảng` ➔ Mở `AcademicYearSettingsModal`.

### 4.3. Nhóm 3: Bộ Chọn Lớp Học Nhanh (Class Selector)
- **Lọc theo khối**: Gồm 6 tab thuốc con: `Tất cả`, `Khối 1`, `Khối 2`, `Khối 3`, `Khối 4`, `Khối 5`.
- **Dropdown chọn lớp**:
  - Tên lớp (VD: `Lớp 3A1`).
  - Huy hiệu sĩ số (VD: `32 học sinh`).
  - Chữ hiển thị môn học: `Môn Tin học`.
  - Nút thêm nhanh: `+ Thêm Lớp Mới` (mở modal tạo lớp).
  - Nút nhập Excel: `📥 Nhập Danh Sách Excel` (mở `ImportExcelModal`).

### 4.4. Nhóm 4: Huy Hiệu Trạng Thái Tiết Dạy Thời Gian Thực (Live Timetable Status)
- Tự động lấy giờ hệ thống máy tính để tính toán:
  - Nếu trong giờ học: Hiện huy hiệu xanh lá `● Tiết 2 (08:15 - 08:50) • Còn 15p`.
  - Nhấp vào huy hiệu: Mở `TimetableModal` xem thời khóa biểu cả tuần của giáo viên.

### 4.5. Nhóm 5: Cụm Nút Điều Khiển Môi Trường (Góc Phải)
1. **Nút Chế Độ Máy Chiếu (`Projector Mode`)**:
   - Icon `Monitor` / `Tv`.
   - Trạng thái BẬT: Nền vàng cam `#f59e0b`, chữ trắng, viền sáng phát quang.
   - Trạng thái TẮT: Nền xám nhạt `btn-outline`.
2. **Nút Bật/Tắt Âm Thanh (`Sound Toggle`)**:
   - Icon `Volume2` (khi bật - xanh lá) hoặc `VolumeX` (khi tắt - xám/đỏ).
3. **Nút Quản Lý CSDL & Sao Lưu (`Backup & Restore`)**:
   - Icon `HardDrive` hoặc `Database`. Nhấp vào mở hộp thoại tải file `.sqlite` hoặc xuất bản snapshot.
4. **Đèn Báo CSDL Nội Bộ (`Database Status Pill`)**:
   - Huy hiệu bo tròn: Chấm tròn xanh lục `●` nhấp nháy + Chữ `SQLite Local` (khẳng định 100% dữ liệu nằm trong máy tính, không sợ mất mạng).
5. **Nút Menu Mở Rộng (`... MoreVertical`)**:
   - Xuất dữ liệu cả trường ra Excel.
   - Trợ lý AI Gemini (`AiAssistantModal`).
   - Giới thiệu phiên bản phần mềm.

---

# 5. ĐẶC TẢ CHI TIẾT THANH BÊN (SIDEBAR)

Thanh Sidebar nằm cố định bên trái màn hình (`position: sticky; top: 0; height: 100vh`), chiều rộng linh hoạt:
- **Trạng thái Mở Rộng**: Chiều rộng `240px` (`min-width: 240px`).
- **Trạng thái Thu Gọn**: Chiều rộng `70px` (`min-width: 70px`).
- Hiệu ứng thu mở: `transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1)`.

```
┌─────────────────────────┐  ┌───────┐
│ ĐIỀU HƯỚNG         [ ◀ ]│  │ [ ▶ ] │ (Thu gọn)
├─────────────────────────┤  ├───────┤
│ 🏠 Trang Chủ            │  │  🏠   │
│ 🎯 Tiết Học    [ĐANG DẠY]│ │  🎯   │ (Pulsing Green)
│ 📚 Bài Học & Slide      │  │  📚   │
│ ⚡ Quick Quiz (Đố Vui)  │  │  ⚡   │
│ 🖥️ Phòng Máy (31 Máy)   │  │  🖥️   │
│ 📋 Sổ Điểm (TT27)       │  │  📋   │
│ ⭐ Điểm Tốt & Nội Quy   │  │  ⭐   │
│ 🦆 Đua Vịt              │  │  🦆   │
│ 🎡 Vòng Quay May Mắn    │  │  🎡   │
│ ⏱️ Đếm Giờ Lớp Học      │  │  ⏱️   │
├─────────────────────────┤  ├───────┤
│ [Phiên bản v1.0.0]      │  │ v1.0  │
└─────────────────────────┘  └───────┘
```

### Bảng Danh Mục 10 Tab Điều Hướng (NavTabs Data Contract)
| Tab ID | Tên hiển thị (Label) | Icon Lucide | Emoji | Huy hiệu đặc biệt (Badge) | Màu sắc Tab khi Active |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `home` | **Trang Chủ** | `<Home size={19} />` | 🏠 | - | Nền `--primary-light`, chữ `--primary` |
| `sessions` | **Tiết Học (Session)** | `<Target size={19} />` | 🎯 | `ĐANG DẠY` (nếu có tiết chạy) hoặc `CHÍNH` | Xanh ngọc lục bảo `#10b981` (khi chạy) |
| `lessons` | **Bài Học & Slide** | `<BookOpen size={19} />` | 📚 | `GDPT 2018` | Tím Indigo `#8b5cf6` |
| `quiz` | **Quick Quiz (Đố Vui)** | `<Zap size={19} />` | ⚡ | `MỚI` | Hồng Neon `#ec4899` |
| `seating` | **Phòng Máy (31 Máy)** | `<Monitor size={19} />` | 🖥️ | `31 MÁY` | Xanh da trời `#0ea5e9` |
| `gradebook`| **Sổ Điểm (TT27)** *(Khối 3-5)*<br>**Sổ Kỹ Năng & Sao** *(Khối 1-2)* | `<ClipboardList size={19} />` | 📋 | `TT 27` / `KỸ NĂNG` | Xanh lục `#059669` |
| `goodscores`| **Điểm Tốt & Nội Quy** | `<Star size={19} />` | ⭐ | `SAO ⭐` | Vàng cam hổ phách `#f59e0b` |
| `duckrace` | **Đua Vịt** | SVG Chú Vịt Vàng | 🦆 | `MINI GAME` | Cam tươi `#f97316` |
| `luckywheel`| **Vòng Quay** | SVG Bánh Xe Quay | 🎡 | `MAY MẮN` | Đỏ hồng `#e11d48` |
| `timer` | **Đếm Giờ** | `<Clock size={19} />` | ⏱️ | - | Xanh lơ `#06b6d4` |

---

# 6. ĐẶC TẢ 10 PHÂN HỆ MÀN HÌNH CHÍNH (MAIN VIEWS)

---

## 6.1. TRANG CHỦ (HomeDashboard)

Màn hình chào mừng và tổng quan toàn diện tình hình dạy học của giáo viên:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ TIẾT DẠY ĐANG DIỄN RA: LỚP 3A1 • BÀI 3: CHUỘT MÁY TÍNH (Còn 18 phút)            [ ▶ TIẾP TỤC TIẾT DẠY ]  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ 🏫 TỔNG SỐ LỚP    │ │ 👥 TỔNG HỌC SINH  │ │ 👶 KHỐI 1 & KHỐI 2│ │ 🧑‍💻 KHỐI 3, 4 & 5  │ │ ⭐ SAO THI ĐUA    │
│      18 Lớp       │ │   580 Học Sinh    │ │  8 Lớp (Kỹ năng)  │ │  10 Lớp (Điểm TT27)│ │   8,420 Ngôi Sao  │
│ 5 Khối học        │ │ Nam: 310 • Nữ: 270│ │ Đánh giá định tính│ │ Điểm số 1 - 10     │ │ Toàn trường       │
└───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘

┌───────────────────────────────────────────────────┐ ┌───────────────────────────────────────────────────┐
│ 🎯 TRUNG TÂM TIẾT HỌC (CLASSROOM SESSION)         │ │ 📚 THƯ VIỆN BÀI HỌC & SLIDE (LESSON LIBRARY)      │
│ Quản lý tiến trình 35p, bấm giờ, thưởng sao 1-chạm│ │ Ngân hàng bài giảng GDPT 2018, mở PowerPoint gốc. │
│ [Vào Trung Tâm Tiết Học ➔]                        │ │ [Xem Thư Viện Bài Học ➔]                          │
└───────────────────────────────────────────────────┘ └───────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────┐ ┌───────────────────────────────────────────────────┐
│ ⚡ QUICK QUIZ (ĐỐ VUI MÁY CHIẾU)                  │ │ 🖥️ PHÒNG MÁY THỰC HÀNH (31 MÁY TÍNH)              │
│ Trắc nghiệm giơ thẻ A/B/C/D không cần điện thoại. │ │ Sơ đồ 5 dãy bàn, xếp chỗ ngồi đôi, báo máy hỏng.   │
│ [Vào Quick Quiz ➔]                                │ │ [Xem Sơ Đồ Phòng Máy ➔]                           │
└───────────────────────────────────────────────────┘ └───────────────────────────────────────────────────┘
```

### Cấu Trúc DOM Chi Tiết:
1. **Banner Tiết Học Đang Diễn Ra (Ongoing Session Alert)**:
   - Hiển thị nếu `ongoingSession !== null` và trạng thái là `RUNNING` hoặc `PAUSED`.
   - Nền: `rgba(16, 185, 129, 0.12)`, đường viền `2px solid #10b981`, bóng đổ xanh lá.
   - Nút `▶ TIẾP TỤC TIẾT DẠY`: Nền gradient xanh lá, hiệu ứng nhấp nháy phát sáng.
2. **Hàng 5 Thẻ Thống Kê Toàn Trường (Stats Strip)**:
   - Bố cục lưới 5 cột (`grid-template-columns: repeat(5, 1fr)`), khoảng cách `16px`.
   - Mỗi thẻ là một `glass-panel` có icon đầu thẻ, số liệu cực lớn (`font-size: 1.75rem; font-weight: 800`).
3. **Lưới Thẻ Chức Năng 10 Phân Hệ (Features Grid)**:
   - Bố cục 2 cột lớn (`grid-template-columns: repeat(2, 1fr)`), khoảng cách `20px`.
   - Mỗi thẻ có màu viền và màu nền gradient nhạt 8% đặc trưng.

---

## 6.2. TRUNG TÂM TIẾT HỌC (SessionDashboard)

Trang điều khiển trực tiếp trên bục giảng trong suốt 35 phút của một tiết học:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LỚP 3A1 • BÀI 4: BÀN PHÍM MÁY TÍNH                         [Tiết 2: 08:15 - 08:50] [Đồng bộ TKB: BẬT]       │
│ ⏱️ 26:30 / 35:00  [ ▶ Chạy / ⏸️ Tạm Dừng ]  [ +5 Phút ]  [ 🔔 Rung Chuông ]  [ ⭐ Cả Lớp +1 ]  [ ⏹️ Kết Thúc ] │
├─────────────────────────────────────────┬───────────────────────────────────────────────────────────────────┤
│ TIẾN TRÌNH TIẾT HỌC (LESSON FLOW)       │ LƯỚI TƯƠNG TÁC HỌC SINH (STUDENT PARTICIPATION GRID - 32 HS)      │
│                                         │                                                                   │
│ [✓] 1. Khởi động (5 phút)               │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────┐ │
│     • Hát múa bài hát Bàn phím vui nhộn │ │ MÁY 01: AN    │ │ MÁY 01: BÌNH  │ │ MÁY 02: CHI   │ │ MÁY 02: │ │
│                                         │ │ ⭐⭐⭐⭐ (4 sao)│ │ ⭐⭐ (2 sao)  │ │ ⭐⭐⭐ (3 sao) │ │ DŨNG    │ │
│ [◉] 2. Khám phá (12 phút)  [ĐANG CHẠY]  │ │ [  +1 SAO ⭐ ]│ │ [  +1 SAO ⭐ ]│ │ [  +1 SAO ⭐ ]│ │ [ +1 ⭐]│ │
│     • Nhận biết khu vực phím cơ sở      │ └───────────────┘ └───────────────┘ └───────────────┘ └─────────┘ │
│                                         │ (Nhấp chuột trái: Thưởng +1 sao tức thì; Nhấp phải: Chọn nội quy) │
│ [ ] 3. Luyện tập thực hành (13 phút)    │                                                                   │
│     • Tập gõ 10 ngón hàng cơ sở Wordpad │ ┌───────────────────────────────────────────────────────────────┐ │
│                                         │ │ THANH TIỆN ÍCH TRONG TIẾT DẠY (QUICK TOOLS BAR)               │ │
│ [ ] 4. Vận dụng & Đánh giá (5 phút)     │ │ [🎡 Gọi Ngẫu Nhiên] [🦆 Đua Vịt] [⚡ Đố Vui] [🖥️ Mở Bài Chiếu]│ │
│     • Trò chơi Đố vui củng cố kiến thức │ └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

### Quy Chuẩn Các Thành Phần:
1. **SessionHeader & SessionTimerDisplay**:
   - Chữ số đồng hồ đếm ngược kích thước `42px`, `font-family: Outfit`, `font-weight: 800`.
   - Nút `+5 Phút`: Thêm ngay 5 phút vào đồng hồ mà không cần vào cài đặt.
   - Nút `🔔 Rung Chuông`: Phát chuông bính boong trường học thu hút trật tự cả lớp.
   - Nút `⭐ Cả Lớp +1`: Cộng đồng loạt 1 sao cho tất cả học sinh có mặt hôm nay.
2. **LessonFlowList (Tiến trình bài học)**:
   - Danh sách 4 bước hoạt động theo chuẩn sư phạm Bộ GD&ĐT.
   - Bước đang chạy có viền xanh dương đậm, nhãn `[ĐANG CHẠY]` và có đồng hồ đếm lùi riêng của hoạt động đó.
3. **StudentParticipationGrid (Lưới học sinh)**:
   - Các ô thẻ học sinh xếp dạng lưới `repeat(auto-fill, minmax(130px, 1fr))`.
   - Mỗi ô hiển thị: Số máy thực hành + Tên học sinh + Số sao hiện tại.
   - Nhấn chuột trái: Gọi API `changeStars` cộng 1 sao tức thì, phát âm thanh `playStarDing()`.
   - Thẻ hiển thị số lần phát biểu trong tiết học.

---

## 6.3. BÀI HỌC & TRÌNH CHIẾU (LessonLibrary & PresentationView)

### A. Thư Viện Bài Giảng (LessonLibrary)
- **Thanh lọc đa chiều**: Lọc theo Khối lớp (Khối 3, 4, 5); lọc theo Chủ đề GDPT 2018 (Chủ đề A: Máy tính và em, Chủ đề B: Mạng máy tính và Internet, Chủ đề C: Tổ chức lưu trữ tìm kiếm, Chủ đề D: Đạo đức pháp luật văn hóa, Chủ đề E: Ứng dụng tin học, Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính).
- **Thẻ bài giảng (Lesson Card)**:
  - Khung ảnh xem trước tỉ lệ 16:9 (`slide-preview-container`). Di chuột vào ảnh sẽ phóng to nhẹ (`scale(1.03)`).
  - Tiêu đề bài học in đậm, số lượng slide (VD: `14 slide`).
  - Nút **[🖥️ Trình Chiếu Web]**: Mở giao diện trình chiếu toàn màn hình trên nền tảng web.
  - Nút **[📽️ Mở PowerPoint Gốc]** *(Desktop Native)*: Nút độc quyền gọi Microsoft PowerPoint bản quyền mở file `original.pptx`.

### B. Trình Chiếu Web Slide (PresentationView)
- Khung trình chiếu cố định tỉ lệ 16:9, tự động phóng to toàn màn hình.
- **7 Mẫu Slide Đa Dạng**:
  1. `title`: Slide tiêu đề bài học lớn.
  2. `concept`: Khám phá khái niệm (ảnh bên trái, định nghĩa bên phải).
  3. `two-column`: So sánh 2 cột đối chiếu (Đúng / Sai hoặc Bàn phím / Chuột).
  4. `question`: Câu hỏi tương tác chọn đáp án.
  5. `practice`: Nhiệm vụ thực hành từng bước.
  6. `summary`: Ghi nhớ cuối bài.
  7. `game`: Trò chơi khởi động.
- **Thanh điều khiển nổi dưới đáy (Floating Presentation Toolbar)**:
  `[◀ Slide Trước]  [ 3 / 14 ]  [Slide Tiếp ▶]  [📝 Ghi chú GV]  [🖥️ Projector Mode]  [⛶ Toàn Màn Hình]`
- **Ngăn ghi chú giáo viên (Teacher Notes Drawer)**: Trượt từ mép phải ra, hiển thị các lưu ý sư phạm và lời thoại gợi ý của giáo viên.

---

## 6.4. ĐỐ VUI NHANH (QuickQuizManager & QuizPlayer)

Màn hình tổ chức kiểm tra trắc nghiệm tương tác cho học sinh tiểu học:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BÀI 3: CHUỘT MÁY TÍNH • CÂU HỎI 2 / 5                             [⏱️ 12 GIÂY] [🔔] [⛶ Toàn Màn Hình]      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│             NÚT NÀO TRÊN CHUỘT MÁY TÍNH DÙNG ĐỂ CUỘN TRANG LÊN VÀ XUỐNG?                                    │
│                                                                                                             │
│    ┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐            │
│    │  A. Nút chuột trái                        │   │  B. Nút cuộn (Con lăn chuột)     [✓ ĐÚNG] │            │
│    │  [Nền Đỏ Nhạt - Viền Đỏ #ef4444]          │   │  [Nền Xanh Lam - Viền Lam #0284c7]        │            │
│    └───────────────────────────────────────────┘   └───────────────────────────────────────────┘            │
│    ┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐            │
│    │  C. Nút chuột phải                        │   │  D. Thân chuột                            │            │
│    │  [Nền Vàng Nhạt - Viền Vàng #f59e0b]      │   │  [Nền Xanh Lục - Viền Lục #10b981]        │            │
│    └───────────────────────────────────────────┘   └───────────────────────────────────────────┘            │
│                                                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [👁️ CÔNG BỐ ĐÁP ÁN]   [📊 Thống Kê Giơ Thẻ: A: 2  B: 28  C: 1  D: 1]   [⭐ CỘNG SAO CHO CÁC BẠN ĐÚNG]      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Màu sắc 4 đáp án**:
  - Đáp án A: Viền Đỏ `#ef4444`, Nền hồng phấn `#fef2f2`.
  - Đáp án B: Viền Xanh dương `#0284c7`, Nền xanh nhạt `#f0f9ff`.
  - Đáp án C: Viền Vàng hổ phách `#f59e0b`, Nền vàng nhạt `#fffbeb`.
  - Đáp án D: Viền Xanh lục `#10b981`, Nền xanh lá nhạt `#f0fdf4`.
- **Cỡ chữ câu hỏi**: `28px - 34px`, đảm bảo học sinh ngồi cuối lớp nhìn rõ 100%.

---

## 6.5. SƠ ĐỒ PHÒNG MÁY THỰC HÀNH (SeatingChart & SeatingDisplayMode)

Mô phỏng sơ đồ vật lý 31 máy tính phòng thực hành của nhà trường:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SƠ ĐỒ PHÒNG MÁY TIN HỌC (31 MÁY)         [Bàn GV: Bên Phải ▼] [Góc Nhìn: Giáo Viên ▼] [🖥️ Chiếu Sơ Đồ]     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                            ┌─────────────────────────────────┐              │
│                                                            │   🖥️ BÀN GIÁO VIÊN & MÁY CHỦ     │              │
│                                                            └─────────────────────────────────┘              │
│                                                                                                             │
│   DÃY 1 (Máy 01 - 06)     DÃY 2 (Máy 07 - 12)     DÃY 3 (Máy 13 - 18)     DÃY 4 (Máy 19 - 24)               │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐              │
│  │ MÁY 01            │   │ MÁY 07            │   │ MÁY 13            │   │ MÁY 19 [⚠️ HỎNG]  │              │
│  │ 👤 Nguyễn Văn An  │   │ 👤 Trần Mai Hoa   │   │ 👤 Lê Hoàng Nam   │   │ (Máy hỏng nguồn)  │              │
│  │ 👤 Lê Thu Hà      │   │ 👤 Vũ Quốc Bảo    │   │ (Trống 1 chỗ)     │   │ [Không cho xếp]   │              │
│  │ [ ⭐ Thưởng Sao ] │   │ [ ⭐ Thưởng Sao ] │   │ [ ⭐ Thưởng Sao ] │   │ [Bỏ Báo Hỏng]     │              │
│  └───────────────────┘   └───────────────────┘   └───────────────────┘   └───────────────────┘              │
│                                                                                                             │
│                             DÃY 5 (DÃY CUỐI CÙNG: Máy 25 đến Máy 31)                                        │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐              │
│  │ MÁY 25            │   │ MÁY 26            │   │ MÁY 27            │   │ MÁY 31            │              │
│  └───────────────────┘   └───────────────────┘   └───────────────────┘   └───────────────────┘              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ KHAY HỌC SINH CHƯA XẾP CHỖ (Chưa có máy thực hành: 4 học sinh)            [Kéo thả hoặc Nhấp để gán máy]     │
│ [ 👤 Đỗ Gia Huy (Kéo vào máy) ]  [ 👤 Phạm Minh Khôi ]  [ 👤 Hoàng Thùy Linh ]  [ 👤 Bùi Tuấn Kiệt ]        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Đặc Tả Kỹ Thuật:
1. **Bố cục 5 dãy bàn máy tính**:
   - Dãy 1: Máy 01 ➔ Máy 06 (6 máy).
   - Dãy 2: Máy 07 ➔ Máy 12 (6 máy).
   - Dãy 3: Máy 13 ➔ Máy 18 (6 máy).
   - Dãy 4: Máy 19 ➔ Máy 24 (6 máy).
   - Dãy 5: Máy 25 ➔ Máy 31 (7 máy).
   - Tổng cộng: **31 máy học sinh**.
2. **Cơ chế Ngồi Ghép Đôi (Paired Seating)**:
   - Mỗi máy tính hỗ trợ hiển thị tối đa 2 học sinh ngồi cùng.
   - Nhấp vào thẻ học sinh để đổi chỗ hoặc gỡ khỏi máy.
3. **Cơ chế Quản Lý Máy Hỏng Toàn Trường (`brokenMachines`)**:
   - Máy bị hỏng được đánh dấu viền đỏ đứt nét `2px dashed #ef4444`, nền đỏ nhạt `rgba(239, 68, 68, 0.08)`.
   - Danh sách máy hỏng lưu tập trung trong SQLite, tự động áp dụng cho tất cả 20+ lớp học khác.
4. **Chế Độ Trình Chiếu Sơ Đồ (`SeatingDisplayMode`)**:
   - Bấm `[🖥️ Chiếu Sơ Đồ]` để mở giao diện toàn màn hình máy chiếu.
   - Chữ số máy to `36px`, tên học sinh in đậm rõ ràng để các em bước vào phòng nhìn lên bảng tự tìm đúng máy.

---

## 6.6. SỔ ĐIỂM & ĐÁNH GIÁ KỸ NĂNG (Gradebook)

Tự động phân hóa giao diện dựa vào khối lớp của lớp đang chọn:

### A. Khối 1 & Khối 2: "Sổ Kỹ Năng & Sao" (Đánh Giá Định Tính)
- Không có các cột điểm số 1-10.
- **Các cột dữ liệu**:
  1. `STT`
  2. `Họ và Tên`
  3. `Giới tính`
  4. `Máy số`
  5. `Cầm chuột & Nhấp đúp`: Chọn Tốt (T) / Đạt (H).
  6. `Kéo thả (Drag & Drop)`: Chọn Tốt (T) / Đạt (H).
  7. `Nhận biết bàn phím`: Chọn Tốt (T) / Đạt (H).
  8. `Vẽ tranh Paint`: Chọn Tốt (T) / Đạt (H).
  9. `Sao thi đua ⭐`: Hiển thị số sao tích lũy.
  10. `Nhận xét giáo viên`: Có các nút bấm nhận xét mẫu 1-chạm (VD: *"Thao tác chuột nhanh nhẹn"*, *"Vẽ tranh sáng tạo"*).

### B. Khối 3, 4, 5: "Sổ Điểm Thông Tư 27" (Đánh Giá Định Lượng & Định Tính)
- Chuyển đổi giữa 2 tab: `📘 Học Kỳ I` và `📙 Học Kỳ II`.
- **Các cột Học kỳ I**:
  `STT` | `Họ và Tên` | `Giới tính` | `Máy số` | `ĐGTX 1` | `ĐGTX 2` | `Điểm Giữa Kỳ (ĐGK)` | `Điểm Cuối Kỳ (ĐGCK)` | `Mức Đạt Được (T/H/C)` | `Nhận xét`
- **Các cột Học kỳ II & Cả Năm**:
  `ĐGTX 3` | `ĐGTX 4` | `Điểm GK II` | `Điểm CK II` | `Điểm Trung Bình Cả Năm` | `Đánh Giá Cả Năm` | `Nhận xét`
- **Quy chuẩn ô nhập điểm (`score-input`)**:
  - Rộng `58px`, căn giữa, chữ số đậm `font-weight: 600`.
  - Phím `Tab` hoặc `Enter` tự động nhảy sang ô của học sinh tiếp theo.
  - Tự động giới hạn từ `0` đến `10`.

---

## 6.7. BẢNG ĐIỂM TỐT, NỘI QUY & CỬA HÀNG (GoodScoresBoard & RewardShop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ĐIỂM TỐT & NỘI QUY PHÒNG MÁY                      [📘 Học Kỳ I] [📙 Học Kỳ II]       [🎁 Cửa Hàng Đổi Quà]  │
├─────────────────────────────────────────┬───────────────────────────────────────────────────────────────────┤
│ MA TRẬN NỘI QUY CỘNG / TRỪ ĐIỂM         │ BẢNG VINH DANH TOP HỌC SINH TÍCH CỰC                              │
│                                         │                                                                   │
│ [🟢 HÀNH VI TỐT - CỘNG SAO]             │ 🥇 TOP 1: TRẦN BẢO NAM   ─── 52 ⭐ [Cúp Vàng 🏆]                   │
│ • Phát biểu bài hay:        +2 ⭐        │ 🥈 TOP 2: LÊ THỊ MAI     ─── 48 ⭐ [Cúp Bạc 🥈]                   │
│ • Giúp đỡ bạn cùng máy:     +1 ⭐        │ 🥉 TOP 3: VŨ ĐỨC HẢI     ─── 45 ⭐ [Cúp Đồng 🥉]                  │
│ • Thực hành xuất sắc:       +2 ⭐        │ 4. Nguyễn Lan Chi        ─── 40 ⭐                                │
│ • Giữ gìn bàn máy sạch:     +1 ⭐        │ 5. Đỗ Gia Huy            ─── 38 ⭐                                │
│                                         │                                                                   │
│ [🔴 NHẮC NHỞ - TRỪ SAO]                 │ NHẬT KÝ GIAO DỊCH SAO GẦN ĐÂY (STAR LEDGER)                       │
│ • Đi lại lộn xộn trong phòng:  -1 ⭐     │ • 08:35: An được +2⭐ (Phát biểu hay)                             │
│ • Vào mạng chơi game:          -2 ⭐     │ • 08:40: Bình được +1⭐ (Giúp bạn máy 01)                         │
│ • Không tắt máy khi về:        -1 ⭐     │ • 08:42: Huy bị -1⭐ (Đi lại tự do)                               │
└─────────────────────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

- **Sổ cái sao (Star Ledger)**: Giao diện bảng hiển thị dòng thời gian giao dịch có dấu (+/-), ID học sinh, số dư mới, lý do, người phê duyệt.
- **Cửa Hàng Đổi Quà (`RewardShop`)**:
  - Modal danh mục quà tặng: Đổi 10 sao lấy `5 phút chơi game Tin học`, Đổi 15 sao lấy `Làm Trưởng nhóm thực hành`, Đổi 20 sao lấy `Sticker Tin học đặc biệt`.
  - Nút bấm `Đổi quà` tự động kiểm tra số dư sao của học sinh và trừ điểm an toàn.

---

## 6.8. TRÒ CHƠI ĐUA VỊT (DuckRace)

- **Đồ họa**: Vẽ trên `<canvas>` HTML5 với chiều cao sông `440px`. Bờ trên xanh cỏ, dòng nước sông xanh lam có gợn sóng lượn sóng mềm mại.
- **Vịnh xuất phát**: Các chú vịt xếp so le 2 hoặc 3 cột, hiển thị tên học sinh phía trên lưng vịt.
- **Vật lý bơi**: Vịt bơi từ trái sang phải với vận tốc ngẫu nhiên và các cú tăng tốc đột ngột (*Boost*).
- **Vạch đích**: Cờ caro đen trắng và dải ruy băng đỏ.
- **Bục vinh danh (Podium Modal)**: Vịt về đích kích hoạt pháo hoa `canvas-confetti`, hiện bục 3 cấp (Hạng Nhất, Nhì, Ba) kèm nút cộng điểm thi đua tức thì.

---

## 6.9. VÒNG QUAY MAY MẮN (LuckyWheel)

- **Bánh xe quay**: Đường tròn Canvas nhiều múi màu xen kẽ rực rỡ, mỗi múi in tên một học sinh hoặc tên một tổ.
- **Kim chỉ**: Mũi tên tam giác màu vàng viền đỏ nằm ở góc 12 giờ hoặc 3 giờ.
- **Nút quay lớn ở tâm**: Nút tròn `QUAY NGAY` nằm chính giữa trục quay.
- **Âm thanh**: Tiếng lách cách cơ học khi kim chạm từng nan quạt, tiếng nhạc chiến thắng khi bánh xe dừng lại.
- **Modal Chúc Mừng**: Nổi lên với tên học sinh được chọn in cỡ chữ `36px` kèm hiệu ứng ngôi sao lấp lánh.

---

## 6.10. ĐỒNG HỒ ĐẾM GIỜ LỚP HỌC (ClassroomTimer)

- **Mặt đồng hồ tròn lớn**:
  - Đồng hồ số kỹ thuật số: `font-size: 4rem; font-weight: 800; font-family: Outfit`.
  - Vòng tiến trình SVG: Vòng tròn mỏng bao quanh mặt số, rút ngắn dần theo phần trăm thời gian còn lại.
- **Các mốc thời gian đặt sẵn**:
  `[ 1 Phút ]  [ 2 Phút ]  [ 3 Phút ]  [ 5 Phút ]  [ 10 Phút ]  [ 15 Phút ]`
- **Bộ phím điều khiển**:
  - Nút `Bắt đầu` / `Tạm dừng` (Nút to tròn màu xanh lá hoặc hổ phách).
  - Nút `Đặt lại` (Icon `RotateCcw`).
  - Nút `Rung chuông thử` (Icon `Bell`).
- Khi hết giờ (00:00): Mặt đồng hồ nhấp nháy đỏ rực và phát chuông trường học bính boong.

---

# 7. ĐẶC TẢ TOÀN BỘ CÁC CỬA SỔ HỘP THOẠI (MODALS & DRAWERS)

Mọi cửa sổ Modal trong EduMaster đều tuân thủ cấu trúc HTML chuẩn:

```html
<div class="modal-overlay">
  <div class="modal-content" style="max-width: ...px">
    <div class="modal-header">
      <h3>Tiêu đề Modal</h3>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Nội dung tương tác -->
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Đóng / Hủy</button>
      <button class="btn btn-primary">Xác nhận / Lưu</button>
    </div>
  </div>
</div>
```

- **`.modal-overlay`**: `position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); z-index: 10000; animation: fadeIn 0.2s ease`.
- **`.modal-content`**: `background: var(--surface); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.

### Danh Sách 15 Modals Toàn Dự Án:
1. **`AcademicYearSettingsModal`** (`max-width: 480px`): Cài đặt ngày tựu trường (ngày 5 tháng 9).
2. **`NewSchoolYearDetectedModal`** (`max-width: 520px`): Thông báo phát hiện bước sang năm học mới.
3. **`SchoolYearTransitionModal`** (`max-width: 680px`): Xem trước danh sách học sinh lên lớp (Khối 1 lên 2, Khối 5 Tốt nghiệp), nút xác nhận chuyển giao năm học.
4. **`ImportExcelModal`** (`max-width: 840px`): Vùng thả file Excel kéo thả, bảng chọn ánh xạ cột (Họ tên, Ngày sinh, Giới tính, Lớp, Số máy), bảng xem trước dữ liệu với thông báo lỗi dòng.
5. **`AiAssistantModal`** (`max-width: 600px`): Khung chat với AI sư phạm Gemini, danh sách câu hỏi mẫu gợi ý, câu trả lời định dạng Markdown.
6. **`AiClassAnalysisModal`** (`max-width: 720px`): Biểu đồ phân tích năng lực học sinh, nhóm cần bồi dưỡng, đề xuất phương pháp dạy.
7. **`AiLessonAnalysisModal`** (`max-width: 700px`): Phân tích bài giảng hiện tại theo chuẩn GDPT 2018.
8. **`AiLessonFlowModal`** (`max-width: 680px`): Lập tiến trình 4 hoạt động 35 phút kèm nút *[Áp dụng vào tiết dạy]*.
9. **`AiQuestionGeneratorModal`** (`max-width: 760px`): Sinh trắc nghiệm tự động từ văn bản giáo án, nút *[Lưu vào ngân hàng]* .
10. **`CreateSessionModal`** (`max-width: 600px`): Chọn lớp dạy, chọn bài học, gắn khung giờ TKB, nhập sĩ số ban đầu.
11. **`TimetableModal`** (`max-width: 900px`): Lưới thời khóa biểu 5 ngày trong tuần (Thứ 2 - Thứ 6), sáng 4 tiết, chiều 3 tiết.
12. **`QuickToolModal`** (`max-width: 500px`): Lối tắt mở Vòng quay, Đua vịt, Quick Quiz, Sơ đồ lớp ngay trong tiết học.
13. **`SessionSummaryModal`** (`max-width: 640px`): Bảng tổng kết tiết dạy (số học sinh phát biểu, số sao đã thưởng, học sinh xuất sắc nhất).
14. **`ImportPptxModal` & `DuplicateComparisonModal`** (`max-width: 880px`): Tải file PowerPoint lên, so sánh 2 bài giảng bị trùng lặp bằng hình ảnh slide đối chiếu hai bên.
15. **`StarExchangeModal`** (`max-width: 520px`): Chọn phần quà trong Reward Shop, chọn học sinh và bấm xác nhận đổi sao.

---

# 8. HỆ THỐNG PHẢN HỒI ÂM THANH & HIỆU ỨNG TRỰC QUAN

Hệ thống âm thanh được gói trọn trong `src/utils/audio.js`, sử dụng Web Audio API tổng hợp sóng âm thanh (Synthesizer) hoặc phát file WAV/MP3 offline, không bao giờ bị lỗi gián đoạn mạng:

- **`playStarDing()`**: Tiếng "ting-ting" thanh thoát ở tần số cao khi cộng 1 sao thưởng cho học sinh.
- **`playVictory()`**: Chuỗi hợp âm vinh quang ngân vang khi vịt về đích hoặc học sinh đạt giải Top 1.
- **`playBuzzer()`**: Âm trầm ngắn khi có thao tác nhắc nhở hoặc trừ sao.
- **`playSchoolBell()`**: Chuông reo trường học âm vang hai hồi khi tiết học kết thúc (00:00).
- **Nút bật/tắt toàn cục**: Khi nút âm thanh trên Navbar bị tắt (`soundEnabled === false`), toàn bộ các hàm trên tự động trả về `null` ngay lập tức, không gây ồn trong lớp.

---

# 9. CHẾ ĐỘ MÁY CHIẾU ĐẶC BIỆT (PROJECTOR MODE)

Chế độ Máy Chiếu là một đặc sản thiết kế của EduMaster nhằm giải quyết vấn đề thực tế: **máy chiếu trường học thường bị mờ, lóa sáng bởi ánh nắng cửa sổ**.

### Cơ chế hoạt động kỹ thuật:
1. Nhấn nút `Projector Mode` trên Navbar ➔ Gọi hàm `onToggleProjector()`.
2. Ứng dụng đặt thuộc tính `data-projector="true"` lên thẻ gốc `<html>` hoặc `<body>`.
3. Toàn bộ các quy tắc CSS ghi đè có hiệu lực tức thì:
   - Cỡ chữ toàn trang nhảy từ `14px - 15px` lên **`18px`**.
   - Mọi màu chữ xám mờ (`--text-muted`, `--text-dim`) bị triệt tiêu, thay bằng **đen tuyền `#000000`** hoặc **xanh đậm `#1e293b`**.
   - Mọi đường viền mờ 1px đổi thành **viền đậm 2px `#94a3b8`**.
   - Các nút bấm loại bỏ hiệu ứng bóng mờ nhẹ, chuyển thành khối màu đặc rõ nét.
   - Các ô trên sơ đồ phòng máy và bảng điểm tăng độ giãn cách để tránh nhìn nhầm dòng.

---

# 10. QUY CHUẨN VIẾT CODE GIAO DIỆN (COMPONENT CATALOG & CSS CHECKLIST)

Khi tạo mới hoặc sửa bất kỳ component nào trong dự án, bắt buộc phải tuân theo danh mục lớp CSS sau:

### 10.1. Danh mục Lớp Nút Bấm (`.btn`)
```html
<button class="btn btn-primary">Nút Hành Động Chính (Indigo Gradient)</button>
<button class="btn btn-success">Nút Thành Công / Bắt Đầu (Emerald Gradient)</button>
<button class="btn btn-amber">Nút Thưởng Sao / Điểm Tốt (Amber Gradient)</button>
<button class="btn btn-purple">Nút Bài Học & Slide (Purple Gradient)</button>
<button class="btn btn-secondary">Nút Đóng / Phụ (Xám Surface Secondary)</button>
<button class="btn btn-outline">Nút Viền Mỏng (Trong Suốt)</button>
<button class="btn btn-danger">Nút Báo Hỏng / Xóa (Hồng Đỏ Danger)</button>

<!-- Biến thể kích thước -->
<button class="btn btn-sm">Nút Nhỏ (padding 0.375rem 0.75rem)</button>
<button class="btn btn-lg">Nút Lớn (padding 0.875rem 1.75rem)</button>
<button class="btn btn-icon"><LucideIcon size={18} /></button>
```

### 10.2. Danh mục Huy Hiệu Xếp Loại (`.badge`)
```html
<span class="badge badge-excellent">Hoàn Thành Tốt (Xanh Lá #dcfce7)</span>
<span class="badge badge-good">Hoàn Thành (Xanh Lam #e0f2fe)</span>
<span class="badge badge-average">Cần Cố Gắng (Vàng Cam #fef3c7)</span>
<span class="badge badge-weak">Chưa Đạt (Đỏ Nhạt #fee2e2)</span>
```

### 10.3. Ô Nhập Điểm Thông Tư 27 (`.score-input`)
```html
<input 
  type="number" 
  class="score-input" 
  min="0" 
  max="10" 
  step="0.5" 
  value={score} 
/>
```

---

# 11. KẾT LUẬN

Tài liệu thiết kế giao diện này phản ánh **nguyên vẹn 100%** kiến trúc, quy chuẩn và trải nghiệm người dùng thực tế của phần mềm **EduMaster Desktop**. Bất kỳ hệ thống AI nào khi được cung cấp tệp `DESIGN.md` này đều có thể tự động sinh ra mã nguồn giao diện React + CSS hoàn chỉnh, khớp chính xác từng chi tiết và chức năng như phiên bản đang vận hành.
