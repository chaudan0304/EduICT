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
  FolderOpen
} from 'lucide-react';
import { 
  fetchLessonsApi, 
  deleteLessonApi, 
  duplicateLessonApi, 
  INFORMATICS_TOPICS,
  fetchLessonDetailApi
} from './lessonStorage';

export default function LessonLibrary({
  onOpenEditor,
  onOpenPresentation,
  currentClass
}) {
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState(() => currentClass?.grade || 'all');
  const [selectedTopic, setSelectedTopic] = useState('all');

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

  // Tìm kiếm tức thời phía client
  const filteredLessons = useMemo(() => {
    let list = lessons;
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
    return list;
  }, [lessons, selectedGrade, selectedTopic, searchTerm]);

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
    // Lấy chi tiết kèm đầy đủ slides
    const full = await fetchLessonDetailApi(lesson.id);
    if (full) {
      onOpenPresentation(full);
    } else {
      onOpenPresentation(lesson);
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

        <button
          onClick={() => onOpenEditor(null)}
          className="btn btn-primary"
          style={{
            padding: '0.75rem 1.35rem',
            fontSize: '0.95rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
          }}
        >
          <Plus size={20} />
          <span>Soạn Bài Học Mới</span>
        </button>
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
            const slideCount = lesson.slides_count || lesson.slides?.length || 0;

            return (
              <div
                key={lesson.id}
                onClick={() => handleEditLesson(lesson)}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Phần trên thẻ bài */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    </div>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} />
                      {lesson.duration_minutes || 35}p
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.35,
                    marginBottom: '0.65rem'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
                    <Layers size={16} />
                    <span>{slideCount} slides</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditor(lesson);
                      }}
                      className="btn btn-icon"
                      style={{ width: 32, height: 32 }}
                      title="Chỉnh sửa bài học & slides"
                    >
                      <Edit3 size={15} />
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
                      className="btn btn-primary"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title="Bắt đầu trình chiếu toàn màn hình"
                    >
                      <Play size={14} fill="#fff" />
                      <span>Trình Chiếu</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
