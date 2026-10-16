import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuestionSourceApi, generateQuestionsApi } from './aiService';
import { createQuestionApi } from '../QuickQuiz/quizStorage';
import { normalizeQuestion, validateQuestion } from './questionDraft';
import useLocalDraft from '../../hooks/useLocalDraft';

export default function useQuestionGenerator({ isOpen, lessons, preselectedLessonId, initialGrade, onQuestionsAdded }) {
  const [lessonId, setLessonId] = useState(preselectedLessonId ? String(preselectedLessonId) : '');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');
  const [instructions, setInstructions] = useState('');
  const [source, setSource] = useState(null);
  const [sourceContent, setSourceContent] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState('');
  const [batch, setBatch] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const generation = useRef(null);
  const saving = useRef(false);
  const epoch = useRef(0);
  const initialized = useRef(!!preselectedLessonId);
  const currentLesson = lessons.find(lesson => String(lesson.id) === lessonId);
  const restoredSource = useRef(null);
  const cancelGeneration = useCallback(() => {
    generation.current?.abort(); generation.current = null;
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && !lessonId && lessons.length && !initialized.current) {
      const preferred = lessons.find(lesson => String(lesson.id) === String(preselectedLessonId))
        || lessons.find(lesson => Number(lesson.grade) === Number(initialGrade)) || lessons[0];
      setLessonId(String(preferred.id));
      initialized.current = true;
    }
  }, [isOpen, lessonId, lessons, preselectedLessonId, initialGrade]);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      // This ref is a request counter, not a DOM node; invalidate the current session.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      epoch.current++;
      cancelGeneration();
    };
  }, [isOpen, cancelGeneration]);

  useEffect(() => {
    if (!isOpen) {
      setQuestions([]); setBatch(null); setSelected(new Set()); setSaved(new Set());
      setLoading(false); setError(''); setReport('');
    }
  }, [isOpen]);

  useEffect(() => {
    setSource(null); setSourceContent(restoredSource.current?.lessonId === lessonId ? restoredSource.current.content : ''); setSourceError('');
    if (!isOpen || !lessonId) { setSourceLoading(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let active = true;
    setSourceLoading(true);
    fetchQuestionSourceApi(lessonId, controller.signal).then(data => {
      if (active) { setSource({ ...data, lessonId }); setSourceContent(restoredSource.current?.lessonId === lessonId ? restoredSource.current.content : data.content); restoredSource.current = null; }
    }).catch(err => {
      if (active) {
        setSource({ content: '', kind: 'empty', lessonId });
        setSourceError(err.name === 'AbortError' ? 'Đọc nội dung quá lâu. Bạn có thể nhập kiến thức bên dưới.' : err.message);
      }
    }).finally(() => { clearTimeout(timer); if (active) setSourceLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [isOpen, lessonId]);

  const localDraft = useLocalDraft(`ai-questions:${preselectedLessonId || 'library'}:${initialGrade}`, isOpen,
    { lessonId, count, difficulty, instructions, sourceContent, batch, questions, selected: [...selected], saved: [...saved] }, data => {
      if (typeof data.lessonId !== 'string' || !Array.isArray(data.questions)) return;
      initialized.current = true; restoredSource.current = { lessonId: data.lessonId, content: data.sourceContent || '' };
      setLessonId(data.lessonId); setCount(Number(data.count) || 5); setDifficulty(data.difficulty || 'mixed'); setInstructions(data.instructions || '');
      setSourceContent(data.sourceContent || ''); setBatch(data.batch || null); setQuestions(data.questions.map(normalizeQuestion));
      setSelected(new Set(data.selected || [])); setSaved(new Set(data.saved || []));
    });
  const clearDraft = localDraft.clear;
  useEffect(() => { if (isOpen && questions.length && questions.every((_, index) => saved.has(index))) clearDraft(); }, [isOpen, questions, saved, clearDraft]);

  const generate = async () => {
    if (generation.current || saving.current || sourceLoading || source?.lessonId !== lessonId || !currentLesson || !sourceContent.trim()) return;
    const controller = new AbortController();
    generation.current = controller;
    const timer = setTimeout(() => controller.abort(), 120000);
    const snapshot = { ...currentLesson, count, difficulty, sourceContent, instructions };
    setLoading(true); setError(''); setReport('');
    try {
      const result = await generateQuestionsApi({ lessonId, count, difficulty, sourceContent, instructions, signal: controller.signal });
      if (generation.current !== controller || controller.signal.aborted) return;
      const drafts = (result.data?.questions || []).map(normalizeQuestion);
      if (!drafts.length) throw new Error('AI chưa trả về câu hỏi hợp lệ. Hãy bổ sung kiến thức và thử lại.');
      setQuestions(drafts); setBatch({ ...snapshot, isCached: !!result.isCached });
      setSelected(new Set(drafts.map((_, index) => index))); setSaved(new Set());
    } catch (err) {
      if (generation.current !== controller) return;
      setError(err.name === 'AbortError' ? 'Tạo câu hỏi quá lâu. Hãy thử lại với ít câu hơn.'
        : err.errorCode === 'AI_NOT_CONFIGURED' ? 'Chưa kết nối Gemini. Hãy kiểm tra cấu hình Trợ giảng AI.'
        : err.errorCode === 'AI_RATE_LIMIT' ? 'AI đang bận hoặc đã đạt giới hạn sử dụng. Hãy thử lại sau.' : err.message);
    } finally {
      clearTimeout(timer);
      if (generation.current === controller) { generation.current = null; setLoading(false); }
    }
  };

  const save = async () => {
    if (saving.current || generation.current || !batch || !selected.size) return;
    const indices = [...selected].filter(index => !saved.has(index));
    for (const index of indices) {
      const problem = validateQuestion(questions[index]);
      if (problem) { setError(`Câu ${index + 1}: ${problem}`); return; }
    }
    const version = epoch.current;
    saving.current = true; setIsSaving(true); setError(''); setReport('');
    let added = 0;
    try {
      for (const index of indices) {
        const question = questions[index];
        await createQuestionApi({
          grade: Number(batch.grade) || 3, topic: question.topic || batch.topic || 'TOPIC_A',
          difficulty: question.difficulty, type: 'MULTIPLE_CHOICE', question: question.questionText.trim(),
          options: question.options.map(option => option.trim()), correct_index: question.correctIndex,
          correct_answer: question.options[question.correctIndex].trim(), explanation: question.explanation,
          lesson_id: String(batch.id), source_lesson_id: String(batch.id), source: 'AI_GEMINI',
          tags: ['AI', `Khối_${batch.grade}`]
        }, { allowLocalFallback: false });
        added++;
        if (version !== epoch.current) break;
        setSaved(previous => new Set([...previous, index]));
        setSelected(previous => { const next = new Set(previous); next.delete(index); return next; });
      }
      if (version === epoch.current) setReport(`Đã lưu ${added} câu vào ngân hàng.`);
    } catch (err) {
      if (version === epoch.current) {
        setReport(added ? `Đã lưu ${added}/${indices.length} câu. Các câu đã lưu được đánh dấu bên dưới.` : '');
        setError(`Chưa lưu được các câu còn lại: ${err.message}`);
      }
    } finally {
      saving.current = false;
      if (version === epoch.current) setIsSaving(false);
      if (added) {
        try { await onQuestionsAdded?.(added); } catch (err) { console.warn('Không thể làm mới danh sách câu hỏi:', err); }
      }
    }
  };

  const toggle = index => setSelected(previous => {
    if (saved.has(index) || loading || isSaving) return previous;
    const next = new Set(previous);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });
  const update = (index, patch) => {
    if (saved.has(index) || loading || isSaving) return;
    setQuestions(previous => previous.map((question, i) => i === index ? { ...question, ...patch } : question));
  };
  return {
    draftStatus: localDraft.status, lessonId, setLessonId, currentLesson, count, setCount, difficulty, setDifficulty,
    instructions, setInstructions, source, sourceContent, setSourceContent, sourceLoading, sourceError,
    loading, isSaving, error, report, batch, questions, selected, saved, generate, cancelGeneration, save, toggle, update,
    selectAll: () => setSelected(new Set(questions.map((_, index) => index).filter(index => !saved.has(index)))),
    deselectAll: () => setSelected(new Set())
  };
}
