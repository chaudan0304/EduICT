/**
 * lessonAnalysisPrompt.js
 * Prompt phân tích bài giảng Tin học Tiểu học chuẩn chương trình GDPT 2018
 */

export function buildLessonAnalysisPrompt({ title, grade, topic, duration, objectives, keywords, slides = [] }) {
  const slidesContent = slides
    .slice(0, 50)
    .map((s, idx) => `Slide ${s.slideNumber || idx + 1}: ${s.title || ''}\n${s.content || ''}`)
    .filter(t => t.trim().length > 0)
    .join('\n\n');

  return `Bạn là một chuyên gia giáo dục và Trợ Giảng AI cho môn Tin học Tiểu học (Chương trình GDPT 2018 tại Việt Nam).
Nhiệm vụ của bạn là phân tích bài học dưới đây một cách chuẩn xác, thực tế và sư phạm.

THÔNG TIN BÀI HỌC:
- Tên bài: ${title || 'Chưa đặt tên'}
- Khối lớp: ${grade || 3} (Học sinh tiểu học từ 6 đến 11 tuổi)
- Chủ đề: ${topic || 'Chung'} (Chuẩn các chủ đề A-F: A. Máy tính và em, B. Mạng máy tính & Internet, C. Tổ chức lưu trữ & Tìm kiếm, D. Đạo đức & Văn hóa số, E. Ứng dụng tin học, F. Giải quyết vấn đề & Lập trình)
- Thời lượng: ${duration || 35} phút
${objectives ? `- Mục tiêu đã có: ${objectives}` : ''}
${keywords ? `- Từ khóa đã có: ${keywords}` : ''}

NỘI DUNG CHI TIẾT TỪ SLIDE / TÀI LIỆU:
${slidesContent || 'Chưa có chi tiết nội dung slide.'}

QUY TẮC PHÂN TÍCH:
1. Ngôn từ gần gũi, chuẩn mực, dễ hiểu đối với học sinh Tiểu học và giáo viên.
2. Mục tiêu bài học (objectives) phải bám sát theo 3 yêu cầu cần đạt: Kiến thức, Kỹ năng và Phẩm chất.
3. Kiến thức trọng tâm (keyKnowledge) liệt kê 3-5 gạch đầu dòng cô đọng nhất mà học sinh bắt buộc phải ghi nhớ.
4. Từ khóa (keywords) là 3-6 thuật ngữ tin học chính yếu xuất hiện trong bài.
5. Hoạt động đề xuất (suggestedActivities) là 2-4 hoạt động thực hành hoặc trò chơi tương tác phù hợp phòng máy tiểu học.
6. Mức độ (difficulty): chọn một trong 3 giá trị: "basic" (Cơ bản / Nhận biết), "intermediate" (Thông hiểu), hoặc "advanced" (Vận dụng).
7. TUYỆT ĐỐI KHÔNG tự bịa các kiến thức không có căn cứ từ bài giảng. Nếu thiếu thông tin, đưa ra phân tích suy luận sư phạm hợp lý cho khối lớp ${grade || 3}.

YÊU CẦU TRẢ VỀ:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown code block hoặc văn bản giải thích thừa), theo cấu trúc:
{
  "lessonTitle": "...",
  "grade": ${Number(grade) || 3},
  "topic": "...",
  "durationMinutes": ${Number(duration) || 35},
  "objectives": [
    "...",
    "..."
  ],
  "keyKnowledge": [
    "...",
    "..."
  ],
  "keywords": [
    "...",
    "..."
  ],
  "difficulty": "basic",
  "suggestedActivities": [
    "...",
    "..."
  ]
}`;
}
