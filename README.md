# 🎓 EduICT - Trợ Giảng Số & Nền Tảng Giảng Dạy Tin Học Tiểu Học

> **Ứng dụng quản lý điểm, sơ đồ phòng máy 31 máy, gamification lớp học và trung tâm điều khiển tiết học (Classroom Session) tối ưu hoá theo Chương trình Giáo dục Phổ thông 2018 (GDPT 2018) và Thông tư 27/2020/TT-BGDĐT.**

[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Native%20Node.js%2022-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-10b981)](#)

---

## 📖 Mục Lục

1. [Giới Thiệu Tổng Quan](#1-giới-thiệu-tổng-quan)
2. [Điểm Nổi Bật Dành Cho Giáo Viên Tin Học](#2-điểm-nổi-bật-dành-cho-giáo-viên-tin-học)
3. [Cài Đặt & Khởi Chạy](#3-cài-đặt--khởi-chạy)
4. [Hướng Dẫn Chi Tiết Các Chức Năng](#4-hướng-dẫn-chi-tiết-các-chức-năng)
   - [🎯 Trung Tâm Tiết Học (Classroom Session)](#41--trung-tâm-tiết-học-classroom-session)
   - [📚 Thư Viện Bài Học & Trình Chiếu (Lesson + Presentation)](#42--thư-viện-bài-học--trình-chiếu-lesson--presentation)
   - [⚡ Quick Quiz & Ngân Hàng Câu Hỏi Trắc Nghiệm](#43--quick-quiz--ngân-hàng-câu-hỏi-trắc-nghiệm)
   - [🖥️ Sơ Đồ Phòng Máy Thực Hành (5 Dãy • 31 Máy)](#44-️-sơ-đồ-phòng-máy-thực-hành-5-dãy--31-máy)
   - [📋 Sổ Điểm & Sổ Đánh Giá Kỹ Năng (Chuẩn TT27)](#45--sổ-điểm--sổ-đánh-giá-kỹ-năng-chuẩn-tt27)
   - [⭐ Điểm Tốt, Điểm Trừ & Nội Quy Phòng Máy](#46--điểm-tốt-điểm-trừ--nội-quy-phòng-máy)
   - [🦆 Mini-game Đua Vịt Lớp Học (Duck Race)](#47--mini-game-đua-vịt-lớp-học-duck-race)
   - [🎡 Vòng Quay May Mắn (Lucky Wheel)](#48--vòng-quay-may-mắn-lucky-wheel)
   - [🎁 Cửa Hàng Đổi Thưởng & Bảo Bối Học Sinh](#49--cửa-hàng-đổi-thưởng--bảo-bối-học-sinh)
   - [⚖️ Quy Đổi Sao Sang Điểm Số (10⭐ = +1.0 Điểm)](#410-️-quy-đổi-sao-sang-điểm-số-10--10-điểm)
   - [⏱️ Đồng Hồ Đếm Giờ Lớp Học (Classroom Timer)](#411-️-đồng-hồ-đếm-giờ-lớp-học-classroom-timer)
   - [🏫 Quản Lý Lớp Học & Bộ Lọc 5 Khối](#412--quản-lý-lớp-học--bộ-lọc-5-khối)
   - [💾 Cơ Sở Dữ Liệu SQLite & Sao Lưu / Phục Hồi SQL](#413--cơ-sở-dữ-liệu-sqlite--sao-lưu--phục-hồi-sql)
5. [Chế Độ Máy Chiếu & Âm Thanh Tương Tác](#5-chế-độ-máy-chiếu--âm-thanh-tương-tác)
6. [Cấu Trúc Thư Mục Dự Án](#6-cấu-trúc-thư-mục-dự-án)
7. [Mẹo Giảng Dạy & Phím Tắt Tiện Ích](#7-mẹo-giảng-dạy--phím-tắt-tiện-ích)

---

## 1. Giới Thiệu Tổng Quan

**EduICT Primary** (gọi tắt là **EduICT**) là ứng dụng web toàn diện được thiết kế chuyên biệt phục vụ giáo viên giảng dạy bộ môn **Tin học tại các trường Tiểu học**. 

Ứng dụng giải quyết triệt để những khó khăn đặc thù trong tiết học 35 phút tại phòng máy:
- Học sinh mải chơi game, mở YouTube, mất trật tự hoặc bấm tắt nguồn sai quy trình.
- Sơ đồ phòng máy đông (lên đến 35 - 45 học sinh/phòng 31 máy, phải ngồi ghép đôi 2 bạn/máy).
- Quản lý máy tính hỏng hóc đồng bộ giữa các lớp học trong trường.
- Đánh giá học sinh theo đúng quy định:
  - **Khối 1 & 2**: Không chấm điểm số, chỉ theo dõi 3 kỹ năng cốt lõi (Chuột, Bàn phím, Paint) theo mức Tốt (T) - Hoàn thành (H) - Cần cố gắng (C).
  - **Khối 3, 4 & 5**: Đánh giá chuẩn **Thông tư 27/2020/TT-BGDĐT** (Đánh giá thường xuyên mức T/H/C, điểm kiểm tra thực hành cuối kỳ thang điểm 10, tính điểm trung bình và xếp loại tự động).
- Tích hợp **Gamification (Trò chơi hoá học tập)** giúp tiết học sôi nổi, hào hứng và tạo động lực học tập cho học sinh tiểu học.

---

## 2. Điểm Nổi Bật Dành Cho Giáo Viên Tin Học

| Tính Năng | Mô Tả Lợi Ích |
| :--- | :--- |
| **🎯 Classroom Session** | Trung tâm điều khiển tiết học trọn vẹn: lên tiến trình bài học (Lesson Flow), Master Timer, bấm giờ hoạt động, ghi nhận phát biểu và thưởng sao 1-chạm. |
| **🖥️ Phòng Máy 31 Máy** | Sơ đồ 5 dãy trực quan, hỗ trợ ngồi đơn và ngồi đôi 2 học sinh/máy, quản lý máy hỏng dùng chung toàn trường, cộng/trừ điểm theo máy tính. |
| **📋 Đánh Giá Chuẩn TT27** | Tự động phân loại khối 1-2 (sổ kỹ năng) và khối 3-4-5 (chuẩn Thông tư 27), tính điểm trung bình, xếp loại và thư viện nhận xét vnEdu/SMAS 1-click. |
| **🎮 Gamification Đỉnh Cao** | Mini-game Đua Vịt bơi sông, Vòng Quay may mắn bốc thăm công bằng, kho thẻ bảo bối đổi thưởng và cơ chế đổi 10⭐ = +1.0 điểm kiểm tra. |
| **📺 Tối Ưu Máy Chiếu** | Nút chuyển đổi **Projector Mode** tức thì (chữ to, số lớn, độ tương phản cao trên màn chiếu xa) kết hợp phím **F11** toàn màn hình. |
| **💾 SQLite Cục Bộ An Toàn** | Lưu trữ trực tiếp vào file CSDL `edumaster.sqlite` tại thư mục máy tính giáo viên, hỗ trợ xuất file script `.sql` và tải file database nhị phân về máy. |
| **🔊 100% Offline Âm Thanh** | Âm thanh tổng hợp qua Web Audio API tại chỗ (tiếng ting ting cộng sao, còi đua, tiếng cạch cạch vòng quay, chuông buzzer hết giờ) không cần mạng Internet. |

---

## 3. Cài Đặt & Khởi Chạy

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 20 trở lên (khuyến nghị **Node.js 22 LTS** để sử dụng tính năng SQLite native `node:sqlite`).
- **Trình duyệt**: Google Chrome, Microsoft Edge, Cốc Cốc hoặc Mozilla Firefox phiên bản mới.

### Các Bước Cài Đặt & Chạy Ứng Dụng

1. **Mở thư mục dự án**:
   ```bash
   cd d:/DU_AN/quan_ly_HS
   ```

2. **Cài đặt các gói thư viện phụ thuộc**:
   ```bash
   npm install
   ```

3. **Khởi chạy môi trường phát triển (Development Server)**:
   ```bash
   npm run dev
   ```
   *Ứng dụng sẽ tự động chạy tại địa chỉ:* `http://localhost:5173` *(hoặc cổng được Vite cung cấp).*

4. **Kiểm tra mã nguồn & Biên dịch bản Production**:
   ```bash
   # Kiểm tra linting với Oxlint siêu tốc
   npm run lint

   # Biên dịch bản sản phẩm hoàn chỉnh
   npm run build
   ```

5. **Chạy máy chủ độc lập (Production Server)**:
   ```bash
   node server.js
   ```

---

## 4. Hướng Dẫn Chi Tiết Các Chức Năng

---

### 4.1. 🎯 Trung Tâm Tiết Học (Classroom Session)

Module điều khiển trung tâm giúp giáo viên quản lý toàn bộ vòng đời một tiết học 35 phút mà không phải chuyển qua lại giữa nhiều tab.

#### Cách Sử Dụng:
1. Trên thanh điều hướng trên cùng, bấm vào tab **`🎯 Tiết Học (Session)`**.
2. **Tạo Session mới**:
   - Bấm nút **`➕ Tạo Classroom Session Mới`**.
   - Chọn lớp giảng dạy, nhập tên bài học (hoặc bấm chọn nhanh từ danh mục **Gợi ý bài học theo khối**).
   - Chọn thời lượng (mặc định 35 phút).
   - Chọn **Mẫu cấu trúc bài giảng (Lesson Flow)**:
     - *Mẫu 1*: Tiết lý thuyết & thực hành chuẩn (Khởi động 5p $\rightarrow$ Giảng bài 10p $\rightarrow$ Thực hành 10p $\rightarrow$ Quick Quiz 5p $\rightarrow$ Tổng kết 5p).
     - *Mẫu 2*: Tiết thực hành trọng tâm (Khởi động 5p $\rightarrow$ Thực hành 20p $\rightarrow$ Bốc thăm báo cáo 5p $\rightarrow$ Đánh giá & Tắt máy 5p).
     - *Mẫu 3*: Tiết ôn tập & Gamification (Khởi động 5p $\rightarrow$ Đua vịt giải đố 10p $\rightarrow$ Thực hành tốc độ 10p $\rightarrow$ Đấu trường Quiz 5p $\rightarrow$ Trao thưởng 5p).
   - Bấm **`Tạo & Bắt Đầu Ngay`** (hoặc `Lưu Bản Nháp`).
3. **Màn hình điều khiển lúc lên lớp (Session Dashboard)**:
   - **Đồng hồ đếm ngược**: Hiển thị đồng thời thời gian còn lại của toàn tiết học và thời gian của hoạt động đang diễn ra.
   - **Điều khiển tiến trình bài học (Lesson Flow)**: Bấm `[Bắt đầu]`, `[Hoàn thành]`, `[Bỏ qua]`, đổi thứ tự hoặc thêm hoạt động trực tiếp.
   - **Ghi nhận học sinh 1-chạm (Participation Board)**: Bấm các nút huy hiệu cạnh tên từng học sinh:
     - `[🙋]` Xung phong phát biểu
     - `[💡]` Ý kiến sáng tạo (+1⭐)
     - `[🏆]` Trả lời đúng (+1⭐)
     - `[🤝]` Giúp bạn cùng máy (+1⭐)
     - `[⭐]` Thưởng sao thi đua (+1⭐)
   - **Thanh điều khiển cố định (Control Bar)**: Bấm `[Trước]`, `[Tạm dừng / Tiếp tục]`, `[Tiếp]`, `[+1p]`, mở nhanh `[🎡 Vòng Quay]`, `[🦆 Đua Vịt]`, `[⚡ Quick Quiz]`.
4. **Kết thúc tiết học**:
   - Bấm `[🏁 Kết Thúc]`, xác nhận kết thúc.
   - Hệ thống tự động xuất **Báo cáo tổng kết (Session Summary)**: Tỷ lệ học sinh tham gia, số sao đã thưởng, các hoạt động hoàn thành và **Bục vinh quang Top 3 học sinh xuất sắc nhất**.
5. **Khả năng chống mất dữ liệu (F5 Resilience)**:
   - Nếu giáo viên vô tình tải lại trang (F5) hoặc mất điện, khi mở lại ứng dụng sẽ tự động nhận diện tiết học đang chạy và bấm `[Tiếp Tục Tiết Học Ngay]` để tiếp tục giảng dạy chính xác đến từng giây.

---

### 4.2. 📚 Thư Viện Bài Học & Trình Chiếu (Lesson + Presentation)

Module hỗ trợ giáo viên xây dựng bài giảng lý thuyết và thực hành chuẩn GDPT 2018, thiết kế slide tương tác và trình chiếu trực tiếp trên máy chiếu phòng học.

#### 1. Thư Viện Bài Học (Lesson Library)
- **Lưới thẻ bài trực quan**: Danh sách toàn bộ bài học có phân loại màu theo Khối 1 - 5, Chủ đề GDPT 2018 (Chủ đề A đến F), thời lượng (35 phút) và số lượng slide.
- **Tìm kiếm & Lọc nhanh**: Lọc theo từng Khối lớp (K1 - K5), lọc theo Chủ đề hoặc gõ từ khóa tìm kiếm.
- **Thao tác nhanh**:
  - `[+ Soạn Bài Học Mới]`: Tạo bài giảng mới từ khung mẫu.
  - `[▶ Trình Chiếu]`: Mở toàn màn hình trình chiếu ngay lập tức.
  - `[✏️ Sửa]`: Chỉnh sửa nội dung từng slide và thông tin bài học.
  - `[📋 Nhân Bản]`: Tạo bản sao bài học kèm toàn bộ slide để tái sử dụng.
  - `[🗑️ Xóa]`: Xóa bài học kèm các slide con.

#### 2. Trình Soạn Thảo Slide (Lesson Editor)
- **Giao diện 2 cột chuẩn**:
  - *Cột trái (Slide Navigator)*: Xem danh sách slide thumbnail, đánh số thứ tự (01, 02...), huy hiệu loại slide, đổi thứ tự lên/xuống, nhân bản hoặc xóa slide.
  - *Cột phải (Slide Canvas & Controls)*: Xem trước trực quan (Live Canvas Preview) và form chỉnh sửa nội dung.
- **Hỗ trợ 7 loại Slide sư phạm chuyên biệt**:
  - `🏷️ TITLE`: Trang bìa bài học (Tên bài, phân môn, khối, tên giáo viên).
  - `📝 CONTENT`: Nội dung kiến thức mới, gạch đầu dòng rõ ràng, chuẩn font chữ lớn.
  - `🖼️ IMAGE`: Hình ảnh minh họa linh kiện, sơ đồ mạng (bố cục Chuẩn, Chia đôi Trái/Phải).
  - `🎥 VIDEO`: Video hướng dẫn thao tác phần mềm kèm đường dẫn liên kết.
  - `❓ QUESTION`: Câu hỏi trắc nghiệm 4 phương án A, B, C, D (giáo viên bấm để hiển thị đáp án đúng & giải thích).
  - `💻 ACTIVITY`: Nhiệm vụ thực hành trên máy tính (chọn hình thức Cá nhân hoặc Ngồi ghép đôi 2 bạn/máy, thời lượng 5-15 phút).
  - `⭐ SUMMARY`: Ghi nhớ cốt lõi bài học và nội quy phòng máy.
- **👨‍🏫 Teacher Notes (Ghi chú sư phạm)**:
  - Mỗi slide có khung ghi chú riêng cho giáo viên (câu hỏi gợi mở, đáp án, mẹo nhắc nhở).
  - **Chỉ hiển thị cho giáo viên trên máy tính điều khiển, tuyệt đối không hiển thị lên máy chiếu**.

#### 3. Chế Độ Trình Chiếu (Presentation Mode)
- **Tối ưu máy chiếu**: Chữ to gấp đôi, độ tương phản cao, tự động căn chỉnh khung hình 16:9.
- **Điều khiển phím tắt**:
  - `→`, `Space`, `PageDown`: Sang slide tiếp theo.
  - `←`, `PageUp`: Quay lại slide trước.
  - `Esc`: Thoát trình chiếu.
  - `F11`: Bật/tắt toàn màn hình.
- **Thanh công cụ nổi (Floating Dock)**:
  - Chọn nhanh slide bất kỳ (`03 / 06`).
  - `⭐ Thưởng Sao`: Mở popup thưởng sao 1-chạm cho học sinh trong lớp đang dạy.
  - `🎡 Vòng Quay`: Bốc thăm học sinh ngẫu nhiên trả lời câu hỏi của slide.
  - `📖 Ghi Chú`: Mở ngăn kéo xem Teacher Notes mà không cản trở bài học.
- **Tích hợp với Classroom Session**:
  - Có thể mở trực tiếp từ màn hình Tiết Học (`SessionDashboard`) qua nút `[📺 Trình Chiếu Bài Học]`.
  - Đồng hồ đếm ngược của tiết học vẫn chạy chính xác trong nền.
  - Thoát trình chiếu quay lại ngay tiết học mà không mất dữ liệu.

---

### 4.3. ⚡ Quick Quiz & Ngân Hàng Câu Hỏi Trắc Nghiệm (GDPT 2018)

Module đánh giá nhanh mức độ hiểu bài của học sinh ngay trong tiết học mà **không bắt buộc học sinh phải có điện thoại, máy tính cá nhân hay tài khoản đăng nhập**. Học sinh có thể giơ thẻ A/B/C/D, giơ tay hoặc trả lời miệng; giáo viên ghi nhận kết quả và hệ thống tự động tổng hợp.

#### 1. Ngân Hàng Câu Hỏi (Question Bank)
- **Chuẩn chương trình GDPT 2018**: Phân loại theo Khối lớp (1 đến 5) và 6 Chủ đề cốt lõi:
  - Chủ đề A: Máy tính và em.
  - Chủ đề B: Mạng máy tính và Internet.
  - Chủ đề C: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin.
  - Chủ đề D: Đạo đức, pháp luật và văn hóa trong môi trường số.
  - Chủ đề E: Ứng dụng tin học (Gõ phím 10 ngón, Paint, Word).
  - Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính (Lập trình Scratch).
- **Phân loại mức độ nhận thức**: Nhận biết (Xanh lá), Thông hiểu (Xanh dương), Vận dụng (Vàng cam).
- **Hỗ trợ 5 dạng câu hỏi**: Trắc nghiệm 4 lựa chọn (A/B/C/D), Đúng / Sai, Điền khuyết, Vấn đáp phát biểu, Chọn tranh ảnh.
- **Thao tác ngân hàng**: Thêm mới, chỉnh sửa, nhân bản câu hỏi, xem trước giao diện máy chiếu (Preview) và tìm kiếm từ khóa tức thời.

#### 2. Thiết Lập Quick Quiz Nhanh
- Tùy chọn nguồn câu hỏi: Theo khối lớp, theo chủ đề GDPT hoặc gắn với bài học cụ thể.
- Số lượng câu hỏi linh hoạt (3, 5, 7, 10 câu).
- Đếm ngược mỗi câu (15s, 20s, 30s hoặc không giới hạn).
- **🔀 Thuật toán xáo trộn thông minh (Fisher-Yates)**:
  - Trộn ngẫu nhiên thứ tự câu hỏi.
  - Xáo trộn thứ tự các phương án A/B/C/D mà **vẫn bảo toàn 100% vị trí đáp án đúng**.
- **2 Chế độ kiểm tra (Quiz Modes)**:
  - **Mode 1 – Class Mode (Mặc định)**: Học sinh giơ thẻ hoặc biểu quyết giơ tay. Giáo viên nhập số lượng hoặc bấm nhanh đáp án số đông; hệ thống tự tính tỷ lệ chính xác % của cả lớp.
  - **Mode 2 – Student Mode**: Giáo viên đánh dấu từng em ✅ Đúng / ❌ Sai / — Chưa trả lời. Học sinh trả lời đúng được tự động tích lũy ⭐ thưởng thi đua.

#### 3. Trình Chiếu Đố Vui (Quiz Projector Mode)
- Phông chữ và số siêu lớn, độ tương phản cao, tối ưu hiển thị rõ nét trên màn chiếu xa cuối lớp.
- Đồng hồ đếm ngược số to đổi màu vàng/đỏ trong 10 giây cuối kèm hiệu ứng âm thanh tick và chuông buzzer khi hết giờ.
- Nút `[🎉 Hiện Đáp Án]`: Làm nổi bật phương án đúng màu xanh lá cây rực rỡ, hiển thị số học sinh trả lời đúng, tỷ lệ % và khung giải thích sư phạm chi tiết.

#### 4. Phân Tích Sư Phạm & Khuyến Nghị (Learning Analytics)
- Báo cáo kết thúc đố vui: Tỷ lệ chính xác trung bình toàn bài, câu hỏi học sinh làm tốt nhất và câu khó nhất.
- **Cảnh báo sư phạm tự động**: Nếu phát hiện câu hỏi có tỷ lệ đúng < 50%, hệ thống đưa ra khuyến nghị nhắc nhở giáo viên dành 2–3 phút củng cố lại khái niệm đó cho cả lớp.
- **Tích hợp sâu**: Mở trực tiếp từ **Classroom Session** và **Presentation View**, lưu kết quả vào nhật ký sự kiện tiết học và đồng bộ sao ⭐ vào Sổ Điểm.

---

### 4.4. 🖥️ Sơ Đồ Phòng Máy Thực Hành (5 Dãy • 31 Máy)

Phòng máy được thiết kế dựa trên thực tế các phòng thực hành Tin học trường Tiểu học:
- **Quy mô chuẩn 31 máy**:
  - Dãy 1 (Sát bàn giáo viên): 7 máy (Máy 1 đến Máy 7).
  - Dãy 2: 6 máy (Máy 8 đến Máy 13).
  - Dãy 3 (Trung tâm): 6 máy (Máy 14 đến Máy 19).
  - Dãy 4: 6 máy (Máy 20 đến Máy 25).
  - Dãy 5 (Phía cửa ra vào): 6 máy (Máy 26 đến Máy 31).

#### Các Tính Năng Chính:
- **Đổi vị trí bàn giáo viên**: Chuyển đổi giữa **Bàn GV Bên Phải** hoặc **Bàn GV Bên Trái** phù hợp với thực tế phòng máy trường học.
- **Hỗ trợ chế độ ngồi đôi (2 học sinh/máy)**: Tự động sắp xếp 2 bạn cùng thực hành trên 1 máy khi sĩ số lớp vượt quá số lượng máy hoạt động.
- **Xếp chỗ thông minh**:
  - `Xếp Tự Động`: Ưu tiên mỗi máy 1 bạn, nếu thiếu máy sẽ ghép đôi vào các máy hoạt động.
  - `Xếp Ngẫu Nhiên`: Đổi vị trí chỗ ngồi ngẫu nhiên tạo hứng khởi.
  - `Đặt Lại`: Xóa toàn bộ số máy để xếp lại.
- **Báo hỏng máy dùng chung toàn trường**:
  - Bấm vào máy tính $\rightarrow$ chọn `Báo máy hỏng`.
  - Máy hỏng được đánh dấu màu xám sọc cảnh báo và tự động đồng bộ trên **tất cả 23 lớp học trong trường**. Khi xếp chỗ tự động, hệ thống sẽ tự động bỏ qua các máy hỏng này.
- **Popup tương tác theo máy**:
  - Bấm vào máy tính bất kỳ để xem danh sách học sinh đang ngồi.
  - Đổi chỗ hoặc chuyển học sinh sang máy khác.
  - Bấm `[+⭐ Thưởng sao]` hoặc trừ sao theo tiêu chí **Nội quy phòng máy**.

---

### 4.5. 📋 Sổ Điểm & Sổ Đánh Giá Kỹ Năng (Chuẩn TT27)

Hệ thống tự động nhận diện khối lớp và chuyển đổi giao diện đánh giá tương ứng:

#### A. Dành Cho Khối 1 & Khối 2 (Làm quen & Rèn kỹ năng - Không chấm điểm số):
- Đánh giá 3 kỹ năng thực hành nền tảng:
  - 🖱️ **Kỹ năng Chuột**: Cầm chuột đúng, nhấp chuột, nhấp đúp, kéo thả mượt mà.
  - ⌨️ **Kỹ năng Bàn phím**: Đặt tay đúng hàng phím cơ sở (F, J), nhận biết phím Enter, Space, phím chữ, phím số.
  - 🎨 **Kỹ năng Paint**: Mở phần mềm Paint, chọn hình khối chữ nhật, hình tròn, tô màu không lem.
- Mức xếp loại: **T** (Tốt), **H** (Hoàn thành), **C** (Cần cố gắng).
- Tích lũy sao khen thưởng thi đua.

#### B. Dành Cho Khối 3, Khối 4 & Khối 5 (Chuẩn Thông tư 27/2020/TT-BGDĐT):
- Cột đánh giá thường xuyên: **Đ.Giá TX (T / H / C)**.
- Điểm kiểm tra thực hành: **T.Hành HK1** và **T.Hành CK (Cuối năm)** theo thang điểm 10.
- **Tự động tính Điểm Trung Bình (ĐTB)** và **Tự động Xếp loại TT27**:
  - *Hoàn thành xuất sắc* (ĐTB $\ge$ 9.0 và Đ.Giá TX mức T).
  - *Hoàn thành tốt* (ĐTB $\ge$ 7.0 đến < 9.0 và Đ.Giá TX từ mức H trở lên).
  - *Hoàn thành* (ĐTB $\ge$ 5.0 đến < 7.0).
  - *Chưa hoàn thành* (ĐTB < 5.0 hoặc Đ.Giá TX mức C).

#### C. Tiện ích quản trị Sổ điểm:
- **Thư viện mẫu nhận xét nhanh vnEdu / SMAS**: Hơn 15 mẫu nhận xét chuẩn mực theo từng khối lớp, click chọn là điền ngay vào ô nhận xét của học sinh.
- **Tìm kiếm & Bộ lọc**: Tìm theo họ tên, mã học sinh, số máy; lọc theo giới tính (Nam/Nữ) và mức đánh giá (T/H/C).
- **Nhập / Xuất Excel (.xlsx)**:
  - Bấm `Xuất Excel` để tải bảng điểm về máy tính nộp ban giám hiệu hoặc nạp vào vnEdu/SMAS.
  - Bấm `Nhập Excel` để nạp danh sách học sinh từ file Excel mẫu có sẵn.

---

### 4.6. ⭐ Điểm Tốt, Điểm Trừ & Nội Quy Phòng Máy

Bao gồm 3 phân hệ phục vụ công tác thi đua nền nếp phòng Tin học:
1. **Bảng Tổng Quan**: Bảng vàng vinh danh học sinh dẫn đầu về số sao, biểu đồ phân loại khen thưởng và vi phạm.
2. **Nhật Ký Thi Đua**: Ghi lại lịch sử chi tiết từng lần cộng/trừ sao (học sinh, máy số mấy, nội dung, ngày giờ, giáo viên ghi chú). Hỗ trợ xuất nhật ký ra file Excel.
3. **Quản Lý Nội Quy Phòng Máy**:
   - Giáo viên được toàn quyền **Thêm mới, Chỉnh sửa, Xóa** các tiêu chí nội quy phòng máy.
   - Tiêu chí khen thưởng (+⭐): *Phát biểu hăng hái (+1⭐), Thực hành về đích sớm (+2⭐), Giúp đỡ bạn cùng máy (+1⭐), Sáng tạo Paint/Scratch (+2⭐), Bảo quản tốt máy tính (+1⭐), Thắng mini-game (+3⭐)*.
   - Tiêu chí vi phạm (-⭐): *Tự ý chơi game/mở YouTube (-2⭐), Mang đồ ăn nước ngọt vào phòng máy (-2⭐), Làm ồn la hét (-1⭐), Tự ý chạy lung tung (-1⭐), Tắt máy bằng rút điện/bấm nút nguồn (-2⭐), Không xếp ghế bàn phím khi về (-1⭐)*.
   - Nút `Khôi phục mặc định` để lấy lại bộ nội quy chuẩn ban đầu.

---

### 4.7. 🦆 Mini-game Đua Vịt Lớp Học (Duck Race)

Trò chơi đua vịt bơi trên dòng sông mô phỏng trên HTML5 Canvas:
- **Tạo sự kịch tính**: Các chú vịt bơi với vận tốc ngẫu nhiên, bất ngờ **Tăng Tốc Thần Tốc (Speed Boost)** kèm thông báo tên học sinh trên màn hình.
- **Bộ lọc chọn thí sinh tham gia**:
  - Chọn toàn bộ học sinh trong lớp.
  - Chọn ngẫu nhiên Top 5 hoặc Top 10 bạn.
  - **Lọc học sinh điểm miệng thấp (< 7 điểm)** để tạo cơ hội thi đua gỡ điểm.
- **Bục vinh quang**: Trao giải Nhất, Nhì, Ba kèm pháo hoa chúc mừng và tự động cộng sao thưởng:
  - 🥇 Hạng 1: **+3⭐**
  - 🥈 Hạng 2: **+2⭐**
  - 🥉 Hạng 3: **+1⭐**

---

### 4.8. 🎡 Vòng Quay May Mắn (Lucky Wheel)

- Vòng quay đa sắc hiển thị tên học sinh trên các nan quạt xoay tròn.
- Kim chỉ vị trí kèm âm thanh "tick-tick" chân thực theo vận tốc quay.
- **Tùy chọn loại trừ người đã gọi**: Đảm bảo không gọi trùng một bạn nhiều lần trong buổi học.
- Theo dõi lịch sử những học sinh đã được quay trúng trong tiết.
- Modal công bố kết quả với các lựa chọn: Thưởng Sao (⭐), Gọi trả lời bài cũ, hoặc Đổi câu hỏi khác.

---

### 4.9. 🎁 Cửa Hàng Đổi Thưởng & Bảo Bối Học Sinh

Kho thẻ đặc quyền quyền lợi học tập đổi bằng Sao tích lũy:
- 🛡️ **Thẻ Miễn Tử (15⭐)**: Được miễn trừ 1 lần kiểm tra bài cũ bất chợt trong tháng.
- 🤝 **Thẻ Cứu TrỢ Đồng Đội (10⭐)**: Được chỉ định 1 bạn trong lớp hỗ trợ khi gặp câu hỏi khó.
- 💺 **Thẻ Chọn Chỗ VIP (12⭐)**: Quyền ưu tiên chọn vị trí máy tính mong muốn trong 1 tuần.
- 🎯 **Thẻ +1 Điểm Học Tập (10⭐)**: Quy đổi sao sang điểm số kiểm tra.
- 🎵 **Thẻ DJ Lớp Học (5⭐)**: Được chọn 1 bài hát yêu thích phát vào giờ giải lao 5 phút cuối giờ.
- Tra cứu số dư sao của học sinh và xem bảng xếp hạng Top 5 học sinh giàu sao nhất.

---

### 4.10. ⚖️ Quy Đổi Sao Sang Điểm Số (10⭐ = +1.0 Điểm)

Cơ chế khuyến khích học tập:
- **Tỷ lệ quy đổi**: **10 Sao (⭐) = +1.0 Điểm số**.
- Hỗ trợ đổi điểm trực tiếp vào các cột điểm:
  - Điểm Miệng Lần 1 (`m1`) / Điểm Miệng Lần 2 (`m2`).
  - Điểm 15 Phút Lần 1 (`p15_1`) / Điểm 15 Phút Lần 2 (`p15_2`).
- **Quy tắc an toàn**: Không cho phép cộng vượt trần 10.0 điểm. Hệ thống tự động tính toán số sao khấu trừ và cập nhật trực tiếp vào cơ sở dữ liệu SQLite và Sổ điểm.

---

### 4.11. ⏱️ Đồng Hồ Đếm Giờ Lớp Học (Classroom Timer)

- Thiết kế số đếm ngược khổng lồ rõ nét từ khoảng cách xa trên máy chiếu hoặc tivi thông minh.
- Các nút chọn nhanh thời gian thông dụng: **10 giây, 30 giây, 1 phút, 2 phút, 5 phút, 10 phút, 15 phút**.
- Nút cộng dồn thời gian linh hoạt: `+30s`, `+1p`.
- Cảnh báo trực quan: Đổi sang màu đỏ cảnh báo hồi hộp trong 10 giây cuối kèm âm thanh đếm tick.
- Chuông báo buzzer khi hết giờ kết hợp nhạc chiến thắng và pháo hoa chúc mừng.

---

### 4.12. 🏫 Quản Lý Lớp Học & Bộ Lọc 5 Khối

- **Bộ chuyển đổi nhanh 5 Khối lớp (K1 - K5)**: Nhấp chuột chuyển nhanh danh sách lớp giữa Khối 1, Khối 2, Khối 3, Khối 4, Khối 5 hoặc Tất Cả.
- **Thêm lớp học mới**: Nhập tên lớp, chọn khối (1-5), tên phân môn và năm học.
- **Xóa lớp học**: Có hộp thoại xác nhận cảnh báo an toàn tránh xóa nhầm dữ liệu điểm của học sinh.

---

### 4.13. 💾 Cơ Sở Dữ Liệu SQLite & Sao Lưu / Phục Hồi SQL

EduICT lưu trữ dữ liệu an toàn ngay trên máy tính của giáo viên:
- **Tệp CSDL SQLite Cục Bộ (`edumaster.sqlite`)**:
  - Dữ liệu được lưu trữ tự động bằng SQLite chuẩn Engine của Node.js (hỗ trợ WAL mode và Foreign Keys).
  - Tự động đồng bộ 2 chiều giữa React State, LocalStorage và SQLite Backend.
- **Tải File Database SQLite (.sqlite)**:
  - Cho phép tải file nhị phân gốc `edumaster.sqlite` về USB hoặc máy tính cá nhân. Có thể mở và quản lý bằng phần mềm *DB Browser for SQLite* hoặc *VS Code SQLite Viewer*.
- **Xuất File Kịch Bản Mã SQL Script (.sql)**:
  - Tự động sinh file text chứa toàn bộ câu lệnh `CREATE TABLE` và `INSERT INTO` (cho các bảng `classes`, `students`, `broken_machines`, `app_settings`, `classroom_sessions`, `session_activities`, `session_events`, `student_participation`, `question_bank`, `quiz_sessions`, `quiz_questions`, `quiz_results`, `quiz_student_results`).
- **Nạp & Thực Thi Kịch Bản SQL (.sql)**:
  - Chọn file kịch bản `.sql` có sẵn để cập nhật hoặc khôi phục lại toàn bộ CSDL.
- **Sao lưu / Phục hồi file JSON Web**:
  - Xuất/nhập file `.json` dự phòng nhanh toàn diện dữ liệu.

---

## 5. Chế Độ Máy Chiếu & Âm Thanh Tương Tác

### 📺 Chế Độ Máy Chiếu (Projector Mode)
- Bấm nút **`Máy chiếu`** trên thanh điều hướng để kích hoạt thuộc tính `data-projector="true"`.
- Toàn bộ cỡ chữ, số đếm giờ và độ tương phản màu sắc được phóng to và làm sắc nét, giúp học sinh ngồi ở dãy cuối phòng máy vẫn nhìn rõ ràng.
- Kết hợp nhấn phím **F11** trên bàn phím máy tính để mở toàn màn hình trình duyệt (Fullscreen).

### 🔊 Hệ Thống Hiệu Ứng Âm Thanh Tương Tác
- Sử dụng **Web Audio API** tổng hợp dao động sóng âm trực tiếp trong trình duyệt, **hoàn toàn offline và không tải bất kỳ file âm thanh nào từ Internet**:
  - Tiếng leng keng nhận sao (`playStarDing`).
  - Tiếng còi xuất phát và bơi vịt (`playQuack`, `playBoost`).
  - Tiếng bánh xe quay cạch cạch (`playTick`).
  - Khúc nhạc kèn chiến thắng (`playVictory`).
  - Chuông báo động hết giờ (`playBuzzer`).
- Nút bật/tắt âm thanh nhanh ngay trên thanh điều hướng.

---

## 6. Cấu Trúc Thư Mục Dự Án

```text
quan_ly_HS/
├── edumaster.sqlite              # File cơ sở dữ liệu SQLite cục bộ
├── index.html                    # Trang HTML gốc ứng dụng
├── package.json                  # Cấu hình dự án và dependencies
├── server.js                     # Máy chủ HTTP Node.js độc lập
├── vite.config.js                # Cấu hình Vite bundler & SQLite plugin
├── server/
│   ├── api-handler.js            # Điều phối REST API (/api/*)
│   ├── db.js                     # Khởi tạo CSDL SQLite, schema và các hàm CRUD
│   └── vite-sqlite-plugin.js     # Middleware SQLite tích hợp trong Vite dev server
└── src/
    ├── App.jsx                   # Component gốc & Router điều hướng tabs
    ├── index.css                 # Hệ thống CSS Design System & Projector Mode
    ├── main.jsx                  # Điểm khởi động React 19
    ├── utils/
    │   ├── audio.js              # Web Audio API synthesizer offline
    │   └── storage.js            # Quản lý lớp, học sinh, điểm TT27, nội quy, Excel
    └── components/
        ├── Navbar.jsx            # Thanh điều hướng, bộ lọc khối 1-5, quản lý CSDL
        ├── HomeDashboard.jsx     # Trang chủ tổng quan các phân hệ
        ├── Gradebook.jsx         # Sổ điểm TT27 & Sổ kỹ năng Khối 1-2
        ├── SeatingChart.jsx      # Sơ đồ phòng máy 5 dãy • 31 máy
        ├── GoodScoresBoard.jsx   # Sổ điểm tốt, điểm trừ & nội quy phòng máy
        ├── DuckRace.jsx          # Mini-game Đua Vịt lớp học
        ├── LuckyWheel.jsx        # Vòng quay may mắn gọi học sinh
        ├── RewardShop.jsx        # Cửa hàng đổi bảo bối & sao
        ├── StarExchangeModal.jsx # Popup quy đổi 10⭐ = +1.0 điểm
        ├── ClassroomTimer.jsx    # Đồng hồ đếm ngược lớp học
        ├── ClassroomSession/     # Module Trung Tâm Tiết Học
        │   ├── SessionManager.jsx             # Điều phối danh sách & phòng học
        │   ├── SessionList.jsx                # Danh sách các tiết học
        │   ├── CreateSessionModal.jsx         # Form tạo tiết học mới & Lesson Flow
        │   ├── SessionDashboard.jsx           # Màn hình điều khiển tiết học lúc lên lớp
        │   ├── SessionHeader.jsx              # Tiêu đề bài giảng & chỉ số nhanh
        │   ├── SessionTimerDisplay.jsx        # Master Timer & Activity Timer
        │   ├── LessonFlowList.jsx             # Quản lý tiến trình bài học (Activities)
        │   ├── StudentParticipationGrid.jsx   # Bảng tương tác & thưởng sao 1-chạm
        │   ├── SessionControlBar.jsx          # Thanh điều khiển cố định chân trang
        │   ├── QuickToolModal.jsx             # Popup mở nhanh Vòng Quay/Đua Vịt/Quiz
        │   ├── SessionSummaryModal.jsx        # Báo cáo tổng kết & bục vinh quang
        │   └── sessionStorage.js              # Service API & cache cho Session
        ├── LessonPresentation/   # Module Bài Học & Trình Chiếu
        │   ├── LessonManager.jsx              # Điều phối Thư viện, Soạn thảo & Trình chiếu
        │   ├── LessonLibrary.jsx              # Thư viện bài học, lọc 5 khối, tìm kiếm
        │   ├── LessonEditor.jsx               # Soạn giáo án số, canvas, thumbnail slides
        │   ├── SlideRenderer.jsx              # Render 7 loại slide chuẩn sư phạm
        │   ├── PresentationView.jsx           # Trình chiếu toàn màn hình máy chiếu
        │   ├── TeacherNotesDrawer.jsx         # Ghi chú sư phạm (chỉ GV thấy)
        │   └── lessonStorage.js               # Service API & cache dữ liệu GDPT 2018
        └── QuickQuiz/            # Module ⚡ Quick Quiz Đố Vui Tức Thời (MỚI)
            ├── QuickQuizManager.jsx           # Điều phối Ngân hàng, Trình chiếu & Kết quả
            ├── QuestionBankView.jsx           # Quản lý ngân hàng câu hỏi, lọc khối & chủ đề
            ├── QuestionFormModal.jsx          # Thêm/Sửa câu hỏi kèm Live Canvas Preview
            ├── CreateQuizModal.jsx            # Cấu hình đố vui, chọn chế độ Lớp / Cá nhân
            ├── QuizPlayer.jsx                 # Màn hình đố vui chiếu toàn màn hình & đếm ngược
            ├── QuizResultModal.jsx            # Báo cáo kết quả & cảnh báo sư phạm
            └── quizStorage.js                 # Service API, Fisher-Yates shuffle & cache offline
```

---

## 7. Mẹo Giảng Dạy & Phím Tắt Tiện Ích

1. **Bật toàn màn hình khi giảng dạy**: Nhấn phím **F11** trên bàn phím máy tính để ẩn thanh công cụ trình duyệt, sau đó bật **Máy chiếu: BẬT** trên thanh điều hướng EduICT.
2. **Khen thưởng khích lệ trong tiết học**: Trong lúc học sinh làm bài thực hành, giáo viên mở màn hình **Tiết Học (Classroom Session)** hoặc **Phòng Máy Thực Hành** để thưởng sao nhanh 1-chạm; tiếng chuông *ting ting* leng keng sẽ kích thích cả lớp thi đua tập trung làm bài.
3. **Gọi học sinh gỡ điểm**: Khi kiểm tra bài cũ hoặc củng cố, sử dụng mini-game **Đua Vịt** với bộ lọc *"Học sinh điểm miệng < 7 điểm"* để tạo cơ hội công bằng và vui vẻ cho các em học sinh còn rụt rè.
4. **Sao lưu dữ liệu định kỳ**: Trước khi kết thúc kỳ học hoặc chuyển máy tính dạy, bấm vào **`CSDL SQL`** trên thanh điều hướng $\rightarrow$ bấm **`Tải .sqlite`** hoặc **`Xuất .sql`** để lưu trữ một bản sao an toàn vào USB.

---

*EduICT Primary - Đồng hành cùng thầy cô trong từng tiết học Tin học Tiểu học vui tươi, chuẩn mực và sáng tạo!*
