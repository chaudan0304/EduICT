import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Zap, 
  Users, 
  UserCheck 
} from 'lucide-react';
import { 
  INFORMATICS_TOPICS, 
  DIFFICULTIES, 
  fetchQuestionsApi, 
  shuffleArray, 
  shuffleQuestionOptions,
  createQuizSessionApi
} from './quizStorage';

export default function CreateQuizModal({
  isOpen,
  onClose,
  onStartQuiz,
  currentClass,
  availableLessons = [],
  preselectedLesson = null,
  sessionId = null
}) {
  const [title, setTitle] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(() => currentClass?.grade || 3);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedLessonId, setSelectedLessonId] = useState(() => preselectedLesson?.id || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [quizMode, setQuizMode] = useState('CLASS'); // 'CLASS' | 'STUDENT'
  const [isRandomQuestions, setIsRandomQuestions] = useState(true);
  const [isRandomAnswers, setIsRandomAnswers] = useState(true);
  const [starReward, setStarReward] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [availableCount, setAvailableCount] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);

  // Cập nhật khi mở modal hoặc thay đổi lớp/bài
  useEffect(() => {
    if (preselectedLesson) {
      setTitle(`Đố vui: ${preselectedLesson.title}`);
      setSelectedGrade(preselectedLesson.grade || 3);
      setSelectedLessonId(preselectedLesson.id);
    } else {
      const clsName = currentClass?.name || 'Lớp';
      setTitle(`Quick Quiz Tin Học - ${clsName}`);
      setSelectedGrade(currentClass?.grade || 3);
    }
  }, [preselectedLesson, currentClass, isOpen]);

  // Kiểm tra số lượng câu hỏi khả dụng theo bộ lọc
  useEffect(() => {
    let ignore = false;
    fetchQuestionsApi({
      grade: selectedGrade,
      topic: selectedTopic,
      difficulty: selectedDifficulty,
      lesson_id: selectedLessonId || undefined
    }).then(list => {
      if (!ignore) {
        setAvailableCount(list.length);
        if (list.length > 0 && questionCount > list.length) {
          setQuestionCount(Math.min(5, list.length));
        }
      }
    });

    return () => {
      ignore = true;
    };
  }, [selectedGrade, selectedTopic, selectedDifficulty, selectedLessonId, questionCount]);

  if (!isOpen) return null;

  const handleStart = async (e) => {
    e.preventDefault();
    setIsPreparing(true);

    try {
      // 1. Lấy toàn bộ câu hỏi thỏa điều kiện
      let pool = await fetchQuestionsApi({
        grade: selectedGrade,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        lesson_id: selectedLessonId || undefined
      });

      if (pool.length === 0) {
        alert('⚠️ Không có câu hỏi nào trong ngân hàng phù hợp với bộ lọc hiện tại!\nVui lòng chọn khối khác hoặc nới lỏng bộ lọc.');
        setIsPreparing(false);
        return;
      }

      // 2. Xáo trộn câu hỏi nếu bật
      if (isRandomQuestions) {
        pool = shuffleArray(pool);
      }

      // 3. Chọn đúng số lượng mong muốn
      let selectedQuestions = pool.slice(0, Math.min(questionCount, pool.length));

      // 4. Xáo trộn thứ tự phương án A/B/C/D nếu bật (bảo toàn đáp án đúng)
      if (isRandomAnswers) {
        selectedQuestions = selectedQuestions.map(q => shuffleQuestionOptions(q));
      }

      // 5. Khởi tạo phiên Quiz qua API / SQLite
      const sessionPayload = {
        classroom_session_id: sessionId || null,
        class_id: currentClass?.id || null,
        lesson_id: selectedLessonId || null,
        title: title.trim() || 'Quick Quiz Tin Học',
        mode: quizMode,
        total_questions: selectedQuestions.length,
        time_per_question: Number(timePerQuestion),
        is_random_questions: isRandomQuestions ? 1 : 0,
        is_random_answers: isRandomAnswers ? 1 : 0,
        star_reward_per_correct: Number(starReward),
        sound_enabled: soundEnabled,
        questions: selectedQuestions,
        status: 'RUNNING'
      };

      const createdSession = await createQuizSessionApi(sessionPayload);
      onStartQuiz(createdSession);
      onClose();
    } catch (err) {
      console.error('Lỗi tạo phiên quiz:', err);
      alert(`❌ Lỗi khởi tạo quiz: ${err.message}`);
    } finally {
      setIsPreparing(false);
    }
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
      zIndex: 1250,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxWidth: 680,
        maxHeight: '92vh',
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
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Thiết Lập Quick Quiz
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Chuẩn máy chiếu • Tự động tính tỷ lệ chính xác • Tích hợp thưởng sao ⭐
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon"
            style={{ width: 34, height: 34 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStart} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tên bài Quiz */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Tên Hoạt Động Đố Vui
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '1rem', fontWeight: 700 }}
              placeholder="Ví dụ: Đố vui củng cố kiến thức Internet..."
              required
            />
          </div>

          {/* Chọn Chế Độ Quiz: Class Mode vs Student Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Chế Độ Kiểm Tra (Quiz Mode)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => setQuizMode('CLASS')}
                style={{
                  border: quizMode === 'CLASS' ? '2px solid #ec4899' : '1px solid var(--surface-border)',
                  background: quizMode === 'CLASS' ? 'rgba(236, 72, 153, 0.08)' : 'var(--surface-ground)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Users size={20} color={quizMode === 'CLASS' ? '#ec4899' : 'var(--text-muted)'} />
                  <strong style={{ fontSize: '0.95rem', color: quizMode === 'CLASS' ? '#ec4899' : 'var(--text-main)' }}>
                    Mode 1: Class Mode
                  </strong>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 99, background: '#10b981', color: '#fff', fontWeight: 700 }}>
                    Mặc định
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Học sinh giơ thẻ hoặc giơ tay. Giáo viên nhập số lượng A/B/C/D hoặc bấm đáp án số đông. Hệ thống tự động tính % đúng cả lớp.
                </p>
              </div>

              <div
                onClick={() => setQuizMode('STUDENT')}
                style={{
                  border: quizMode === 'STUDENT' ? '2px solid #a855f7' : '1px solid var(--surface-border)',
                  background: quizMode === 'STUDENT' ? 'rgba(168, 85, 247, 0.08)' : 'var(--surface-ground)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <UserCheck size={20} color={quizMode === 'STUDENT' ? '#a855f7' : 'var(--text-muted)'} />
                  <strong style={{ fontSize: '0.95rem', color: quizMode === 'STUDENT' ? '#a855f7' : 'var(--text-main)' }}>
                    Mode 2: Student Mode
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Giáo viên đánh dấu từng em ✅ Đúng / ❌ Sai / — Chưa trả lời. Học sinh trả lời đúng được cộng ngay sao ⭐ vào hệ thống.
                </p>
              </div>
            </div>
          </div>

          {/* Bộ lọc câu hỏi: Khối, Chủ đề, Mức độ, Bài học */}
          <div style={{
            background: 'var(--surface-ground)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Nguồn Câu Hỏi Từ Ngân Hàng
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#0284c7', fontWeight: 700 }}>
                Có sẵn: <strong>{availableCount}</strong> câu hỏi phù hợp
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Khối Lớp
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {[1, 2, 3, 4, 5].map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Chủ Đề GDPT 2018
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {INFORMATICS_TOPICS.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label.split(':')[0]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Mức Độ
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {DIFFICULTIES.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {availableLessons.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Theo Bài Học Cụ Thể (Tùy chọn)
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="">-- Lấy câu hỏi chung của toàn khối / chủ đề --</option>
                  {availableLessons.map(l => (
                    <option key={l.id} value={l.id}>[K{l.grade}] {l.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cấu hình thời gian, số câu, sao thưởng */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Số Câu Hỏi Kiểm Tra
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="input-field"
                style={{ width: '100%' }}
              >
                {[3, 5, 7, 10, 15, 20].map(n => (
                  <option key={n} value={n} disabled={availableCount > 0 && n > availableCount}>
                    {n} câu {availableCount > 0 && n > availableCount ? '(Không đủ câu)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Thời Gian Mỗi Câu
              </label>
              <select
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value={15}>⏱ 15 giây (Thần tốc)</option>
                <option value={20}>⏱ 20 giây (Chuẩn tiểu học)</option>
                <option value={30}>⏱ 30 giây (Thoải mái)</option>
                <option value={45}>⏱ 45 giây (Vận dụng suy nghĩ)</option>
                <option value={0}>♾ Không giới hạn thời gian</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Thưởng Sao (⭐)
              </label>
              <select
                value={starReward}
                onChange={(e) => setStarReward(Number(e.target.value))}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value={1}>⭐ +1 Sao / mỗi câu đúng</option>
                <option value={2}>⭐ +2 Sao / mỗi câu đúng</option>
                <option value={0}>Không cộng sao</option>
              </select>
            </div>
          </div>

          {/* Tùy chọn nâng cao: Random câu hỏi, Random đáp án, Sound */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.5rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isRandomQuestions}
                onChange={(e) => setIsRandomQuestions(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#ec4899' }}
              />
              <span>🔀 Trộn ngẫu nhiên câu hỏi</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isRandomAnswers}
                onChange={(e) => setIsRandomAnswers(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#ec4899' }}
              />
              <span>🔀 Xáo trộn phương án A/B/C/D</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#ec4899' }}
              />
              <span>🔊 Hiệu ứng âm thanh (Tick & Chuông)</span>
            </label>
          </div>

          {/* Footer Action Button */}
          <div style={{
            marginTop: '0.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Đang chọn: <strong>{Math.min(questionCount, availableCount)}</strong> câu hỏi
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isPreparing || availableCount === 0}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.65rem',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
                  boxShadow: '0 4px 14px rgba(236, 72, 153, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Play size={18} fill="#fff" />
                <span>{isPreparing ? 'Đang Khởi Tạo...' : 'Bắt Đầu Quick Quiz Ngay'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
