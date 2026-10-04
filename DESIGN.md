# HỆ THỐNG THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG (UI/UX DESIGN SYSTEM)
## DỰ ÁN: EDUMASTER — NỀN TẢNG QUẢN LÝ & DẠY HỌC TIN HỌC TIỂU HỌC

---

## 1. TỔNG QUAN & TRIẾT LÝ THIẾT KẾ

### 1.1. Bối cảnh & Đối tượng người dùng
**EduMaster** (tiền thân là EduICT) là phần mềm máy tính (Desktop Application trên nền tảng Windows) phục vụ trực tiếp công tác giảng dạy, tổ chức tiết học và quản lý học tập môn **Tin học Tiểu học (Lớp 1 đến Lớp 5)** tại các trường tiểu học Việt Nam.

Đối tượng người dùng chính bao gồm:
1. **Giáo viên Tin học Tiểu học (Primary ICT Teachers)**:
   - Cần thao tác cực nhanh trong tiết dạy 35 phút (không được để "thời gian chết" trên lớp).
   - Thao tác một tay khi đang đứng giảng bài trên bục giảng hoặc đi quanh phòng máy.
   - Cần giao diện trực quan, rõ ràng, dễ nhìn trên cả màn hình laptop cá nhân lẫn màn hình máy chiếu phòng máy.
2. **Học sinh Tiểu học (Primary Students - 6 đến 11 tuổi)**:
   - Học sinh Khối 1 - 2: Chưa thạo chữ, thị giác nhạy bén với màu sắc rực rỡ, biểu tượng sinh động, hình ảnh minh họa lớn.
   - Học sinh Khối 3 - 5: Bắt đầu tiếp cận kỹ năng máy tính, thích sự thi đua, tính điểm thưởng, bảng vinh danh và các hoạt động tương tác sôi động.

### 1.2. Ba trụ cột thiết kế cốt lõi (Core Pillars)

```
        ┌─────────────────────────────────────────────────────────────┐
        │                 TRIẾT LÝ THIẾT KẾ EDUMASTER                 │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   VUI TƯƠI &     │         │   PROJECTOR-FIRST│         │   CHUẨN MỰC &    │
│  GAMIFICATION    │         │  (SIÊU RÕ NÉT)   │         │    SƯ PHẠM       │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│• Sao thưởng ⭐   │         │• Tương phản cao  │         │• Thông tư 27     │
│• Vòng quay 🎡    │         │• Phông chữ lớn   │         │• Khối 1-2 vs 3-5 │
│• Đua vịt 🦆      │         │• Thao tác 1-chạm │         │• GDPT 2018       │
│• Pháo hoa 🎉     │         │• Projector Mode  │         │• Offline an toàn │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

1. **Vui tươi, sinh động & Gamification (Trải nghiệm học mà chơi)**:
   - Tích hợp động lực học tập tức thì: Hệ thống cộng sao tích lũy (`Star Ledger`), Bảng vinh danh điểm tốt, Vòng quay may mắn gọi tên, Đường đua vịt thi đua giữa các tổ/nhóm.
   - Âm thanh phản hồi trực quan (tiếng chuông trường, tiếng nổ pháo hoa, tiếng ting-ting cộng sao) kích thích tối đa sự tập trung của trẻ em tiểu học.
2. **Projector-First & High Legibility (Tối ưu tuyệt đối cho máy chiếu)**:
   - Phòng máy tính tiểu học thường có ánh sáng mạnh và máy chiếu độ phân giải vừa phải. Giao diện được thiết kế với độ tương phản cao, thẻ bo góc lớn, chế độ chuyên biệt **Projector Mode** chuyển toàn bộ nền xám/tối sang nền trắng viền đậm sắc nét, cỡ chữ tăng từ 15px lên 18px+ để học sinh ở bàn cuối phòng máy (cách 8-10m) vẫn đọc rõ.
3. **Chuẩn mực sư phạm & Đơn giản hóa nghiệp vụ**:
   - Phân hóa rành mạch giữa **Khối 1 - 2** (Đánh giá định tính qua kỹ năng sử dụng chuột/bàn phím/vẽ Paint và sao thi đua, không cho điểm số) và **Khối 3 - 5** (Đánh giá định lượng kết hợp định tính chuẩn Thông tư 27/2020/TT-BGDĐT với thang điểm 1-10 và các mức Hoàn thành tốt T / Hoàn thành H / Chưa hoàn thành C).
   - Thiết kế "Zero Configuration": Không bắt giáo viên cấu hình máy chủ, mạng Internet hay database. Cài đặt 1 cú nhấp chuột và chạy ngoại tuyến 100%.

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM & VISUAL TOKENS)

### 2.1. Phông chữ & Thứ bậc Typographic
Dự án sử dụng cặp phông chữ hiện đại, hỗ trợ 100% tiếng Việt có dấu đầy đủ, được **đóng gói cục bộ** qua `@fontsource` (không tải từ Google Fonts CDN để đảm bảo hoạt động khi mất mạng):

- **Heading Font**: `Outfit` — Phông chữ hình học không chân với các đường cong tròn trịa, hiện đại, thân thiện, tạo cảm giác vui vẻ, dễ tiếp cận với học sinh.
- **Body & Data Font**: `Plus Jakarta Sans` — Phông chữ công nghệ cao cấp, độ cân bằng quang học tuyệt vời, các nét chữ rành mạch giúp các con số, danh sách học sinh và nội quy dễ đọc nhất.

```css
/* Token Typography */
--font-primary: 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
```

#### Bảng thang kích thước Typography
| Cấp độ | Cỡ chữ thông thường | Cỡ chữ Projector Mode | Trọng số (Weight) | Ứng dụng |
| :--- | :---: | :---: | :---: | :--- |
| **Display / Clock** | `36px - 48px` | `48px - 64px` | ExtraBold (800) | Đồng hồ đếm ngược tiết học, số máy phòng thực hành |
| **Heading 1 (H1)** | `28px - 32px` | `36px - 40px` | Bold (700) | Tên phân hệ lớn, tiêu đề bài giảng |
| **Heading 2 (H2)** | `20px - 24px` | `26px - 28px` | SemiBold (600) | Tiêu đề khối thẻ chức năng, tên bài học |
| **Heading 3 (H3)** | `16px - 18px` | `20px - 22px` | SemiBold (600) | Tiêu đề cột, tên học sinh trên sơ đồ máy |
| **Body Text** | `14px - 15px` | `18px` | Regular (400) / Medium (500) | Văn bản hướng dẫn, nội quy, ghi chú bài giảng |
| **Caption / Badge**| `11px - 12px` | `14px` | Bold (700) | Nhãn trạng thái, số thứ tự, chỉ số phụ |

---

### 2.2. Bảng màu & Ý nghĩa ngữ nghĩa (Color Palette)

Hệ thống màu sắc được pha trộn hài hòa giữa sắc màu công nghệ thông tin (Indigo / Cyan) và năng lượng giáo dục rực rỡ (Amber / Emerald / Purple / Rose):

```
       #4f46e5           #0ea5e9           #f59e0b           #10b981           #ec4899
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │   PRIMARY   │   │  SECONDARY  │   │   ACCENT    │   │   SUCCESS   │   │ GAMIFY PINK │
   │  Chủ đạo    │   │  Công nghệ  │   │  Sao & Thưởng│  │  Hoàn thành │  │  Đua vịt    │
   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

