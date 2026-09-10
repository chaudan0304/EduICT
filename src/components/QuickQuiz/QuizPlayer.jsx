import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Check,
  Volume2, 
  VolumeX, 
  Lightbulb, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';
import { DIFFICULTIES } from './quizStorage';

export default function QuizPlayer({
  quizSession,
  students = [],
  onClose,
  onCompleteQuiz,
  onAwardStars = null
}) {
  const questions = quizSession?.questions || [];
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Timer cho mỗi câu
  const initialTime = quizSession?.time_per_question || 20;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isTimerRunning, setIsTimerRunning] = useState(initialTime > 0);

  // Âm thanh
  const [isSoundEnabled, setIsSoundEnabled] = useState(quizSession?.sound_enabled !== false);

  // Dữ liệu kết quả của toàn bộ các câu: Map<questionId, { distribution, correct_count, wrong_count, accuracy_rate }>
  const [resultsByQuestion, setResultsByQuestion] = useState({});

  // Dữ liệu ghi nhận từng học sinh theo từng câu (Mode 2 - Student Mode): Map<questionId, Map<studentId, 'CORRECT'|'WRONG'|'NOT_ANSWERED'>>
  const [studentMarksByQuestion, setStudentMarksByQuestion] = useState({});

  // Mode 1 (Class Mode): Số lượng học sinh chọn mỗi phương án A, B, C, D cho câu hiện tại
  const [classCounts, setClassCounts] = useState({ 0: '', 1: '', 2: '', 3: '' });

  const currentQ = questions[currentIndex] || null;
  const timerRef = useRef(null);

  // Reset timer & load dữ liệu khi đổi câu hỏi
  useEffect(() => {
    setIsAnswerRevealed(false);
    if (initialTime > 0) {
      setTimeLeft(initialTime);
      setIsTimerRunning(true);
    } else {
      setTimeLeft(0);
      setIsTimerRunning(false);
    }

    // Load lại kết quả của câu này nếu đã có trước đó
    if (currentQ) {
      const savedRes = resultsByQuestion[currentQ.id];
      if (savedRes && savedRes.distribution) {
        setClassCounts(savedRes.distribution);
        setIsAnswerRevealed(true);
      } else {
        setClassCounts({ 0: '', 1: '', 2: '', 3: '' });
      }
    }
  }, [currentIndex, currentQ, initialTime, resultsByQuestion]);

  // Bộ đếm ngược thời gian
  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimerRunning(false);
          if (isSoundEnabled) soundEffects.playBuzzer();
          return 0;
        }

        // 5 giây cuối phát tiếng tick
        if (prev <= 6 && isSoundEnabled) {
          soundEffects.playTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timeLeft, isSoundEnabled]);


  // Mode 1: Thay đổi số lượng cho 1 phương án
  const handleClassCountChange = (optIdx, val) => {
    setClassCounts(prev => ({
      ...prev,
      [optIdx]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0)
    }));
  };

  // Mode 1: Bấm nhanh 1-chạm vào đáp án số đông (ví dụ cả lớp chọn B)
  const handleSetMajority = (optIdx) => {
    const totalStudents = students.length || 32;
    const newCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    newCounts[optIdx] = totalStudents;
    setClassCounts(newCounts);
  };

  // Mode 2: Ghi nhận đánh dấu cho một học sinh
  const handleToggleStudentMark = (studentId, status) => {
    if (!currentQ) return;
    setStudentMarksByQuestion(prev => {
      const qMarks = { ...(prev[currentQ.id] || {}) };
      qMarks[studentId] = status;
      return { ...prev, [currentQ.id]: qMarks };
    });
  };

  // Mode 2: Chọn nhanh "Tất cả Đúng" hoặc "Đặt lại"
  const handleBatchStudentMarks = (status) => {
    if (!currentQ) return;
    const qMarks = {};
    students.forEach(s => {
      qMarks[s.id] = status;
    });
    setStudentMarksByQuestion(prev => ({ ...prev, [currentQ.id]: qMarks }));
  };

  // Hiện đáp án đúng
  const handleRevealAnswer = useCallback(() => {
    if (!currentQ) return;
    setIsAnswerRevealed(true);
    setIsTimerRunning(false);

    if (isSoundEnabled) {
      soundEffects.playStarDing();
    }

    // Tính toán số liệu thống kê cho câu hỏi này
    const isStudentMode = quizSession.mode === 'STUDENT';
    let correctCount = 0;
    let wrongCount = 0;
    let totalResponses = 0;

    if (isStudentMode) {
      const qMarks = studentMarksByQuestion[currentQ.id] || {};
      students.forEach(s => {
        const mark = qMarks[s.id];
        if (mark === 'CORRECT') correctCount++;
        else if (mark === 'WRONG') wrongCount++;
      });
      totalResponses = correctCount + wrongCount;
    } else {
      // Class mode
      const counts = classCounts;
      const cIdx = currentQ.correct_index ?? 0;
      correctCount = Number(counts[cIdx]) || 0;
      Object.keys(counts).forEach(k => {
        const num = Number(counts[k]) || 0;
        totalResponses += num;
        if (Number(k) !== cIdx) {
          wrongCount += num;
        }
      });
    }

    const accuracyRate = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0;

    setResultsByQuestion(prev => ({
      ...prev,
      [currentQ.id]: {
        quiz_question_id: currentQ.id,
        distribution: classCounts,
        total_responses: totalResponses,
        correct_count: correctCount,
        wrong_count: wrongCount,
        accuracy_rate: accuracyRate
      }
    }));
  }, [currentQ, isSoundEnabled, quizSession?.mode, studentMarksByQuestion, students, classCounts]);

  // Sang câu hỏi tiếp theo
  const handleNextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  // Quay lại câu trước
  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Kết thúc phiên Quiz
  const handleFinishQuiz = () => {
    // Tính toán kết quả tổng kết toàn bộ quiz
    const allResults = Object.values(resultsByQuestion);
    const completedCount = allResults.length;
    let totalAccuracy = 0;
    let totalCorrect = 0;

    allResults.forEach(r => {
      totalAccuracy += (r.accuracy_rate || 0);
      totalCorrect += (r.correct_count || 0);
    });

    const averageAccuracy = completedCount > 0 ? Math.round(totalAccuracy / completedCount) : 0;
    const starRewardRate = quizSession.star_reward_per_correct ?? 1;

    // Chuẩn bị danh sách kết quả học sinh (nếu có Mode 2)
    const studentResultsList = [];
    let totalStarsAwarded = 0;

    if (quizSession.mode === 'STUDENT' && students.length > 0) {
      // Tính sao cho từng em
      const starsEarnedByStudent = {};
      Object.entries(studentMarksByQuestion).forEach(([qId, marksMap]) => {
        Object.entries(marksMap).forEach(([sId, status]) => {
          if (status === 'CORRECT') {
            starsEarnedByStudent[sId] = (starsEarnedByStudent[sId] || 0) + starRewardRate;
          }
          const std = students.find(s => s.id === sId);
          studentResultsList.push({
            quiz_question_id: qId,
            student_id: sId,
            student_name: std?.name || '',
            status: status,
            stars_earned: status === 'CORRECT' ? starRewardRate : 0
          });
        });
      });

      // Thưởng sao thực tế vào hệ thống nếu có callback
      if (onAwardStars && Object.keys(starsEarnedByStudent).length > 0) {
        onAwardStars(starsEarnedByStudent);
      }

      totalStarsAwarded = Object.values(starsEarnedByStudent).reduce((a, b) => a + b, 0);
    } else {
      // Class mode: Thưởng sao tập thể nếu đạt tỷ lệ cao
      if (averageAccuracy >= 70 && starRewardRate > 0) {
        totalStarsAwarded = starRewardRate * (students.length || 30);
      }
    }

    if (isSoundEnabled) {
      soundEffects.playVictory();
    }

    onCompleteQuiz({
      session_id: quizSession.id,
      title: quizSession.title,
      total_questions: totalQuestions,
      average_accuracy: averageAccuracy,
      total_stars_awarded: totalStarsAwarded,
      results: allResults,
      student_results: studentResultsList
    });
  };

  // Xử lý phím tắt bàn phím chuẩn máy chiếu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          handleRevealAnswer();
        } else {
          handleNextQuestion();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, currentIndex, totalQuestions, onClose]);

  if (!currentQ) return null;

  const currentResult = resultsByQuestion[currentQ.id];
  const diffInfo = DIFFICULTIES.find(d => d.id === currentQ.difficulty);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #030712 100%)',
      color: '#f8fafc',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflow: 'hidden'
    }}>
      {/* 1. Top Header: Tên Quiz, Tiến độ, Nút âm thanh, Đóng */}
      <div style={{
        padding: '0.85rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
            padding: '0.35rem 0.85rem',
            borderRadius: 99,
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.8125rem'
          }}>
            <Zap size={15} fill="#fff" />
            <span>QUICK QUIZ</span>
          </div>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            {quizSession.title}
          </h2>

          <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 99,
            background: 'rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#38bdf8'
          }}>
            {quizSession.mode === 'STUDENT' ? 'Mode 2: Từng học sinh' : 'Mode 1: Thống kê cả lớp'}
          </span>
        </div>

        {/* Tiến độ và Nút điều khiển âm thanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ec4899', letterSpacing: '0.5px' }}>
            CÂU {String(currentIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
          </span>

          <button
            onClick={() => setIsSoundEnabled(prev => !prev)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSoundEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer'
            }}
            title={isSoundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.85rem',
              color: '#f87171',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <X size={16} />
            <span>Thoát (Esc)</span>
          </button>
        </div>
      </div>

      {/* 2. Main Question Canvas (Projector Mode Typography) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 3.5rem',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Hàng chỉ số & Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 99,
              background: 'rgba(236, 72, 153, 0.2)',
              color: '#f472b6',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              Khối {currentQ.grade}
            </span>
            {diffInfo && (
              <span style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 99,
                background: diffInfo.bg,
                color: diffInfo.color,
                fontWeight: 800,
                fontSize: '0.9rem'
              }}>
                {diffInfo.label}
              </span>
            )}
          </div>

          {/* Countdown Timer Siêu To */}
          {initialTime > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: timeLeft <= 5 
                ? 'rgba(239, 68, 68, 0.25)' 
                : timeLeft <= 10 
                  ? 'rgba(245, 158, 11, 0.25)' 
                  : 'rgba(255, 255, 255, 0.08)',
              border: timeLeft <= 5 ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 99,
              padding: '0.45rem 1.4rem',
              animation: timeLeft <= 5 ? 'pulse 0.8s infinite' : 'none'
            }}>
              <Clock size={22} color={timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#38bdf8'} />
              <span style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#f8fafc',
                fontFamily: 'monospace'
              }}>
                00:{String(timeLeft).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Nội dung câu hỏi chữ siêu lớn */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          lineHeight: 1.35,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '2.5rem',
          textShadow: '0 4px 16px rgba(0,0,0,0.5)',
          maxWidth: 1100,
          alignSelf: 'center'
        }}>
          {currentQ.question}
        </h1>

        {/* Lưới 4 phương án A/B/C/D */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {(currentQ.options || []).map((opt, idx) => {
            const isCorrect = idx === currentQ.correct_index;
            const isRevealed = isAnswerRevealed;

            let bgColor = 'rgba(255, 255, 255, 0.05)';
            let borderColor = 'rgba(255, 255, 255, 0.12)';
            let textColor = '#e2e8f0';

            if (isRevealed) {
              if (isCorrect) {
                bgColor = 'rgba(16, 185, 129, 0.25)';
                borderColor = '#10b981';
                textColor = '#6ee7b7';
              } else {
                bgColor = 'rgba(255, 255, 255, 0.02)';
                borderColor = 'rgba(255, 255, 255, 0.05)';
                textColor = 'rgba(255, 255, 255, 0.4)';
              }
            }

            return (
              <div
                key={idx}
                style={{
                  padding: '1.5rem 1.75rem',
                  borderRadius: 'var(--radius-xl)',
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  boxShadow: isRevealed && isCorrect ? '0 0 30px rgba(16, 185, 129, 0.35)' : 'none',
                  transform: isRevealed && isCorrect ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Badge chữ cái A / B / C / D */}
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: isRevealed && isCorrect 
                    ? '#10b981' 
                    : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  {String.fromCharCode(65 + idx)}
                </div>

                {/* Nội dung phương án */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: textColor, lineHeight: 1.4 }}>
                    {opt}
                  </div>
                </div>

                {/* Icon tích xanh khi đáp án đúng */}
                {isRevealed && isCorrect && (
                  <CheckCircle2 size={36} color="#10b981" style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Khung giải thích sư phạm khi đã hiện đáp án */}
        {isAnswerRevealed && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(14, 165, 233, 0.08) 100%)',
            borderLeft: '6px solid #0284c7',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.75rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <Lightbulb size={28} color="#38bdf8" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.35rem' }}>
                🎉 Đáp án đúng: {String.fromCharCode(65 + currentQ.correct_index)}
                {currentResult && (
                  <span style={{ marginLeft: '1rem', color: '#6ee7b7', fontSize: '0.95rem', fontWeight: 700 }}>
                    ({currentResult.correct_count}/{currentResult.total_responses} học sinh đúng • {currentResult.accuracy_rate}%)
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#e0f2fe', lineHeight: 1.55 }}>
                {currentQ.explanation || 'Internet và công nghệ giúp kết nối toàn cầu và mở rộng tri thức.'}
              </p>
            </div>
          </div>
        )}

        {/* 3. Bảng Nhập Kết Quả Giáo Viên (Teacher Control Dock) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.75rem',
          marginTop: 'auto'
        }}>
          {quizSession.mode === 'STUDENT' ? (
            /* Mode 2: Ghi nhận từng học sinh */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a855f7' }}>
                  GHI NHẬN TỪNG HỌC SINH (MODE 2):
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleBatchStudentMarks('CORRECT')}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#10b981' }}
                  >
                    ✓ Tất cả Đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchStudentMarks('NOT_ANSWERED')}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    Đặt lại
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem',
                maxHeight: 180,
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {students.map(s => {
                  const mark = (studentMarksByQuestion[currentQ.id] || {})[s.id] || 'NOT_ANSWERED';
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        background: mark === 'CORRECT' 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : mark === 'WRONG' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(255, 255, 255, 0.05)',
                        border: mark === 'CORRECT' 
                          ? '1px solid #10b981' 
                          : mark === 'WRONG' 
                            ? '1px solid #ef4444' 
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </span>
                      <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentMark(s.id, mark === 'CORRECT' ? 'NOT_ANSWERED' : 'CORRECT')}
                          style={{
                            border: 'none',
                            background: mark === 'CORRECT' ? '#10b981' : 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            borderRadius: '4px',
                            width: 22,
                            height: 22,
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentMark(s.id, mark === 'WRONG' ? 'NOT_ANSWERED' : 'WRONG')}
                          style={{
                            border: 'none',
                            background: mark === 'WRONG' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            borderRadius: '4px',
                            width: 22,
                            height: 22,
                            cursor: 'pointer'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Mode 1: Class Mode Thống Kê Số Lượng */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ec4899' }}>
                  NHẬP KẾT QUẢ CẢ LỚP (MODE 1):
                </span>

                {(currentQ.options || []).map((_, optIdx) => (
                  <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleSetMajority(optIdx)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        color: '#fff',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                      title={`Bấm nhanh: Cả lớp chọn ${String.fromCharCode(65 + optIdx)}`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={classCounts[optIdx] ?? ''}
                      onChange={(e) => handleClassCountChange(optIdx, e.target.value)}
                      placeholder="Số em"
                      style={{
                        width: 64,
                        padding: '0.35rem',
                        textAlign: 'center',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0, 0, 0, 0.4)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Tự động tính toán tỷ lệ chính xác */}
              {currentResult && (
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>
                  Đúng: {currentResult.correct_count} • Sai: {currentResult.wrong_count} • Chính xác: {currentResult.accuracy_rate}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Navigation Dock: Phím Lùi, Hiện Đáp Án, Phím Tiếp */}
      <div style={{
        padding: '1rem 2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)'
      }}>
        <button
          onClick={handlePrevQuestion}
          disabled={currentIndex === 0}
          className="btn btn-secondary"
          style={{
            padding: '0.6rem 1.25rem',
            fontWeight: 700,
            opacity: currentIndex === 0 ? 0.3 : 1
          }}
        >
          <ChevronLeft size={18} />
          <span>← Câu Trước</span>
        </button>

        {/* Nút trung tâm: Hiện Đáp Án */}
        {!isAnswerRevealed ? (
          <button
            onClick={handleRevealAnswer}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2.5rem',
              fontWeight: 900,
              fontSize: '1.15rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <Sparkles size={20} />
            <span>🎉 Hiện Đáp Án (Space)</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 800 }}>
              ✓ Đã hiển thị đáp án đúng
            </span>
          </div>
        )}

        <button
          onClick={handleNextQuestion}
          className="btn btn-primary"
          style={{
            padding: '0.6rem 1.5rem',
            fontWeight: 800,
            background: currentIndex === totalQuestions - 1 
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
              : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
          }}
        >
          <span>{currentIndex === totalQuestions - 1 ? '🏆 Hoàn Thành Quiz' : 'Câu Tiếp Theo →'}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
