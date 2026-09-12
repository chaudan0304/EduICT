/**
 * quizAnalysisPrompt.js
 * Prompt phân tích kết quả phiên đố vui Quick Quiz (Ẩn danh, không truyền thông tin cá nhân)
 */

export function buildQuizAnalysisPrompt({ quizTitle, totalQuestions, averageAccuracy, totalResponses, questionsData = [] }) {
  const questionsSummary = questionsData
    .map((q, idx) => `Câu ${idx + 1}: "${q.question}" -> Tỷ lệ đúng: ${Math.round(q.accuracyRate || 0)}% (${q.correctCount || 0} đúng, ${q.wrongCount || 0} sai)`)
    .join('\n');

  return `Bạn là một chuyên gia đánh giá khảo thí và Trợ Giảng AI cho môn Tin học Tiểu học.
Nhiệm vụ của bạn là phân tích số liệu kết quả của phiên đố vui Quick Quiz vừa hoàn thành để giúp giáo viên nắm bắt ngay mức độ tiếp thu bài của cả lớp và có hành động củng cố kịp thời.

THÔNG SỐ TỔNG QUAN PHIÊN ĐỐ VUI:
- Tên đố vui / Chủ đề: ${quizTitle || 'Đố vui Tin học'}
- Tổng số câu hỏi: ${totalQuestions || 5} câu
- Độ chính xác trung bình toàn lớp: ${Math.round(averageAccuracy || 0)}%
- Tổng lượt trả lời: ${totalResponses || 0} lượt

CHI TIẾT KẾT QUẢ TỪNG CÂU HỎI:
${questionsSummary || 'Chưa có chi tiết từng câu.'}

QUY TẮC PHÂN TÍCH SƯ PHẠM:
1. Nhận định tổng quan (summary): Đánh giá ngắn gọn mức độ hiểu bài của cả lớp (Xuất sắc, Tốt, Khá hoặc Cần củng cố thêm).
2. Điểm sáng / Kiến thức nắm vững (strengths): Chỉ ra 1-3 nội dung hoặc câu hỏi mà học sinh làm rất tốt (> 75% đúng).
3. Lỗ hổng / Khái niệm còn nhầm lẫn (weaknesses): Xác định cụ thể 1-2 nội dung hoặc câu hỏi có tỷ lệ sai cao nhất và chỉ ra nguyên nhân học sinh thường nhầm lẫn ở lứa tuổi tiểu học.
4. Đề xuất củng cố nhanh 3 phút (recommendedReinforcement): 2-3 gợi ý hành động cụ thể để thầy/cô giảng lại hoặc làm rõ ngay tại chỗ trước khi kết thúc giờ học.
5. Thời gian củng cố khuyến nghị: thường từ 2 đến 5 phút.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown code block hoặc văn bản thừa) theo cấu trúc:
{
  "summary": "...",
  "strengths": [
    "...",
    "..."
  ],
  "weaknesses": [
    "...",
    "..."
  ],
  "recommendedReinforcement": [
    "...",
    "..."
  ],
  "recommendedMinutes": 3
}`;
}
