/**
 * questionGenerationPrompt.js
 * Prompt sinh câu hỏi trắc nghiệm & câu hỏi ôn tập chuẩn Question Bank EduICT
 */

export function buildQuestionGenerationPrompt({ lessonTitle, grade, topic, slidesContent, count = 5, difficulty = 'mixed', types = ['MULTIPLE_CHOICE'] }) {
  return `Bạn là một chuyên gia khảo thí và Trợ Giảng AI cho môn Tin học Tiểu học (Chương trình GDPT 2018).
Nhiệm vụ của bạn là tạo ra ${count} câu hỏi chất lượng cao dựa trên nội dung bài học được cung cấp.

BÀI HỌC CĂN CỨ:
- Tên bài: ${lessonTitle || 'Bài học Tin học'}
- Khối lớp: Khối ${grade || 3}
- Chủ đề: ${topic || 'TOPIC_A'}
- Nội dung tóm tắt từ bài:
${slidesContent || 'Nội dung bài học chuẩn Tin học Tiểu học.'}

YÊU CẦU ĐẶC THÙ VỀ CÂU HỎI:
1. Số lượng câu: Đúng ${count} câu.
2. Mức độ (difficulty): Yêu cầu "${difficulty}". Các giá trị hợp lệ là "NHẬN BIẾT", "THÔNG HIỂU", "VẬN DỤNG". Nếu "mixed", hãy phân bổ cân đối cả 3 mức độ.
3. Đối với câu trắc nghiệm (MULTIPLE_CHOICE):
   - Mảng "options" BẮT BUỘC có ĐỦ 4 lựa chọn khác nhau (tương ứng các phương án A, B, C, D).
   - "correctAnswer" BẮT BUỘC phải TRÙNG KHỚP 100% với một trong 4 phương án trong "options".
   - "correctIndex" là chỉ số (0, 1, 2, hoặc 3) của "correctAnswer" trong "options".
   - Các phương án nhiễu phải hợp lý, không quá vô lý nhưng phân biệt rõ ràng với đáp án đúng.
4. Ngôn từ trong sáng, ngắn gọn, phù hợp với tâm lý lứa tuổi học sinh tiểu học lớp ${grade || 3}.
5. Câu hỏi TUYỆT ĐỐI KHÔNG trùng lặp nhau.
6. Nội dung bám sát bài học, không đưa ra câu hỏi ngoài phạm vi kiến thức.
7. Phần "explanation" (giải thích) phải ngắn gọn, dễ hiểu và nhất quán với đáp án đúng.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown code block hoặc văn bản giải thích thừa) theo cấu trúc:
{
  "questions": [
    {
      "questionText": "...",
      "questionType": "MULTIPLE_CHOICE",
      "options": [
        "...",
        "...",
        "...",
        "..."
      ],
      "correctAnswer": "...",
      "correctIndex": 0,
      "difficulty": "NHẬN BIẾT",
      "explanation": "...",
      "topic": "${topic || 'TOPIC_A'}",
      "points": 1
    }
  ]
}`;
}