#### Bảng mã màu chi tiết
| Token | Giá trị HEX / HSL | Ý nghĩa & Vị trí ứng dụng |
| :--- | :---: | :--- |
| `--primary` | `#4f46e5` (Indigo 600) | Màu thương hiệu chính, nút CTA chính, chỉ báo tab đang chọn |
| `--primary-hover` | `#4338ca` (Indigo 700) | Trạng thái hover của nút bấm chính |
| `--primary-light` | `#eef2ff` (Indigo 50) | Nền thẻ active, viền sáng xung quanh vùng đang chọn |
| `--secondary` | `#0ea5e9` (Sky 500) | Phân hệ Phòng máy tính 31 máy, các chức năng thiết bị |
| `--accent` | `#f59e0b` (Amber 500) | Sao thi đua ⭐, Cúp vinh danh, điểm thưởng, cảnh báo nhẹ |
| `--success` | `#10b981` (Emerald 500) | Trạng thái "Đang dạy", học sinh có mặt, xếp loại Tốt, lưu thành công |
| `--danger` | `#ef4444` (Rose 500) | Báo máy tính hỏng ⚠️, trừ điểm vi phạm, xóa dữ liệu |
| `--purple` | `#8b5cf6` (Purple 500) | Phân hệ Bài giảng & Slide, các thẻ chức năng trí tuệ |
| `--pink` | `#ec4899` (Pink 500) | Phân hệ Tiết học, trò chơi Đua vịt, Quick Quiz sôi nổi |

#### Bảng màu theo chế độ hiển thị (Theme Modes)
| Thành phần giao diện | Chế độ Chuẩn (Light Default) | Chế độ Tối (Dark Mode) | Chế độ Máy Chiếu (Projector Mode) |
| :--- | :--- | :--- | :--- |
| **Nền ứng dụng (`--bg-main`)** | `#f8fafc` + Radial Mesh gradient nhẹ | `#0b0f19` + Mesh tối dịu mắt | `#f1f5f9` (Xám rất nhạt, chống chói) |
| **Mặt thẻ/Panel (`--surface-card`)** | `rgba(255, 255, 255, 0.95)` | `rgba(19, 27, 46, 0.95)` | `#ffffff` (Trắng tuyệt đối, nét 100%) |
| **Đường viền (`--surface-border`)** | `#e2e8f0` (1px mảnh mờ) | `#2e3c54` | `#94a3b8` (2px rõ nét, tương phản cao) |
| **Chữ chính (`--text-main`)** | `#0f172a` (Slate 900) | `#f8fafc` (Trắng ngà) | `#000000` (Đen tuyền 100%, nét đanh) |
| **Chữ phụ (`--text-muted`)** | `#64748b` (Slate 500) | `#94a3b8` | `#334155` (Đậm hơn để máy chiếu không mờ) |

---

### 2.3. Hệ thống Không gian & Bố cục (Spatial Grid)
- **Container tối đa**: `max-width: 1440px`, căn giữa màn hình với đệm `padding: 1.25rem 1.5rem 3rem`.
- **Hệ thống bước nhảy Spacing**: Bội số của `4px`:
  - `4px` (`0.25rem`): Khoảng cách icon và chữ trong badge.
  - `8px` (`0.5rem`): Khoảng cách các thành phần trong nút bấm, khoảng cách thẻ con.
  - `12px` (`0.75rem`): Khoảng cách đệm ô bảng dữ liệu, ô nhập liệu.
  - `16px` (`1rem`): Đệm thẻ con, khoảng cách giữa các khối chức năng nhỏ.
  - `24px` (`1.5rem`): Đệm panel lớn, khoảng cách các hàng trong dashboard.
  - `32px` (`2rem`): Khoảng cách giữa các phân đoạn nội dung chính.

