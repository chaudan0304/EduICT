import React from 'react';
import { 
  Trophy, 
  X, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Award, 
  TrendingUp, 
  HelpCircle,
  Lightbulb
} from 'lucide-react';

export default function QuizResultModal({
  isOpen,
  onClose,
  summaryData,
  onRetryQuiz = null
}) {
  if (!isOpen || !summaryData) return null;

  const {
    title = 'Quick Quiz Tin Học',
    total_questions = 0,
    average_accuracy = 0,
    total_stars_awarded = 0,
    results = [],
    student_results = []
  } = summaryData;

  // Xác định câu làm tốt nhất và câu khó nhất
  let bestQuestion = null;
  let hardestQuestion = null;
  const weakQuestions = [];

  if (results.length > 0) {
    const sorted = [...results].sort((a, b) => (b.accuracy_rate || 0) - (a.accuracy_rate || 0));
    bestQuestion = sorted[0];
    hardestQuestion = sorted[sorted.length - 1];

    // Phát hiện các câu có tỷ lệ chính xác < 50% để cảnh báo sư phạm
    results.forEach(r => {
      if ((r.accuracy_rate || 0) < 50) {
        weakQuestions.push(r);
      }
    });
  }

  // Lấy danh sách học sinh xuất sắc (nếu có Mode 2)
  const topStudents = [];
  if (student_results && student_results.length > 0) {
    const studentScores = {};
    student_results.forEach(sr => {
      if (sr.status === 'CORRECT') {
        studentScores[sr.student_name] = (studentScores[sr.student_name] || 0) + 1;
      }
    });

    Object.entries(studentScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([name, count]) => {
        topStudents.push({ name, count });
      });
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2100,
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.3s ease'
      }}>
        {/* Header Vàng Vinh Quang */}
        <div style={{
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
            }}>
              <Trophy size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                KẾT QUẢ QUICK QUIZ
              </h2>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {title} • {total_questions} câu hỏi
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ width: 34, height: 34 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung kết quả */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 3 Thẻ Chỉ Số Nổi Bật */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                {average_accuracy}%
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                Độ chính xác TB
              </span>
            </div>

            <div style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>
                {results.length}/{total_questions}
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                Câu đã hoàn thành
              </span>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Star size={24} fill="#f59e0b" />
                <span>+{total_stars_awarded}</span>
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                Tổng ⭐ khen thưởng
              </span>
            </div>
          </div>

          {/* Phân Tích Câu Đúng Nhất & Câu Khó Nhất */}
          <div style={{
            background: 'var(--surface-ground)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              📊 Phân Tích Chi Tiết Theo Câu Hỏi
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {bestQuestion && (
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid #10b981',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Câu làm tốt nhất</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Độ chính xác: <strong style={{ color: '#10b981' }}>{bestQuestion.accuracy_rate}%</strong>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {bestQuestion.correct_count}/{bestQuestion.total_responses} học sinh trả lời đúng
                  </span>
                </div>
              )}

              {hardestQuestion && (
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid #f59e0b',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <TrendingUp size={16} />
                    <span>Câu cần củng cố</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Độ chính xác: <strong style={{ color: '#f59e0b' }}>{hardestQuestion.accuracy_rate}%</strong>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {hardestQuestion.correct_count}/{hardestQuestion.total_responses} học sinh trả lời đúng
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cảnh Báo Sư Phạm (Learning Analytics Warning nếu có câu < 50%) */}
          {weakQuestions.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderLeft: '5px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                <AlertTriangle size={18} />
                <span>⚠️ KHUYẾN NGHỊ SƯ PHẠM (ĐÁNH GIÁ THƯỜNG XUYÊN)</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Có <strong>{weakQuestions.length} câu hỏi</strong> có tỷ lệ chính xác dưới 50%. Thầy/cô nên dành 2–3 phút cuối giờ để củng cố và giải thích lại các khái niệm này cho cả lớp trước khi kết thúc tiết học.
              </p>
            </div>
          )}

          {/* Top Học Sinh Sôi Nổi (Nếu có dữ liệu Mode 2) */}
          {topStudents.length > 0 && (
            <div style={{
              background: 'var(--surface-ground)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                ⭐ Vinh Danh Học Sinh Tích Cực (Mode 2)
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {topStudents.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#f59e0b' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 600 }}>{st.name}</span>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>+{st.count}⭐</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Nút Đóng */}
        <div style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'var(--surface-ground)'
        }}>
          {onRetryQuiz && (
            <button
              type="button"
              onClick={onRetryQuiz}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem', gap: '0.4rem' }}
            >
              <RotateCcw size={16} />
              <span>Chơi Lại Quiz</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.75rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            }}
          >
            ✓ Đã Hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
