import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Play, 
  Edit3, 
  Copy, 
  Trash2, 
  Clock, 
  Layers, 
  FolderOpen,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { 
  fetchLessonsApi, 
  deleteLessonApi, 
  duplicateLessonApi, 
  INFORMATICS_TOPICS,
  fetchLessonDetailApi,
  fetchLessonRenderStatusApi,
  compareLessonTitles
} from './lessonStorage';
import ImportPptxModal from './ImportPptxModal';
import EditImportedLessonModal from './EditImportedLessonModal';
import ErrorBoundary from '../ErrorBoundary';

export default function LessonLibrary({
  onOpenEditor,
  onOpenPresentation,
  currentClass
}) {
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(() => currentClass?.grade || 'all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [sortBy, setSortBy] = useState('lesson_order'); // 'lesson_order' | 'title_asc' | 'title_desc' | 'recent'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingImportedLesson, setEditingImportedLesson] = useState(null);

  // Load danh sách bài học
  useEffect(() => {
    let ignore = false;
    fetchLessonsApi({
      grade: selectedGrade,
      topic: selectedTopic,
      search: searchTerm
    })
      .then((data) => {
        if (!ignore) {
          setLessons(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi nạp bài học:', err);
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedGrade, selectedTopic, searchTerm]);

  // Polling tự động cập nhật trạng thái render slide nền cho các bài đang processing
  useEffect(() => {
    const processingLessons = lessons.filter(l => l.render_status === 'processing');
    if (processingLessons.length === 0) return;

    const interval = setInterval(async () => {
      for (const l of processingLessons) {
        try {
          const statusData = await fetchLessonRenderStatusApi(l.id);
          if (statusData && statusData.render_status !== 'processing') {
            setLessons(prev => prev.map(item => {
              if (item.id === l.id) {
                return {
                  ...item,
                  render_status: statusData.render_status,
                  thumbnail_url: statusData.thumbnail_url || item.thumbnail_url,
                  slide_count: statusData.slide_count || item.slide_count,
                  slides: statusData.slides || item.slides
                };
              }
              return item;
            }));
          }
        } catch (err) {
          console.warn('Lỗi polling status trong LessonLibrary:', err);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lessons]);

  // Tìm kiếm tức thời phía client & Sắp xếp bài học chuẩn xác
  const filteredLessons = useMemo(() => {
    let list = [...lessons];
    if (selectedGrade !== 'all') {
      list = list.filter(l => Number(l.grade) === Number(selectedGrade));
    }
    if (selectedTopic !== 'all') {
      list = list.filter(l => l.topic === selectedTopic);
    }
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      list = list.filter(l => 
        (l.title && l.title.toLowerCase().includes(s)) ||
        (l.keywords && l.keywords.toLowerCase().includes(s)) ||
        (l.objectives && l.objectives.toLowerCase().includes(s))
      );
    }

    list.sort((a, b) => {
      // 1. Nếu xem tất cả khối lớp, sắp xếp theo Khối 1 -> 2 -> 3 -> 4 -> 5 trước
      if (selectedGrade === 'all') {
        const gradeA = Number(a.grade) || 0;
        const gradeB = Number(b.grade) || 0;
        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }
      }

      // 2. Sắp xếp theo tiêu chí người dùng chọn
      if (sortBy === 'recent') {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'title_desc') {
        return compareLessonTitles(b.title || '', a.title || '');
      }
      if (sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'vi');
      }

      // Mặc định: 'lesson_order' (Bài 1, Bài 2, ..., Bài 9, Bài 10, Bài 11...)
      return compareLessonTitles(a.title || '', b.title || '');
    });

    return list;
  }, [lessons, selectedGrade, selectedTopic, searchTerm, sortBy]);

  // Xóa bài học
  const handleDeleteLesson = async (lesson, e) => {
    e.stopPropagation();
    if (!window.confirm(`Thầy/cô có chắc chắn muốn xóa bài học "${lesson.title}"?\nThao tác này sẽ xóa toàn bộ các slide con trong bài.`)) {
      return;
    }

    try {
      await deleteLessonApi(lesson.id);
      setLessons(prev => prev.filter(l => l.id !== lesson.id));
    } catch (err) {
      alert(`❌ Lỗi xóa: ${err.message}`);
    }
  };

  // Nhân bản bài học
  const handleDuplicateLesson = async (lesson, e) => {
    e.stopPropagation();
    try {
      const cloned = await duplicateLessonApi(lesson.id);
      if (cloned) {
        setLessons(prev => [cloned, ...prev]);
      }
    } catch (err) {
      alert(`❌ Lỗi nhân bản: ${err.message}`);
    }
  };

  // Mở trình chiếu
  const handleLaunchPresentation = async (lesson, e) => {
    e?.stopPropagation();
    setLaunchingId(lesson.id);
    try {
      // Lấy chi tiết kèm đầy đủ slides
      const full = await fetchLessonDetailApi(lesson.id);
      if (full) {
        onOpenPresentation(full);
      } else {
        onOpenPresentation(lesson);
      }
    } catch (err) {
      console.error('Lỗi nạp bài học để trình chiếu:', err);
      onOpenPresentation(lesson);
    } finally {
      setLaunchingId(null);
    }
  };

  // Mở soạn thảo bài
  const handleEditLesson = async (lesson, e) => {
    e?.stopPropagation();
    const full = await fetchLessonDetailApi(lesson.id);
    if (full) {
      onOpenEditor(full);
    } else {
      onOpenEditor(lesson);
    }
  };

  const gradeColors = {
    1: { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
    2: { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
    3: { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284c7', border: 'rgba(2, 132, 199, 0.3)' },
    4: { bg: 'rgba(6, 182, 212, 0.12)', text: '#0891b2', border: 'rgba(6, 182, 212, 0.3)' },
    5: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Banner & Nút Thêm Mới */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
        border: '1px solid rgba(2, 132, 199, 0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)'
          }}>
            <BookOpen size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Thư Viện Bài Học & Slide Giảng Dạy
              </h1>
              <span style={{
                fontSize: '0.75rem',
                background: '#10b981',
                color: '#fff',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px'
              }}>
                GDPT 2018
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Soạn giáo án số, thiết kế bài trình chiếu tương tác và chiếu trực tiếp trong tiết học phòng máy.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onOpenEditor(null)}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={20} />
            <span>+ Tạo bài học</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
            }}
          >
            <UploadCloud size={20} />
            <span>📥 Import PowerPoint</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh Công Cụ Lọc & Tìm Kiếm */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Bộ lọc nhanh 5 Khối lớp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--surface-border)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setSelectedGrade('all')}
            style={{
              padding: '0.35rem 0.85rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: selectedGrade === 'all' ? '#0284c7' : 'transparent',
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
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: Number(selectedGrade) === g ? '#0284c7' : 'transparent',
                color: Number(selectedGrade) === g ? '#fff' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              Khối {g}
            </button>
          ))}
        </div>

        {/* Lọc theo Chủ đề & Ô tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', minWidth: 320 }}>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="input-field"
            style={{ minWidth: 200, fontSize: '0.875rem', fontWeight: 600 }}
          >
            {INFORMATICS_TOPICS.map(t => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>

          {/* Sắp xếp bài giảng */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
            style={{ minWidth: 185, fontSize: '0.875rem', fontWeight: 600 }}
            title="Thứ tự sắp xếp bài giảng"
          >
            <option value="lesson_order">🔢 Thứ tự bài (Bài 1 → 10)</option>
            <option value="title_asc">🔤 Tên bài: A → Z</option>
            <option value="title_desc">🔤 Tên bài: Z → A</option>
            <option value="recent">🕒 Mới cập nhật gần đây</option>
          </select>

          <div style={{ position: 'relative', width: 240 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm bài học, từ khóa..."
              className="input-field"
              style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {/* 3. Lưới Thẻ Bài Học (Lesson Cards Grid) */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang nạp thư viện bài học...
        </div>
      ) : filteredLessons.length === 0 ? (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '4rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <FolderOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Không tìm thấy bài học nào phù hợp
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Hãy thử xóa bộ lọc tìm kiếm hoặc tạo bài học mới cho khối lớp này.
          </p>
          <button
            onClick={() => onOpenEditor(null)}
            className="btn btn-primary"
          >
            + Soạn Bài Học Đầu Tiên
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredLessons.map(lesson => {
            const gc = gradeColors[lesson.grade] || gradeColors[3];
            const slideCount = lesson.slide_count || lesson.slides_count || lesson.slides?.length || 0;
            const isImported = lesson.type === 'imported';

            return (
              <div
                key={lesson.id}
                onClick={() => {
                  if (isImported) {
                    setEditingImportedLesson(lesson);
                  } else {
                    handleEditLesson(lesson);
                  }
                }}
                style={{
                  background: 'var(--surface-card)',
                  border: isImported ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isImported ? '0 4px 14px rgba(168, 85, 247, 0.08)' : 'var(--shadow-sm)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = isImported 
                    ? '0 8px 24px rgba(168, 85, 247, 0.18)' 
                    : 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = isImported 
                    ? '0 4px 14px rgba(168, 85, 247, 0.08)' 
                    : 'var(--shadow-sm)';
                }}
              >
                {/* Phần trên thẻ bài */}
                <div>
                  {/* Thumbnail Slide 1 hoặc placeholder */}
                  {lesson.thumbnail_url ? (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      background: '#090d16',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      marginBottom: '0.85rem',
                      position: 'relative',
                      border: '1px solid var(--surface-border)'
                    }}>
                      <img
                        src={lesson.thumbnail_url}
                        alt={lesson.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backdropFilter: 'blur(4px)'
                      }}>
                        Slide 1
                      </div>
                    </div>
                  ) : isImported ? (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      marginBottom: '0.85rem',
                      position: 'relative',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      color: '#fff'
                    }}>
                      <span style={{ fontSize: '1.6rem' }}>📊</span>
                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                        PowerPoint • {slideCount} slides
                      </span>
                      {lesson.render_status === 'processing' && (
                        <span style={{
                          fontSize: '0.675rem',
                          color: '#eab308',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontWeight: 700
                        }}>
                          <Loader2 size={10} className="animate-spin" />
                          Đang chuẩn bị slide...
                        </span>
                      )}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{
                        background: gc.bg,
                        color: gc.text,
                        border: `1px solid ${gc.border}`,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px'
                      }}>
                        Khối {lesson.grade}
                      </span>
                      <span style={{
                        background: 'var(--surface-secondary)',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        border: '1px solid var(--surface-border)'
                      }}>
                        {lesson.topic || 'Chung'}
                      </span>
                      {isImported && (
                        lesson.render_status === 'processing' ? (
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.12)',
                            color: '#eab308',
                            border: '1px solid rgba(234, 179, 8, 0.35)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Loader2 size={10} className="animate-spin" />
                            <span>Đang chuẩn bị slide...</span>
                          </span>
                        ) : lesson.render_status === 'failed' ? (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>⚠️ Lỗi xử lý slide</span>
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>🟣</span>
                            <span>PowerPoint đã import</span>
                          </span>
                        )
                      )}
                    </div>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} />
                      {lesson.duration_minutes || 35}p
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.35,
                    marginBottom: '0.5rem'
                  }}>
                    {lesson.title}
                  </h3>

                  {lesson.objectives && (
                    <p style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {lesson.objectives}
                    </p>
                  )}
                </div>

                {/* Phần dưới thẻ bài: Nút thao tác & Slide count */}
                <div style={{
                  borderTop: '1px solid var(--surface-border)',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: isImported ? '#a855f7' : '#0284c7', fontWeight: 700 }}>
                    <Layers size={16} />
                    <span>{slideCount} slides</span>
                  </div>

                  {isImported ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingImportedLesson(lesson);
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Xem & sửa thông tin bài giảng"
                      >
                        <Edit3 size={14} />
                        <span>Thông tin</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteLesson(lesson, e)}
                        className="btn btn-icon"
                        style={{ width: 32, height: 32, color: '#ef4444' }}
                        title="Xóa bài học"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={(e) => handleLaunchPresentation(lesson, e)}
                        disabled={launchingId === lesson.id}
                        className="btn btn-primary"
                        style={{
                          padding: '0.4rem 0.95rem',
                          fontSize: '0.825rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
                        }}
                        title="Bắt đầu trình chiếu bài PowerPoint này"
                      >
                        {launchingId === lesson.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Play size={15} fill="#fff" />
                        )}
                        <span>📺 Trình Chiếu</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditor(lesson);
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Chỉnh sửa nội dung và slides"
                      >
                        <Edit3 size={14} />
                        <span>Sửa</span>
                      </button>

                      <button
                        onClick={(e) => handleDuplicateLesson(lesson, e)}
                        className="btn btn-icon"
                        style={{ width: 32, height: 32 }}
                        title="Nhân bản bài học"
                      >
                        <Copy size={15} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteLesson(lesson, e)}
                        className="btn btn-icon"
                        style={{ width: 32, height: 32, color: '#ef4444' }}
                        title="Xóa bài học"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={(e) => handleLaunchPresentation(lesson, e)}
                        disabled={launchingId === lesson.id}
                        className="btn btn-primary"
                        style={{
                          padding: '0.4rem 0.95rem',
                          fontSize: '0.825rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
                        }}
                        title="Bắt đầu trình chiếu toàn màn hình bài học này"
                      >
                        {launchingId === lesson.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Play size={15} fill="#fff" />
                        )}
                        <span>📺 Trình Chiếu</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Import PowerPoint */}
      <ErrorBoundary title="Không thể hiển thị hộp thoại Import PowerPoint" onClose={() => setIsImportModalOpen(false)}>
        <ImportPptxModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(newLessons) => {
            const toAdd = Array.isArray(newLessons) ? newLessons : [newLessons];
            if (toAdd.length === 0 || !toAdd[0]) return;

            setLessons(prev => {
              const addMap = new Map(toAdd.map(item => [item.id, item]));
              // Cập nhật các bài đã tồn tại
              const updated = prev.map(p => addMap.has(p.id) ? { ...p, ...addMap.get(p.id) } : p);
              // Thêm các bài mới vào đầu danh sách nếu chưa có
              const existingIds = new Set(prev.map(p => p.id));
              const reallyNew = toAdd.filter(item => !existingIds.has(item.id));
              return [...reallyNew, ...updated];
            });

            // Tự động chuyển bộ lọc về 'all' để giáo viên thấy ngay bài vừa import
            setSelectedGrade('all');
            setSelectedTopic('all');
            setSearchTerm('');
          }}
          defaultGrade={currentClass?.grade || 3}
        />
      </ErrorBoundary>

      {/* Modal Chỉnh Sửa Thông Tin Bài Import */}
      {editingImportedLesson && (
        <EditImportedLessonModal
          key={editingImportedLesson.id}
          isOpen={!!editingImportedLesson}
          lesson={editingImportedLesson}
          onClose={() => setEditingImportedLesson(null)}
          onUpdateSuccess={(updated) => {
            setLessons(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
          }}
        />
      )}
    </div>
  );
}