---

### 2.4. Hiệu ứng Chiều sâu & Bo góc (Elevation & Radius)
- **Bo góc (Border Radius)**:
  - `--radius-sm` (`8px`): Ô nhập điểm, ô trạng thái máy tính, nút phụ nhỏ.
  - `--radius-md` (`12px`): Nút bấm tiêu chuẩn, thẻ học sinh, ô chọn dropdown.
  - `--radius-lg` (`16px`): Khối panel nội dung, thẻ chức năng chính trên Dashboard, cửa sổ Modal.
  - `--radius-full` (`9999px`): Huy hiệu (Badges), avatar học sinh, viên đếm giờ hình tròn.
- **Đổ bóng & Kính mờ (Glassmorphism)**:
  - Khối giao diện `glass-panel` ứng dụng `backdrop-filter: blur(12px)` kết hợp viền mờ `1px solid var(--surface-border)` tạo cảm giác lớp giao diện nổi nhẹ nhàng trên nền lưới mesh mềm mại.

---

### 2.5. Tương tác vi mô & Chuyển động (Micro-interactions)
- **Hiệu ứng nút bấm**:
  - `Hover`: Nâng nhẹ bề mặt `transform: translateY(-1px)` và tăng độ phát sáng của bóng (`--primary-glow`, `--accent-glow`).
  - `Active (Click)`: Co nhẹ `transform: scale(0.97)` tạo cảm giác nhấn phím vật lý rõ ràng.
- **Đèn báo trạng thái (Pulsing Indicator)**:
  - Khi có tiết học đang diễn ra: Huy hiệu `ĐANG DẠY` trên thanh điều hướng phát nhịp đập ánh sáng xanh lá (`pulseGlow`) chu kỳ 2s.
- **Hiệu ứng ăn mừng (Celebration Confetti)**:
  - Khi hoàn thành trò chơi Đua vịt hoặc trao quà lớn: Thư viện `canvas-confetti` kích hoạt bắn pháo hoa 2 bên màn hình tạo không khí phấn khích trong lớp học.

---

## 3. KIẾN TRÚC THÔNG TIN & KHUNG BỐ CỤC TOÀN CỤC

### 3.1. Sơ đồ khung giao diện chính (App Shell Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR CỐ ĐỊNH (Cao 58px)                                                                                  │
│ [🎓 EduMaster] [Năm học: 2026-2027 ▼] [Lớp 3A1 (32 HS) ▼] ─── [🖥️ Projector] [🔊 Âm thanh] [⚙️] [💾 Backup] [🟢 DB]│
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR ĐIỀU HƯỚNG│ KHÔNG GIAN LÀM VIỆC CHÍNH (MAIN WORKSPACE CONTAINER - Max 1440px)                       │
│ (70px ◄► 240px)   │                                                                                         │
│                   │ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ 🏠 Trang Chủ      │ │ BANNER TIẾT HỌC ĐANG DIỄN RA / THÔNG TIN LỚP HỌC                                    │ │
│ 🎯 Tiết Học [LIVE]│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│ 📚 Bài Học & Slide│                                                                                         │
│ ⚡ Quick Quiz     │ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ 🖥️ Phòng Máy (31) │ │ NỘI DUNG PHÂN HỆ ĐANG CHỌN (Dynamic View Component)                                 │ │
│ 📋 Sổ Điểm TT27   │ │ (HomeDashboard / SessionManager / LessonLibrary / SeatingChart / Gradebook...)       │ │
│ ⭐ Điểm Tốt       │ │                                                                                     │ │
│ 🦆 Đua Vịt        │ │                                                                                     │ │
│ 🎡 Vòng Quay      │ │                                                                                     │ │
│ ⏱️ Đếm Giờ        │ └─────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Thanh điều hướng trên cùng (Navbar)
Thanh Navbar cố định trên cùng (`z-index: 100`), luôn hiển thị trong mọi trạng thái làm việc:

1. **Brand Logo & Version**: Biểu tượng mũ cử nhân tốt nghiệp kèm dòng chữ `EduMaster Desktop` sắc nét.
2. **Bộ chọn Năm học (School Year Selector)**:
   - Cho phép giáo viên chuyển đổi linh hoạt giữa các năm học (VD: `2025 - 2026`, `2026 - 2027`).
   - CSDL tự động phân vùng dữ liệu: xem lại điểm số, lớp học của các khóa trước mà không sợ ghi đè.
3. **Bộ chọn Lớp học nhanh (Quick Class Switcher)**:
   - Dropdown hiển thị danh sách lớp theo từng khối (Khối 1 đến Khối 5).
   - Hiển thị sĩ số từng lớp (VD: `Lớp 3A1 (32 HS)`).
   - Nút `+ Thêm Lớp` và `Nhập Excel` tích hợp ngay trong menu thả xuống.
4. **Cụm điều khiển môi trường giảng dạy (Teaching Controls)**:
   - **Nút Chế độ Máy Chiếu (`🖥️ Projector Mode`)**: Bật/tắt chế độ siêu tương phản cao cho máy chiếu.
   - **Nút Âm Thanh (`🔊 / 🔇`)**: Bật/tắt tức thì toàn bộ âm thanh hiệu ứng trong lớp học.
   - **Đèn báo trạng thái CSDL (`🟢 SQLite Local`)**: Cho giáo viên biết dữ liệu đang lưu an toàn 100% trong máy, không cần mạng.
   - **Nút Sao lưu & Phục hồi (`💾`)**: Mở nhanh trung tâm sao lưu dữ liệu đề phòng sự cố.

