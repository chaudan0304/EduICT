import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RotateCcw,
  CheckSquare,
  Square,
  PlusCircle,
  BookOpen
} from 'lucide-react';
import { generateQuestionsApi } from './aiService';
import { createQuestionApi } from '../QuickQuiz/quizStorage';

export default function AiQuestionGeneratorModal({
  isOpen,
  onClose,
  lessons = [],
  preselectedLessonId = null,
  onQuestionsAdded
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(preselectedLessonId || '');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isCached, setIsCached] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveReport, setSaveReport] = useState(null);

  useEffect(() => {
    if (preselectedLessonId) {
      setSelectedLessonId(preselectedLessonId);
    } else if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [preselectedLessonId, lessons]);

  useEffect(() => {
    if (!isOpen) {
      setGeneratedQuestions([]);
      setSelectedIndices(new Set());
      setError(null);
      setSaveReport(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!selectedLessonId) {
      setError('Vui lòng chọn bài học cần sinh câu hỏi.');
      return;
    }
    setLoading(true);
    setError(null);
    setSaveReport(null);
    try {
      const res = await generateQuestionsApi({
        lessonId: String(selectedLessonId),
        count: Number(count),
        difficulty,
        types: ['MULTIPLE_CHOICE']
      });

      const qList = res.data?.questions || [];
      setGeneratedQuestions(qList);
      setIsCached(!!res.isCached);
      // Mặc định chọn tất cả câu hỏi để giáo viên dễ lọc bớt
      setSelectedIndices(new Set(qList.map((_, idx) => idx)));
    } catch (err) {
      console.error('[AI Question Gen] Lỗi:', err);
      let msg = err.message || 'Không thể tạo câu hỏi trắc nghiệm từ AI.';
      if (err.errorCode === 'AI_NOT_CONFIGURED') {
        msg = 'Trợ giảng AI chưa được cấu hình GEMINI_API_KEY trong file .env.';
      } else if (err.errorCode === 'AI_RATE_LIMIT') {
        msg = 'Gemini đang quá tải hoặc đạt giới hạn gọi (15 req/phút). Vui lòng thử lại sau.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(generatedQuestions.map((_, idx) => idx)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleSaveSelectedToBank = async () => {
    if (selectedIndices.size === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi để thêm vào Ngân hàng!');
      return;
    }

    const lessonObj = lessons.find(l => String(l.id) === String(selectedLessonId));
    const grade = lessonObj?.grade || 3;
    const topic = lessonObj?.topic || 'A';

    setIsSaving(true);
    let addedCount = 0;
    try {
      for (const idx of selectedIndices) {
        const q = generatedQuestions[idx];
        if (!q) continue;

        // Chuyển đổi sang format lưu trữ của question_bank
        const questionPayload = {
          grade: Number(grade),
          topic: q.topic || topic,
          difficulty: q.difficulty === 'recognition' ? 'NHẬN BIẾT' : q.difficulty === 'understanding' ? 'THÔNG HIỂU' : q.difficulty === 'application' ? 'VẬN DỤNG' : (q.difficulty || 'NHẬN BIẾT'),
          type: 'MULTIPLE_CHOICE',
          question: q.questionText || q.question_text || q.question,
          question_text: q.questionText || q.question_text || q.question,
          options: q.options || [],
          correct_answer: q.correctAnswer || q.correct_answer,
          correct_index: q.correctIndex !== undefined ? q.correctIndex : (q.options ? q.options.indexOf(q.correctAnswer || q.correct_answer) : 0),
          explanation: q.explanation || '',
          source: 'AI_GEMINI',
          lesson_id: String(selectedLessonId),
          source_lesson_id: String(selectedLessonId),
          tags: ['AI', `Khối_${grade}`, `ChủĐề_${topic}`]
        };

        await createQuestionApi(questionPayload);
        addedCount++;
      }

      setSaveReport(`✓ Đã thêm thành công ${addedCount} câu hỏi AI vào Ngân Hàng Câu Hỏi!`);
      if (onQuestionsAdded) {
        onQuestionsAdded(addedCount);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert(`❌ Lỗi khi lưu câu hỏi vào ngân hàng: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentLesson = lessons.find(l => String(l.id) === String(selectedLessonId));

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
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: 860,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleUp 0.25s ease'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)'
            }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  AI Tạo Câu Hỏi Trắc Nghiệm Tin Học
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  background: '#ec4899',
                  color: '#fff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 99
                }}>
                  GDPT 2018
                </span>
                {isCached && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 99
                  }}>
                    ⚡ Bộ nhớ đệm (Cache)
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)' }}>
                Tự động trích xuất kiến thức bài giảng để sinh câu hỏi trắc nghiệm 4 lựa chọn chuẩn xác.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{ color: 'var(--text-muted, #94a3b8)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thanh Thiết Lập Tạo Câu Hỏi */}
        <div style={{
          padding: '1rem 1.75rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--surface-border, #334155)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
          gap: '1rem',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted, #94a3b8)' }}>
              Bài học nguồn:
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="input-select"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  K{l.grade} - {l.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted, #94a3b8)' }}>
              Số lượng câu hỏi:
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input-select"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value={3}>3 câu hỏi nhanh</option>
              <option value={5}>5 câu hỏi tiêu chuẩn</option>
              <option value={7}>7 câu hỏi đầy đủ</option>
              <option value={10}>10 câu hỏi kiểm tra</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-muted, #94a3b8)' }}>
              Mức độ nhận thức:
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="input-select"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="mixed">Hỗn hợp (Nhận biết + Thông hiểu + Vận dụng)</option>
              <option value="recognition">Nhận biết (Câu hỏi trực quan, nhớ kiến thức)</option>
              <option value="understanding">Thông hiểu (Hiểu bản chất, giải thích)</option>
              <option value="application">Vận dụng (Tình huống thực tế phòng máy)</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-primary"
              style={{
                height: 38,
                padding: '0 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.35)'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{loading ? 'Đang tạo câu hỏi...' : '✨ Sinh Câu Hỏi'}</span>
            </button>
          </div>
        </div>

        {/* Nội dung danh sách câu hỏi */}
        <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Loader2 size={44} className="animate-spin" style={{ color: '#ec4899', margin: '0 auto 1.25rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🤖 Gemini AI đang đọc slide bài giảng và thiết kế câu hỏi...
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #94a3b8)', maxWidth: 500, margin: '0 auto' }}>
                Đảm bảo 4 phương án rõ ràng, đáp án chính xác nằm trong các lựa chọn và giải thích sư phạm chi tiết.
              </p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertCircle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', margin: '0 0 0.35rem 0' }}>
                  Không thể tạo câu hỏi
                </h4>
                <p style={{ fontSize: '0.875rem', margin: '0 0 0.85rem 0', color: 'var(--text-muted, #94a3b8)' }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          )}

          {!loading && !error && generatedQuestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted, #94a3b8)' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(236, 72, 153, 0.1)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Sparkles size={28} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)', marginBottom: '0.4rem' }}>
                Sẵn sàng tạo câu hỏi trắc nghiệm
              </h4>
              <p style={{ fontSize: '0.875rem', maxWidth: 440, margin: '0 auto' }}>
                Chọn bài giảng và nhấn <strong>"✨ Sinh Câu Hỏi"</strong> để Trợ Giảng AI đề xuất câu hỏi trắc nghiệm kèm giải thích.
              </p>
            </div>
          )}

          {generatedQuestions.length > 0 && !loading && (
            <>
              {/* Thanh điều khiển chọn câu hỏi */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.65rem 1rem',
                borderRadius: 10,
                border: '1px solid var(--surface-border, #334155)'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                  Đã chọn: <span style={{ color: '#ec4899' }}>{selectedIndices.size}</span> / {generatedQuestions.length} câu hỏi
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.775rem', padding: '0.25rem 0.6rem' }}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.775rem', padding: '0.25rem 0.6rem' }}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              {/* Danh sách từng câu hỏi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {generatedQuestions.map((q, idx) => {
                  const isChecked = selectedIndices.has(idx);
                  const diffLabel = q.difficulty === 'recognition' ? 'Nhận biết' : q.difficulty === 'understanding' ? 'Thông hiểu' : 'Vận dụng';
                  const diffColor = q.difficulty === 'recognition' ? '#10b981' : q.difficulty === 'understanding' ? '#0284c7' : '#f59e0b';

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      style={{
                        background: isChecked ? 'rgba(236, 72, 153, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid var(--surface-border, #334155)',
                        borderRadius: 12,
                        padding: '1rem 1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.65rem' }}>
                        <div style={{ marginTop: 2, color: isChecked ? '#ec4899' : 'var(--text-muted, #94a3b8)' }}>
                          {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ec4899' }}>
                              Câu {idx + 1}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: diffColor,
                              border: `1px solid ${diffColor}44`,
                              borderRadius: 6,
                              padding: '0.1rem 0.45rem'
                            }}>
                              {diffLabel}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.45 }}>
                            {q.questionText}
                          </p>
                        </div>
                      </div>

                      {/* 4 Phương án */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '0.5rem',
                        marginLeft: '2rem',
                        marginBottom: '0.65rem'
                      }}>
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect = opt === q.correctAnswer;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              style={{
                                background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: isCorrect ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--surface-border, #334155)',
                                color: isCorrect ? '#34d399' : 'var(--text-main, #f8fafc)',
                                borderRadius: 8,
                                padding: '0.45rem 0.75rem',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem'
                              }}
                            >
                              <strong style={{ opacity: 0.8 }}>{letter}.</strong>
                              <span>{opt}</span>
                              {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 800 }}>✓ Đáp án</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Giải thích */}
                      {q.explanation && (
                        <div style={{
                          marginLeft: '2rem',
                          background: 'rgba(2, 132, 199, 0.06)',
                          border: '1px solid rgba(2, 132, 199, 0.2)',
                          borderRadius: 8,
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted, #94a3b8)'
                        }}>
                          <strong style={{ color: '#0284c7' }}>💡 Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--surface-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--surface-ground, #0f172a)'
        }}>
          <div>
            {saveReport && (
              <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>{saveReport}</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Hủy
            </button>

            {generatedQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleSaveSelectedToBank}
                disabled={isSaving || selectedIndices.size === 0}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
                <span>Thêm câu đã chọn vào Question Bank ({selectedIndices.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
