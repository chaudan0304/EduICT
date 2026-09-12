import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  HelpCircle, 
  BookOpen, 
  Layers, 
  Users, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { fetchAiStatus } from './aiService';

export default function AiAssistantModal({
  isOpen,
  onClose,
  onOpenAnalyzeLesson,
  onOpenQuestionGen,
  onOpenLessonFlow,
  onOpenClassAnalysis
}) {
  const [status, setStatus] = useState({ enabled: true, configured: false, model: 'gemini-2.5-flash' });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setChecking(true);
      fetchAiStatus()
        .then(st => setStatus(st))
        .finally(() => setChecking(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2200,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'var(--surface-card, #1e293b)',
        color: 'var(--text-main, #f8fafc)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--surface-border, #334155)',
        boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: 760,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s ease'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0284c7 0%, #a855f7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(2, 132, 199, 0.4)'
            }}>
              <Sparkles size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                  Trợ Giảng AI Tin Học EduICT
                </h2>
                <span style={{
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0284c7, #a855f7)',
                  color: '#fff',
                  padding: '0.15rem 0.6rem',
                  borderRadius: 99
                }}>
                  GEMINI 2.5 FLASH
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                Bộ công cụ AI hỗ trợ giáo viên soạn bài, tạo câu hỏi trắc nghiệm, thiết kế tiến trình & phân tích học tập GDPT 2018.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ color: 'var(--text-muted, #94a3b8)' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Trạng thái kết nối Gemini */}
        <div style={{
          padding: '0.85rem 2rem',
          background: status.configured ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: status.configured ? '#10b981' : '#f59e0b',
              boxShadow: status.configured ? '0 0 8px #10b981' : 'none'
            }} />
            <span>Trạng thái kết nối:</span>
            <strong style={{ color: status.configured ? '#10b981' : '#f59e0b' }}>
              {status.configured ? 'Sẵn sàng hoạt động' : 'Chưa thiết lập GEMINI_API_KEY'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted, #94a3b8)' }}>
            <Cpu size={15} />
            <span>Mô hình: <strong>{status.model || 'gemini-2.5-flash'}</strong></span>
          </div>
        </div>

        {/* Cảnh báo hướng dẫn nếu chưa cấu hình key */}
        {!status.configured && (
          <div style={{
            margin: '1.25rem 2rem 0',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 12,
            padding: '1rem 1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>
                Chưa cấu hình GEMINI_API_KEY
              </strong>
              <span style={{ color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
                Để sử dụng các tính năng Trợ Giảng AI, thầy/cô hoặc quản trị viên vui lòng thêm khóa API vào file <code>.env</code> ở thư mục gốc dự án:
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 6,
                  marginTop: '0.4rem',
                  color: '#38bdf8',
                  fontSize: '0.8rem'
                }}>GEMINI_API_KEY=AIzaSy...&#10;GEMINI_MODEL=gemini-2.5-flash&#10;GEMINI_ENABLED=true</pre>
                <em>Lưu ý: Mọi chức năng cốt lõi của EduICT vẫn hoạt động bình thường kể cả khi không kích hoạt AI.</em>
              </span>
            </div>
          </div>
        )}

        {/* Danh Sách 5 Tính Năng Chính */}
        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Feature 1: Phân tích bài giảng */}
          <div
            onClick={() => {
              onClose();
              if (onOpenAnalyzeLesson) onOpenAnalyzeLesson();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--surface-border, #334155)',
              borderRadius: 12,
              padding: '1.15rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--surface-border, #334155)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(2, 132, 199, 0.15)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
                  ✨ Phân Tích Bài Giảng (Lesson Analysis)
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Trích xuất mục tiêu chuẩn GDPT 2018, từ khóa trọng tâm và gợi ý hoạt động học tập từ slide PowerPoint.
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #94a3b8)" />
          </div>

          {/* Feature 2: Tạo câu hỏi trắc nghiệm */}
          <div
            onClick={() => {
              onClose();
              if (onOpenQuestionGen) onOpenQuestionGen();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--surface-border, #334155)',
              borderRadius: 12,
              padding: '1.15rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(236, 72, 153, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--surface-border, #334155)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(236, 72, 153, 0.15)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
                  📝 Tạo Câu Hỏi Trắc Nghiệm (Question Bank)
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Tự động sinh 3–10 câu hỏi trắc nghiệm 4 lựa chọn theo 3 mức độ (Nhận biết, Thông hiểu, Vận dụng) với checkbox chọn lọc.
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #94a3b8)" />
          </div>

          {/* Feature 3: Đề xuất tiến trình tiết học */}
          <div
            onClick={() => {
              onClose();
              if (onOpenLessonFlow) onOpenLessonFlow();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--surface-border, #334155)',
              borderRadius: 12,
              padding: '1.15rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--surface-border, #334155)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
                  🎯 Đề Xuất Tiến Trình Tiết Học (Lesson Flow)
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Lập kế hoạch 35 phút phân bổ 5 hoạt động sư phạm chuẩn cho phòng máy: Khởi động, Khám phá, Thực hành, Đố vui, Tổng kết.
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #94a3b8)" />
          </div>

          {/* Feature 4: Phân tích lớp học */}
          <div
            onClick={() => {
              onClose();
              if (onOpenClassAnalysis) onOpenClassAnalysis();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--surface-border, #334155)',
              borderRadius: 12,
              padding: '1.15rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--surface-border, #334155)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>
                  👨‍🏫 Phân Tích Sư Phạm Lớp Học (Class Analysis)
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Tổng hợp năng lực thực hành (Chuột, Phím, Phần mềm), nhận diện học sinh cần hỗ trợ theo Thông tư 27 không đổi điểm.
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #94a3b8)" />
          </div>
        </div>

        {/* Footer Modal */}
        <div style={{
          padding: '1rem 2rem',
          borderTop: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-ground, #0f172a)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Quyền kiểm soát thuộc về giáo viên • Không tự động ghi đè dữ liệu</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
