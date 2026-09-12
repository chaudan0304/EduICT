/**
 * lessonFlowPrompt.js
 * Prompt gợi ý tiến trình tiết học (Lesson Flow) 35 phút cho phòng máy Tin học Tiểu học
 */

export function buildLessonFlowPrompt({ lessonTitle, grade, topic, durationMinutes = 35, objectives }) {
  return `Bạn là một chuyên gia phương pháp giảng dạy môn Tin học Tiểu học.
Nhiệm vụ của bạn là xây dựng kế hoạch tiến trình hoạt động (Lesson Flow) cho một tiết học ${durationMinutes} phút tại phòng máy tính (mô hình 31 máy, 1 học sinh/máy hoặc ngồi đôi).

THÔNG TIN TIẾT HỌC:
- Tên bài dạy: ${lessonTitle || 'Bài dạy Tin học'}
- Khối lớp: Khối ${grade || 3}
- Chủ đề: ${topic || 'Chung'}
- Thời lượng tiết học: Đúng ${durationMinutes} phút
${objectives ? `- Mục tiêu bài: ${objectives}` : ''}

QUY TẮC PHÂN BỔ 5 PHA TIẾT HỌC CHUẨN TIỂU HỌC:
1. Pha 1 - Khởi động (WARMUP): Khoảng 4 - 5 phút (khơi gợi hứng thú, trò chơi ngắn, xem video hoặc câu đố khởi động).
2. Pha 2 - Khám phá kiến thức mới (LESSON): Khoảng 8 - 10 phút (giáo viên hướng dẫn, trực quan hóa trên máy chiếu, học sinh quan sát).
3. Pha 3 - Thực hành tại phòng máy (ACTIVITY / PRACTICE): Khoảng 10 - 12 phút (học sinh tự thao tác trên máy tính, giáo viên quan sát hỗ trợ từng bạn).
4. Pha 4 - Đố vui củng cố (QUIZ): Khoảng 5 - 7 phút (sử dụng Quick Quiz đố vui hoặc Vòng quay may mắn).
5. Pha 5 - Tổng kết & Đánh giá (SUMMARY): Khoảng 3 - 5 phút (ghi nhớ kiến thức, dặn dò tắt máy đúng quy trình, thưởng sao).

ĐẶC BIỆT LƯU Ý:
- Tổng thời lượng của tất cả các hoạt động BẮT BUỘC phải BẰNG ĐÚNG ${durationMinutes} phút.
- Mỗi hoạt động cần có tiêu đề rõ ràng, loại hoạt động chuẩn (WARMUP, LESSON, ACTIVITY, QUIZ, SUMMARY) và hướng dẫn sư phạm thực tế.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown code block hoặc văn bản thừa) theo cấu trúc:
{
  "totalDuration": ${Number(durationMinutes) || 35},
  "activities": [
    {
      "title": "Khởi động: ...",
      "duration": 5,
      "type": "WARMUP",
      "description": "Hướng dẫn cụ thể hoạt động khởi động..."
    },
    {
      "title": "Khám phá kiến thức: ...",
      "duration": 8,
      "type": "LESSON",
      "description": "Hướng dẫn cụ thể nội dung trọng tâm..."
    },
    {
      "title": "Luyện tập & Thực hành phòng máy: ...",
      "duration": 10,
      "type": "ACTIVITY",
      "description": "Nhiệm vụ thực hành trên máy tính của học sinh..."
    },
    {
      "title": "Quick Quiz đố vui củng cố: ...",
      "duration": 7,
      "type": "QUIZ",
      "description": "Học sinh tham gia đố vui trắc nghiệm..."
    },
    {
      "title": "Tổng kết bài học & Nhận xét: ...",
      "duration": 5,
      "type": "SUMMARY",
      "description": "Chốt kiến thức, thưởng sao và hướng dẫn tắt máy đúng cách..."
    }
  ]
}`;
}
