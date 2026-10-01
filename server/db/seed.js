export function seedInitialData(db) {
  const initialClasses = [
    { id: 'class_1a1', name: 'Lớp 1A1', grade: 1, subject: 'Tin Học 1 (Làm quen & Vẽ Paint)' },
    { id: 'class_2a1', name: 'Lớp 2A1', grade: 2, subject: 'Tin Học 2 (Luyện phím & Vẽ hình)' },
    { id: 'class_3a1', name: 'Lớp 3A1', grade: 3, subject: 'Tin Học 3 (Gõ 10 ngón & Paint)' },
    { id: 'class_4a1', name: 'Lớp 4A1', grade: 4, subject: 'Tin Học 4 (Word & PowerPoint)' },
    { id: 'class_5a1', name: 'Lớp 5A1', grade: 5, subject: 'Tin Học 5 (Lập trình Scratch & Internet)' },
  ];

  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade, subject, school_year) 
    VALUES (?, ?, ?, ?, '2025 - 2026');
  `);

  const insertStudent = db.prepare(`
    INSERT INTO students (
      id, class_id, name, dob, gender, machine_number, stars, attendance,
      skill_mouse, skill_keyboard, skill_paint, eval_regular, eval_hk1, eval_hk2, score_hk1, score_ck, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  // Dữ liệu mẫu học sinh 5 khối (HOÀN TOÀN GIẢ ĐỊNH - KHÔNG CHỨA PII THỰC TẾ)
  const sampleStudents = {
    class_1a1: [
      { id: 'HS101', name: 'Nguyễn Tuấn Anh', dob: '15/03/2018', gender: 'Nam', m: 1, s: 15, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Cầm chuột đúng cách, vẽ bông hoa đẹp' },
      { id: 'HS102', name: 'Trần Bảo Châu', dob: '20/07/2018', gender: 'Nữ', m: 2, s: 22, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Thao tác kéo thả rất nhanh, chăm chỉ' },
      { id: 'HS103', name: 'Lê Minh Đăng', dob: '12/11/2018', gender: 'Nam', m: 3, s: 10, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Biết click đúp mở phần mềm Paint' },
      { id: 'HS104', name: 'Phạm Quỳnh Giang', dob: '05/01/2018', gender: 'Nữ', m: 4, s: 18, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Tô màu khéo, không lem ra ngoài' },
      { id: 'HS105', name: 'Vũ Đức Khang', dob: '18/09/2018', gender: 'Nam', m: 5, s: 8, m_skill: 'H', k_skill: 'C', p_skill: 'H', ev: 'H', note: 'Cần luyện thêm tìm phím Enter và Space' },
      { id: 'HS106', name: 'Đỗ Thảo Linh', dob: '22/04/2018', gender: 'Nữ', m: 6, s: 14, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Rất ngoan, ngồi đúng tư thế' },
      { id: 'HS107', name: 'Bùi Gia Minh', dob: '09/10/2018', gender: 'Nam', m: 7, s: 9, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Đã biết di chuyển chuột mượt mà' },
      { id: 'HS108', name: 'Ngô Ngọc Mai', dob: '30/06/2018', gender: 'Nữ', m: 8, s: 20, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Biết chọn hình tròn, hình vuông trong Paint' },
    ],
    class_2a1: [
      { id: 'HS201', name: 'Trịnh Bảo An', dob: '14/02/2017', gender: 'Nữ', m: 1, s: 18, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Gõ hàng phím cơ sở tốt' },
      { id: 'HS202', name: 'Lý Quốc Bảo', dob: '08/05/2017', gender: 'Nam', m: 2, s: 14, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Vẽ ngôi nhà và cây xanh rất sáng tạo' },
      { id: 'HS203', name: 'Dương Khánh Chi', dob: '19/08/2017', gender: 'Nữ', m: 3, s: 25, m_skill: 'T', k_skill: 'T', p_skill: 'T', ev: 'T', note: 'Thao tác gõ chữ tiếng Việt cơ bản nhanh' },
      { id: 'HS204', name: 'Mai Hữu Đạt', dob: '25/11/2017', gender: 'Nam', m: 4, s: 9, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Cần chú ý đặt đúng ngón tay trên phím F và J' },
      { id: 'HS205', name: 'Cao Diễm Hằng', dob: '02/03/2017', gender: 'Nữ', m: 5, s: 16, m_skill: 'T', k_skill: 'H', p_skill: 'T', ev: 'T', note: 'Biết phóng to thu nhỏ hình vẽ' },
      { id: 'HS206', name: 'Phan Tuấn Kiệt', dob: '17/09/2017', gender: 'Nam', m: 6, s: 11, m_skill: 'H', k_skill: 'H', p_skill: 'H', ev: 'H', note: 'Chăm chỉ hoàn thành bài luyện gõ' },
    ],
    class_3a1: [
      { id: 'HS301', name: 'Nguyễn Thành Long', dob: '10/01/2016', gender: 'Nam', m: 1, s: 28, hk1: 9.5, ck: 10.0, ev: 'T', note: 'Gõ 10 ngón chuẩn xác, hoàn thành bài sớm' },
      { id: 'HS302', name: 'Lê Thuỳ Trang', dob: '24/04/2016', gender: 'Nữ', m: 2, s: 24, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Hiểu bài nhanh, hướng dẫn bạn cùng máy' },
      { id: 'HS303', name: 'Trần Quang Huy', dob: '15/07/2016', gender: 'Nam', m: 3, s: 12, hk1: 7.5, ck: 8.0, ev: 'H', note: 'Thao tác gõ tiếng Việt Telex tiến bộ' },
      { id: 'HS304', name: 'Võ Minh Thư', dob: '09/10/2016', gender: 'Nữ', m: 4, s: 19, hk1: 8.5, ck: 9.0, ev: 'T', note: 'Vẽ tranh phong cảnh Paint rất khéo' },
      { id: 'HS305', name: 'Phạm Đức Trọng', dob: '03/12/2016', gender: 'Nam', m: 5, s: 8, hk1: 6.5, ck: 7.0, ev: 'H', note: 'Cần rèn luyện thêm gõ hàng phím trên' },
      { id: 'HS306', name: 'Đỗ Ngọc Bích', dob: '28/02/2016', gender: 'Nữ', m: 6, s: 26, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Nắm vững quy tắc an toàn phòng máy' },
      { id: 'HS307', name: 'Hoàng Anh Tuấn', dob: '11/06/2016', gender: 'Nam', m: 7, s: 10, hk1: 7.0, ck: 7.5, ev: 'H', note: 'Có tiến bộ trong thực hành tạo thư mục' },
      { id: 'HS308', name: 'Đặng Mai Chi', dob: '16/09/2016', gender: 'Nữ', m: 8, s: 17, hk1: 8.5, ck: 9.0, ev: 'T', note: 'Soạn đoạn thơ ngắn đúng dấu' },
    ],
    class_4a1: [
      { id: 'HS401', name: 'Bùi Đức Anh', dob: '05/03/2015', gender: 'Nam', m: 1, s: 20, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Định dạng phông chữ, cỡ chữ văn bản rất chuẩn' },
      { id: 'HS402', name: 'Nguyễn Hoàng Yến', dob: '12/06/2015', gender: 'Nữ', m: 2, s: 32, hk1: 10.0, ck: 10.0, ev: 'T', note: 'Chèn ảnh và tạo hiệu ứng trình chiếu đẹp mắt' },
      { id: 'HS403', name: 'Lê Gia Hưng', dob: '21/08/2015', gender: 'Nam', m: 3, s: 13, hk1: 7.5, ck: 8.0, ev: 'H', note: 'Biết chèn bảng đơn giản trong Word' },
      { id: 'HS404', name: 'Trần Phương Uyên', dob: '17/10/2015', gender: 'Nữ', m: 4, s: 21, hk1: 9.0, ck: 9.0, ev: 'T', note: 'Tìm kiếm thông tin trên Internet an toàn' },
      { id: 'HS405', name: 'Vũ Quốc Khánh', dob: '02/12/2015', gender: 'Nam', m: 5, s: 9, hk1: 6.5, ck: 7.0, ev: 'H', note: 'Cần lưu bài đúng vào thư mục cá nhân' },
      { id: 'HS406', name: 'Phạm Hồng Nhung', dob: '29/01/2015', gender: 'Nữ', m: 6, s: 25, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Thiết kế slide bài thuyết trình rất sinh động' },
    ],
    class_5a1: [
      { id: 'HS501', name: 'Đoàn Nhật Minh', dob: '19/02/2014', gender: 'Nam', m: 1, s: 35, hk1: 10.0, ck: 10.0, ev: 'T', note: 'Lập trình nhân vật Scratch chuyển động mượt mà' },
      { id: 'HS502', name: 'Võ Khánh Vy', dob: '14/05/2014', gender: 'Nữ', m: 2, s: 27, hk1: 9.5, ck: 9.5, ev: 'T', note: 'Tạo game mê cung Scratch rất sáng tạo' },
      { id: 'HS503', name: 'Hoàng Trung Kiên', dob: '08/08/2014', gender: 'Nam', m: 3, s: 22, hk1: 9.0, ck: 9.5, ev: 'T', note: 'Hiểu câu lệnh lặp và rẽ nhánh if-then' },
      { id: 'HS504', name: 'Ngô Thảo Nguyên', dob: '23/10/2014', gender: 'Nữ', m: 4, s: 15, hk1: 8.0, ck: 8.5, ev: 'H', note: 'Nhập dữ liệu vào bảng tính cẩn thận' },
      { id: 'HS505', name: 'Đinh Trọng Phúc', dob: '06/11/2014', gender: 'Nam', m: 5, s: 11, hk1: 7.0, ck: 7.5, ev: 'H', note: 'Cần chú ý thêm khối lệnh âm thanh trong Scratch' },
      { id: 'HS506', name: 'Trần Mỹ Dung', dob: '30/12/2014', gender: 'Nữ', m: 6, s: 30, hk1: 9.5, ck: 10.0, ev: 'T', note: 'Xuất sắc, tư duy logic rất tốt' },
    ]
  };

  for (const c of initialClasses) {
    insertClass.run(c.id, c.name, c.grade, c.subject);
    const stuList = sampleStudents[c.id] || [];
    for (const s of stuList) {
      insertStudent.run(
        s.id,
        c.id,
        s.name,
        s.dob || '',
        s.gender,
        s.m,
        s.s || 0,
        'present',
        s.m_skill || 'T',
        s.k_skill || 'H',
        s.p_skill || 'T',
        s.ev || 'T',
        s.ev || 'T',
        s.ev || 'T',
        s.hk1 || null,
        s.ck || null,
        s.note || ''
      );
    }
  }
}

// Nạp dữ liệu bài học mẫu chuẩn GDPT 2018 cho môn Tin học
export function seedInitialLessons(db) {
  const sampleLessons = [
    {
      id: 'les_k4_internet',
      title: 'Bài: Internet và Tìm kiếm thông tin',
      grade: 4,
      subject: 'Tin Học 4',
      topic: 'Mạng máy tính & Internet',
      duration_minutes: 35,
      objectives: 'Học sinh hiểu được mạng Internet là gì; Nêu được các lợi ích cơ bản của Internet trong học tập và giải trí; Biết mở trình duyệt Web và tìm kiếm thông tin bằng Google.',
      keywords: 'Internet, Trình duyệt Web, Tìm kiếm thông tin, An toàn mạng',
      teacher_notes: 'Gợi ý khởi động: Đặt câu hỏi xem các em thường dùng Internet để làm gì ở nhà hoặc ở trường.',
      slides: [
        {
          id: 'slide_k4_1',
          type: 'TITLE',
          title: 'Bài: Internet & Tìm kiếm thông tin',
          content: 'Môn Tin học 4 • Thời lượng 35 phút\nGiáo viên giảng dạy: Thầy/Cô bộ môn Tin học',
          layout: 'STANDARD',
          teacher_notes: 'Chào cả lớp, ổn định trật tự và giới thiệu tên bài học.'
        },
        {
          id: 'slide_k4_2',
          type: 'CONTENT',
          title: '1. Internet là gì?',
          content: '• Internet là mạng kết nối các máy tính trên phạm vi toàn thế giới.\n• Người dùng có thể tìm kiếm, chia sẻ thông tin và học tập trực tuyến.\n• Kho tàng thông tin phong phú: bài giảng, video, hình ảnh và tài liệu học tập.',
          layout: 'STANDARD',
          teacher_notes: 'Hỏi học sinh: Ngoài máy tính, thiết bị nào có thể kết nối Internet? (Điện thoại, tivi, máy tính bảng).'
        },
        {
          id: 'slide_k4_3',
          type: 'IMAGE',
          title: 'Mô hình mạng lưới Internet toàn cầu',
          content: 'Hàng triệu máy tính và thiết bị thông minh liên kết trao đổi dữ liệu với nhau không giới hạn khoảng cách địa lý.',
          layout: 'SPLIT_RIGHT',
          image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60',
          teacher_notes: 'Chỉ vào sơ đồ và giải thích mạng Internet như một mạng lưới tơ nhện khổng lồ.'
        },
        {
          id: 'slide_k4_4',
          type: 'QUESTION',
          title: 'Thử tài Tin học: Nhận biết lợi ích của Internet',
          content: 'Em hãy chọn đáp án đúng nhất cho câu hỏi bên dưới:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Hành vi nào dưới đây KHÔNG NÊN làm khi sử dụng Internet?',
            options: [
              'A. Tìm kiếm hình ảnh và tài liệu phục vụ bài học',
              'B. Chơi trò chơi điện tử suốt đêm không đi ngủ',
              'C. Xem video khoa học khám phá vũ trụ',
              'D. Trao đổi bài tập với thầy cô và bạn bè'
            ],
            correct_index: 1,
            explanation: 'Chơi game thâu đêm gây tổn hại nghiêm trọng cho mắt, sức khỏe và việc học. Cần sử dụng Internet điều độ và có sự đồng ý của cha mẹ.'
          }),
          teacher_notes: 'Dùng Vòng Quay May Mắn để gọi 1 học sinh trả lời, sau đó bấm vào đáp án B để kiểm tra giải thích.'
        },
        {
          id: 'slide_k4_5',
          type: 'ACTIVITY',
          title: 'Hoạt động thực hành: Tìm kiếm thông tin trên Web',
          content: 'Nhiệm vụ: Mở trình duyệt Google Chrome, truy cập trang google.com và tìm kiếm hình ảnh loài hoa em yêu thích. Lưu ảnh vào thư mục cá nhân.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'pair',
            duration: 10,
            task: 'Ngồi ghép đôi 2 bạn/máy: 1 bạn thao tác chuột tìm kiếm, 1 bạn hỗ trợ gõ từ khóa chính xác.'
          }),
          teacher_notes: 'Bấm nút bắt đầu đếm giờ 10 phút, đi quanh các dãy máy quan sát và hỗ trợ học sinh gặp khó khăn.'
        },
        {
          id: 'slide_k4_6',
          type: 'SUMMARY',
          title: 'Ghi nhớ kiến thức cốt lõi',
          content: '1. Internet là mạng máy tính toàn cầu kết nối hàng triệu thiết bị.\n2. Lợi ích: Học tập, tìm kiếm thông tin, giải trí lành mạnh.\n3. An toàn mạng: Tuyệt đối không chia sẻ mật khẩu, địa chỉ nhà hay thông tin cá nhân cho người lạ.',
          layout: 'STANDARD',
          teacher_notes: 'Yêu cầu 1-2 học sinh đọc to phần ghi nhớ trước khi kết thúc bài học.'
        }
      ]
    },
    {
      id: 'les_k3_computer',
      title: 'Bài: Khám phá máy tính và các bộ phận',
      grade: 3,
      subject: 'Tin Học 3',
      topic: 'Máy tính và Em',
      duration_minutes: 35,
      objectives: 'Nhận biết được 4 bộ phận cơ bản của máy tính để bàn: Màn hình, Thân máy, Bàn phím, Chuột. Biết chức năng cơ bản của từng bộ phận.',
      keywords: 'Màn hình, Thân máy, Bàn phím, Chuột máy tính',
      teacher_notes: 'Chỉ trực quan vào máy tính trước mặt học sinh.',
      slides: [
        {
          id: 'slide_k3_1',
          type: 'TITLE',
          title: 'Khám phá máy tính',
          content: 'Môn Tin học 3 • Bài 1: Người bạn mới của em',
          layout: 'STANDARD',
          teacher_notes: 'Khơi gợi sự tò mò: Các em đã thấy máy tính ở những nơi nào?'
        },
        {
          id: 'slide_k3_2',
          type: 'CONTENT',
          title: '4 bộ phận cơ bản của máy tính để bàn',
          content: '1. Màn hình (Monitor): Hiển thị kết quả làm việc của máy tính.\n2. Thân máy (Case): Chứa bộ xử lý trung tâm (CPU) - đầu não của máy tính.\n3. Bàn phím (Keyboard): Có nhiều phím, dùng để nhập chữ và số.\n4. Chuột (Mouse): Giúp điều khiển máy tính nhanh chóng và thuận tiện.',
          layout: 'STANDARD',
          teacher_notes: 'Chỉ vào từng bộ phận trên máy giáo viên và yêu cầu học sinh chỉ vào máy của các em.'
        },
        {
          id: 'slide_k3_3',
          type: 'QUESTION',
          title: 'Thử tài quan sát',
          content: 'Em hãy chọn bộ phận thích hợp:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Bộ phận nào được ví như "Bộ não" điều khiển mọi hoạt động của máy tính?',
            options: [
              'A. Màn hình máy tính',
              'B. Thân máy (chứa bộ xử lý CPU)',
              'C. Bàn phím máy tính',
              'D. Con chuột máy tính'
            ],
            correct_index: 1,
            explanation: 'Thân máy chứa bộ xử lý trung tâm (CPU) đóng vai trò như bộ não xử lý mọi phép tính và mệnh lệnh.'
          }),
          teacher_notes: 'Khen thưởng 1 sao cho học sinh trả lời nhanh và chính xác.'
        },
        {
          id: 'slide_k3_4',
          type: 'ACTIVITY',
          title: 'Thực hành: Cầm chuột đúng cách',
          content: 'Học sinh đặt bàn tay phải lên chuột: Ngón trỏ đặt nhẹ lên nút trái, ngón giữa đặt lên nút phải, các ngón còn lại giữ hai bên thân chuột. Luyện tập di chuyển con trỏ chuột trên màn hình.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'individual',
            duration: 8,
            task: 'Thực hành cá nhân: Cầm chuột đúng cách và nhấp chuột vào biểu tượng trên màn hình Desktop.'
          }),
          teacher_notes: 'Nhắc nhở các em ngồi thẳng lưng, mắt cách màn hình 50-70cm.'
        },
        {
          id: 'slide_k3_5',
          type: 'SUMMARY',
          title: 'Em cần ghi nhớ',
          content: '• Máy tính để bàn gồm 4 bộ phận chính: Màn hình, Thân máy, Bàn phím và Chuột.\n• Ngồi học đúng tư thế giúp bảo vệ mắt và cột sống.\n• Tắt máy đúng quy trình khi kết thúc giờ học.',
          layout: 'STANDARD',
          teacher_notes: 'Nhắc học sinh xếp ghế gọn gàng trước khi ra về.'
        }
      ]
    },
    {
      id: 'les_k5_typing',
      title: 'Bài: Kỹ năng soạn thảo văn bản Tiếng Việt',
      grade: 5,
      subject: 'Tin Học 5',
      topic: 'Ứng dụng Tin học',
      duration_minutes: 35,
      objectives: 'Nắm vững quy tắc gõ chữ Tiếng Việt có dấu theo kiểu gõ Telex; Biết định dạng chữ đậm, nghiêng, chọn cỡ chữ và phông chữ phù hợp.',
      keywords: 'Soạn thảo văn bản, Word, Kiểu gõ Telex, Unikey',
      teacher_notes: 'Nhắc học sinh kiểm tra biểu tượng chữ V màu đỏ của Unikey ở góc phải màn hình.',
      slides: [
        {
          id: 'slide_k5_1',
          type: 'TITLE',
          title: 'Soạn thảo văn bản Tiếng Việt',
          content: 'Tin học 5 • Kỹ năng thực hành văn phòng cơ bản',
          layout: 'STANDARD',
          teacher_notes: 'Kiểm tra phần mềm Unikey và Word trên máy học sinh trước khi dạy.'
        },
        {
          id: 'slide_k5_2',
          type: 'CONTENT',
          title: 'Quy tắc gõ chữ có dấu kiểu Telex',
          content: '• Các chữ có mũ, móc: aa → â, aw → ă, ee → ê, oo → ô, ow → ơ, uw → ư, dd → đ\n• Các dấu thanh: s → Sắc, f → Huyền, r → Hỏi, x → Ngã, j → Nặng\n• Xóa dấu: gõ thêm chữ z ở cuối từ.',
          layout: 'STANDARD',
          teacher_notes: 'Cho học sinh nhẩm thuộc lòng câu thần chú: sắc s, huyền f, hỏi r, ngã x, nặng j.'
        },
        {
          id: 'slide_k5_3',
          type: 'QUESTION',
          title: 'Kiểm tra quy tắc gõ',
          content: 'Em hãy chọn cách gõ đúng cho từ bên dưới:',
          layout: 'CENTERED',
          question_data: JSON.stringify({
            question: 'Để gõ từ "HỌC TẬP" theo kiểu Telex, em gõ như thế nào?',
            options: [
              'A. Hocj taapj',
              'B. Hoocj taapj',
              'C. Hojc taapj',
              'D. Hocj tapj'
            ],
            correct_index: 0,
            explanation: 'Hocj = Học (j là dấu nặng); taapj = Tập (aa thành â, j là dấu nặng).'
          }),
          teacher_notes: 'Giải thích vì sao đáp án B, C, D sai để học sinh tránh nhầm lẫn vị trí gõ dấu.'
        },
        {
          id: 'slide_k5_4',
          type: 'ACTIVITY',
          title: 'Thực hành: Gõ đoạn thơ ngắn',
          content: 'Mở Microsoft Word, gõ khổ thơ 4 câu về mái trường. Định dạng tiêu đề in đậm (Ctrl + B), màu xanh dương, nội dung bài thơ cỡ chữ 14.',
          layout: 'STANDARD',
          activity_data: JSON.stringify({
            format: 'individual',
            duration: 12,
            task: 'Mỗi học sinh tự gõ bài vào file Word và lưu lại với tên của mình.'
          }),
          teacher_notes: 'Bấm giờ thực hành 12 phút, cộng 2 sao cho 3 bạn gõ nhanh và không mắc lỗi chính tả.'
        },
        {
          id: 'slide_k5_5',
          type: 'SUMMARY',
          title: 'Quy tắc vàng khi soạn thảo',
          content: '1. Luôn gõ dấu thanh ở cuối mỗi từ để tránh lỗi font chữ.\n2. Dấu câu (. , : ;) phải đặt sát từ phía trước, sau đó mới bấm dấu cách (Space).\n3. Tập thói quen nhấn Ctrl + S thường xuyên để lưu bài.',
          layout: 'STANDARD',
          teacher_notes: 'Khen ngợi cả lớp đã hoàn thành tốt bài thực hành.'
        }
      ]
    }
  ];

  const insertLesson = db.prepare(`
    INSERT INTO lessons (id, title, grade, subject, topic, duration_minutes, objectives, keywords, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const insertSlide = db.prepare(`
    INSERT INTO lesson_slides (id, lesson_id, order_index, type, title, content, layout, image_url, video_url, question_data, activity_data, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const les of sampleLessons) {
    insertLesson.run(
      les.id,
      les.title,
      les.grade,
      les.subject,
      les.topic,
      les.duration_minutes,
      les.objectives,
      les.keywords,
      les.teacher_notes
    );

    les.slides.forEach((sl, idx) => {
      insertSlide.run(
        sl.id,
        les.id,
        idx,
        sl.type,
        sl.title || '',
        sl.content || '',
        sl.layout || 'STANDARD',
        sl.image_url || '',
        sl.video_url || '',
        sl.question_data || '',
        sl.activity_data || '',
        sl.teacher_notes || ''
      );
    });
  }
}

export function seedInitialQuestions(db) {
  const insertStmt = db.prepare(`
    INSERT INTO question_bank (
      id, question, grade, subject, topic, lesson_id, type, difficulty,
      options, correct_answer, correct_index, explanation, points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const sampleQuestions = [
    // Khối 1
    {
      id: 'qb_k1_01',
      question: 'Máy tính để bàn gồm có mấy bộ phận chính?',
      grade: 1,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['4 bộ phận (Màn hình, thân máy, bàn phím, chuột)', '2 bộ phận', '1 bộ phận', '6 bộ phận'],
      correct_answer: '4 bộ phận (Màn hình, thân máy, bàn phím, chuột)',
      correct_index: 0,
      explanation: 'Máy tính để bàn gồm 4 bộ phận cơ bản: Màn hình, Thân máy, Bàn phím và Chuột.',
      points: 1
    },
    {
      id: 'qb_k1_02',
      question: 'Bộ phận nào của máy tính giúp em nhìn thấy chữ, tranh ảnh và video?',
      grade: 1,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Màn hình máy tính', 'Chuột máy tính', 'Bàn phím máy tính', 'Dây điện'],
      correct_answer: 'Màn hình máy tính',
      correct_index: 0,
      explanation: 'Màn hình là nơi hiển thị kết quả làm việc, chữ viết và tranh ảnh cho em quan sát.',
      points: 1
    },
    {
      id: 'qb_k1_03',
      question: 'Khi cầm chuột máy tính bằng tay phải, ngón trỏ của em đặt ở đâu?',
      grade: 1,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Đặt lên nút trái của chuột', 'Đặt lên nút phải của chuột', 'Đặt lên con lăn chuột', 'Đặt dưới đáy chuột'],
      correct_answer: 'Đặt lên nút trái của chuột',
      correct_index: 0,
      explanation: 'Ngón trỏ đặt trên nút trái chuột, ngón giữa đặt trên nút phải chuột.',
      points: 1
    },
    {
      id: 'qb_k1_04',
      question: 'Chuột máy tính thông thường gồm có các bộ phận nào?',
      grade: 1,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Nút trái, nút phải và bánh lăn (nút cuộn)', 'Chỉ có 1 nút bấm duy nhất', 'Bàn phím và màn hình', 'Hộp màu và bút chì'],
      correct_answer: 'Nút trái, nút phải và bánh lăn (nút cuộn)',
      correct_index: 0,
      explanation: 'Chuột máy tính chuẩn có 3 bộ phận: nút trái, nút phải và nút cuộn ở giữa.',
      points: 1
    },
    {
      id: 'qb_k1_05',
      question: 'Biểu tượng phần mềm tập vẽ Paint trên màn hình có hình gì?',
      grade: 1,
      topic: 'TOPIC_E',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Hộp màu và cây cọ vẽ', 'Một bông hoa màu đỏ', 'Một chiếc máy bay', 'Một quyển truyện tranh'],
      correct_answer: 'Hộp màu và cây cọ vẽ',
      correct_index: 0,
      explanation: 'Biểu tượng phần mềm Paint là hộp bút màu và bảng vẽ cọ nghệ thuật.',
      points: 1
    },
    {
      id: 'qb_k1_06',
      question: 'Khi ngồi học máy tính, tư thế nào sau đây là ĐÚNG?',
      grade: 1,
      topic: 'TOPIC_D',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Ngồi thẳng lưng, mắt cách màn hình 50-70cm', 'Nằm ra bàn để nhìn cho gần', 'Ngồi vắt chân lên ghế', 'Ghé sát mắt vào màn hình'],
      correct_answer: 'Ngồi thẳng lưng, mắt cách màn hình 50-70cm',
      correct_index: 0,
      explanation: 'Ngồi thẳng lưng và giữ khoảng cách an toàn giúp bảo vệ cột sống và mắt của em.',
      points: 1
    },

    // Khối 2
    {
      id: 'qb_k2_01',
      question: 'Trên bàn phím máy tính, phím dài nhất nằm ở hàng phím dưới cùng là phím gì?',
      grade: 2,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím cách (Spacebar)', 'Phím Enter', 'Phím Shift', 'Phím Caps Lock'],
      correct_answer: 'Phím cách (Spacebar)',
      correct_index: 0,
      explanation: 'Phím cách (Spacebar) là phím dài nhất, dùng để tạo khoảng cách giữa các từ khi gõ.',
      points: 1
    },
    {
      id: 'qb_k2_02',
      question: 'Phím nào sau đây dùng để xuống dòng khi em đang gõ văn bản?',
      grade: 2,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Phím Enter', 'Phím Space', 'Phím Delete', 'Phím Backspace'],
      correct_answer: 'Phím Enter',
      correct_index: 0,
      explanation: 'Phím Enter dùng để kết thúc dòng hiện tại và chuyển con trỏ xuống đầu dòng tiếp theo.',
      points: 1
    },
    {
      id: 'qb_k2_03',
      question: 'Hai phím nào trên hàng phím cơ sở có gờ nổi để đặt hai ngón trỏ?',
      grade: 2,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím F và phím J', 'Phím A và phím L', 'Phím G và phím H', 'Phím D và phím K'],
      correct_answer: 'Phím F và phím J',
      correct_index: 0,
      explanation: 'Phím F và phím J có hai gờ nổi nhỏ giúp nhận biết vị trí đặt tay mà không cần nhìn bàn phím.',
      points: 1
    },
    {
      id: 'qb_k2_04',
      question: 'Trong phần mềm Paint, công cụ hình Cục tẩy (Eraser) dùng để làm gì?',
      grade: 2,
      topic: 'TOPIC_E',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Xóa các nét vẽ hoặc chi tiết chưa vừa ý', 'Tô màu toàn bộ bức tranh', 'Vẽ hình tròn', 'Viết chữ hoa'],
      correct_answer: 'Xóa các nét vẽ hoặc chi tiết chưa vừa ý',
      correct_index: 0,
      explanation: 'Công cụ Tẩy (Eraser) dùng để xóa đi những nét vẽ hoặc vùng màu cần sửa lại.',
      points: 1
    },
    {
      id: 'qb_k2_05',
      question: 'Để tắt máy tính an toàn và đúng cách, em thực hiện như thế nào?',
      grade: 2,
      topic: 'TOPIC_A',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Bấm nút Start -> Chọn Power -> Chọn Shut down', 'Rút phích cắm điện ngay lập tức', 'Bấm nút tắt trên màn hình rồi bỏ về', 'Giữ nút nguồn trên thân máy thật lâu'],
      correct_answer: 'Bấm nút Start -> Chọn Power -> Chọn Shut down',
      correct_index: 0,
      explanation: 'Phải tắt máy bằng lệnh Start -> Power -> Shut down để hệ điều hành lưu dữ liệu an toàn.',
      points: 1
    },
    {
      id: 'qb_k2_06',
      question: 'Hành động nào sau đây KHÔNG ĐƯỢC PHÉP làm trong phòng máy tính?',
      grade: 2,
      topic: 'TOPIC_D',
      lesson_id: null,
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Mang đồ ăn, bánh kẹo và nước uống vào bàn máy', 'Ngồi đúng số máy được thầy cô phân công', 'Báo thầy cô khi máy gặp sự cố', 'Tắt máy tính gọn gàng trước khi ra về'],
      correct_answer: 'Mang đồ ăn, bánh kẹo và nước uống vào bàn máy',
      correct_index: 0,
      explanation: 'Nước uống và vụn đồ ăn có thể làm hỏng bàn phím hoặc gây cháy chập điện phòng máy.',
      points: 1
    },

    // Khối 3
    {
      id: 'qb_k3_01',
      question: 'Bộ phận nào của máy tính dùng để gõ chữ và số vào máy?',
      grade: 3,
      topic: 'TOPIC_A',
      lesson_id: 'les_k3_computer',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Bàn phím', 'Màn hình', 'Chuột máy tính', 'Thân máy'],
      correct_answer: 'Bàn phím',
      correct_index: 0,
      explanation: 'Bàn phím gồm nhiều phím chữ và số, dùng để đưa thông tin văn bản vào máy tính.',
      points: 1
    },
    {
      id: 'qb_k3_02',
      question: 'Thao tác "Nhấp đúp chuột" (Double click) là gì?',
      grade: 3,
      topic: 'TOPIC_A',
      lesson_id: 'les_k3_computer',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Nhấn nút trái chuột 1 lần', 'Nhấn nút trái chuột nhanh 2 lần liên tiếp', 'Nhấn giữ nút phải chuột', 'Lăn nút cuộn chuột'],
      correct_answer: 'Nhấn nút trái chuột nhanh 2 lần liên tiếp',
      correct_index: 1,
      explanation: 'Nhấp đúp chuột là thao tác nhấn nhanh nút chuột trái 2 lần liên tiếp để mở phần mềm hoặc tệp tin.',
      points: 1
    },
    {
      id: 'qb_k3_03',
      question: 'Ngồi học máy tính đúng tư thế giúp ích gì cho em?',
      grade: 3,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Bảo vệ mắt và không bị mỏi lưng, vẹo cột sống', 'Gõ phím phát ra tiếng to hơn', 'Máy tính chạy nhanh hơn gấp đôi', 'Không cần dùng bàn phím'],
      correct_answer: 'Bảo vệ mắt và không bị mỏi lưng, vẹo cột sống',
      correct_index: 0,
      explanation: 'Ngồi thẳng lưng, mắt cách màn hình 50-70cm giúp tránh cận thị và bảo vệ cột sống.',
      points: 1
    },
    {
      id: 'qb_k3_04',
      question: 'Biểu tượng của phần mềm vẽ Paint trên máy tính thường có hình gì?',
      grade: 3,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Hộp đựng bút chì màu và bảng màu', 'Một chiếc đồng hồ cát', 'Một quyển sách màu đỏ', 'Một chiếc loa phát thanh'],
      correct_answer: 'Hộp đựng bút chì màu và bảng màu',
      correct_index: 0,
      explanation: 'Phần mềm Paint là công cụ tập vẽ tranh đơn giản có icon bảng vẽ và cọ tô màu.',
      points: 1
    },
    {
      id: 'qb_k3_05',
      question: 'Khi đang trong phòng thực hành Tin học, hành vi nào sau đây là ĐÚNG quy tắc?',
      grade: 3,
      topic: 'TOPIC_D',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Mang đồ ăn nước uống vào bàn phím', 'Tự ý cắm rút dây điện phía sau máy', 'Ngồi đúng vị trí máy được phân công và giữ gìn thiết bị', 'Đùa giỡn chạy nhảy trong phòng'],
      correct_answer: 'Ngồi đúng vị trí máy được phân công và giữ gìn thiết bị',
      correct_index: 2,
      explanation: 'Học sinh phải ngồi đúng số máy, không mang đồ ăn thức uống để phòng tránh cháy chập và bảo vệ phòng máy.',
      points: 1
    },
    {
      id: 'qb_k3_06',
      question: 'Trên bàn phím máy tính, hai phím nào trên hàng phím cơ sở có gờ nổi?',
      grade: 3,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím F và phím J', 'Phím A và phím L', 'Phím Space và phím Enter', 'Phím Shift và phím Ctrl'],
      correct_answer: 'Phím F và phím J',
      correct_index: 0,
      explanation: 'Phím F và J có gờ nổi làm mốc để đặt 2 ngón trỏ khi luyện gõ 10 ngón.',
      points: 1
    },

    // Khối 4
    {
      id: 'qb_k4_01',
      question: 'Mạng Internet dùng để làm gì trong học tập và đời sống?',
      grade: 4,
      topic: 'TOPIC_B',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Chỉ để chơi trò chơi điện tử', 'Kết nối các máy tính và tìm kiếm, trao đổi thông tin toàn cầu', 'Để tự động in sách vở', 'Tắt máy tính từ xa'],
      correct_answer: 'Kết nối các máy tính và tìm kiếm, trao đổi thông tin toàn cầu',
      correct_index: 1,
      explanation: 'Internet là mạng toàn cầu kết nối hàng triệu máy tính, kho tài liệu khổng lồ phục vụ học tập.',
      points: 1
    },
    {
      id: 'qb_k4_02',
      question: 'Phần mềm nào sau đây là trình duyệt web giúp em xem các trang thông tin trên mạng?',
      grade: 4,
      topic: 'TOPIC_B',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Google Chrome, Cốc Cốc, Microsoft Edge', 'Microsoft Word', 'Paint', 'Máy tính tính toán Calculator'],
      correct_answer: 'Google Chrome, Cốc Cốc, Microsoft Edge',
      correct_index: 0,
      explanation: 'Google Chrome và Microsoft Edge là các trình duyệt web phổ biến để truy cập Internet.',
      points: 1
    },
    {
      id: 'qb_k4_03',
      question: 'Thông tin nào sau đây em TUYỆT ĐỐI KHÔNG nên chia sẻ cho người lạ trên mạng?',
      grade: 4,
      topic: 'TOPIC_D',
      lesson_id: 'les_k4_internet',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'VẬN DỤNG',
      options: ['Mật khẩu tài khoản, địa chỉ nhà riêng và số điện thoại của bố mẹ', 'Tên bài hát em yêu thích', 'Một câu đố vui dân gian', 'Tên môn học em thích ở trường'],
      correct_answer: 'Mật khẩu tài khoản, địa chỉ nhà riêng và số điện thoại của bố mẹ',
      correct_index: 0,
      explanation: 'Mật khẩu và thông tin cá nhân cần được bảo mật để tránh bị kẻ xấu lợi dụng hoặc lừa đảo.',
      points: 1
    },
    {
      id: 'qb_k4_04',
      question: 'Thư mục (Folder) trong máy tính có biểu tượng màu gì và dùng để làm gì?',
      grade: 4,
      topic: 'TOPIC_A',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Màu vàng kẹp tài liệu, dùng để chứa và phân loại các tệp tin gọn gàng', 'Màu xanh lá cây, dùng để nghe nhạc', 'Màu đỏ, dùng để báo máy bị virus', 'Màu đen, dùng để xóa vĩnh viễn tệp tin'],
      correct_answer: 'Màu vàng kẹp tài liệu, dùng để chứa và phân loại các tệp tin gọn gàng',
      correct_index: 0,
      explanation: 'Thư mục hình chiếc kẹp tài liệu màu vàng, đóng vai trò như ngăn kéo để sắp xếp tệp tin khoa học.',
      points: 1
    },
    {
      id: 'qb_k4_05',
      question: 'Trong phần mềm soạn thảo văn bản, để viết hoa toàn bộ một từ ta dùng phím nào?',
      grade: 4,
      topic: 'TOPIC_E',
      lesson_id: 'les_k5_typing',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Phím Caps Lock', 'Phím Tab', 'Phím Esc', 'Phím Space'],
      correct_answer: 'Phím Caps Lock',
      correct_index: 0,
      explanation: 'Bấm phím Caps Lock (đèn sáng) để bật chế độ gõ chữ in hoa liên tục.',
      points: 1
    },
    {
      id: 'qb_k4_06',
      question: 'Khi tìm kiếm thông tin trên Google, nếu muốn kết quả chính xác hơn em nên làm gì?',
      grade: 4,
      topic: 'TOPIC_B',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Nhập từ khóa ngắn gọn, đúng trọng tâm cần tìm', 'Gõ một đoạn văn thật dài không dấu', 'Gõ ngẫu nhiên các chữ cái', 'Chỉ nhấn nút tìm kiếm mà không gõ gì'],
      correct_answer: 'Nhập từ khóa ngắn gọn, đúng trọng tâm cần tìm',
      correct_index: 0,
      explanation: 'Từ khóa rõ ràng, súc tích giúp máy tìm kiếm lọc đúng nội dung em cần.',
      points: 1
    },

    // Khối 5
    {
      id: 'qb_k5_01',
      question: 'Trong phần mềm lập trình trực quan Scratch, nhân vật mặc định ban đầu là gì?',
      grade: 5,
      topic: 'TOPIC_F',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Chú mèo Scratch màu vàng cam', 'Một chú khủng long xanh', 'Một phi thuyền không gian', 'Một quả bóng đá'],
      correct_answer: 'Chú mèo Scratch màu vàng cam',
      correct_index: 0,
      explanation: 'Chú mèo vàng là nhân vật biểu tượng mặc định khi tạo một dự án mới trong Scratch.',
      points: 1
    },
    {
      id: 'qb_k5_02',
      question: 'Tổ hợp phím tắt chuẩn để LƯU (Save) văn bản Word hoặc bài trình chiếu PowerPoint là:',
      grade: 5,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Ctrl + S', 'Ctrl + C', 'Ctrl + V', 'Ctrl + Z'],
      correct_answer: 'Ctrl + S',
      correct_index: 0,
      explanation: 'Ctrl + S (Save) giúp lưu lại kết quả bài làm để tránh mất dữ liệu khi mất điện.',
      points: 1
    },
    {
      id: 'qb_k5_03',
      question: 'Khi sử dụng tranh ảnh, tài liệu lấy từ Internet vào bài thuyết trình của mình, em nên:',
      grade: 5,
      topic: 'TOPIC_D',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Ghi rõ nguồn tác giả hoặc trang web đã lấy tài liệu để tôn trọng bản quyền', 'Nhận đó là tranh do chính mình tự vẽ hoàn toàn', 'Bán tranh đó cho các bạn khác lấy tiền', 'Xóa tên tác giả gốc đi'],
      correct_answer: 'Ghi rõ nguồn tác giả hoặc trang web đã lấy tài liệu để tôn trọng bản quyền',
      correct_index: 0,
      explanation: 'Tôn trọng bản quyền tác giả là một đức tính văn minh khi sử dụng công nghệ số.',
      points: 1
    },
    {
      id: 'qb_k5_04',
      question: 'Cấu trúc của một địa chỉ thư điện tử (Email) hợp lệ gồm có ký hiệu đặc biệt nào?',
      grade: 5,
      topic: 'TOPIC_B',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Ký hiệu @ (A-còng)', 'Ký hiệu # (Thăng)', 'Ký hiệu $ (Đô-la)', 'Ký hiệu & (Và)'],
      correct_answer: 'Ký hiệu @ (A-còng)',
      correct_index: 0,
      explanation: 'Địa chỉ email luôn có dạng tên_người_dùng@tên_nhà_cung_cấp (ví dụ: hocsinh@gmail.com).',
      points: 1
    },
    {
      id: 'qb_k5_05',
      question: 'Trong phần mềm Scratch, khối lệnh màu xanh dương "move 10 steps" có tác dụng gì?',
      grade: 5,
      topic: 'TOPIC_F',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'THÔNG HIỂU',
      options: ['Cho nhân vật di chuyển tiến lên 10 bước', 'Phát ra âm thanh tiếng kêu 10 lần', 'Đổi màu nhân vật thành màu xanh', 'Xóa nhân vật khỏi sân khấu'],
      correct_answer: 'Cho nhân vật di chuyển tiến lên 10 bước',
      correct_index: 0,
      explanation: 'Khối "move 10 steps" thuộc nhóm Motion (Chuyển động), điều khiển nhân vật tiến về phía trước 10 bước.',
      points: 1
    },
    {
      id: 'qb_k5_06',
      question: 'Để sao chép (Copy) và dán (Paste) một đoạn văn bản hoặc hình ảnh, ta dùng tổ hợp phím nào?',
      grade: 5,
      topic: 'TOPIC_E',
      type: 'MULTIPLE_CHOICE',
      difficulty: 'NHẬN BIẾT',
      options: ['Ctrl + C để sao chép, sau đó Ctrl + V để dán', 'Ctrl + X để sao chép, sau đó Ctrl + Z để dán', 'Ctrl + A để sao chép, sau đó Ctrl + B để dán', 'Ctrl + P để sao chép, sau đó Ctrl + S để dán'],
      correct_answer: 'Ctrl + C để sao chép, sau đó Ctrl + V để dán',
      correct_index: 0,
      explanation: 'Ctrl + C (Copy) lưu vào bộ nhớ tạm, và Ctrl + V (Paste) để dán vào vị trí con trỏ.',
      points: 1
    }
  ];

  for (const q of sampleQuestions) {
    insertStmt.run(
      q.id,
      q.question,
      q.grade,
      'Tin Học',
      q.topic,
      q.lesson_id || null,
      q.type,
      q.difficulty,
      JSON.stringify(q.options),
      q.correct_answer,
      q.correct_index,
      q.explanation,
      q.points
    );
  }
}
