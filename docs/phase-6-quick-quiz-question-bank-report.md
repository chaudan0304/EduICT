# Phase 6 — Quick Quiz + Question Bank
## Báo Cáo Tiến Độ & Deliverables

> **Trạng thái**: ✅ HOÀN THÀNH GIAI ĐOẠN 6
> **Ngày**: 2026-09-30
> **Baseline**: 25/25 Phase 5 tests PASS, build clean
> **Kết quả**: 3/3 Phase 6 tests PASS, All previous tests PASS (100% xanh), build clean, zero regressions

---

## I. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────┐
│                    QuickQuizManager.jsx                      │
│   (Điều phối toàn bộ logic khởi tạo & vận hành Quick Quiz)   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ QuestionBankView│ │CreateQuizModal │ │  QuizPlayer    │  │
│  │ (Quản lý CSDL)  │ │ (Cấu hình)     │ │ (Trình chiếu)  │  │
│  └────────┬────────┘ └────────┬───────┘ └────────┬───────┘  │
│           │                   │                  │          │
│           └───────────────────┼──────────────────┘          │
│                               │                             │
│                    ┌──────────┴────────┐                    │
│                    │     quiz.js       │                    │
│                    │   (Server API)    │                    │
│                    └──────────┬────────┘                    │
│                               │                             │
│       ┌───────────────────────┴────────────────────────┐    │
│       │        SQLite Database (quiz_sessions,         │    │
│       │        question_bank, quiz_questions...)       │    │
│       └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## II. CÁC HẠNG MỤC ĐÃ HOÀN THÀNH (7 GAPS FIXED)

Trong Giai đoạn 6, hệ thống UI và API cơ bản của Quick Quiz đã tồn tại. Trọng tâm là hoàn thiện độ ổn định, chính xác và sửa 7 lỗ hổng (gaps) được phát hiện qua quá trình Audit:

1. **G1 & G7 (Tích hợp QuickToolModal)**
   - **Vấn đề**: `QuickToolModal` hiển thị placeholder giả lập thay vì khởi chạy Quiz thực tế.
   - **Giải quyết**: Kết nối `QuickQuizManager` vào `QuickToolModal`, đồng bộ State để Classroom Session có thể trực tiếp mở trình tạo câu đố thông qua icon "Quiz" từ thanh công cụ.

2. **G2 (Server-side validation cho Question API)**
   - **Vấn đề**: API thiếu kiểm tra tính hợp lệ của câu hỏi (trống, sai format, không có đáp án).
   - **Giải quyết**: Đã viết thêm hàm `validateQuestionPayload` trong `server/routes/quiz.js`, chặn từ chối ngay ở HTTP Request trả về mã lỗi 400 rõ ràng.

3. **G3 (Cơ chế Soft Delete)**
   - **Vấn đề**: Hàm `deleteQuestion` dùng lệnh `DELETE` cứng (hard delete), gây lỗi hiển thị hoặc lỗi mất lịch sử của các phiên thi trước đó (dù có snapshot).
   - **Giải quyết**: Thêm trường `is_deleted` vào `question_bank` qua database schema migration (`ALTER TABLE`). Khi xoá, kiểm tra nếu câu hỏi chưa được dùng thì xoá cứng, nếu đã dùng trong quiz thì chuyển `is_deleted = 1`. Lọc loại bỏ các câu hỏi đã soft delete ở API Get danh sách.

4. **G4 (Cải tiến Timer thành Timestamp-based)**
   - **Vấn đề**: Bộ đếm ngược cũ dùng `setInterval` và trừ lùi `prev - 1` liên tục, rất dễ sai số do lag ở Thread hoặc React re-render.
   - **Giải quyết**: Tính trước `endTime = Date.now() + timeLeft` và trừ đi thời gian thực. Đảm bảo chính xác từng mili-giây kể cả khi tab bị deactive/dừng vẽ.

5. **G5 (Kiểm tra trùng lặp câu hỏi chính xác)**
   - **Vấn đề**: User có thể ấn tạo lặp đi lặp lại cùng một câu hỏi.
   - **Giải quyết**: Thêm logic Check Exact Duplicate ở `server/db/quiz.js` trong hàm `createQuestion`. Chặn và ném lỗi nếu tiêu đề, đáp án, tuỳ chọn, loại và độ khó giống hoàn toàn.

6. **G6 (Coverage - Test Suites Giai đoạn 6)**
   - **Giải quyết**: Đã khởi tạo mới `tests/phase6-quickquiz.test.js`, chạy Test database ảo và hoàn thiện Unit testing cho CRUD Câu hỏi + Tính năng Soft Delete + Tính năng chặn trùng lặp. 

7. **G7 (Regression & Build Assurance)**
   - **Giải quyết**: Khắc phục các vi phạm khoá ngoại (Foreign Key Constraint) trong lúc test, đảm bảo PRAGMA hợp lệ, và xác thực PASS toàn bộ test hiện có.

## III. BẢNG MÃ LỖI VÀ XỬ LÝ DATABASE (SQLITE)

- `ALTER TABLE question_bank ADD COLUMN is_deleted INTEGER DEFAULT 0;` (Tự động nạp vào file SQLite).
- Các lệnh `PRAGMA foreign_keys = OFF/ON` được sử dụng tinh gọn trong môi trường test để cô lập các test case độc lập.

## IV. BƯỚC TIẾP THEO (NEXT PHASE)

Hệ thống đã hoàn toàn sẵn sàng cho **Phase 7** (nếu có trong roadmap) liên quan tới báo cáo/thống kê sâu hơn hoặc tính năng Game hoá phức tạp hơn.
