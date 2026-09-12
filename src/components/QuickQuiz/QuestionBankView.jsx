import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  Zap, 
  CheckCircle2, 
  Lightbulb, 
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { 
  fetchQuestionsApi, 
  createQuestionApi, 
  updateQuestionApi, 
  deleteQuestionApi, 
  duplicateQuestionApi,
  INFORMATICS_TOPICS,
  QUESTION_TYPES,
  DIFFICULTIES
} from './quizStorage';
import { fetchLessonsApi } from '../LessonPresentation/lessonStorage';
import QuestionFormModal from './QuestionFormModal';
import AiQuestionGeneratorModal from '../AI/AiQuestionGeneratorModal';

export default function QuestionBankView({
  onLaunchQuizCreator,
  currentClass,
  availableLessons = []
}) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(() => currentClass?.grade || 'all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Quản lý Modal thêm/sửa câu hỏi
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Quản lý Modal AI tạo câu hỏi
  const [isAiGenOpen, setIsAiGenOpen] = useState(false);
  const [loadedLessons, setLoadedLessons] = useState(availableLessons);

  useEffect(() => {
    if (availableLessons && availableLessons.length > 0) {
      setLoadedLessons(availableLessons);
    } else {
      fetchLessonsApi({ grade: 'all' })
        .then(data => setLoadedLessons(data || []))
        .catch(err => console.warn('Lỗi tải danh sách bài học cho AI Question:', err));
    }
  }, [availableLessons]);

  // Load danh sách câu hỏi
  useEffect(() => {
    let ignore = false;
    fetchQuestionsApi({
      grade: selectedGrade,
      topic: selectedTopic,
      difficulty: selectedDifficulty,
      type: selectedType,
      search: searchTerm
    })
      .then(data => {
        if (!ignore) {
          setQuestions(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Lỗi nạp câu hỏi:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedGrade, selectedTopic, selectedDifficulty, selectedType, searchTerm]);

  // Lọc tức thời phía client
  const filteredQuestions = useMemo(() => {
    let list = questions;
    if (selectedGrade !== 'all') {
      list = list.filter(q => Number(q.grade) === Number(selectedGrade));
    }
    if (selectedTopic !== 'all') {
      list = list.filter(q => q.topic === selectedTopic);
    }
    if (selectedDifficulty !== 'all') {
      list = list.filter(q => q.difficulty === selectedDifficulty);
    }
    if (selectedType !== 'all') {
      list = list.filter(q => q.type === selectedType);
    }
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      list = list.filter(q => 
        (q.question && q.question.toLowerCase().includes(s)) ||
        (q.explanation && q.explanation.toLowerCase().includes(s))
      );
    }
    return list;
  }, [questions, selectedGrade, selectedTopic, selectedDifficulty, selectedType, searchTerm]);

  // Xử lý Xóa câu hỏi
  const handleDelete = async (q, e) => {
    e.stopPropagation();
    if (!window.confirm(`Thầy/cô có chắc chắn muốn xóa câu hỏi:\n"${q.question}"?`)) {
      return;
    }
    try {
      await deleteQuestionApi(q.id);
      setQuestions(prev => prev.filter(item => item.id !== q.id));
    } catch (err) {
      alert(`❌ Lỗi xóa: ${err.message}`);
    }
  };

  // Xử lý Nhân bản câu hỏi
  const handleDuplicate = async (q, e) => {
    e.stopPropagation();
    try {
      const duplicated = await duplicateQuestionApi(q.id);
      if (duplicated) {
        setQuestions(prev => [duplicated, ...prev]);
      }
    } catch (err) {
      alert(`❌ Lỗi nhân bản: ${err.message}`);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsFormOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (q) => {
    setEditingQuestion(q);
    setIsFormOpen(true);
  };

  // Lưu câu hỏi từ modal
  const handleSaveQuestion = async (formData) => {
    try {
      if (editingQuestion) {
        const updated = await updateQuestionApi(editingQuestion.id, formData);
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updated : q));
      } else {
        const created = await createQuestionApi(formData);
        setQuestions(prev => [created, ...prev]);
      }
    } catch (err) {
      alert(`❌ Lỗi lưu câu hỏi: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
      {/* 1. Header Banner & Hành Động Chính */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(147, 51, 234, 0.08) 100%)',
        border: '1px solid rgba(236, 72, 153, 0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)'
            }}>
              <Zap size={22} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Ngân Hàng Câu Hỏi Trắc Nghiệm Tin Học
            </h1>
            <span style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 99,
              background: '#ec4899',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              GDPT 2018
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Quản lý kho câu hỏi phân loại theo Khối 1–5, 6 Chủ đề A–F và tạo nhanh bài đố vui kiểm tra trên lớp không cần học sinh dùng thiết bị riêng.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAiGenOpen(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'rgba(236, 72, 153, 0.4)',
              color: '#ec4899',
              background: 'rgba(236, 72, 153, 0.08)'
            }}
            title="✨ Trợ Giảng AI tạo câu hỏi trắc nghiệm tự động từ bài giảng"
          >
            <Sparkles size={16} color="#ec4899" />
            <span>✨ AI Tạo Câu Hỏi</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="btn btn-secondary"
            style={{
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Plus size={16} />
            <span>Thêm Câu Hỏi</span>
          </button>

          <button
            onClick={onLaunchQuizCreator}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.4rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Zap size={18} fill="#fff" />
            <span>+ Tạo Quick Quiz Ngay</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh Công Cụ & Bộ Lọc Đa Chiều */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Hàng 1: Nút lọc Khối Lớp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem' }}>
            Khối Lớp:
          </span>
          <button
            onClick={() => setSelectedGrade('all')}
            style={{
              padding: '0.4rem 0.9rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: selectedGrade === 'all' ? '#ec4899' : 'var(--surface-ground)',
              color: selectedGrade === 'all' ? '#fff' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            Tất Cả Khối
          </button>
          {[1, 2, 3, 4, 5].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              style={{
                padding: '0.4rem 0.9rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: Number(selectedGrade) === g ? '#ec4899' : 'var(--surface-ground)',
                color: Number(selectedGrade) === g ? '#fff' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              Khối {g}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Hiển thị: <strong style={{ color: '#ec4899' }}>{filteredQuestions.length}</strong> câu hỏi
          </div>
        </div>

        {/* Hàng 2: Bộ lọc Chủ đề, Mức độ, Dạng câu hỏi & Tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Lọc Chủ đề */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="input-field"
            style={{ minWidth: 200, fontSize: '0.85rem', fontWeight: 600 }}
          >
            {INFORMATICS_TOPICS.map(t => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>

          {/* Lọc Mức độ */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="input-field"
            style={{ minWidth: 150, fontSize: '0.85rem' }}
          >
            {DIFFICULTIES.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          {/* Lọc Dạng câu hỏi */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-field"
            style={{ minWidth: 180, fontSize: '0.85rem' }}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm câu hỏi, từ khóa, giải thích..."
              className="input-field"
              style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {/* 3. Lưới Danh Sách Câu Hỏi (Cards Grid) */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang nạp ngân hàng câu hỏi...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <FolderOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Không tìm thấy câu hỏi phù hợp
          </h3>
          <p style={{ fontSize: '0.875rem', maxWidth: 450, margin: '0 auto 1.5rem' }}>
            Thầy/cô có thể thử nới lỏng bộ lọc Khối, Chủ đề hoặc thêm câu hỏi mới vào ngân hàng.
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ background: '#ec4899', margin: '0 auto' }}
          >
            <Plus size={16} />
            <span>Thêm Câu Hỏi Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredQuestions.map((q) => {
            const topicInfo = INFORMATICS_TOPICS.find(t => t.id === q.topic);
            const diffInfo = DIFFICULTIES.find(d => d.id === q.difficulty);

            return (
              <div
                key={q.id}
                onClick={() => handleOpenEdit(q)}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ec4899';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--surface-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  {/* Badges: Khối, Chủ đề, Mức độ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(236, 72, 153, 0.12)',
                      color: '#ec4899',
                      fontWeight: 800,
                      fontSize: '0.75rem'
                    }}>
                      Khối {q.grade}
                    </span>

                    {topicInfo && (
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-ground)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        {topicInfo.icon} {topicInfo.label.split(':')[0]}
                      </span>
                    )}

                    {diffInfo && (
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: diffInfo.bg,
                        color: diffInfo.color,
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        {diffInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Câu hỏi */}
                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.45,
                    marginBottom: '0.85rem'
                  }}>
                    {q.question}
                  </h3>

                  {/* Danh sách phương án thu gọn */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {(q.options || []).map((opt, idx) => {
                      const isCorrect = idx === q.correct_index;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-ground)',
                            border: isCorrect ? '1px solid #10b981' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.8125rem'
                          }}
                        >
                          <span style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: isCorrect ? '#10b981' : 'var(--surface-secondary)',
                            color: isCorrect ? '#fff' : 'var(--text-muted)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span style={{
                            fontWeight: isCorrect ? 700 : 500,
                            color: isCorrect ? '#10b981' : 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {opt}
                          </span>
                          {isCorrect && (
                            <CheckCircle2 size={14} color="#10b981" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lời giải thích */}
                  {q.explanation && (
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(2, 132, 199, 0.08)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                      marginBottom: '0.85rem'
                    }}>
                      <Lightbulb size={14} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {q.explanation}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer thẻ: Nút Thao Tác */}
                <div style={{
                  borderTop: '1px solid var(--surface-border)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {q.points || 1} điểm (⭐)
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(q);
                      }}
                      className="btn btn-icon"
                      style={{ width: 30, height: 30 }}
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={(e) => handleDuplicate(q, e)}
                      className="btn btn-icon"
                      style={{ width: 30, height: 30 }}
                      title="Nhân bản câu hỏi"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      onClick={(e) => handleDelete(q, e)}
                      className="btn btn-icon"
                      style={{ width: 30, height: 30, color: '#ef4444' }}
                      title="Xóa câu hỏi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Sửa câu hỏi */}
      <QuestionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuestion(null);
        }}
        question={editingQuestion}
        onSave={handleSaveQuestion}
        availableLessons={availableLessons}
      />

      {/* Modal AI Tạo Câu Hỏi */}
      {isAiGenOpen && (
        <AiQuestionGeneratorModal
          isOpen={isAiGenOpen}
          onClose={() => setIsAiGenOpen(false)}
          lessons={loadedLessons}
          onQuestionsAdded={() => {
            fetchQuestionsApi({
              grade: selectedGrade,
              topic: selectedTopic,
              difficulty: selectedDifficulty,
              type: selectedType,
              search: searchTerm
            }).then(data => setQuestions(data || []));
          }}
        />
      )}
    </div>
  );
}
