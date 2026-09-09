import React, { useState } from 'react';
import QuestionBankView from './QuestionBankView';
import CreateQuizModal from './CreateQuizModal';
import QuizPlayer from './QuizPlayer';
import QuizResultModal from './QuizResultModal';
import { saveQuizResultsApi } from './quizStorage';

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

  // Khởi chạy phiên Quiz
  const handleStartQuiz = (session) => {
    setActiveQuizSession(session);
    setIsCreatorOpen(false);
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

  // Xử lý cộng sao cho học sinh (Mode 2)
  const handleAwardStars = (starsMap) => {
    if (!onUpdateStudents || !currentClass?.students) return;

    const updatedStudents = currentClass.students.map(s => {
      const added = starsMap[s.id] || 0;
      if (added > 0) {
        return {
          ...s,
          stars: (s.stars || 0) + added
        };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Màn hình Quản Lý Ngân Hàng Câu Hỏi */}
      <QuestionBankView
        onLaunchQuizCreator={() => setIsCreatorOpen(true)}
        currentClass={currentClass}
        availableLessons={availableLessons}
      />

      {/* 2. Modal Thiết Lập & Tạo Đề Quick Quiz */}
      <CreateQuizModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onStartQuiz={handleStartQuiz}
        currentClass={currentClass}
        availableLessons={availableLessons}
        preselectedLesson={preselectedLesson}
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
