import React, { useState } from 'react';
import LessonLibrary from './LessonLibrary';
import LessonEditor from './LessonEditor';
import PresentationView from './PresentationView';

export default function LessonManager({
  currentClass,
  onUpdateStudents,
  onUpdateGoodScores,
  soundEnabled = true
}) {
  const [view, setView] = useState('library'); // 'library' | 'editor'
  const [editingLesson, setEditingLesson] = useState(null);
  const [presentationLesson, setPresentationLesson] = useState(null);
  const [presentationInitialSlide, setPresentationInitialSlide] = useState(0);

  // Mở trình soạn thảo
  const handleOpenEditor = (lesson) => {
    setEditingLesson(lesson);
    setView('editor');
  };

  // Quay lại thư viện
  const handleBackToLibrary = () => {
    setEditingLesson(null);
    setView('library');
  };

  // Mở chế độ trình chiếu
  const handleLaunchPresentation = (lesson, initialSlideIndex = 0) => {
    setPresentationLesson(lesson);
    setPresentationInitialSlide(initialSlideIndex);
  };

  return (
    <>
      {view === 'library' && (
        <LessonLibrary
          onOpenEditor={handleOpenEditor}
          onOpenPresentation={handleLaunchPresentation}
          currentClass={currentClass}
        />
      )}

      {view === 'editor' && (
        <LessonEditor
          initialLesson={editingLesson}
          onBack={handleBackToLibrary}
          onSaveSuccess={(savedLesson) => setEditingLesson(savedLesson)}
          onLaunchPresentation={handleLaunchPresentation}
        />
      )}

      {/* Chế độ trình chiếu toàn màn hình */}
      {presentationLesson && (
        <PresentationView
          lesson={presentationLesson}
          initialSlideIndex={presentationInitialSlide}
          onClose={() => setPresentationLesson(null)}
          currentClass={currentClass}
          onUpdateStudents={onUpdateStudents}
          onUpdateGoodScores={onUpdateGoodScores}
          soundEnabled={soundEnabled}
        />
      )}
    </>
  );
}
