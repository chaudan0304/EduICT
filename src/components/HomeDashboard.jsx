import React from 'react';
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
  Flame
} from 'lucide-react';

export default function HomeDashboard({ 
  currentClass, 
  onSelectTab,
  onOpenExchangeModal 
}) {
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
      title: 'Đua Vịt Lớp Học',
      badge: 'HOT • Hào hứng',
      badgeColor: '#f59e0b',
      icon: '🦆',
      description: 'Mini-game gọi học sinh trả lời ngẫu nhiên hoặc gỡ điểm miệng bằng cuộc đua vịt siêu kịch tính trên sông.',
      highlight: 'Tăng tốc thần tốc & Bục vinh quang',
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
              Năm học 2025 - 2026 • Môn {currentClass?.subject || 'Tin Học'}
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

          {/* Thanh chỉ số nhanh */}
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sĩ số lớp</div>
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng sao / Điểm tốt</div>
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