### 3.3. Thanh điều hướng bên hông (Collapsible Sidebar)
Sidebar có thể chuyển đổi giữa 2 trạng thái chỉ bằng 1 cú nhấp:
- **Trạng thái Mở rộng (240px)**: Hiển thị đầy đủ icon + tên phân hệ chữ viết tiếng Việt rõ ràng + huy hiệu trạng thái.
- **Trạng thái Thu gọn (70px)**: Tối ưu không gian hiển thị bài học và sơ đồ phòng máy. Chỉ hiển thị icon lớn căn giữa kèm tooltip chú thích khi di chuột.

---

## 4. ĐẶC TẢ CHI TIẾT GIAO DIỆN TỪNG PHÂN HỆ NGHIỆP VỤ

### 4.1. Trang Chủ (Home Dashboard)
Trang tổng quan khi mở phần mềm, cung cấp cái nhìn toàn diện về năm học và các lối tắt hành động:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ LỚP ĐANG CHỌN: LỚP 3A1 • MÔN TIN HỌC • NĂM HỌC 2026-2027                                      │
│ Sĩ số: 32 học sinh  |  Tổng số sao thi đua: 485 ⭐  |  Tiết học gần nhất: Bài 3 - Chuột máy tính│
└───────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ TỔNG SỐ LỚP   │ │ TỔNG HỌC SINH │ │ KHỐI 1 - 2    │ │ KHỐI 3 - 4 - 5│ │ SAO TÍCH LŨY  │
│      18 Lớp   │ │   580 Học sinh│ │ 8 Lớp (Kỹ năng│ │ 10 Lớp (TT 27)│ │   8,420 ⭐    │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

┌───────────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐
│ 🎯 TRUNG TÂM TIẾT HỌC (SESSION DASHBOARD)     │ │ 📚 THƯ VIỆN BÀI HỌC & SLIDE                 │
│ Bắt đầu tiết dạy 35p, bấm giờ, ghi nhận sao.  │ │ Ngân hàng giáo án GDPT 2018, mở PowerPoint. │
│ [ ▶ Bắt Đầu Tiết Dạy Ngay ]                   │ │ [ Xem Danh Sách Bài Giảng ]                 │
└───────────────────────────────────────────────┘ └─────────────────────────────────────────────┘
┌───────────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐
│ ⚡ QUICK QUIZ (ĐỐ VUI MÁY CHIẾU)              │ │ 🖥️ PHÒNG MÁY THỰC HÀNH (31 MÁY)             │
│ Kiểm tra hiểu bài tức thì, giơ thẻ A/B/C/D.   │ │ Sơ đồ 5 dãy bàn, báo máy hỏng, ngồi đôi.    │
│ [ Vào Phòng Đố Vui ]                          │ │ [ Quản Lý Sơ Đồ Phòng Máy ]                 │
└───────────────────────────────────────────────┘ └─────────────────────────────────────────────┘
```

- **Thẻ Banner thông minh**: Nếu có tiết học đang chạy dở dở (bị đóng app đột ngột), Banner lập tức chuyển màu xanh Emerald nhấp nháy: `⚡ ĐANG CÓ TIẾT HỌC ĐANG DIỄN RA` kèm nút `▶ Tiếp tục tiết dạy ngay`.
- **Thống kê phân tầng**: Tách biệt rõ chỉ số học sinh Khối 1-2 (đánh giá kỹ năng) và Khối 3-5 (sổ điểm TT27).
- **Lưới 10 thẻ chức năng**: Mỗi thẻ có viền màu accent riêng biệt, icon 3D sinh động, mô tả ngắn gọn và nút CTA dẫn thẳng vào nghiệp vụ tương ứng.

---

### 4.2. Trung Tâm Tiết Học (Classroom Session Dashboard)
Phân hệ quan trọng bậc nhất, là "bàn điều khiển trung tâm" của giáo viên trong suốt 35 phút lên lớp:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIẾT DẠY: LỚP 3A1 • BÀI 4: BÀN PHÍM MÁY TÍNH                                                 │
│ [⏱️ 28:45 / 35:00] [▶ Tiếp tục / ⏸️ Tạm dừng] [🔔 Rung chuông] [⭐ Thưởng cả lớp] [⏹️ Kết thúc]│
├───────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ TIẾN TRÌNH TIẾT HỌC (LESSON FLOW - 35 PHÚT)   │ LƯỚI HỌC SINH & GHI NHẬN PHÁT BIỂU (32 HS)   │
│                                               │                                               │
│ ● 1. Khởi động (5 phút)           [✓ Hoàn tất]│ [1. An ⭐⭐⭐ +]   [2. Bình ⭐⭐ +]  [3. Chi ⭐⭐⭐⭐ +]│
│   • Hát bài hát Tin học vui vẻ                │ [4. Dũng ⭐ +]    [5. Đạt ⭐⭐⭐ +]  [6. Hà ⭐⭐ +]   │
│                                               │                                               │
│ ◉ 2. Khám phá kiến thức (12 phút) [ĐANG CHẠY] │ (Nhấp 1-chạm vào tên học sinh để +1 sao ⭐)   │
│   • Giới thiệu các hàng phím cơ bản           │ (Nhấp chuột phải để mở menu trừ điểm/nội quy) │
│                                               │                                               │
│ ○ 3. Luyện tập thực hành (13 phút)[Chờ]       │ ┌───────────────────────────────────────────┐ │
│   • Luyện gõ hàng phím cơ sở trên Wordpad     │ │ THANH CÔNG CỤ NHANH TRONG TIẾT DẠY        │ │
│                                               │ │ [🎡 Gọi ngẫu nhiên] [⚡ Đố vui] [🦆 Đua vịt]│ │
│ ○ 4. Vận dụng & Đánh giá (5 phút) [Chờ]       │ │ [⏱️ Đếm giờ nhóm]   [🖥️ Mở slide bài dạy]   │ │
│   • Trò chơi Đố vui củng cố kiến thức         │ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

#### Các đặc điểm thiết kế đặc thù:
1. **Master Session Timer (Đồng hồ nhạc trưởng)**:
   - Hiển thị cỡ lớn trên đỉnh màn hình, tự động đếm ngược từ 35:00 về 00:00.
   - Khi còn 5 phút cuối: Đồng hồ chuyển sang màu vàng cảnh báo.
   - Khi hết giờ (00:00): Tự động phát chuông trường học bính-boong vui nhộn và mở modal nhắc nhở kết thúc tiết dạy.
2. **Interactive Lesson Flow (Tiến trình bài học)**:
   - Hiển thị theo dạng timeline 4 bước chuẩn sư phạm: Khởi động ➔ Khám phá ➔ Luyện tập ➔ Vận dụng.
   - Giáo viên có thể đánh dấu tick hoàn thành từng chặng hoặc điều chỉnh thời lượng linh hoạt.
3. **One-Click Star Grid (Lưới thưởng sao 1-chạm)**:
   - Tên và số sao hiện tại của toàn bộ 30-35 học sinh hiển thị dưới dạng các ô thẻ bấm to bản.
   - Giáo viên chỉ cần chạm 1 lần là học sinh được cộng sao ngay lập tức, kèm âm thanh ting-ting phấn khích mà không làm gián đoạn bài giảng.
4. **Modal Tổng kết tiết học (Session Summary Modal)**:
   - Tự động thống kê: Số học sinh phát biểu, tổng số sao đã phát ra trong tiết, học sinh tích cực nhất ("Ngôi sao của tiết học").
   - Lưu lại lịch sử buổi dạy vào CSDL để giáo viên đối chiếu cuối kỳ.

---

### 4.3. Thư Viện Bài Học & Trình Chiếu (Lesson Library & Presentation)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ THƯ VIỆN BÀI GIẢNG TIN HỌC (GDPT 2018)            [+ Nạp PowerPoint (.pptx)] [+ Tạo Bài Mới]  │
│ [Tất cả khối ▼] [Khối 3] [Khối 4] [Khối 5]    [Chủ đề: A - Máy tính và em ▼]  [🔍 Tìm kiếm...]│
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐   │
│ │ [ẢNH SLIDE 16:9 XEM TRƯỚC]│ │ [ẢNH SLIDE 16:9 XEM TRƯỚC]│ │ [ẢNH SLIDE 16:9 XEM TRƯỚC]│   │
│ │                           │ │                           │ │                           │   │
│ │ Bài 1: Thông tin và quyết │ │ Bài 2: Xử lý thông tin    │ │ Bài 3: Máy tính - người   │   │
│ │ định                      │ │                           │ │ bạn mới                   │   │
│ │ Khối 3 • 12 Slides        │ │ Khối 3 • 15 Slides        │ │ Khối 3 • 18 Slides        │   │
│ │ [🖥️ Trình Chiếu Web]      │ │ [🖥️ Trình Chiếu Web]      │ │ [🖥️ Trình Chiếu Web]      │   │
│ │ [📽️ Mở PowerPoint Gốc]    │ │ [📽️ Mở PowerPoint Gốc]    │ │ [📽️ Mở PowerPoint Gốc]    │   │
│ └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Thiết kế chức năng trình chiếu:
- **Tỉ lệ khung hình Slide**: Chuẩn 16:9 điện ảnh, hỗ trợ xem trước thumbnail sắc nét.
- **Trình nạp PPTX Kéo-thả (Drag & Drop)**:
  - Cho phép thả file bài giảng `.pptx` có sẵn của giáo viên vào.
  - Tự động tách slide, trích xuất ghi chú giáo viên (`Teacher Notes`).
  - **Modal đối chiếu trùng lặp (Duplicate Comparison Modal)**: Nếu bài giảng đã tồn tại, hiển thị giao diện so sánh 2 bên (Side-by-side) giúp giáo viên quyết định ghi đè hoặc tạo bản sao.
- **Nút "Mở PowerPoint" (Desktop Native)**:
  - Nút bấm đặc quyền trên bản Desktop: Mở trực tiếp file gốc bằng phần mềm **Microsoft PowerPoint** có sẵn trên máy với chế độ bảo vệ file (`ReadOnly`), đồng thời mở thanh điều khiển slide từ xa ngay trên EduMaster.

---

### 4.4. Quick Quiz (Đố Vui Máy Chiếu & Ngân Hàng Câu Hỏi)
Thiết kế phục vụ đánh giá thường xuyên tại lớp học tiểu học mà **học sinh không cần điện thoại hay máy tính**:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ CÂU 2 / 5: BỘ PHẬN NÀO SAU ĐÂY DÙNG ĐỂ NHẬP CHỮ VÀO MÁY TÍNH?                    [⏱️ 15s]     │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                               │
│    ┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐       │
│    │  A. Màn hình máy tính                │    │  B. Bàn phím máy tính        [✓ ĐÚNG]│       │
│    └──────────────────────────────────────┘    └──────────────────────────────────────┘       │
│    ┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐       │
│    │  C. Chuột máy tính                   │    │  D. Thân máy tính                    │       │
│    └──────────────────────────────────────┘    └──────────────────────────────────────┘       │
│                                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ [👁️ Hiện Đáp Án]  [📊 Thống Kê Giơ Thẻ: A: 2 | B: 28 | C: 1 | D: 1]  [⭐ Thưởng Sao Người Đúng]  │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Typography cực đại**: Phông chữ câu hỏi và 4 đáp án đạt `24px - 32px`, sử dụng màu sắc phân biệt đặc trưng (A: Đỏ, B: Xanh dương, C: Vàng, D: Xanh lá).
- **Cơ chế giơ thẻ A/B/C/D**: Giáo viên chiếu câu hỏi, học sinh giơ thẻ màu. Giáo viên gõ nhanh số lượng hoặc bấm nút để công bố đáp án với hiệu ứng âm thanh cổ vũ sôi nổi.

---

### 4.5. Sơ Đồ Phòng Máy Thực Hành (Seating Chart - 31 Máy)
Mô phỏng chân thực phòng máy tính tiểu học tiêu chuẩn (1 bàn giáo viên + 5 dãy máy học sinh gồm 31 máy tính):

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHÒNG THỰC HÀNH TIN HỌC (31 MÁY)  [Chế độ: Đơn / Ngồi Đôi] [🖥️ Chiếu Sơ Đồ] [⚠️ Báo Máy Hỏng]│
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                              ┌───────────────────────────────┐                                │
│                              │   BÀN GIÁO VIÊN & MÁY CHỦ     │                                │
│                              └───────────────────────────────┘                                │
│                                                                                               │
│   DÃY 1 (Máy 01 - 06)      DÃY 2 (Máy 07 - 12)     DÃY 3 (Máy 13 - 18)     DÃY 4 (19 - 24)    │
│  ┌──────────────────┐     ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐│
│  │ MÁY 01           │     │ MÁY 07           │    │ MÁY 13           │    │ MÁY 19 [⚠️ HỎNG] ││
│  │ • Nguyễn Văn An  │     │ • Trần Thị Mai   │    │ • Lê Hoàng Nam   │    │ (Không xếp chỗ)  ││
│  │ • Lê Thu Hà      │     │ • Vũ Đức Hải     │    │ • Phạm Gia Huy   │    │                  ││
│  │ [ ⭐ +1 ]        │     │ [ ⭐ +1 ]        │    │ [ ⭐ +1 ]        │    │                  ││
│  └──────────────────┘     └──────────────────┘    └──────────────────┘    └──────────────────┘│
│                                                                                               │
│                            DÃY 5 (DÃY CUỐI: Máy 25 - Máy 31)                                  │
│  ┌──────────────────┐     ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐│
│  │ MÁY 25           │     │ MÁY 26           │    │ MÁY 27           │    │ MÁY 31           ││
│  └──────────────────┘     └──────────────────┘    └──────────────────┘    └──────────────────┘│
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Tính năng UI/UX nổi bật:
1. **Hỗ trợ Ngồi đôi (Paired Seating)**: Mỗi máy hiển thị 2 học sinh ngồi chung một máy thực hành, giúp quản lý chính xác trong điều kiện phòng máy đông học sinh.
2. **Cảnh báo Máy hỏng trực quan (`⚠️ Broken Machine Tag`)**: Máy bị hỏng được đánh dấu viền đỏ, mờ nền và không cho phép xếp chỗ, đồng thời lưu trạng thái hỏng xuyên suốt các lớp khác để báo cho bộ phận thiết bị.
3. **Chế độ Chiếu sơ đồ (`Seating Display Mode`)**: Giao diện toàn màn hình máy chiếu, phông chữ lớn, để khi học sinh xếp hàng bước vào phòng máy có thể nhìn lên bảng và tự động về đúng vị trí máy của mình mà không gây mất trật tự.

---

### 4.6. Sổ Điểm & Đánh Giá Kỹ Năng (Gradebook - Chuẩn Thông Tư 27)

Giao diện tự động thích ứng hoàn toàn dựa trên khối lớp của học sinh:

#### A. Đối với Khối 1 & Khối 2: "Sổ Kỹ Năng & Sao"
- Không sử dụng điểm số số học (1 - 10) để tránh áp lực tâm lý cho học sinh lớp nhỏ.
- Theo dõi 4 nhóm kỹ năng tin học nền tảng:
  1. *Kỹ năng cầm chuột & di chuột*.
  2. *Kỹ năng nhấp đúp & kéo thả (Drag & Drop)*.
  3. *Kỹ năng gõ phím cơ bản & phím cách/Enter*.
  4. *Kỹ năng vẽ hình đơn giản trên phần mềm Paint*.
- Tích hợp số sao thi đua đạt được và nhận xét định tính (Hoàn thành tốt / Hoàn thành).

#### B. Đối với Khối 3, 4, 5: "Sổ Điểm Thông Tư 27"
- Đầy đủ cột mục theo quy định chính thức của Bộ Giáo dục & Đào tạo:
  - Điểm đánh giá thường xuyên (ĐGTX 1, ĐGTX 2, ĐGTX 3, ĐGTX 4).
  - Điểm kiểm tra định kỳ: Giữa học kỳ I, Cuối học kỳ I, Giữa học kỳ II, Cuối học kỳ II.
  - Mức đạt được: **T** (Hoàn thành tốt), **H** (Hoàn thành), **C** (Chưa hoàn thành).
- Nhập điểm trực tiếp trên từng ô (`score-input`) với phím Tab / Enter chuyển ô nhanh, tự động tô màu badge cảnh báo học sinh cần hỗ trợ.
- Tích hợp 1-click xuất danh sách ra tệp **Microsoft Excel (`.xlsx`)** chuẩn mẫu phòng giáo dục.

---

### 4.7. Điểm Tốt, Nội Quy & Đổi Thưởng (Good Scores Board & Rewards)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ BẢNG ĐIỂM TỐT & NỘI QUY PHÒNG MÁY                     [⭐ Sổ Cái Sao] [🎁 Cửa Hàng Đổi Thưởng]│
├───────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ NỘI QUY CỘNG / TRỪ SAO PHÒNG MÁY              │ TOP HỌC SINH TÍCH CỰC (BẢNG VINH DANH)        │
│                                               │                                               │
│ [🟢 CỘNG SAO THI ĐUA]                         │ 🥇 1. Trần Bảo Nam  ── 45 ⭐ [Cúp Vàng]        │
│ • Phát biểu hay, sáng tạo:        +2 ⭐        │ 🥈 2. Lê Thị Mai    ── 42 ⭐ [Cúp Bạc]         │
│ • Giúp đỡ bạn cùng máy:           +1 ⭐        │ 🥉 3. Vũ Đức Hải    ── 39 ⭐ [Cúp Đồng]        │
│ • Thực hành xong bài sớm nhất:    +2 ⭐        │ 4. Nguyễn Lan Chi   ── 35 ⭐                  │
│                                               │ 5. Đỗ Gia Huy       ── 31 ⭐                  │
│ [🔴 NHẮC NHỞ / TRỪ SAO]                       │                                               │
│ • Đi lại tự do trong phòng máy:   -1 ⭐        │ ┌───────────────────────────────────────────┐ │
│ • Chơi game / Vào web lạ:         -2 ⭐        │ │ CỬA HÀNG ĐỔI THƯỞNG (REWARD SHOP)         │ │
│ • Chưa tắt máy tính khi về:       -1 ⭐        │ │ • 10 ⭐: 5 Phút chơi game Tin học tự do   │ │
│                                               │ │ • 15 ⭐: Làm Trưởng nhóm thực hành 1 tuần │ │
│                                               │ │ • 20 ⭐: Huy hiệu sticker Tin học siêu cấp│ │
│                                               │ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

- **Sổ cái sao (Star Ledger)**: Mọi giao dịch cộng/trừ sao đều được lưu trữ nhật ký minh bạch kèm nhãn nguyên nhân (VD: `+1 sao: Giúp bạn`), đảm bảo tính công bằng và có thể kiểm tra lại bất cứ lúc nào.
- **Cửa hàng đổi thưởng (Reward Shop)**: Tạo động lực thực tế để các em phấn đấu học tốt và giữ gìn nội quy phòng máy.

---

### 4.8. Trò Chơi Tương Tác Lớp Học (Gamification: Duck Race & Lucky Wheel)

#### 1. Đua Vịt (Duck Race)
- Mô phỏng đường đua bơi lội nhiều làn (Làn 1 đến Làn 6 đại diện cho các Tổ hoặc các nhóm học sinh).
- Mỗi chú vịt có màu sắc rực rỡ, số đeo và hoạt ảnh lắc lư khi bơi.
- Thuật toán bước tiến ngẫu nhiên có gia tốc, tạo sự kịch tính nghẹt thở đến giây cuối cùng.
- Khi vịt chạm đích: Hiển thị bục vinh danh Top 1, Top 2, Top 3 kèm hiệu ứng pháo hoa Confetti và nút cộng sao tự động cho các thành viên trong tổ thắng cuộc.

#### 2. Vòng Quay May Mắn (Lucky Wheel)
- Bánh xe hình tròn vẽ bằng canvas độ nét cao với các múi màu xen kẽ chứa tên học sinh hoặc tên tổ.
- Nút bấm `QUAY NGAY` ở trung tâm kèm âm thanh cơ học cạch-cạch khi kim chỉ qua từng nan quạt.
- Hiệu ứng hãm đà quán tính chân thực, dừng lại chính xác tại học sinh được chọn để trả lời câu hỏi hoặc nhận phần thưởng may mắn.

---

### 4.9. Đếm Giờ Lớp Học (Classroom Timer)
- Màn hình số kỹ thuật số siêu lớn (Digital Clock) chiếm trọn trung tâm, kết hợp vòng tròn tiến trình (Progress Ring SVG) rút ngắn dần theo thời gian.
- Các nút chọn nhanh thời lượng bài tập: `1 Phút`, `2 Phút`, `3 Phút`, `5 Phút`, `10 Phút`, `15 Phút`.
- Cho phép tùy chỉnh nhạc nền tập trung khi đang đếm giờ và chuông báo reo vang khi hết giờ.

---

### 4.10. Hệ Thống Trợ Lý AI Giáo Viên (Gemini AI Integration)
Bộ 5 cửa sổ chức năng AI được thiết kế dưới dạng Modal cao cấp (`backdrop-filter: blur(16px)`):

1. **AiAssistantModal**: Trợ lý trò chuyện sư phạm, gợi ý phương pháp tổ chức trò chơi, quản lý lớp học nghịch ngợm trong phòng máy.
2. **AiClassAnalysisModal**: Phân tích biểu đồ học tập của cả lớp, chỉ ra nhóm học sinh tiến bộ nhanh và nhóm học sinh còn yếu thao tác chuột/phím.
3. **AiLessonAnalysisModal**: So khớp bài giảng hiện tại với chuẩn đầu ra GDPT 2018 Tin học.
4. **AiLessonFlowModal**: Tự động gợi ý phân bổ thời lượng 35 phút cho bài giảng cụ thể.
5. **AiQuestionGeneratorModal**: Đọc nội dung bài học và tự động sinh 5 - 10 câu hỏi trắc nghiệm kèm đáp án và giải thích chi tiết.

---

## 5. THIẾT KẾ KHẢ NĂNG TIẾP CẬN & MÔI TRƯỜNG THỰC TẾ

### 5.1. Chế độ Máy Chiếu (Projector Mode)
Được kích hoạt tức thì bằng phím tắt hoặc nút bấm trên Navbar:
- **Độ tương phản cực hạn**: Nền đổi sang xám trắng sáng `#f1f5f9`, các thẻ đổi sang trắng `#ffffff` với viền đậm `2px solid #94a3b8`.
- **Chữ đen tuyền 100% (`#000000`)**: Loại bỏ các màu chữ xám nhạt khó đọc.
- **Tăng cỡ chữ toàn cục**: Kích thước phông chữ cơ bản tự động nâng lên `18px`.
- Đảm bảo học sinh ngồi ở góc xa phòng máy hoặc phòng có ánh sáng ban ngày mạnh vẫn nhìn rõ từng con số và câu hỏi.

### 5.2. Hoạt động Ngoại tuyến 100% (Offline-First UX)
- Mọi tài nguyên giao diện (phông chữ, icon Lucide SVG, âm thanh chuông) đều được đóng gói tĩnh trong bộ cài đặt `EduMaster.exe`.
- Khi máy tính phòng thực hành không có Internet (hoặc mạng chập chờn), ứng dụng vẫn khởi động trong 2 giây và vận hành trơn tru không có bất kỳ thông báo lỗi kết nối nào.

---

## 6. DANH MỤC THÀNH PHẦN GIAO DIỆN (UI COMPONENT CATALOG)

### 6.1. Hệ thống Nút bấm (Button Styles)
```css
/* Nút Chính (Primary CTA) */
.btn-primary   /* Nền gradient Indigo 600 -> 500, chữ trắng, shadow phát sáng */
/* Nút Thành Công (Success CTA) */
.btn-success   /* Nền gradient Emerald 600 -> 500, chữ trắng */
/* Nút Sao / Thưởng (Amber CTA) */
.btn-amber     /* Nền gradient Amber 600 -> 500, chữ trắng, shadow vàng */
/* Nút Bài Giảng (Purple CTA) */
.btn-purple    /* Nền gradient Purple 600 -> 500, chữ trắng */
/* Nút Thứ Cấp (Secondary) */
.btn-secondary /* Nền xám nhạt, viền mờ, chữ đậm */
/* Nút Viền (Outline) */
.btn-outline   /* Nền trong suốt, viền mỏng, đổi màu khi hover */
/* Nút Nguy Hiểm (Danger) */
.btn-danger    /* Nền đỏ nhạt, chữ đỏ đậm cảnh báo */
```

### 6.2. Hệ thống Huy hiệu (Badges)
- `.badge-excellent`: Nền xanh lá nhạt `#dcfce7`, chữ xanh đậm `#15803d` (Hoàn thành Tốt).
- `.badge-good`: Nền xanh dương nhạt `#e0f2fe`, chữ xanh đậm `#0369a1` (Hoàn thành).
- `.badge-average`: Nền vàng nhạt `#fef3c7`, chữ nâu hổ phách `#b45309` (Cần cố gắng).
- `.badge-weak`: Nền đỏ nhạt `#fee2e2`, chữ đỏ sẫm `#b91c1c` (Chưa hoàn thành).

### 6.3. Bảng Dữ Liệu Tương Tác (Data Tables)
- Tiêu đề cột `th` có nền xám sáng, chữ in hoa đệm, cố định (`position: sticky; top: 0`) khi cuộn trang dài.
- Hàng dữ liệu `tr:hover` đổi màu nền mượt mà giúp giáo viên không bị nhìn lệch dòng giữa các học sinh.
- Ô nhập điểm `score-input` bo góc nhỏ, căn giữa, khi chọn sẽ sáng đèn viền xanh nổi bật.

---

## 7. TỔNG KẾT

Hệ thống thiết kế giao diện của **EduMaster** là sự kết hợp chặt chẽ giữa **mỹ thuật số hiện đại** và **thực tế phòng máy trường học Việt Nam**. Với thiết kế lấy người học làm trung tâm, tối ưu triệt để cho tiết dạy 35 phút trên máy chiếu và hệ thống Gamification đầy hứng khởi, EduMaster mang lại trải nghiệm giảng dạy Tin học chuẩn mực, chuyên nghiệp và tràn ngập niềm vui học tập.
