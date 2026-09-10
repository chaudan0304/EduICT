import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Eye, 
  FolderOpen,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Sliders
} from 'lucide-react';
import { 
  fastImportPptxApi, 
  fetchLessonRenderStatusApi, 
  updateLessonApi, 
  deleteLessonApi,
  INFORMATICS_TOPICS,
  compareLessonTitles,
  detectGradeFromFileName
} from './lessonStorage';

export default function ImportPptxModal({
  isOpen,
  onClose,
  onImportSuccess,
  defaultGrade = 3
}) {
  // Danh sách các file trong hàng đợi import
  // Mỗi item: { id, file, status: 'pending'|'processing'|'ready'|'error', lesson, slideCount, renderStatus, lessonTitle, grade, topic, durationMinutes, description, errorMsg, isCached }
  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [zoomedSlideIndex, setZoomedSlideIndex] = useState(null);
  const [applyAllToast, setApplyAllToast] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const fileInputRef = useRef(null);

  // Tự động nhận diện Khối lớp và Tên bài từ tên file
  const detectGradeAndTitle = useCallback((fileName) => {
    const detectedGrade = detectGradeFromFileName(fileName, defaultGrade);

    let suggestedTitle = fileName.replace(/\.pptx$/i, '')
      .replace(/^KHBD[_-]/i, '')
      .replace(/^[A-Z0-9]+[_-]/i, '')
      .trim();

    if (!suggestedTitle) suggestedTitle = fileName.replace(/\.pptx$/i, '');

    return { detectedGrade, suggestedTitle };
  }, [defaultGrade]);

  // Xử lý import nhanh một file (Phase A < 30ms)
  const processFile = useCallback(async (item) => {
    try {
      const data = await fastImportPptxApi(item.file, {
        title: item.lessonTitle,
        grade: item.grade,
        topic: item.topic,
        durationMinutes: item.durationMinutes,
        description: item.description
      });

      const lesson = data.lesson;
      if (onImportSuccess) {
        onImportSuccess(lesson);
      }

      setQueue(prev => prev.map(q => {
        if (q.id === item.id) {
          return {
            ...q,
            status: 'ready',
            lesson,
            lessonTitle: lesson.title || q.lessonTitle,
            slideCount: lesson.slide_count || (lesson.slides ? lesson.slides.length : 0),
            renderStatus: lesson.render_status || 'ready',
            isCached: !!data.isCached,
            description: `Bài giảng PowerPoint gồm ${lesson.slide_count || 14} slides được import từ tệp "${item.file.name}".`
          };
        }
        return q;
      }));
    } catch (err) {
      console.error('Lỗi import nhanh PowerPoint:', item.file.name, err);
      setQueue(prev => prev.map(q => {
        if (q.id === item.id) {
          return {
            ...q,
            status: 'error',
            errorMsg: err.message || 'Không thể import file PowerPoint.'
          };
        }
        return q;
      }));
    }
  }, [onImportSuccess]);

  // Xử lý khi người dùng chọn một hoặc nhiều file
  const handleAddFiles = useCallback((files) => {
    if (!files || files.length === 0) return;

    const newItems = [];
    const rejectedFiles = [];

    Array.from(files).forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pptx')) {
        rejectedFiles.push(file.name);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        rejectedFiles.push(`${file.name} (>100MB)`);
        return;
      }

      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const { detectedGrade, suggestedTitle } = detectGradeAndTitle(file.name);

      newItems.push({
        id,
        file,
        status: 'processing',
        lesson: null,
        slideCount: 0,
        renderStatus: 'pending',
        lessonTitle: suggestedTitle,
        grade: detectedGrade,
        topic: 'Máy tính & Em',
        durationMinutes: 35,
        description: `Bài giảng PowerPoint được import từ tệp "${file.name}".`,
        errorMsg: null,
        isCached: false
      });
    });

    if (rejectedFiles.length > 0) {
      setGlobalError(`Bỏ qua ${rejectedFiles.length} file không hợp lệ hoặc quá 100MB: ${rejectedFiles.join(', ')}`);
    } else {
      setGlobalError(null);
    }

    if (newItems.length > 0) {
      // Sắp xếp các file theo đúng thứ tự tên bài học (Bài 1 -> Bài 10)
      newItems.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return compareLessonTitles(a.lessonTitle, b.lessonTitle);
      });

      setQueue((prev) => {
        const updated = [...prev, ...newItems];
        updated.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          return compareLessonTitles(a.lessonTitle, b.lessonTitle);
        });
        if (!activeId && updated.length > 0) {
          setActiveId(updated[0].id);
        }
        return updated;
      });

      // Bắt đầu import nhanh theo đúng thứ tự bài học
      newItems.forEach(item => {
        processFile(item);
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [activeId, detectGradeAndTitle, processFile]);

  // Polling tự động cập nhật trạng thái render nền cho các item đang 'processing'
  useEffect(() => {
    const processingItems = queue.filter(item => item.status === 'ready' && item.renderStatus === 'processing' && item.lesson?.id);
    if (processingItems.length === 0) return;

    const interval = setInterval(async () => {
      for (const item of processingItems) {
        try {
          const statusData = await fetchLessonRenderStatusApi(item.lesson.id);
          if (statusData && statusData.render_status !== 'processing') {
            setQueue(prev => prev.map(q => {
              if (q.id === item.id) {
                return {
                  ...q,
                  renderStatus: statusData.render_status,
                  slideCount: statusData.slide_count,
                  lesson: {
                    ...q.lesson,
                    render_status: statusData.render_status,
                    thumbnail_url: statusData.thumbnail_url,
                    slide_count: statusData.slide_count,
                    slides: statusData.slides
                  }
                };
              }
              return q;
            }));
          }
        } catch (err) {
          console.warn('Lỗi polling status trong modal:', err);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queue]);

  // Xóa một file khỏi danh sách và xóa khỏi database
  const handleRemoveItem = async (id, e) => {
    e?.stopPropagation();
    const itemToRemove = queue.find(q => q.id === id);
    if (itemToRemove?.lesson?.id) {
      try {
        await deleteLessonApi(itemToRemove.lesson.id);
      } catch (err) {
        console.warn('Lỗi xóa bài khỏi DB:', err.message);
      }
    }

    setQueue(prev => {
      const next = prev.filter(q => q.id !== id);
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  // Áp dụng Khối lớp và Chủ đề của bài hiện tại cho TẤT CẢ các bài trong queue
  const handleApplyToAll = async () => {
    const activeItem = queue.find(q => q.id === activeId);
    if (!activeItem) return;

    setQueue(prev => prev.map(item => ({
      ...item,
      grade: activeItem.grade,
      topic: activeItem.topic,
      durationMinutes: activeItem.durationMinutes
    })));

    for (const item of queue) {
      if (item.lesson?.id) {
        try {
          const updated = await updateLessonApi(item.lesson.id, {
            grade: activeItem.grade,
            topic: activeItem.topic,
            duration_minutes: activeItem.durationMinutes
          });
          if (updated) onImportSuccess(updated);
        } catch (e) {
          console.warn('Lỗi đồng bộ bài học:', e.message);
        }
      }
    }

    setApplyAllToast(true);
    setTimeout(() => setApplyAllToast(false), 2500);
  };

  // Cập nhật thông tin bài active
  const updateActiveItem = (field, value) => {
    setQueue(prev => prev.map(item => 
      item.id === activeId ? { ...item, [field]: value } : item
    ));
  };

  // Lưu các thay đổi về tiêu đề, khối lớp, chủ đề vào database
  const handleSaveItemChanges = async (item) => {
    if (!item || !item.lesson?.id) return;
    if (!item.lessonTitle.trim()) {
      alert('Vui lòng nhập tên bài học!');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateLessonApi(item.lesson.id, {
        title: item.lessonTitle.trim(),
        grade: Number(item.grade),
        topic: item.topic,
        duration_minutes: Number(item.durationMinutes) || 35,
        objectives: (item.description || '').trim()
      });

      if (updated) {
        onImportSuccess(updated);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2000);
      }
    } catch (err) {
      alert(`❌ Lỗi cập nhật bài giảng: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Đóng modal
  const handleClose = () => {
    setQueue([]);
    setActiveId(null);
    setGlobalError(null);
    setZoomedSlideIndex(null);
    onClose();
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  if (!isOpen) return null;

  const activeItem = queue.find(q => q.id === activeId) || queue[0];
  const readyCount = queue.filter(q => q.status === 'ready').length;
  const processingCount = queue.filter(q => q.status === 'processing' || q.status === 'pending').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-2xl)',
        width: '100%',
        maxWidth: queue.length > 0 ? '1280px' : '640px',
        height: queue.length > 0 ? '90vh' : 'auto',
        maxHeight: '94vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease, height 0.3s ease'
      }}>
        {/* 1. Header Modal */}
        <div style={{
          padding: '1.15rem 1.75rem',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  📥 Import Bài Giảng PowerPoint
                </h2>
                {queue.length > 0 && (
                  <span style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}>
                    {readyCount} / {queue.length} file đã sẵn sàng
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Hỗ trợ chọn nhiều file .pptx cùng lúc • Giữ 100% nguyên gốc bố cục, font và hình ảnh
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                disabled={isSaving}
              >
                <Plus size={16} />
                <span>Thêm file khác</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="btn btn-icon"
              style={{ width: 36, height: 36, borderRadius: '50%' }}
              disabled={isSaving}
              title="Đóng hộp thoại"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Thông báo lỗi chung nếu có */}
        {globalError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#ef4444',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Thông báo sao chép cấu hình */}
        {applyAllToast && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.5rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#10b981',
            fontWeight: 700,
            flexShrink: 0
          }}>
            <Check size={16} />
            <span>Đã đồng bộ Khối lớp và Chủ đề cho toàn bộ các bài trong danh sách!</span>
          </div>
        )}

        {/* Thông báo lưu thay đổi thành công */}
        {saveToast && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.5rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#10b981',
            fontWeight: 700,
            flexShrink: 0
          }}>
            <Check size={16} />
            <span>Đã lưu thành công các thay đổi bài học vào Thư viện!</span>
          </div>
        )}

        {/* 2. Thân Modal */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* TRƯỜNG HỢP 1: CHƯA CÓ FILE NÀO TRONG HÀNG ĐỢI (MÀN HÌNH CHỌN FILE BAN ĐẦU) */}
          {queue.length === 0 ? (
            <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? '#a855f7' : 'var(--surface-border)'}`,
                  backgroundColor: dragActive ? 'rgba(168, 85, 247, 0.08)' : 'var(--surface-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.25rem'
                }}
              >
                <div style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={40} />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Kéo thả một hoặc nhiều file .pptx vào đây
                  </h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', margin: 0 }}>
                    hoặc bấm vào khung để duyệt file từ máy tính (hỗ trợ chọn nhiều file cùng lúc)
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1.8rem',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FolderOpen size={19} />
                  <span>Chọn file PowerPoint (.pptx)</span>
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.825rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem'
                }}>
                  <span style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontWeight: 700
                  }}>
                    Định dạng: .pptx
                  </span>
                  <span>•</span>
                  <span>Tối đa 100MB mỗi file</span>
                  <span>•</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>Hỗ trợ import hàng loạt</span>
                </div>
              </div>

              {/* Hướng dẫn ngắn */}
              <div style={{
                marginTop: '1.5rem',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.15rem 1.4rem',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} color="#a855f7" />
                  <span>Điểm nổi bật khi import bài giảng vào EduICT:</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  <li>Thầy/cô có thể chọn nhiều file bài giảng cùng một lúc để hệ thống xử lý tự động.</li>
                  <li>Từng slide được trích xuất nguyên bản 100% hình ảnh, đồ họa, phông chữ và bảng biểu.</li>
                  <li>Trình chiếu mượt mà chuẩn 16:9 trực tiếp trong tiết học phòng máy.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: ĐÃ CÓ FILE TRONG HÀNG ĐỢI (GIAO DIỆN QUẢN LÝ BATCH + XEM TRƯỚC) */
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* CỘT TRÁI: DANH SÁCH FILE TRONG QUEUE (340px) */}
              <div style={{
                width: 350,
                borderRight: '1px solid var(--surface-border)',
                background: 'var(--surface-secondary)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}>
                <div style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--surface-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Danh sách bài giảng ({queue.length})
                  </div>
                  {processingCount > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Loader2 size={12} className="animate-spin" />
                      Đang xử lý {processingCount} bài...
                    </span>
                  )}
                </div>

                {/* Danh sách cuộn các bài */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {queue.map((item, idx) => {
                      const isActive = item.id === (activeItem?.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveId(item.id)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: 'var(--radius-lg)',
                            background: isActive ? 'var(--surface-card)' : 'transparent',
                            border: `1px solid ${isActive ? '#a855f7' : 'var(--surface-border)'}`,
                            boxShadow: isActive ? '0 4px 12px rgba(168, 85, 247, 0.15)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                              <span style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: isActive ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </span>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  color: isActive ? '#a855f7' : 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }} title={item.lessonTitle || item.file.name}>
                                  {item.lessonTitle || item.file.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {formatFileSize(item.file.size)}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleRemoveItem(item.id, e)}
                              className="btn btn-icon"
                              style={{ width: 26, height: 26, color: '#ef4444', flexShrink: 0 }}
                              title="Xóa khỏi danh sách"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Trạng thái xử lý */}
                          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {item.status === 'processing' && (
                              <span style={{ fontSize: '0.75rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Đang lưu vào thư viện...</span>
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ⏳ Đang chờ...
                              </span>
                            )}
                            {item.status === 'ready' && (
                              item.renderStatus === 'processing' ? (
                                <span style={{
                                  fontSize: '0.725rem',
                                  color: '#eab308',
                                  background: 'rgba(234, 179, 8, 0.12)',
                                  padding: '0.1rem 0.5rem',
                                  borderRadius: '999px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <Loader2 size={10} className="animate-spin" />
                                  <span>Chuẩn bị slide ({item.slideCount})</span>
                                </span>
                              ) : item.renderStatus === 'failed' ? (
                                <span style={{
                                  fontSize: '0.725rem',
                                  color: '#ef4444',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  padding: '0.1rem 0.5rem',
                                  borderRadius: '999px',
                                  fontWeight: 700
                                }}>
                                  ⚠️ Lỗi xử lý
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.725rem',
                                  color: '#10b981',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '0.1rem 0.5rem',
                                  borderRadius: '999px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <CheckCircle size={11} />
                                  <span>{item.slideCount} slides</span>
                                </span>
                              )
                            )}
                            {item.status === 'error' && (
                              <span style={{
                                fontSize: '0.725rem',
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '999px',
                                fontWeight: 700
                              }} title={item.errorMsg}>
                                ❌ Lỗi xử lý
                              </span>
                            )}

                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Khối {item.grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chân cột trái: Thao tác hàng loạt */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderTop: '1px solid var(--surface-border)',
                  background: 'var(--surface-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  {queue.length > 1 && (
                    <button
                      type="button"
                      onClick={handleApplyToAll}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        padding: '0.45rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                      title="Áp dụng Khối lớp và Chủ đề của bài đang chọn cho tất cả các bài còn lại"
                    >
                      <Sliders size={14} />
                      <span>Áp dụng Khối & Chủ đề cho tất cả</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <CheckCircle size={16} />
                    <span>Hoàn tất & Đóng ({queue.length} bài)</span>
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: CHI TIẾT BÀI ĐANG CHỌN & LƯỚI PREVIEW SLIDES */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeItem ? (
                  <>
                    {/* Header thông tin file */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius-md)',
                          background: '#a855f7',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem'
                        }}>
                          PPT
                        </div>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {activeItem.file.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                            <span>Dung lượng: <strong>{formatFileSize(activeItem.file.size)}</strong></span>
                            <span>•</span>
                            {activeItem.status === 'ready' && (
                              activeItem.renderStatus === 'processing' ? (
                                <span style={{ color: '#eab308', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>Đã thêm vào thư viện • Đang chuẩn bị {activeItem.slideCount} slides</span>
                                </span>
                              ) : activeItem.renderStatus === 'failed' ? (
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                  ⚠️ Lỗi kết xuất ảnh slide
                                </span>
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  ✓ Đã thêm vào thư viện • Sẵn sàng {activeItem.slideCount} slides {activeItem.isCached && '(Từ Cache)'}
                                </span>
                              )
                            )}
                            {activeItem.status === 'processing' && (
                              <span style={{ color: '#a855f7', fontWeight: 700 }}>
                                ⏳ Đang lưu vào thư viện...
                              </span>
                            )}
                            {activeItem.status === 'error' && (
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                ❌ {activeItem.errorMsg || 'Xử lý thất bại'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {activeItem.status === 'ready' && (
                        <button
                          type="button"
                          onClick={() => handleSaveItemChanges(activeItem)}
                          disabled={isSaving}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.55rem 1.15rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Check size={15} color="#10b981" />
                          <span>Lưu thay đổi bài này</span>
                        </button>
                      )}
                    </div>

                    {/* Form Metadata bài giảng */}
                    <div style={{
                      background: 'var(--surface-secondary)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.25rem 1.4rem',
                      border: '1px solid var(--surface-border)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '1rem'
                    }}>
                      {/* Tên bài học */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Tên bài học <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={activeItem.lessonTitle}
                          onChange={(e) => updateActiveItem('lessonTitle', e.target.value)}
                          placeholder="Ví dụ: Bài 1: Làm quen với máy tính"
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--surface-border)',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Khối lớp */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Khối lớp <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={activeItem.grade}
                          onChange={(e) => updateActiveItem('grade', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--surface-border)',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            boxSizing: 'border-box'
                          }}
                        >
                          {[1, 2, 3, 4, 5].map(g => (
                            <option key={g} value={g}>Khối {g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Chủ đề */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Chủ đề môn Tin học
                        </label>
                        <select
                          value={activeItem.topic}
                          onChange={(e) => updateActiveItem('topic', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--surface-border)',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            boxSizing: 'border-box'
                          }}
                        >
                          {INFORMATICS_TOPICS.filter(t => t.id !== 'all').map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Thời lượng */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Thời lượng (phút)
                        </label>
                        <input
                          type="number"
                          min="15"
                          max="90"
                          value={activeItem.durationMinutes}
                          onChange={(e) => updateActiveItem('durationMinutes', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--surface-border)',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Mô tả / Mục tiêu */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          Mục tiêu / Ghi chú bài giảng
                        </label>
                        <textarea
                          rows={2}
                          value={activeItem.description}
                          onChange={(e) => updateActiveItem('description', e.target.value)}
                          placeholder="Nhập mục tiêu trọng tâm cần đạt của bài học..."
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--surface-border)',
                            background: 'var(--surface-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            boxSizing: 'border-box',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    </div>

                    {/* Lưới xem trước slide */}
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={18} color="#a855f7" />
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            Xem trước slide ({activeItem.slideCount || activeItem.lesson?.slides?.length || 0} slides)
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Bấm vào ảnh slide để phóng to kiểm tra
                        </span>
                      </div>

                      {activeItem.status === 'processing' ? (
                        <div style={{
                          padding: '3rem',
                          textAlign: 'center',
                          background: 'var(--surface-secondary)',
                          borderRadius: 'var(--radius-xl)',
                          border: '1px solid var(--surface-border)'
                        }}>
                          <Loader2 size={36} className="animate-spin" color="#a855f7" style={{ margin: '0 auto 1rem' }} />
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            Đang lưu bài giảng vào thư viện...
                          </div>
                        </div>
                      ) : activeItem.renderStatus === 'processing' ? (
                        <div style={{
                          padding: '3rem 2rem',
                          textAlign: 'center',
                          background: 'var(--surface-secondary)',
                          borderRadius: 'var(--radius-xl)',
                          border: '1px solid rgba(234, 179, 8, 0.3)'
                        }}>
                          <Loader2 size={36} className="animate-spin" color="#eab308" style={{ margin: '0 auto 1rem' }} />
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                            ● Đang chuẩn bị các slide trình chiếu trong nền... ({activeItem.slideCount || 14} slides)
                          </div>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem auto 0', maxWidth: 500, lineHeight: 1.5 }}>
                            Bài học đã được thêm thành công vào Thư viện. Hệ thống đang kết xuất slide chất lượng cao ở chế độ ngầm. Thầy/cô có thể đóng hộp thoại này ngay bây giờ mà không cần chờ đợi!
                          </p>
                        </div>
                      ) : activeItem.status === 'error' || activeItem.renderStatus === 'failed' ? (
                        <div style={{
                          padding: '2.5rem',
                          textAlign: 'center',
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderRadius: 'var(--radius-xl)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#ef4444'
                        }}>
                          <AlertCircle size={36} style={{ margin: '0 auto 0.75rem' }} />
                          <div style={{ fontWeight: 800 }}>Không thể kết xuất slide bài giảng này</div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                            {activeItem.errorMsg || 'Vui lòng kiểm tra lại file PowerPoint của bạn.'}
                          </p>
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: '0.85rem',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          padding: '0.75rem',
                          background: 'var(--surface-secondary)',
                          borderRadius: 'var(--radius-xl)',
                          border: '1px solid var(--surface-border)'
                        }}>
                          {(activeItem.lesson?.slides || activeItem.previewData?.slides || []).map((slide, idx) => (
                            <div
                              key={idx}
                              onClick={() => setZoomedSlideIndex(idx)}
                              style={{
                                background: '#090d16',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                border: '1px solid var(--surface-border)',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                aspectRatio: '16/9'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <img
                                src={slide.imageUrl || slide.image_url}
                                alt={`Slide ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  display: 'block'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: 4,
                                left: 4,
                                background: 'rgba(0, 0, 0, 0.75)',
                                color: '#fff',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '999px',
                                backdropFilter: 'blur(4px)'
                              }}>
                                {idx + 1}
                              </div>
                              <div style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: 'rgba(0, 0, 0, 0.6)',
                                color: '#fff',
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Eye size={12} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Chọn một bài từ danh sách bên trái để xem trước và cấu hình
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer Modal khi đã có file */}
        {queue.length > 0 && (
          <div style={{
            padding: '0.85rem 1.75rem',
            borderTop: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-secondary)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Đã thêm: <strong style={{ color: 'var(--text-main)' }}>{readyCount}</strong> / {queue.length} bài
              </span>
              {processingCount > 0 && (
                <span style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <Loader2 size={14} className="animate-spin" />
                  Đang chuẩn bị slide trong nền...
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '0.55rem 1.35rem',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
                }}
                onClick={handleClose}
              >
                <Check size={18} />
                <span>Hoàn tất & Xem trong Thư Viện</span>
              </button>
            </div>
          </div>
        )}

        {/* Input file ẩn (Hỗ trợ multiple) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleAddFiles(e.target.files);
            }
          }}
        />

        {/* MODAL PHÓNG TO SLIDE ĐỂ KIỂM TRA ĐỘ SẮC NÉT */}
        {zoomedSlideIndex !== null && (activeItem?.lesson?.slides?.[zoomedSlideIndex] || activeItem?.previewData?.slides?.[zoomedSlideIndex]) && (
          <div 
            onClick={() => setZoomedSlideIndex(null)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(12px)',
              zIndex: 1200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '92vw',
                maxHeight: '85vh',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{
                position: 'absolute',
                top: -45,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: '#fff'
              }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                  Slide {zoomedSlideIndex + 1}
                </span>
                <button
                  onClick={() => setZoomedSlideIndex(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: '#fff',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <img 
                src={(activeItem.lesson?.slides?.[zoomedSlideIndex]?.image_url || activeItem.previewData?.slides?.[zoomedSlideIndex]?.imageUrl)} 
                alt={`Slide ${zoomedSlideIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '82vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                  background: '#090d16'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
