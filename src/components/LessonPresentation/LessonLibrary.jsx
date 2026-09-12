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
  UploadCloud,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { 
  fetchLessonsApi, 
  deleteLessonApi, 
  duplicateLessonApi, 
  INFORMATICS_TOPICS,
  fetchLessonDetailApi,
  fetchLessonRenderStatusApi,
  compareLessonTitles,
  scanLibraryDuplicatesApi,
  resolveDuplicateApi,
  retryLessonThumbnailApi,
  DUPLICATE_TIERS
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
  const [similarityFilter, setSimilarityFilter] = useState('all'); // 'all' | 'unique' | 'exact_duplicate' | 'high_duplicate' | 'near_similar'
  const [sortBy, setSortBy] = useState('lesson_order'); // 'lesson_order' | 'title_asc' | 'title_desc' | 'recent'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingImportedLesson, setEditingImportedLesson] = useState(null);
  const [duplicateDetailModal, setDuplicateDetailModal] = useState(null); // { lesson, matchedLesson, ... }
  const [scanReport, setScanReport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanModalTab, setScanModalTab] = useState('all'); // 'all' | 'exact' | 'high' | 'reference'
  const [scanModalClassFilter, setScanModalClassFilter] = useState('all'); // 'all' | '1' | '2' | '3' | '4' | '5' | 'unassigned'

  // Load danh sách bài học
  useEffect(() => {
    let ignore = false;
    fetchLessonsApi({
      grade: selectedGrade,
      topic: selectedTopic,
      search: searchTerm,
      similarity_status: similarityFilter
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
  }, [selectedGrade, selectedTopic, searchTerm, similarityFilter]);

  const [retryingThumbnailIds, setRetryingThumbnailIds] = useState(new Set());

  // Polling tự động cập nhật các bài học đang render slide nền hoặc thiếu thumbnail
  useEffect(() => {
    const hasPendingLessons = lessons.some(l => 
      l.type === 'imported' && (
        l.render_status === 'processing' || 
        l.renderStatus === 'processing' || 
        l.import_status === 'IMPORTING' ||
        (!l.thumbnail_url && !l.thumbnailUrl)
      )
    );
    if (!hasPendingLessons) return;

    const interval = setInterval(async () => {
      let hasChanges = false;
      const updatedLessons = await Promise.all(
        lessons.map(async (l) => {
          if (l.type === 'imported' && (l.render_status === 'processing' || l.renderStatus === 'processing' || (!l.thumbnail_url && !l.thumbnailUrl))) {
            try {
              const statusData = await fetchLessonRenderStatusApi(l.id);
              if (statusData && (
                (statusData.renderStatus && statusData.renderStatus !== l.renderStatus) ||
                (statusData.render_status && statusData.render_status !== l.render_status) ||
                (statusData.thumbnailUrl && statusData.thumbnailUrl !== l.thumbnailUrl) ||
                (statusData.thumbnail_url && statusData.thumbnail_url !== l.thumbnail_url)
              )) {
                hasChanges = true;
                return {
                  ...l,
                  render_status: statusData.renderStatus || statusData.render_status || l.render_status,
                  renderStatus: statusData.renderStatus || statusData.render_status || l.renderStatus,
                  thumbnail_url: statusData.thumbnailUrl || statusData.thumbnail_url || l.thumbnail_url,
                  thumbnailUrl: statusData.thumbnailUrl || statusData.thumbnail_url || l.thumbnailUrl,
                  rendered_slides: statusData.renderedSlides !== undefined ? statusData.renderedSlides : l.rendered_slides,
                  renderedSlides: statusData.renderedSlides !== undefined ? statusData.renderedSlides : l.renderedSlides,
                  failed_slides: statusData.failedSlides !== undefined ? statusData.failedSlides : l.failed_slides,
                  failedSlides: statusData.failedSlides !== undefined ? statusData.failedSlides : l.failedSlides,
                  slides: statusData.slides || l.slides
                };
              }
            } catch {}
          }
          return l;
        })
      );
      if (hasChanges) {
        setLessons(updatedLessons);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lessons]);

  // Thao tác: Thử lại tạo ảnh xem trước (Requirement 2)
  const handleRetryThumbnail = async (e, lessonId) => {
    e.stopPropagation();
    if (retryingThumbnailIds.has(lessonId)) return;
    setRetryingThumbnailIds(prev => new Set([...prev, lessonId]));
    try {
      const res = await retryLessonThumbnailApi(lessonId);
      if (res && (res.thumbnailUrl || res.thumbnail_url)) {
        const url = res.thumbnailUrl || res.thumbnail_url;
        setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, thumbnail_url: url, thumbnailUrl: url } : l));
      } else {
        setTimeout(async () => {
          try {
            const st = await fetchLessonRenderStatusApi(lessonId);
            if (st && (st.thumbnailUrl || st.thumbnail_url)) {
              const url = st.thumbnailUrl || st.thumbnail_url;
              setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, thumbnail_url: url, thumbnailUrl: url, render_status: st.renderStatus || st.render_status } : l));
            }
          } catch {}
        }, 1500);
      }
    } catch (err) {
      alert(`Không thể tạo ảnh xem trước: ${err.message}`);
    } finally {
      setRetryingThumbnailIds(prev => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  };

  // Tự động quét toàn bộ thư viện bài giảng để phát hiện trùng lặp
  const runAutoScan = async () => {
    setIsScanning(true);
    try {
      const data = await scanLibraryDuplicatesApi();
      if (data && data.success) {
        setScanReport(data);
      }
    } catch (err) {
      console.warn('Lỗi quét trùng lặp tự động:', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runAutoScan();
  }, []);

  // Thao tác: Giữ lại bài giảng (bỏ qua cảnh báo trùng lặp)
  const handleKeepLesson = async (lessonId) => {
    try {
      await resolveDuplicateApi(lessonId);
      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, similarity_status: 'unique', duplicate_of_id: null } : l));
      setScanReport(prev => {
        if (!prev) return prev;
        const newPairs = prev.pairs.filter(p => p.lessonA.id !== lessonId && p.lessonB.id !== lessonId);
        const newMap = { ...prev.lessonDuplicateMap };
        delete newMap[lessonId];
        return {
          ...prev,
          totalDuplicates: newPairs.length,
          exactCount: newPairs.filter(p => p.tier === 'exact').length,
          highCount: newPairs.filter(p => p.tier === 'high').length,
          referenceCount: newPairs.filter(p => p.tier === 'reference').length,
          pairs: newPairs,
          lessonDuplicateMap: newMap
        };
      });
      if (duplicateDetailModal?.lesson?.id === lessonId) {
        setDuplicateDetailModal(null);
      }
      alert('✓ Đã xác nhận giữ lại bài giảng trong thư viện.');
    } catch (err) {
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  // Thao tác: Xóa bài giảng trùng lặp
  const handleDeleteDuplicateLesson = async (targetLesson) => {
    if (!window.confirm(`Thầy/cô có chắc chắn muốn xóa bài "${targetLesson.title}" khỏi thư viện?\nThao tác này sẽ xóa toàn bộ nội dung và slide của bài.`)) {
      return;
    }
    try {
      await deleteLessonApi(targetLesson.id);
      setLessons(prev => prev.filter(l => l.id !== targetLesson.id));
      setScanReport(prev => {
        if (!prev) return prev;
        const newPairs = prev.pairs.filter(p => p.lessonA.id !== targetLesson.id && p.lessonB.id !== targetLesson.id);
        const newMap = { ...prev.lessonDuplicateMap };
        delete newMap[targetLesson.id];
        return {
          ...prev,
          totalDuplicates: newPairs.length,
          exactCount: newPairs.filter(p => p.tier === 'exact').length,
          highCount: newPairs.filter(p => p.tier === 'high').length,
          referenceCount: newPairs.filter(p => p.tier === 'reference').length,
          pairs: newPairs,
          lessonDuplicateMap: newMap
        };
      });
      if (duplicateDetailModal?.lesson?.id === targetLesson.id || duplicateDetailModal?.matchedLesson?.id === targetLesson.id) {
        setDuplicateDetailModal(null);
      }
      alert('✓ Đã xóa bài giảng trùng lặp thành công.');
    } catch (err) {
      alert(`❌ Lỗi xóa: ${err.message}`);
    }
  };

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
    if (similarityFilter !== 'all') {
      if (similarityFilter === 'unique') {
        list = list.filter(l => {
          const dupInfo = scanReport?.lessonDuplicateMap?.[l.id];
          if (dupInfo) return false;
          return !l.similarity_status || l.similarity_status === 'unique';
        });
      } else if (similarityFilter === 'exact_duplicate') {
        list = list.filter(l => {
          const dupInfo = scanReport?.lessonDuplicateMap?.[l.id];
          return l.similarity_status === 'exact_duplicate' || dupInfo?.tier === 'exact';
        });
      } else if (similarityFilter === 'high_duplicate') {
        list = list.filter(l => {
          const dupInfo = scanReport?.lessonDuplicateMap?.[l.id];
          return l.similarity_status === 'high_duplicate' || l.similarity_status === 'near_duplicate' || dupInfo?.tier === 'high';
        });
      } else if (similarityFilter === 'near_similar') {
        list = list.filter(l => {
          const dupInfo = scanReport?.lessonDuplicateMap?.[l.id];
          return l.similarity_status === 'near_similar' || dupInfo?.tier === 'reference';
        });
      }
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
  }, [lessons, selectedGrade, selectedTopic, searchTerm, sortBy, similarityFilter, scanReport]);

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
            onClick={() => {
              runAutoScan();
              setIsScanModalOpen(true);
            }}
            className="btn btn-secondary"
            disabled={isScanning}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative'
            }}
            title="Tự động quét và phát hiện các bài giảng trùng lặp trong thư viện"
          >
            {isScanning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} color="#0284c7" />
            )}
            <span>🔍 Tự động quét</span>
            {scanReport && scanReport.totalDuplicates > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
              }}>
                {scanReport.totalDuplicates}
              </span>
            )}
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

      {/* Banner Tự Động Quét Bài Giảng Trùng Lặp (Phân loại 3 mức độ) */}
      {scanReport && scanReport.totalDuplicates > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(249, 115, 22, 0.06) 50%, rgba(234, 179, 8, 0.05) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <h4 style={{ fontSize: '0.975rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Kết quả tự động quét: Phát hiện {scanReport.totalDuplicates} cặp bài giảng trùng hoặc gần trùng
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.825rem' }}>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  🔴 Trùng 100% (95-100%): <strong>{scanReport.exactCount}</strong> bài
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>
                  🟠 Trùng cao (80-95%): <strong>{scanReport.highCount}</strong> bài
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: '#b45309', fontWeight: 700 }}>
                  🟡 Gần giống (60-80%): <strong>{scanReport.referenceCount}</strong> bài
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Xem chi tiết & Xử lý ({scanReport.totalDuplicates})</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

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

        {/* Bộ lọc trạng thái bài giảng (Trùng lặp) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          width: '100%',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--surface-border)'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Trạng thái bài:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unique', label: '✓ Bài mới', color: '#10b981' },
            { id: 'exact_duplicate', label: '🔴 Trùng 100% (95-100%)', color: '#ef4444', count: scanReport?.exactCount },
            { id: 'high_duplicate', label: '🟠 Trùng cao (80-95%)', color: '#f97316', count: scanReport?.highCount },
            { id: 'near_similar', label: '🟡 Gần giống (60-80%)', color: '#eab308', count: scanReport?.referenceCount }
          ].map(p => {
            const isActive = similarityFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSimilarityFilter(p.id)}
                style={{
                  padding: '0.25rem 0.7rem',
                  borderRadius: '999px',
                  border: isActive ? `1px solid ${p.color || '#0284c7'}` : '1px solid var(--surface-border)',
                  background: isActive ? (p.color ? `${p.color}20` : 'rgba(2, 132, 199, 0.15)') : 'transparent',
                  color: isActive ? (p.color || '#0284c7') : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{p.label}</span>
                {p.count > 0 && (
                  <span style={{
                    background: p.color,
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.05rem 0.4rem',
                    fontSize: '0.675rem',
                    fontWeight: 900
                  }}>
                    {p.count}
                  </span>
                )}
              </button>
            );
          })}
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
                      gap: '0.45rem',
                      color: '#fff',
                      padding: '1rem'
                    }}>
                      {(lesson.render_status === 'processing' || lesson.renderStatus === 'processing' || lesson.import_status === 'IMPORTING') ? (
                        <>
                          <span style={{ fontSize: '1.5rem' }}>📊</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
                            PowerPoint đã import
                          </span>
                          <span style={{
                            fontSize: '0.725rem',
                            color: '#eab308',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(234, 179, 8, 0.18)',
                            border: '1px solid rgba(234, 179, 8, 0.35)',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '999px',
                            fontWeight: 700
                          }}>
                            <Loader2 size={12} className="animate-spin" />
                            ⏳ Đang tạo ảnh xem trước...
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '1.5rem' }}>🖼️</span>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                            Không tạo được ảnh xem trước
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRetryThumbnail(e, lesson.id)}
                            disabled={retryingThumbnailIds.has(lesson.id)}
                            style={{
                              marginTop: '0.25rem',
                              padding: '0.35rem 0.9rem',
                              borderRadius: '999px',
                              background: 'rgba(2, 132, 199, 0.25)',
                              border: '1px solid #0284c7',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              cursor: retryingThumbnailIds.has(lesson.id) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {retryingThumbnailIds.has(lesson.id) ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Đang tạo lại...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw size={12} />
                                <span>Thử lại</span>
                              </>
                            )}
                          </button>
                        </>
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
                        (lesson.render_status === 'processing' || lesson.renderStatus === 'processing') ? (
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
                            <span>⏳ Đang tạo ảnh xem trước...</span>
                          </span>
                        ) : (lesson.render_status === 'partial' || lesson.renderStatus === 'partial') ? (
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>⚠️</span>
                            <span>Có slide không thể kết xuất ({lesson.renderedSlides !== undefined ? lesson.renderedSlides : (slideCount - (lesson.failed_slides || 1))}/{lesson.totalSlides || slideCount} slide đã xử lý)</span>
                          </span>
                        ) : (lesson.render_status === 'failed' || lesson.renderStatus === 'failed') ? (
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>⚠️</span>
                            <span>Có slide không thể kết xuất</span>
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

                      {/* Trạng thái trùng lặp bài giảng: 3 Cấp độ */}
                      {(() => {
                        const dupInfo = scanReport?.lessonDuplicateMap?.[lesson.id];
                        const simScore = dupInfo ? dupInfo.score : (lesson.similarity_score || 0);
                        const simStatus = dupInfo ? dupInfo.status : (lesson.similarity_status || 'unique');
                        const matchedTarget = dupInfo ? dupInfo.matchedLesson : (lessons.find(l => l.id === lesson.duplicate_of_id) || { title: 'Bài giảng trùng lặp' });

                        if (simStatus === 'exact_duplicate' || dupInfo?.tier === 'exact') {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateDetailModal({
                                  lesson,
                                  matchedLesson: matchedTarget,
                                  score: simScore || 100,
                                  tier: 'exact',
                                  tierBadge: '🔴 Cảnh báo',
                                  tierLabel: 'Trùng 100% (95-100%)',
                                  tierColor: '#ef4444'
                                });
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                fontSize: '0.725rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.55rem',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                              title="Nhấn để xem chi tiết đối chiếu & xử lý bài trùng"
                            >
                              <span>🔴</span>
                              <span>Trùng 100% ({simScore || 100}%)</span>
                            </button>
                          );
                        }

                        if (simStatus === 'high_duplicate' || simStatus === 'near_duplicate' || dupInfo?.tier === 'high') {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateDetailModal({
                                  lesson,
                                  matchedLesson: matchedTarget,
                                  score: simScore || 85,
                                  tier: 'high',
                                  tierBadge: '🟠 Cảnh báo',
                                  tierLabel: 'Trùng cao (80-95%)',
                                  tierColor: '#f97316'
                                });
                              }}
                              style={{
                                background: 'rgba(249, 115, 22, 0.15)',
                                color: '#ea580c',
                                border: '1px solid rgba(249, 115, 22, 0.4)',
                                fontSize: '0.725rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.55rem',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                              title="Nhấn để xem chi tiết đối chiếu & xử lý"
                            >
                              <span>🟠</span>
                              <span>Trùng cao ({simScore || 85}%)</span>
                            </button>
                          );
                        }

                        if (simStatus === 'near_similar' || dupInfo?.tier === 'reference') {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateDetailModal({
                                  lesson,
                                  matchedLesson: matchedTarget,
                                  score: simScore || 70,
                                  tier: 'reference',
                                  tierBadge: '🟡 Tham khảo',
                                  tierLabel: 'Gần giống (60-80%)',
                                  tierColor: '#eab308'
                                });
                              }}
                              style={{
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#b45309',
                                border: '1px solid rgba(234, 179, 8, 0.4)',
                                fontSize: '0.725rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.55rem',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer'
                              }}
                              title="Nhấn để xem chi tiết đối chiếu tham khảo"
                            >
                              <span>🟡</span>
                              <span>Gần giống ({simScore || 70}%)</span>
                            </button>
                          );
                        }

                        return (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <span>✓ Bài mới</span>
                          </span>
                        );
                      })()}
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

      {/* Modal Chi Tiết Đối Chiếu Trùng Lặp */}
      {duplicateDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 680,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Chi Tiết Đối Chiếu Trùng Lặp Bài Giảng
                </h3>
              </div>
              <button
                onClick={() => setDuplicateDetailModal(null)}
                className="btn btn-icon"
                style={{ width: 32, height: 32 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? '#ef4444' : '#d97706' }}>
                    {duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? 'Trùng lặp hoàn toàn (SHA-256)' : 'Nội dung gần giống'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {duplicateDetailModal.lesson.source_filename ? `Tệp gốc: ${duplicateDetailModal.lesson.source_filename}` : 'Đã phát hiện đối sánh trong cơ sở dữ liệu'}
                  </div>
                </div>
                <div style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? '#ef4444' : '#d97706'
                }}>
                  {duplicateDetailModal.lesson.similarity_score || (duplicateDetailModal.lesson.similarity_status === 'exact_duplicate' ? 100 : 85)}%
                </div>
              </div>

              {/* So sánh hai bên */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Bài giảng này */}
                <div style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                    Bài giảng này
                  </span>
                  {duplicateDetailModal.lesson.thumbnail_url ? (
                    <img
                      src={duplicateDetailModal.lesson.thumbnail_url}
                      alt="Thumbnail bài này"
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#090d16', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                      Slide 1
                    </div>
                  )}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--text-main)' }}>
                    {duplicateDetailModal.lesson.title}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Khối: {duplicateDetailModal.lesson.grade} • Số slide: {duplicateDetailModal.lesson.slide_count || 0}
                  </div>
                </div>

                {/* Bài đã tồn tại */}
                <div style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
                    Bài đã có trong thư viện
                  </span>
                  {duplicateDetailModal.matchedLesson?.thumbnail_url ? (
                    <img
                      src={duplicateDetailModal.matchedLesson.thumbnail_url}
                      alt="Thumbnail bài gốc"
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#090d16', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                      Slide 1
                    </div>
                  )}
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--text-main)' }}>
                    {duplicateDetailModal.matchedLesson?.title || 'Bài giảng gốc'}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Khối: {duplicateDetailModal.matchedLesson?.grade || duplicateDetailModal.lesson.grade} • Số slide: {duplicateDetailModal.matchedLesson?.slide_count || duplicateDetailModal.lesson.slide_count || 0}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              background: 'var(--surface-secondary)'
            }}>
              <button
                onClick={() => setDuplicateDetailModal(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Đóng
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  onClick={() => handleKeepLesson(duplicateDetailModal.lesson.id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    borderColor: '#10b981',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  title="Xác nhận bài học hợp lệ và giữ lại trong thư viện"
                >
                  <ShieldCheck size={16} />
                  <span>🛡️ Giữ lại bài</span>
                </button>

                <button
                  onClick={() => handleDeleteDuplicateLesson(duplicateDetailModal.lesson)}
                  className="btn btn-primary"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    background: '#ef4444',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                  }}
                  title="Xóa vĩnh viễn bài giảng trùng này khỏi thư viện"
                >
                  <Trash2 size={16} />
                  <span>🗑️ Xóa bài trùng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự Động Quét & Quản Lý Toàn Bộ Bài Giảng Trùng Lặp */}
      {isScanModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 960,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden'
          }}>
            {/* Header Modal Quét */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Search size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    🔍 Kết Quả Tự Động Quét Bài Giảng Trùng Lặp
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Phân loại: {DUPLICATE_TIERS.exact.title} ({DUPLICATE_TIERS.exact.badge}) • {DUPLICATE_TIERS.high.title} ({DUPLICATE_TIERS.high.badge}) • {DUPLICATE_TIERS.reference.title} ({DUPLICATE_TIERS.reference.badge})
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={runAutoScan}
                  disabled={isScanning}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Quét lại toàn bộ thư viện bài giảng"
                >
                  <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                  <span>Quét lại</span>
                </button>
                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="btn btn-icon"
                  style={{ width: 32, height: 32 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Nội dung Modal: Thống kê tổng quan, Phân bố theo lớp và Danh sách cặp trùng */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* 1. 4 Thẻ Card Thống Kê Tổng Quan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {/* Card 1: Tổng bài */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(37, 99, 235, 0.12) 100%)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    📚
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                      {scanReport?.totalLessons ?? lessons.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Tổng số bài giảng
                    </div>
                  </div>
                </div>

                {/* Card 2: Lớp có bài */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.12) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    🏫
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                      {scanReport?.totalClasses ?? 23}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Lớp có bài giảng
                    </div>
                  </div>
                </div>

                {/* Card 3: Nhóm trùng hoàn toàn */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.12) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    🔴
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', lineHeight: 1.1 }}>
                      {scanReport?.exactCount ?? 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Bị trùng (100%)
                    </div>
                  </div>
                </div>

                {/* Card 4: Cần xem xét / Đề xuất xóa */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(234, 179, 8, 0.12) 100%)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #f97316, #eab308)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    🗑
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f97316', lineHeight: 1.1 }}>
                      {(scanReport?.suggestedDeleteCount && scanReport.suggestedDeleteCount > 0)
                        ? scanReport.suggestedDeleteCount
                        : ((scanReport?.highCount || 0) + (scanReport?.referenceCount || 0))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
                      Đề xuất xem xét xóa
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Phần Thống Kê Số Bài Giảng Theo Lớp / Khối */}
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span>📊</span>
                      <span>Số Bài Giảng Theo Lớp</span>
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                      Bấm vào từng lớp hoặc hàng bảng để lọc và xem tình trạng bài giảng tương ứng.
                    </p>
                  </div>
                  {scanModalClassFilter !== 'all' && (
                    <button
                      onClick={() => setScanModalClassFilter('all')}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      ✕ Xem tất cả lớp
                    </button>
                  )}
                </div>

                {/* Thanh tiến trình / Bar chart đơn giản CSS Native */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {scanReport?.byGrade?.map(g => {
                    const isSelected = scanModalClassFilter === String(g.gradeKey);
                    return (
                      <div
                        key={g.gradeKey}
                        onClick={() => setScanModalClassFilter(isSelected ? 'all' : String(g.gradeKey))}
                        style={{
                          cursor: 'pointer',
                          padding: '0.55rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-card)',
                          border: isSelected ? '1px solid #0284c7' : '1px solid var(--surface-border)',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Bấm để lọc bài giảng ${g.label}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? '#0284c7' : 'var(--text-main)' }}>
                              {g.label}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({g.subLabel})
                            </span>
                            {g.exactCount > 0 && (
                              <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                🔴 {g.exactCount} trùng 100%
                              </span>
                            )}
                            {g.needReviewCount > 0 && (
                              <span style={{ fontSize: '0.7rem', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                🟠 {g.needReviewCount} cần xem
                              </span>
                            )}
                            {g.exactCount === 0 && g.needReviewCount === 0 && (
                              <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                ✓
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {g.total} bài <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({g.percentOfTotal}%)</span>
                          </div>
                        </div>

                        {/* Thanh Bar Chart CSS Native */}
                        <div style={{
                          width: '100%',
                          height: 8,
                          borderRadius: 4,
                          background: 'var(--surface-secondary)',
                          overflow: 'hidden',
                          display: 'flex'
                        }}>
                          {/* Phần độc nhất (Xanh lá) */}
                          <div style={{
                            width: `${g.total > 0 ? (g.uniqueCount / g.total) * 100 : 0}%`,
                            background: '#10b981',
                            height: '100%',
                            transition: 'width 0.3s ease'
                          }} title={`Bình thường: ${g.uniqueCount} bài`} />
                          {/* Phần cần xem xét (Cam/Vàng) */}
                          <div style={{
                            width: `${g.total > 0 ? (g.needReviewCount / g.total) * 100 : 0}%`,
                            background: '#f97316',
                            height: '100%',
                            transition: 'width 0.3s ease'
                          }} title={`Cần xem xét: ${g.needReviewCount} bài`} />
                          {/* Phần trùng hoàn toàn (Đỏ) */}
                          <div style={{
                            width: `${g.total > 0 ? (g.exactCount / g.total) * 100 : 0}%`,
                            background: '#ef4444',
                            height: '100%',
                            transition: 'width 0.3s ease'
                          }} title={`Trùng 100%: ${g.exactCount} bài`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bảng Dữ Liệu Thống Kê Chi Tiết */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.825rem',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Lớp / Khối</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Tổng số bài</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>🔴 Bị trùng</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>🟠 Cần xem xét</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>🟢 Bình thường</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanReport?.byGrade?.map(g => {
                        const isSelected = scanModalClassFilter === String(g.gradeKey);
                        return (
                          <tr
                            key={g.gradeKey}
                            onClick={() => setScanModalClassFilter(isSelected ? 'all' : String(g.gradeKey))}
                            style={{
                              borderBottom: '1px solid var(--surface-border)',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                              fontWeight: isSelected ? 700 : 'normal',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: isSelected ? '#0284c7' : 'var(--text-main)' }}>
                                {g.label}
                              </span>
                              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>({g.subLabel})</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                              {g.total} bài
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: g.exactCount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: g.exactCount > 0 ? 800 : 500 }}>
                              {g.exactCount}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: g.needReviewCount > 0 ? '#f97316' : 'var(--text-muted)', fontWeight: g.needReviewCount > 0 ? 800 : 500 }}>
                              {g.needReviewCount}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                              {g.uniqueCount}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {g.percentOfTotal}%
                            </td>
                          </tr>
                        );
                      })}
                      {/* Hàng TỔNG cộng */}
                      <tr style={{
                        borderTop: '2px solid var(--surface-border)',
                        background: 'var(--surface-card)',
                        fontWeight: 900
                      }}>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-main)' }}>
                          TỔNG CỘNG
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#0284c7' }}>
                          {scanReport?.totalLessons ?? lessons.length} bài
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#ef4444' }}>
                          {scanReport?.exactCount ?? 0}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#f97316' }}>
                          {(scanReport?.highCount || 0) + (scanReport?.referenceCount || 0)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                          {scanReport?.byGrade ? scanReport.byGrade.reduce((s, g) => s + g.uniqueCount, 0) : 0}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-main)' }}>
                          100%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Thanh Bộ Lọc Kép: Lọc Theo Lớp & Lọc Theo Mức Độ Trùng Lặp */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem 1rem'
              }}>
                {/* Dòng 1: Lọc theo lớp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                    Lọc lớp:
                  </span>
                  <button
                    onClick={() => setScanModalClassFilter('all')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: scanModalClassFilter === 'all' ? '1px solid #0284c7' : '1px solid var(--surface-border)',
                      background: scanModalClassFilter === 'all' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                      color: scanModalClassFilter === 'all' ? '#0284c7' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Tất cả lớp ({scanReport?.totalLessons ?? lessons.length})
                  </button>
                  {scanReport?.byGrade?.map(g => {
                    const isActive = scanModalClassFilter === String(g.gradeKey);
                    return (
                      <button
                        key={g.gradeKey}
                        onClick={() => setScanModalClassFilter(String(g.gradeKey))}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: isActive ? '1px solid #0284c7' : '1px solid var(--surface-border)',
                          background: isActive ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                          color: isActive ? '#0284c7' : 'var(--text-muted)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {g.label} ({g.total})
                      </button>
                    );
                  })}
                </div>

                {/* Dòng 2: Lọc theo mức độ trùng lặp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                    Mức độ:
                  </span>
                  {[
                    { id: 'all', label: 'Tất cả các cặp', count: scanReport?.totalDuplicates || 0 },
                    { id: 'exact', label: '🔴 Trùng 100% (95-100%)', color: '#ef4444', count: scanReport?.exactCount || 0 },
                    { id: 'high', label: '🟠 Trùng cao (80-95%)', color: '#f97316', count: scanReport?.highCount || 0 },
                    { id: 'reference', label: '🟡 Gần giống (60-80%)', color: '#eab308', count: scanReport?.referenceCount || 0 }
                  ].map(tab => {
                    const isActive = scanModalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setScanModalTab(tab.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: isActive ? `1px solid ${tab.color || '#0284c7'}` : '1px solid var(--surface-border)',
                          background: isActive ? (tab.color ? `${tab.color}20` : 'rgba(2, 132, 199, 0.15)') : 'transparent',
                          color: isActive ? (tab.color || '#0284c7') : 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{tab.label}</span>
                        <span style={{
                          background: isActive ? (tab.color || '#0284c7') : 'var(--surface-secondary)',
                          color: isActive ? '#fff' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          padding: '0.05rem 0.4rem',
                          borderRadius: '999px',
                          fontWeight: 900
                        }}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Banner Tiêu Điểm Khi Chọn Một Lớp */}
              {(() => {
                if (scanModalClassFilter === 'all') return null;
                const selectedGradeObj = scanReport?.byGrade?.find(g => String(g.gradeKey) === scanModalClassFilter);
                if (!selectedGradeObj) return null;
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(37, 99, 235, 0.08) 100%)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0284c7', marginBottom: '0.2rem' }}>
                        📚 BÀI GIẢNG {selectedGradeObj.label.toUpperCase()} ({selectedGradeObj.subLabel})
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>Tổng: <strong>{selectedGradeObj.total} bài</strong></span>
                        <span>•</span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>🔴 Trùng 95-100%: {selectedGradeObj.exactCount}</span>
                        <span>•</span>
                        <span style={{ color: '#f97316', fontWeight: 700 }}>🟠 Có khả năng trùng: {selectedGradeObj.highCount}</span>
                        <span>•</span>
                        <span style={{ color: '#eab308', fontWeight: 700 }}>🟡 Tương đồng: {selectedGradeObj.referenceCount}</span>
                        <span>•</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Bình thường: {selectedGradeObj.uniqueCount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setScanModalClassFilter('all')}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      ✕ Bỏ lọc lớp
                    </button>
                  </div>
                );
              })()}

              {/* 5. Danh Sách Các Cặp Bài Trùng Lặp (Được lọc theo lớp & mức độ) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🔍 Danh Sách Cặp Bài Trùng Lặp</span>
                  {scanModalClassFilter !== 'all' && (
                    <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                      Đang lọc theo: {scanReport?.byGrade?.find(g => String(g.gradeKey) === scanModalClassFilter)?.label}
                    </span>
                  )}
                </h4>

                {(() => {
                  if (!scanReport || !scanReport.pairs || scanReport.pairs.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Tuyệt vời! Không phát hiện bài giảng nào bị trùng lặp.
                        </h4>
                        <p style={{ fontSize: '0.875rem', margin: 0 }}>
                          Tất cả các bài học trong thư viện của bạn đều là nội dung độc nhất.
                        </p>
                      </div>
                    );
                  }

                  const filteredPairs = scanReport.pairs.filter(p => {
                    // Lọc theo tab mức độ
                    if (scanModalTab !== 'all' && p.tier !== scanModalTab) return false;
                    // Lọc theo lớp
                    if (scanModalClassFilter !== 'all') {
                      if (scanModalClassFilter === 'unassigned') {
                        const isAUn = !p.lessonA.grade || isNaN(p.lessonA.grade) || p.lessonA.grade < 1 || p.lessonA.grade > 5;
                        const isBUn = !p.lessonB.grade || isNaN(p.lessonB.grade) || p.lessonB.grade < 1 || p.lessonB.grade > 5;
                        return isAUn || isBUn;
                      }
                      const gNum = Number(scanModalClassFilter);
                      return Number(p.lessonA.grade) === gNum || Number(p.lessonB.grade) === gNum;
                    }
                    return true;
                  });

                  if (filteredPairs.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>
                          Không có cặp bài giảng nào trong nhóm hoặc lớp này.
                        </p>
                      </div>
                    );
                  }

                  return filteredPairs.map((pair) => {
                    const isExact = pair.tier === 'exact';
                    const isHigh = pair.tier === 'high';
                    const borderColor = isExact ? 'rgba(239, 68, 68, 0.4)' : (isHigh ? 'rgba(249, 115, 22, 0.4)' : 'rgba(234, 179, 8, 0.4)');
                    const badgeBg = isExact ? 'rgba(239, 68, 68, 0.12)' : (isHigh ? 'rgba(249, 115, 22, 0.12)' : 'rgba(234, 179, 8, 0.12)');


                  return (
                    <div
                      key={pair.id}
                      style={{
                        background: 'var(--surface-secondary)',
                        border: `1px solid ${borderColor}`,
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Tiêu đề thanh thẻ cặp */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            background: badgeBg,
                            color: pair.tierColor,
                            border: `1px solid ${pair.tierColor}60`,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.65rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <span>{pair.tierBadge}</span>
                            <span>•</span>
                            <span>{pair.score}%</span>
                          </span>
                          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                            {pair.isExactHash ? 'Mã băm SHA-256 trùng khớp hoàn toàn' : 'Trùng lặp cấu trúc và nội dung slide'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setDuplicateDetailModal({
                                lesson: pair.lessonB,
                                matchedLesson: pair.lessonA,
                                score: pair.score,
                                tier: pair.tier,
                                tierBadge: pair.tierBadge,
                                tierLabel: pair.tierLabel,
                                tierColor: pair.tierColor
                              });
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            👁️ Xem đối chiếu
                          </button>
                          <button
                            onClick={() => {
                              handleKeepLesson(pair.lessonA.id);
                              handleKeepLesson(pair.lessonB.id);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, borderColor: '#10b981', color: '#10b981' }}
                            title="Xác nhận giữ lại cả hai bài giảng"
                          >
                            🛡️ Giữ lại cả 2 bài
                          </button>
                        </div>
                      </div>

                      {/* Hai bài học song song */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Bài 1 */}
                        <div style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.6rem'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                                Bài giảng 1
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Khối {pair.lessonA.grade} • {pair.lessonA.slide_count || 0} slide
                              </span>
                            </div>
                            <h5 style={{ fontSize: '0.925rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
                              {pair.lessonA.title}
                            </h5>
                            {pair.lessonA.source_filename && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                File: {pair.lessonA.source_filename}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-border)' }}>
                            <button
                              onClick={() => handleDeleteDuplicateLesson(pair.lessonA)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}
                            >
                              <Trash2 size={13} style={{ marginRight: 4 }} />
                              <span>Xóa bài 1</span>
                            </button>
                          </div>
                        </div>

                        {/* Bài 2 */}
                        <div style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.6rem'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
                                Bài giảng 2 (Bản đối sánh)
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Khối {pair.lessonB.grade} • {pair.lessonB.slide_count || 0} slide
                              </span>
                            </div>
                            <h5 style={{ fontSize: '0.925rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
                              {pair.lessonB.title}
                            </h5>
                            {pair.lessonB.source_filename && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                File: {pair.lessonB.source_filename}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-border)' }}>
                            <button
                              onClick={() => handleDeleteDuplicateLesson(pair.lessonB)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}
                            >
                              <Trash2 size={13} style={{ marginRight: 4 }} />
                              <span>Xóa bài 2</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
                </div>
              </div>

              {/* Footer Modal Quét */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-secondary)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tổng số bài học đã quét: <strong>{scanReport?.scannedCount || lessons.length}</strong> bài
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.4rem', fontSize: '0.875rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
