import React, { useState } from 'react';
import QuestionBankView from './QuestionBankView';
import CreateQuizModal from './CreateQuizModal';
import QuizPlayer from './QuizPlayer';
import QuizResultModal from './QuizResultModal';
import { saveQuizResultsApi } from './quizStorage';
import { awardStars } from '../../utils/starLedger';

export default function QuickQuizManager({
  currentClass,
  onUpdateStudents,
  availableLessons = [],
  preselectedLesson = null,
  sessionId = null,
  onQuizFinishedInSession = null,
  initialLaunchCreator = false
}) {
  const [isCreatorOpen, setIsCreatorOpen] = useState(initialLaunchCreator);
  const [activeQuizSession, setActiveQuizSession] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const [preselectedQuestions, setPreselectedQuestions] = useState([]);

  // Khởi chạy phiên Quiz
  const handleStartQuiz = (session) => {
    setActiveQuizSession(session);
    setIsCreatorOpen(false);
    setPreselectedQuestions([]);
  };

  // Đóng trình phát Quiz
  const handleClosePlayer = () => {
    setActiveQuizSession(null);
  };

  // Hoàn thành Quiz
  const handleCompleteQuiz = async (summaryPayload) => {
    setActiveQuizSession(null);
    setSummaryData(summaryPayload);
    setIsResultOpen(true);

    // Lưu kết quả lên SQLite qua API
    if (summaryPayload.session_id) {
      try {
        await saveQuizResultsApi(summaryPayload.session_id, {
          status: 'COMPLETED',
          average_accuracy: summaryPayload.average_accuracy,
          total_stars_awarded: summaryPayload.total_stars_awarded,
          completed_at: new Date().toISOString(),
          results: summaryPayload.results,
          student_results: summaryPayload.student_results
        });
      } catch (err) {
        console.error('Lỗi lưu kết quả quiz lên API:', err);
      }
    }

    // Thông báo cho Classroom Session nếu đang chạy trong session
    if (onQuizFinishedInSession) {
      onQuizFinishedInSession(summaryPayload);
    }
  };

  // Xử lý cộng sao cho học sinh (Mode 2) — qua sổ cái server, đồng bộ newBalance
  const handleAwardStars = async (starsMap) => {
    if (!onUpdateStudents || !currentClass?.students) return;
    const classId = currentClass.id;
    const entries = Object.entries(starsMap || {}).filter(([, n]) => Number(n) > 0);
    if (entries.length === 0) return;

    const balances = {};
    await Promise.all(entries.map(async ([sid, n]) => {
      try {
        const nb = await awardStars({
          studentId: sid,
          classId,
          amount: Number(n),
          reason: 'Thưởng Quick Quiz',
          source: 'QUICK_QUIZ',
          sessionId,
        });
        if (typeof nb === 'number') balances[String(sid)] = nb;
      } catch (e) {
        console.error('Lỗi cộng sao Quick Quiz:', e);
      }
    }));

    const updatedStudents = currentClass.students.map(s =>
      balances[String(s.id)] !== undefined ? { ...s, stars: balances[String(s.id)] } : s
    );
    onUpdateStudents(updatedStudents);
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Màn hình Quản Lý Ngân Hàng Câu Hỏi */}
      <QuestionBankView
        onLaunchQuizCreator={(chosenQuestions = []) => {
          setPreselectedQuestions(chosenQuestions);
          setIsCreatorOpen(true);
        }}
        currentClass={currentClass}
        availableLessons={availableLessons}
      />

      {/* 2. Modal Thiết Lập & Tạo Đề Quick Quiz */}
      <CreateQuizModal
        isOpen={isCreatorOpen}
        onClose={() => {
          setIsCreatorOpen(false);
          setPreselectedQuestions([]);
        }}
        onStartQuiz={handleStartQuiz}
        currentClass={currentClass}
        availableLessons={availableLessons}
        preselectedLesson={preselectedLesson}
        preselectedQuestions={preselectedQuestions}
        sessionId={sessionId}
      />

      {/* 3. Màn Hình Projector Mode Chơi Quiz Toàn Màn Hình */}
      {activeQuizSession && (
        <QuizPlayer
          quizSession={activeQuizSession}
          students={currentClass?.students || []}
          onClose={handleClosePlayer}
          onCompleteQuiz={handleCompleteQuiz}
          onAwardStars={handleAwardStars}
        />
      )}

      {/* 4. Modal Báo Cáo Kết Quả & Khuyến Nghị Sư Phạm */}
      <QuizResultModal
        isOpen={isResultOpen}
        onClose={() => {
          setIsResultOpen(false);
          setSummaryData(null);
        }}
        summaryData={summaryData}
        onRetryQuiz={() => {
          setIsResultOpen(false);
          setIsCreatorOpen(true);
        }}
      />
    </div>
  );
}
