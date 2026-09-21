import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Play, 
  Zap, 
  Users, 
  UserCheck,
  Search,
  CheckSquare,
  CheckCircle2,
  Check,
  ListChecks,
  Sliders,
  AlertCircle
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
  preselectedQuestions = [],
  sessionId = null
}) {
  const [title, setTitle] = useState('');
  
  // Chế độ chọn câu hỏi: 'MANUAL' (Tự chọn từng câu) | 'AUTO' (Lấy ngẫu nhiên theo bộ lọc)
  const [selectionMode, setCreationMode] = useState('MANUAL');

  // Cấu hình Chế độ Tự Chọn (MANUAL)
  const [manualPool, setManualPool] = useState([]);
  const [manualGrade, setManualGrade] = useState('all');
  const [manualTopic, setManualTopic] = useState('all');
  const [manualSearch, setManualSearch] = useState('');
  const [selectedManualIds, setSelectedManualIds] = useState(new Set());
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  // Cấu hình Chế độ Lấy Ngẫu Nhiên (AUTO)
  const [selectedGrade, setSelectedGrade] = useState(() => currentClass?.grade || 'all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedLessonId, setSelectedLessonId] = useState(() => preselectedLesson?.id || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [questionCount, setQuestionCount] = useState(5);
  const [availableCount, setAvailableCount] = useState(0);
  const [isLessonFallback, setIsLessonFallback] = useState(false);

  // Cấu hình Phiên Chơi Quiz chung
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [quizMode, setQuizMode] = useState('CLASS'); // 'CLASS' | 'STUDENT'
  const [isRandomQuestions, setIsRandomQuestions] = useState(true);
  const [isRandomAnswers, setIsRandomAnswers] = useState(true);
  const [starReward, setStarReward] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);

  // Nạp toàn bộ ngân hàng câu hỏi khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    setIsLoadingBank(true);

    fetchQuestionsApi({ grade: 'all' })
      .then(data => {
        if (!ignore) {
          setManualPool(data || []);
          setIsLoadingBank(false);
        }
      })
      .catch(err => {
        console.error('Lỗi nạp câu hỏi cho modal:', err);
        if (!ignore) setIsLoadingBank(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  // Cập nhật tiêu đề và câu hỏi được chọn sẵn
  useEffect(() => {
    if (!isOpen) return;

    if (preselectedQuestions && preselectedQuestions.length > 0) {
      setCreationMode('MANUAL');
      setSelectedManualIds(new Set(preselectedQuestions.map(q => q.id)));
      const clsName = currentClass?.name || 'Lớp';
      setTitle(`Quick Quiz Tin Học - ${clsName} (${preselectedQuestions.length} câu đã chọn)`);
    } else if (preselectedLesson) {
      setTitle(`Đố vui: ${preselectedLesson.title}`);
      setSelectedGrade(preselectedLesson.grade || 'all');
      setSelectedLessonId(preselectedLesson.id);
      setManualGrade(preselectedLesson.grade || 'all');
      setCreationMode('MANUAL');
    } else {
      const clsName = currentClass?.name || 'Lớp';
      setTitle(`Quick Quiz Tin Học - ${clsName}`);
      setSelectedGrade(currentClass?.grade || 'all');
      setManualGrade(currentClass?.grade || 'all');
      setCreationMode('MANUAL');
    }
  }, [preselectedQuestions, preselectedLesson, currentClass, isOpen]);

  // Kiểm tra số lượng câu hỏi khả dụng theo bộ lọc (Cho Chế độ AUTO)
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    fetchQuestionsApi({
      grade: selectedGrade === 'all' ? undefined : selectedGrade,
      topic: selectedTopic === 'all' ? undefined : selectedTopic,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
      lesson_id: selectedLessonId || undefined
    }).then(async list => {
      if (ignore) return;
      if (list.length === 0 && selectedLessonId) {
        // Fallback: nếu bài học cụ thể chưa gán câu hỏi, lấy câu hỏi theo khối/chủ đề
        const fallbackList = await fetchQuestionsApi({
          grade: selectedGrade === 'all' ? undefined : selectedGrade,
          topic: selectedTopic === 'all' ? undefined : selectedTopic,
          difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty
        });
        if (!ignore) {
          setAvailableCount(fallbackList.length);
          setIsLessonFallback(fallbackList.length > 0);
          if (fallbackList.length > 0 && questionCount > fallbackList.length) {
            setQuestionCount(Math.min(5, fallbackList.length));
          }
        }
      } else {
        setAvailableCount(list.length);
        setIsLessonFallback(false);
        if (list.length > 0 && questionCount > list.length) {
          setQuestionCount(Math.min(5, list.length));
        }
      }
    });

    return () => {
      ignore = true;
    };
  }, [isOpen, selectedGrade, selectedTopic, selectedDifficulty, selectedLessonId, questionCount]);

  // Lọc câu hỏi hiển thị trong tab Tự Chọn (MANUAL)
  const filteredManualPool = useMemo(() => {
    let list = manualPool;
    if (manualGrade !== 'all') {
      list = list.filter(q => Number(q.grade) === Number(manualGrade));
    }
    if (manualTopic !== 'all') {
      list = list.filter(q => q.topic === manualTopic);
    }
    if (manualSearch.trim()) {
      const s = manualSearch.trim().toLowerCase();
      list = list.filter(q => 
        (q.question && q.question.toLowerCase().includes(s)) ||
        (q.explanation && q.explanation.toLowerCase().includes(s))
      );
    }
    return list;
  }, [manualPool, manualGrade, manualTopic, manualSearch]);

  // Thao tác chọn câu hỏi (MANUAL)
  const toggleManualId = (id) => {
    setSelectedManualIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllManual = () => {
    setSelectedManualIds(prev => {
      const next = new Set(prev);
      filteredManualPool.forEach(q => next.add(q.id));
      return next;
    });
  };

  const handleDeselectAllManual = () => {
    setSelectedManualIds(prev => {
      const next = new Set(prev);
      filteredManualPool.forEach(q => next.delete(q.id));
      return next;
    });
  };

  if (!isOpen) return null;

  const handleStart = async (e) => {
    e.preventDefault();
    setIsPreparing(true);

    try {
      let chosenQuestions = [];

      if (selectionMode === 'MANUAL') {
        if (selectedManualIds.size === 0) {
          alert('⚠️ Thầy/cô vui lòng tích chọn ít nhất 1 câu hỏi từ ngân hàng để bắt đầu!');
          setIsPreparing(false);
          return;
        }
        chosenQuestions = manualPool.filter(q => selectedManualIds.has(q.id));
        if (isRandomQuestions) {
          chosenQuestions = shuffleArray(chosenQuestions);
        }
      } else {
        // Chế độ Lấy Ngẫu Nhiên (AUTO)
        let pool = await fetchQuestionsApi({
          grade: selectedGrade === 'all' ? undefined : selectedGrade,
          topic: selectedTopic === 'all' ? undefined : selectedTopic,
          difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
          lesson_id: selectedLessonId || undefined
        });

        if (pool.length === 0 && selectedLessonId) {
          pool = await fetchQuestionsApi({
            grade: selectedGrade === 'all' ? undefined : selectedGrade,
            topic: selectedTopic === 'all' ? undefined : selectedTopic,
            difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty
          });
        }

        if (pool.length === 0) {
          alert('⚠️ Không có câu hỏi nào trong ngân hàng phù hợp với bộ lọc hiện tại!\nVui lòng chọn khối khác hoặc nới lỏng bộ lọc.');
          setIsPreparing(false);
          return;
        }

        if (isRandomQuestions) {
          pool = shuffleArray(pool);
        }
        chosenQuestions = pool.slice(0, Math.min(questionCount, pool.length));
      }

      // Xáo trộn đáp án A/B/C/D nếu bật
      if (isRandomAnswers) {
        chosenQuestions = chosenQuestions.map(q => shuffleQuestionOptions(q));
      }

      // Khởi tạo phiên Quiz qua API / SQLite
      const sessionPayload = {
        classroom_session_id: sessionId || null,
        class_id: currentClass?.id || null,
        lesson_id: selectedLessonId || null,
        title: title.trim() || 'Quick Quiz Tin Học',
        mode: quizMode,
        total_questions: chosenQuestions.length,
        time_per_question: Number(timePerQuestion),
        is_random_questions: isRandomQuestions ? 1 : 0,
        is_random_answers: isRandomAnswers ? 1 : 0,
        star_reward_per_correct: Number(starReward),
        sound_enabled: soundEnabled,
        questions: chosenQuestions,
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

  const isAllFilteredSelected = filteredManualPool.length > 0 && 
    filteredManualPool.every(q => selectedManualIds.has(q.id));

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
        maxWidth: 760,
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.15rem 1.5rem',
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
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
        <form onSubmit={handleStart} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* 1. Tên bài Quiz */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Tên Hoạt Động Đố Vui
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '0.95rem', fontWeight: 700 }}
              placeholder="Ví dụ: Đố vui củng cố kiến thức Internet..."
              required
            />
          </div>

          {/* 2. Mode Switcher: Tự Chọn vs Lấy Ngẫu Nhiên */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.45rem' }}>
              Cách Thức Chọn Câu Hỏi
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setCreationMode('MANUAL')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: selectionMode === 'MANUAL' ? '2px solid #ec4899' : '1px solid var(--surface-border)',
                  background: selectionMode === 'MANUAL' ? 'rgba(236, 72, 153, 0.1)' : 'var(--surface-ground)',
                  color: selectionMode === 'MANUAL' ? '#ec4899' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ListChecks size={18} />
                <span>🎯 Tự Chọn Từng Câu ({selectedManualIds.size} đã chọn)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('AUTO')}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: selectionMode === 'AUTO' ? '2px solid #a855f7' : '1px solid var(--surface-border)',
                  background: selectionMode === 'AUTO' ? 'rgba(168, 85, 247, 0.1)' : 'var(--surface-ground)',
                  color: selectionMode === 'AUTO' ? '#a855f7' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sliders size={18} />
                <span>🔀 Lấy Ngẫu Nhiên Theo Bộ Lọc</span>
              </button>
            </div>
          </div>

          {/* 3. Panel: GIAO DIỆN TỰ CHỌN CÂU HỎI (MANUAL) */}
          {selectionMode === 'MANUAL' && (
            <div style={{
              background: 'var(--surface-ground)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {/* Bộ lọc nhanh trong kho */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={manualGrade}
                  onChange={(e) => setManualGrade(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.8125rem', minWidth: 125 }}
                >
                  <option value="all">Tất Cả Khối (1-5)</option>
                  {[1, 2, 3, 4, 5].map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>

                <select
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.8125rem', minWidth: 170 }}
                >
                  {INFORMATICS_TOPICS.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label.split(':')[0]}</option>
                  ))}
                </select>

                <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Tìm câu hỏi theo từ khóa..."
                    className="input-field"
                    style={{ paddingLeft: '2rem', width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              {/* Thanh thao tác chọn tất cả / bỏ chọn */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={isAllFilteredSelected ? handleDeselectAllManual : handleSelectAllManual}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    {isAllFilteredSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredManualPool.length})`}
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Tìm thấy: <strong>{filteredManualPool.length}</strong> câu
                  </span>
                </div>

                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ec4899' }}>
                  ⭐ Đã chọn: {selectedManualIds.size} câu hỏi
                </span>
              </div>

              {/* Danh sách câu hỏi cuộn được có Checkbox */}
              <div style={{
                maxHeight: 240,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingRight: '0.25rem'
              }}>
                {isLoadingBank ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Đang nạp ngân hàng câu hỏi...
                  </div>
                ) : filteredManualPool.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Không có câu hỏi nào khớp với bộ lọc. Hãy nới lỏng khối hoặc từ khóa!
                  </div>
                ) : (
                  filteredManualPool.map(q => {
                    const isChecked = selectedManualIds.has(q.id);
                    const topicInfo = INFORMATICS_TOPICS.find(t => t.id === q.topic);

                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleManualId(q.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isChecked ? 'rgba(236, 72, 153, 0.08)' : 'var(--surface-card)',
                          border: isChecked ? '1.5px solid #ec4899' : '1px solid var(--surface-border)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: isChecked ? '2px solid #ec4899' : '2px solid var(--surface-border)',
                            background: isChecked ? '#ec4899' : 'var(--surface-ground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                            flexShrink: 0
                          }}
                        >
                          {isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: '#ec4899',
                              background: 'rgba(236, 72, 153, 0.12)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              Khối {q.grade}
                            </span>
                            {topicInfo && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {topicInfo.icon} {topicInfo.label.split(':')[0]}
                              </span>
                            )}
                          </div>

                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            lineHeight: 1.35
                          }}>
                            {q.question}
                          </div>

                          {/* Phương án rút gọn */}
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                            display: 'flex',
                            gap: '0.6rem',
                            flexWrap: 'wrap'
                          }}>
                            {(q.options || []).slice(0, 4).map((opt, oIdx) => (
                              <span key={oIdx} style={{
                                color: oIdx === q.correct_index ? '#10b981' : undefined,
                                fontWeight: oIdx === q.correct_index ? 700 : 400
                              }}>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. Panel: GIAO DIỆN LẤY NGẪU NHIÊN THEO BỘ LỌC (AUTO) */}
          {selectionMode === 'AUTO' && (
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
                  Thiết Lập Bộ Lọc Tự Động
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#0284c7', fontWeight: 700 }}>
                  Có sẵn trong kho: <strong>{availableCount}</strong> câu hỏi phù hợp
                </span>
              </div>

              {isLessonFallback && (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  fontSize: '0.78rem',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} color="#b45309" style={{ flexShrink: 0 }} />
                  <span>Bài học này chưa có câu hỏi riêng. Hệ thống sẽ lấy câu hỏi chung từ khối để đảm bảo bạn luôn tổ chức được đố vui!</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Khối Lớp
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="all">Tất Cả Các Khối (1-5)</option>
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Số Lượng Câu Muốn Rút Ra
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  {[3, 5, 7, 10, 15, 20].map(n => (
                    <option key={n} value={n} disabled={availableCount > 0 && n > availableCount}>
                      {n} câu {availableCount > 0 && n > availableCount ? '(Không đủ câu trong kho)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 5. Chọn Chế Độ Quiz: Class Mode vs Student Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Hình Thức Đánh Giá (Quiz Mode)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => setQuizMode('CLASS')}
                style={{
                  border: quizMode === 'CLASS' ? '2px solid #ec4899' : '1px solid var(--surface-border)',
                  background: quizMode === 'CLASS' ? 'rgba(236, 72, 153, 0.08)' : 'var(--surface-ground)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Users size={18} color={quizMode === 'CLASS' ? '#ec4899' : 'var(--text-muted)'} />
                  <strong style={{ fontSize: '0.9rem', color: quizMode === 'CLASS' ? '#ec4899' : 'var(--text-main)' }}>
                    Mode 1: Class Mode
                  </strong>
                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: 99, background: '#10b981', color: '#fff', fontWeight: 700 }}>
                    Mặc định
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Học sinh giơ thẻ hoặc giơ tay. Giáo viên nhập số lượng A/B/C/D hoặc bấm đáp án số đông. Hệ thống tự động tính % đúng cả lớp.
                </p>
              </div>

              <div
                onClick={() => setQuizMode('STUDENT')}
                style={{
                  border: quizMode === 'STUDENT' ? '2px solid #a855f7' : '1px solid var(--surface-border)',
                  background: quizMode === 'STUDENT' ? 'rgba(168, 85, 247, 0.08)' : 'var(--surface-ground)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <UserCheck size={18} color={quizMode === 'STUDENT' ? '#a855f7' : 'var(--text-muted)'} />
                  <strong style={{ fontSize: '0.9rem', color: quizMode === 'STUDENT' ? '#a855f7' : 'var(--text-main)' }}>
                    Mode 2: Student Mode
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Giáo viên đánh dấu từng em ✅ Đúng / ❌ Sai / — Chưa trả lời. Học sinh trả lời đúng được cộng ngay sao ⭐ vào hệ thống.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Cấu hình thời gian, sao thưởng */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
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

          {/* 7. Tùy chọn nâng cao: Random câu hỏi, Random đáp án, Sound */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.65rem',
            paddingTop: '0.25rem'
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

          {/* 8. Footer Action Button */}
          <div style={{
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {selectionMode === 'MANUAL' ? (
                <>Đang chọn: <strong style={{ color: '#ec4899' }}>{selectedManualIds.size}</strong> câu hỏi</>
              ) : (
                <>Rút ngẫu nhiên: <strong style={{ color: '#a855f7' }}>{Math.min(questionCount, availableCount)}</strong> / {availableCount} câu</>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                disabled={isPreparing || (selectionMode === 'MANUAL' ? selectedManualIds.size === 0 : availableCount === 0)}
                className="btn btn-primary"
                style={{
                  padding: '0.6rem 1.65rem',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
                  boxShadow: '0 4px 14px rgba(236, 72, 153, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: isPreparing || (selectionMode === 'MANUAL' ? selectedManualIds.size === 0 : availableCount === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={18} fill="#fff" />
                <span>
                  {isPreparing ? 'Đang Khởi Tạo...' : (
                    selectionMode === 'MANUAL' 
                      ? `Bắt Đầu Quick Quiz (${selectedManualIds.size} câu đã chọn)`
                      : `Bắt Đầu Quick Quiz (${Math.min(questionCount, availableCount)} câu)`
                  )}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
