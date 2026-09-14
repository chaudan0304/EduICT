import React, { useState } from 'react';
import { 
  GraduationCap, 
  ClipboardList, 
  Sparkles, 
  Gamepad2, 
  RotateCcw, 
  Monitor, 
  Gift, 
  Clock, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  BookOpen,
  Zap,
  Target
} from 'lucide-react';

export default function HomeDashboard({ 
  classes = [],
  currentClass, 
  onSelectClass,
  studentStats,
  _isLoadingStats,
  onSelectTab,
  onOpenExchangeModal,
  currentSchoolYear = '2026 - 2027'
}) {
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const students = currentClass?.students || [];
  const totalStars = students.reduce((acc, s) => acc + (s.stars || 0), 0);
  const grade = currentClass?.grade || 3;
  const isGrade1or2 = (grade === 1 || grade === 2);
  
  // Danh sách các chức năng hệ thống EduICT Tin Học Tiểu Học
  const features = [
    {
      id: 'sessions',
      title: 'Trung Tâm Tiết Học (Classroom Session)',
      badge: 'MỚI • Trung tâm điều khiển',
      badgeColor: '#ec4899',
      icon: '🎯',
      description: 'Lên tiến trình bài học (Lesson Flow), bắt đầu, bấm giờ, ghi nhận phát biểu và thưởng sao 1-chạm trọn vẹn tiết học.',
      highlight: 'Tiến trình 35p • Master Timer • Thưởng sao tức thì',
      actionText: 'Vào Trung Tâm Tiết Học',
      color: 'rgba(236, 72, 153, 0.08)',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      accentColor: '#ec4899'
    },
    {
      id: 'lessons',
      title: 'Bài Học & Slide (Lesson Library)',
      badge: 'MỚI • GDPT 2018',
      badgeColor: '#8b5cf6',
      icon: '📚',
      description: 'Ngân hàng giáo án số, thiết kế bài trình chiếu tương tác 7 dạng slide và trình chiếu toàn màn hình máy chiếu.',
      highlight: '7 dạng Slide • Trắc nghiệm tương tác • Teacher Notes',
      actionText: 'Vào Thư Viện Bài Học',
      color: 'rgba(139, 92, 246, 0.08)',
      borderColor: 'rgba(139, 92, 246, 0.25)',
      accentColor: '#8b5cf6'
    },
    {
      id: 'quiz',
      title: 'Quick Quiz (Đố Vui & Ngân Hàng Câu Hỏi)',
      badge: 'MỚI • Đánh giá thường xuyên',
      badgeColor: '#ec4899',
      icon: '⚡',
      description: 'Kiểm tra nhanh mức độ hiểu bài ngay trên máy chiếu, giơ thẻ A/B/C/D không cần điện thoại, tự tính % và thưởng sao.',
      highlight: 'Projector Mode • Class Mode & Student Mode • Thưởng sao ⭐',
      actionText: 'Vào Quick Quiz & Ngân Hàng',
      color: 'rgba(236, 72, 153, 0.08)',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      accentColor: '#ec4899'
    },
    {
      id: 'seating',
      title: 'Phòng Máy Thực Hành',
      badge: '5 Dãy • 31 Máy',
      badgeColor: '#0284c7',
      icon: '🖥️',
      description: 'Sơ đồ phòng máy trực quan, hỗ trợ ngồi ghép đôi 2 học sinh/máy, cộng sao thi đua 1 chạm & kiểm tra máy hỏng.',
      highlight: 'Ngồi đôi & Báo máy hỏng toàn trường',
      actionText: 'Xem Sơ Đồ Phòng Máy',
      color: 'rgba(2, 132, 199, 0.08)',
      borderColor: 'rgba(2, 132, 199, 0.25)',
      accentColor: '#0284c7'
    },
    {
      id: 'gradebook',
      title: isGrade1or2 ? 'Sổ Kỹ Năng & Sao' : 'Sổ Điểm (Thông Tư 27)',
      badge: isGrade1or2 ? 'Khối 1-2: Không điểm số' : 'Khối 3-4-5: Chuẩn TT27',
      badgeColor: '#10b981',
      icon: '📋',
      description: isGrade1or2 
        ? 'Theo dõi kỹ năng cầm chuột, kéo thả, gõ phím cơ bản, vẽ tranh Paint và tích lũy sao thi đua.' 
        : 'Đánh giá thường xuyên mức T - H - C, kiểm tra thực hành cuối kỳ thang điểm 10 và xuất Excel nộp vnEdu/SMAS.',
      highlight: isGrade1or2 ? '100% Khen thưởng tích cực' : 'Chuẩn Thông tư 27/2020/TT-BGDĐT',
      actionText: 'Vào Sổ Điểm Tin Học',
      color: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      accentColor: '#10b981'
    },
    {
      id: 'goodscores',
      title: 'Điểm Tốt, Điểm Trừ & Nội Quy',
      badge: 'Cộng/Trừ Sao • Tự Sửa Nội Quy',
      badgeColor: '#ec4899',
      icon: '⭐',
      description: 'Quy định các tiêu chí khen thưởng (+⭐) và vi phạm nội quy phòng máy (-⭐). Giáo viên được toàn quyền thêm, sửa, xóa tiêu chí.',
      highlight: 'Tùy chỉnh nội quy phòng máy & Bảng thi đua',
      actionText: 'Mở Sổ Điểm & Nội Quy',
      color: 'rgba(236, 72, 153, 0.08)',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      accentColor: '#ec4899'
    },
    {
      id: 'duckrace',
      title: 'Đua Vịt Gọi Trả Bài',
      badge: 'HOT • Hào hứng',
      badgeColor: '#f59e0b',
      icon: '🦆',
      description: 'Cuộc đua bơi vịt kịch tính trên sông để bốc thăm ngẫu nhiên học sinh lên bảng trả bài hoặc gỡ điểm miệng.',
      highlight: 'Gọi học sinh trả bài & Bơi bứt phá',
      actionText: 'Bắt Đầu Đua Vịt',
      color: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.25)',
      accentColor: '#f59e0b'
    },
    {
      id: 'luckywheel',
      title: 'Vòng Quay May Mắn',
      badge: 'Bốc thăm công bằng',
      badgeColor: '#8b5cf6',
      icon: '🎡',
      description: 'Vòng xoay đa sắc quay thưởng, bốc thăm học sinh lên bảng kiểm tra bài cũ hoặc nhận câu hỏi vui.',
      highlight: 'Loại trừ người đã gọi & Âm thanh tick-tick',
      actionText: 'Quay Vòng May Mắn',
      color: 'rgba(139, 92, 246, 0.08)',
      borderColor: 'rgba(139, 92, 246, 0.25)',
      accentColor: '#8b5cf6'
    },
    {
      id: 'rewards',
      title: 'Đổi Thưởng & Quy Đổi Điểm',
      badge: '10⭐ = +1.0 Điểm',
      badgeColor: '#10b981',
      icon: '🎁',
      description: 'Quy đổi sao thi đua sang điểm miệng/15p (10 sao = 1 điểm) và kho thẻ bảo bối quyền lợi lớp học hấp dẫn.',
      highlight: 'Đổi điểm học tập & Thẻ miễn tử',
      actionText: 'Mở Cửa Hàng Đổi Sao',
      color: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      accentColor: '#10b981'
    },
    {
      id: 'timer',
      title: 'Đồng Hồ Đếm Giờ',
      badge: 'Màn hình máy chiếu',
      badgeColor: '#ef4444',
      icon: '⏱️',
      description: 'Đồng hồ đếm ngược số siêu lớn cho lớp học thảo luận nhóm, làm bài tập nhanh, kèm chuông báo động hết giờ.',
      highlight: 'Các mốc 30s, 1p, 2p, 5p, 10p, 15p',
      actionText: 'Mở Đồng Hồ Đếm Giờ',
      color: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.25)',
      accentColor: '#ef4444'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Banner Chào Mừng Lớp Học & Tóm Tắt */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(245, 158, 11, 0.08) 100%)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          fontSize: '10rem',
          opacity: 0.05,
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          🎓
        </div>

        <div style={{ maxWidth: '820px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              EduICT Hub
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Môn {currentClass?.subject || 'Tin Học Tiểu Học'}
            </span>
          </div>

          <h1 style={{ 
            fontSize: '2.25rem', 
            fontWeight: 800, 
            color: 'var(--text-main)', 
            marginBottom: '0.75rem',
            lineHeight: 1.2
          }}>
            Trợ Giảng Tin Học Tiểu Học • <span style={{ 
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>{currentClass?.name || 'Lớp Học'} (Khối {grade})</span>
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Hệ thống quản lý phòng máy 31 máy, sổ đánh giá kỹ năng & chuẩn Thông tư 27 cho 5 khối lớp, cộng sao 1-chạm và các mini-games tương tác sôi động cho tiết học 35 phút.
          </p>

          {/* Thanh chỉ số phòng máy và lớp */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Users size={20} color="#4f46e5" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sĩ số lớp đang chọn</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{students.length} Học sinh</div>
              </div>
            </div>

            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Star size={20} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng sao tích lũy</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f59e0b' }}>{totalStars} ⭐</div>
              </div>
            </div>

            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Monitor size={20} color="#06b6d4" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phòng máy thực hành</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#06b6d4' }}>5 Dãy • 31 Máy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION XXV & XXVI: THỐNG KÊ TOÀN TRƯỜNG & THỐNG KÊ THEO KHỐI */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--surface-border)',
          paddingBottom: '0.85rem'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              <GraduationCap size={22} color="var(--primary)" />
              <span>THỐNG KÊ SỐ LƯỢNG HỌC SINH</span>
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Số liệu thực tế trực tiếp từ cơ sở dữ liệu SQLite
            </div>
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(2, 132, 199, 0.1)',
            color: 'var(--primary)',
            padding: '0.3rem 0.75rem',
            borderRadius: '999px'
          }}>
            Năm học {studentStats?.schoolYear || currentSchoolYear}
          </span>
        </div>

        {/* Grid các Cards Thống Kê: Toàn trường + 5 Khối */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card TOÀN TRƯỜNG (Nổi Bật) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
            border: '2px solid rgba(2, 132, 199, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.12)'
          }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.35rem'
            }}>
              TOÀN TRƯỜNG
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
              {studentStats?.totalStudents ?? 807}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              học sinh
            </div>
            <div style={{
              marginTop: '0.65rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(2, 132, 199, 0.18)',
              color: 'var(--primary)'
            }}>
              {studentStats?.totalClasses ?? 24} lớp
            </div>
          </div>

          {/* 5 Cards KHỐI 1 - 5 (Lớn, rõ ràng, dễ đọc) */}
          {[1, 2, 3, 4, 5].map(gNum => {
            const gData = studentStats?.grades?.find(g => g.grade === gNum) || { 
              grade: gNum, 
              studentCount: 0, 
              classCount: 0 
            };
            const isSelected = selectedGradeFilter === gNum;
            const hasNoStudents = gData.studentCount === 0;

            return (
              <div
                key={gNum}
                onClick={() => setSelectedGradeFilter(selectedGradeFilter === gNum ? 'all' : gNum)}
                style={{
                  background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-secondary)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.15rem 1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 14px rgba(2, 132, 199, 0.18)' : 'none'
                }}
                title={`Bấm để lọc xem danh sách lớp Khối ${gNum}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    textTransform: 'uppercase'
                  }}>
                    KHỐI {gNum}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {gData.classCount} lớp
                  </span>
                </div>

                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {gData.studentCount}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                    học sinh
                  </span>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  {hasNoStudents ? (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#d97706',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      ⚠ Chưa có danh sách
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {isSelected ? '✓ Đang xem' : 'Bấm để xem lớp'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION XXII & XXIII: BỘ LỌC KHỐI & DANH SÁCH LỚP (Cấp Khối & Lớp) */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Bộ Lọc Khối Rõ Ràng (Section XXII) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--surface-border)',
          paddingBottom: '1rem'
        }}>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            KHỐI:
          </span>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {['all', 1, 2, 3, 4, 5].map(opt => {
              const isAct = selectedGradeFilter === opt;
              const label = opt === 'all' ? 'Tất cả' : `Khối ${opt}`;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedGradeFilter(opt)}
                  className={`btn ${isAct ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    padding: '0.4rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    background: isAct ? 'linear-gradient(135deg, #0284c7, #2563eb)' : undefined
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Danh Sách Lớp Khi Chọn Khối (Section XXIII & Section 8) */}
        <div>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              {selectedGradeFilter === 'all' ? 'TẤT CẢ CÁC LỚP HỌC' : `CÁC LỚP KHỐI ${selectedGradeFilter}`}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {classes.filter(c => selectedGradeFilter === 'all' || Number(c.grade) === Number(selectedGradeFilter)).length} lớp
            </span>
          </div>

          {classes.length === 0 ? (
            /* Trạng thái chưa có lớp trong năm học mới (Section 17) */
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--surface-secondary)',
              border: '1px dashed var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              margin: '0.5rem 0'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Năm học {currentSchoolYear}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Chưa có lớp học nào trong năm học này.
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.85rem'
            }}>
              {classes
                .filter(c => selectedGradeFilter === 'all' || Number(c.grade) === Number(selectedGradeFilter))
                .map(c => {
                  const isCurrent = c.id === currentClass?.id;
                  const count = c.students?.length || 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectClass?.(c.id)}
                      style={{
                        background: isCurrent 
                          ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)' 
                          : 'var(--surface-secondary)',
                        border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1.15rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: isCurrent ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.borderColor = 'var(--surface-border)';
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: isCurrent ? 'var(--primary)' : 'var(--text-main)'
                        }}>
                          {c.name} — <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{count} học sinh</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Khối {c.grade || 3} • Môn {c.subject || 'Tin Học'}
                        </div>
                      </div>

                      {isCurrent ? (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#fff',
                          background: 'var(--primary)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap'
                        }}>
                          Đang chọn
                        </span>
                      ) : (
                        count === 0 && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: '#d97706',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px'
                          }}>
                            0 HS
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION XXIV & SECTION 13: THÔNG TIN LỚP ĐANG CHỌN (Hiển thị ngay sau khi chọn lớp) */}
      {currentClass && (
        <div style={{
          background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(2, 132, 199, 0.05) 100%)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              LỚP ĐANG CHỌN
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1.2rem' }}>
                Khối {currentClass.grade || 3} ›
              </span>
              <span>{currentClass.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                👥 {students.length} học sinh
              </span>
              {students.length === 0 ? (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#d97706',
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px'
                }}>
                  ⚠ Chưa có danh sách học sinh
                </span>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  color: '#10b981',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px'
                }}>
                  ✓ Đã có danh sách
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onSelectTab?.('seating')}
              className="btn btn-outline"
              style={{ fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Monitor size={16} />
              <span>Sơ Đồ Phòng Máy</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('gradebook')}
              className="btn btn-outline"
              style={{ fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <ClipboardList size={16} />
              <span>Sổ Điểm (TT27)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('goodscores')}
              className="btn btn-outline"
              style={{ fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Star size={16} />
              <span>Điểm Tốt & Sao</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('sessions')}
              className="btn btn-primary"
              style={{
                fontWeight: 800,
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Target size={16} />
              <span>Vào Tiết Học</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner Nổi Bật: Tỷ Lệ Quy Đổi Sao Sang Điểm */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.35)',
            fontSize: '1.35rem'
          }}>
            ⭐
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Cơ Chế Quy Đổi Sao Thi Đua: <strong>10 Sao (⭐) = +1.0 Điểm Số</strong></span>
              <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>Mới</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Quy đổi trực tiếp vào <strong>Điểm Miệng</strong> (m1, m2) và <strong>Điểm 15 Phút</strong> (p15_1, p15_2). Điểm tối đa đạt 10.0.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => onOpenExchangeModal?.()}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '0.6rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            <Sparkles size={18} />
            Quy Đổi Sao Ngay
          </button>
        </div>
      </div>

      {/* Lưới Danh Mục Các Chức Năng (Feature Cards) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Danh Mục Chức Năng Hệ Thống
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Chọn chức năng để bắt đầu buổi dạy học hoặc quản lý lớp
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {features.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                background: 'var(--surface-card)',
                border: `1px solid ${item.borderColor}`,
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.borderColor = item.accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = item.borderColor;
              }}
            >
              <div>
                {/* Header thẻ: Icon lớn & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-lg)',
                    background: item.color,
                    border: `1px solid ${item.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.85rem'
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: `${item.accentColor}18`,
                    color: item.accentColor,
                    border: `1px solid ${item.accentColor}35`
                  }}>
                    {item.badge}
                  </span>
                </div>

                {/* Tên chức năng */}
                <h3 style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 700, 
                  color: 'var(--text-main)', 
                  margin: '0 0 0.5rem 0' 
                }}>
                  {item.title}
                </h3>

                {/* Mô tả chức năng */}
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--text-muted)', 
                  lineHeight: 1.55, 
                  margin: '0 0 1rem 0',
                  minHeight: '2.8rem'
                }}>
                  {item.description}
                </p>
              </div>

              {/* Chân thẻ: Nổi bật & Nút hành động */}
              <div>
                <div style={{
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px dashed var(--surface-border)',
                  paddingTop: '0.75rem',
                  marginBottom: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>💡</span>
                  <span>{item.highlight}</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: item.accentColor
                }}>
                  <span>{item.actionText}</span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
