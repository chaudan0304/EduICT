// Adapted from the classroom games supplied by the teacher; plain data only.
export const TUG_QUIZ = `Phím dài nhất trên bàn phím thường là phím nào? | Enter | Phím cách | Shift | Backspace | B
Phần mềm nào giúp em vẽ tranh? | Paint | Máy tính bỏ túi | Thùng rác | Đồng hồ | A
Khi tay ướt, em cần làm gì trước khi dùng máy tính? | Bật máy ngay | Lau khô tay và làm theo hướng dẫn của thầy cô | Chạm vào ổ điện | Rút dây nguồn | B
Hàng phím có F và J được gọi là gì? | Hàng phím số | Hàng phím trên | Hàng phím cơ sở | Hàng phím dưới | C
Tổ hợp phím nào thường dùng để lưu bài? | Ctrl + S | Ctrl + Z | Alt + F4 | Ctrl + C | A
Đâu là thông tin dạng âm thanh? | Bức tranh | Tiếng trống trường | Dòng chữ | Biển báo | B`;

export const DEVICE_QUIZ = `Bộ phận nào dùng để hiển thị hình ảnh? | Màn hình | Bàn phím | Loa | A
Tư thế nào phù hợp khi học máy tính? | Cúi sát màn hình | Ngồi ngay ngắn theo hướng dẫn | Nằm trên bàn | B
Để gõ chữ và số, em dùng thiết bị nào? | Thân máy | Chuột | Bàn phím | C
Đâu là một thao tác sử dụng chuột? | Nháy đúp chuột | Đập chuột xuống bàn | Kéo dây chuột | A`;

export const FOLDER_QUIZ = `Thư mục thường có biểu tượng giống vật nào? | Bìa kẹp màu vàng | Quả địa cầu | Thùng rác | A
Tên thư mục trên Windows có được chứa dấu hỏi chấm không? | Được | Không được | Chỉ khi viết hoa | B
Để mở thư mục bằng chuột, em thường làm gì? | Di chuyển chuột | Nháy đúp chuột trái | Rút dây chuột | B
Sắp xếp tệp vào thư mục giúp em điều gì? | Dễ tìm và ngăn nắp | Xóa hết dữ liệu | Làm mất bài | A`;

export const TRAIN_LEVELS = [
  { title: 'Tắt máy tính đúng cách', steps: ['Lưu bài và đóng phần mềm đang mở', 'Nháy nút Start (Windows)', 'Chọn nút Power (Nguồn)', 'Chọn Shut down và chờ máy tắt'] },
  { title: 'Tạo thư mục mới', steps: ['Nháy phải chuột tại vùng trống', 'Chọn New', 'Chọn Folder', 'Gõ tên thư mục rồi nhấn Enter'] },
  { title: 'Mở bài vẽ đã lưu', steps: ['Mở phần mềm vẽ', 'Chọn lệnh Open (Mở)', 'Tìm và chọn tệp bài vẽ', 'Nháy Open để mở bài'] },
];

export function readQuiz(text) {
  const questions = []; const errors = [];
  text.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    const parts = line.split('|').map(part => part.trim());
    const letter = parts.at(-1)?.toUpperCase();
    const correct = /^[A-D]$/.test(letter) ? 'ABCD'.indexOf(letter) : -1;
    const options = parts.slice(1, -1);
    if (parts.length < 4 || parts.length > 6 || !parts[0] || options.some(option => !option) || correct < 0 || correct >= options.length) {
      errors.push(`Dòng ${index + 1}: cần câu hỏi, 2–4 lựa chọn và chữ cái đáp án đúng.`); return;
    }
    if (parts[0].length > 400 || options.some(option => option.length > 240)) {
      errors.push(`Dòng ${index + 1}: câu hỏi tối đa 400 ký tự, mỗi lựa chọn tối đa 240 ký tự.`); return;
    }
    questions.push({ question: parts[0], options, correct, answer: `${'ABCD'[correct]}. ${options[correct]}` });
  });
  if (questions.length > 24) errors.push('Mỗi bộ tối đa 24 câu hỏi.');
  if (!questions.length && !errors.length) errors.push('Thêm ít nhất một câu hỏi trắc nghiệm.');
  return { questions: questions.slice(0, 24), errors };
}

export const isQuiz = mode => mode === 'quiz' || mode === 'race';
