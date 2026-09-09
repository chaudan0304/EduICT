import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  Lightbulb, 
  Layers, 
  Eye
} from 'lucide-react';
import { 
  INFORMATICS_TOPICS, 
  QUESTION_TYPES, 
  DIFFICULTIES, 
  createDefaultQuestion 
} from './quizStorage';

export default function QuestionFormModal({
  isOpen,
  onClose,
  question = null,
  onSave,
  availableLessons = []
}) {
  const [formData, setFormData] = useState(() => createDefaultQuestion(3, 'TOPIC_A'));
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData({
        ...question,
        options: Array.isArray(question.options) ? [...question.options] : ['A', 'B', 'C', 'D'],
        correct_index: question.correct_index !== undefined ? Number(question.correct_index) : 0
      });
    } else {
      setFormData(createDefaultQuestion(3, 'TOPIC_A'));
    }
    setShowPreview(false);
  }, [question, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (idx, value) => {
    const updated = [...(formData.options || [])];
    updated[idx] = value;
    setFormData(prev => ({
      ...prev,
      options: updated,
      correct_answer: prev.correct_index === idx ? value : prev.correct_answer
    }));
  };

  const handleSetCorrect = (idx) => {
    setFormData(prev => ({
      ...prev,
      correct_index: idx,
      correct_answer: prev.options[idx] || `Phương án ${String.fromCharCode(65 + idx)}`
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      alert('⚠️ Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    const payload = {
      ...formData,
      question: formData.question.trim(),
      grade: Number(formData.grade) || 3,
      correct_index: Number(formData.correct_index) || 0,
      correct_answer: formData.options?.[formData.correct_index] || formData.correct_answer || ''
    };

    onSave(payload);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxWidth: 780,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-ground)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {question ? 'Chỉnh Sửa Câu Hỏi' : 'Tạo Câu Hỏi Mới'}
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Ngân hàng câu hỏi trắc nghiệm Tin học Tiểu học (GDPT 2018)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', gap: '0.35rem' }}
            >
              <Eye size={15} />
              <span>{showPreview ? 'Chỉnh Sửa' : 'Xem Trước'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-icon"
              style={{ width: 34, height: 34 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {showPreview ? (
            /* Live Preview Canvas */
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <span style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 99,
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontSize: '0.8125rem',
                  fontWeight: 700
                }}>
                  Khối {formData.grade} • {INFORMATICS_TOPICS.find(t => t.id === formData.topic)?.label || formData.topic}
                </span>
                <span style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 99,
                  background: DIFFICULTIES.find(d => d.id === formData.difficulty)?.bg || 'rgba(255,255,255,0.1)',
                  color: DIFFICULTIES.find(d => d.id === formData.difficulty)?.color || '#fff',
                  fontSize: '0.8125rem',
                  fontWeight: 700
                }}>
                  {formData.difficulty}
                </span>
              </div>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.4, marginBottom: '1.5rem', color: '#f8fafc' }}>
                {formData.question || 'Nội dung câu hỏi sẽ hiển thị tại đây...'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
                {(formData.options || []).map((opt, idx) => {
                  const isCorrect = idx === formData.correct_index;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        border: isCorrect ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isCorrect ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.95rem'
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: isCorrect ? '#6ee7b7' : '#e2e8f0' }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {formData.explanation && (
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(2, 132, 199, 0.15)',
                  borderLeft: '4px solid #0284c7',
                  fontSize: '0.9rem',
                  color: '#bae6fd',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  <Lightbulb size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Giải thích:</strong> {formData.explanation}</span>
                </div>
              )}
            </div>
          ) : (
            /* Edit Form Fields */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Hàng 1: Khối lớp, Chủ đề, Mức độ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Khối Lớp
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => handleFieldChange('grade', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {[1, 2, 3, 4, 5].map(g => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Chủ Đề GDPT 2018
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => handleFieldChange('topic', e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {INFORMATICS_TOPICS.filter(t => t.id !== 'all').map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Mức Độ Nhận Thức
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {DIFFICULTIES.filter(d => d.id !== 'all').map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hàng 2: Loại câu hỏi & Bài học liên kết */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Dạng Câu Hỏi
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let newOpts = formData.options;
                      if (newType === 'TRUE_FALSE') {
                        newOpts = ['Đúng', 'Sai'];
                      } else if (newType === 'MULTIPLE_CHOICE' && formData.options.length < 4) {
                        newOpts = ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
                      }
                      setFormData(prev => ({
                        ...prev,
                        type: newType,
                        options: newOpts,
                        correct_index: 0,
                        correct_answer: newOpts[0] || ''
                      }));
                    }}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    {QUESTION_TYPES.filter(t => t.id !== 'all').map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Gắn với Bài Học Trong Thư Viện (Tùy chọn)
                  </label>
                  <select
                    value={formData.lesson_id || ''}
                    onChange={(e) => handleFieldChange('lesson_id', e.target.value || null)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Không gắn riêng (Dùng chung cho cả khối) --</option>
                    {availableLessons.map(l => (
                      <option key={l.id} value={l.id}>
                        [K{l.grade}] {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Nội Dung Câu Hỏi <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) => handleFieldChange('question', e.target.value)}
                  placeholder="Ví dụ: Internet dùng để làm gì trong học tập và đời sống?"
                  className="input-field"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', fontSize: '1rem', fontWeight: 600 }}
                  required
                />
              </div>

              {/* Danh sách các lựa chọn đáp án */}
              <div style={{
                background: 'var(--surface-ground)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Các Phương Án Lựa Chọn (Bấm nút tròn để chọn đáp án đúng)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                    ✓ Đáp án đúng hiện tại: Phương án {String.fromCharCode(65 + formData.correct_index)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(formData.options || []).map((opt, idx) => {
                    const isCorrect = idx === formData.correct_index;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-card)',
                          border: isCorrect ? '2px solid #10b981' : '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.5rem 0.75rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetCorrect(idx)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            background: isCorrect ? '#10b981' : 'var(--surface-secondary)',
                            color: isCorrect ? '#fff' : 'var(--text-muted)',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title="Bấm để chọn đây là đáp án ĐÚNG"
                        >
                          {isCorrect ? <CheckCircle2 size={18} /> : String.fromCharCode(65 + idx)}
                        </button>

                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Nội dung phương án ${String.fromCharCode(65 + idx)}...`}
                          className="input-field"
                          style={{ flex: 1, border: 'none', background: 'transparent', boxShadow: 'none', fontWeight: 600 }}
                          required
                        />

                        {isCorrect && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', paddingRight: '0.5rem' }}>
                            ĐÁP ÁN ĐÚNG
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lời giải thích sư phạm */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Giải Thích Chi Tiết / Hướng Dẫn Sư Phạm (Hiển thị khi hiện đáp án)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => handleFieldChange('explanation', e.target.value)}
                  placeholder="Ví dụ: Vì Internet là mạng toàn cầu kết nối các máy tính để tìm kiếm và trao đổi thông tin..."
                  className="input-field"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* Footer nút hành động */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0.6rem 1.5rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Save size={16} />
              <span>{question ? 'Lưu Thay Đổi' : 'Thêm Vào Ngân Hàng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
