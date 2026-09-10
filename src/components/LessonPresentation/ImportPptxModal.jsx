import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Eye, 
  RefreshCw, 
  FolderOpen 
} from 'lucide-react';
import { 
  uploadPptxPreviewApi, 
  confirmImportPptxApi, 
  cancelImportPptxApi, 
  INFORMATICS_TOPICS 
} from './lessonStorage';

export default function ImportPptxModal({
  isOpen,
  onClose,
  onImportSuccess,
  defaultGrade = 3
}) {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'preview' | 'saving'
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form dữ liệu bài học
  const [lessonTitle, setLessonTitle] = useState('');
  const [grade, setGrade] = useState(defaultGrade);
  const [topic, setTopic] = useState('Máy tính & Em');
  const [durationMinutes, setDurationMinutes] = useState(35);
  const [description, setDescription] = useState('');

  // Zoom xem trước slide lớn
  const [zoomedSlideIndex, setZoomedSlideIndex] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const resetState = () => {
    if (previewData?.tempId) {
      cancelImportPptxApi(previewData.tempId);
    }
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setErrorMsg(null);
    setLessonTitle('');
    setZoomedSlideIndex(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Xử lý khi người dùng chọn file
  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setErrorMsg('Hệ thống hiện chỉ hỗ trợ định dạng Microsoft PowerPoint (.pptx). Vui lòng chọn file có phần mở rộng .pptx!');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('Dung lượng file vượt quá giới hạn cho phép (Tối đa 100MB).');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setStep('processing');

    try {
      const data = await uploadPptxPreviewApi(file);
      setPreviewData(data);

      // Tự động nhận diện khối lớp từ tên file nếu có (vd: LQTH1 -> Lớp 1, K3 -> Lớp 3, Lớp 4 -> Lớp 4)
      let detectedGrade = defaultGrade;
      const fn = file.name.toUpperCase();
      if (fn.includes('LỚP 1') || fn.includes('LOP 1') || fn.includes('LQTH1') || fn.includes('K1')) detectedGrade = 1;
      else if (fn.includes('LỚP 2') || fn.includes('LOP 2') || fn.includes('LQTH2') || fn.includes('K2')) detectedGrade = 2;
      else if (fn.includes('LỚP 3') || fn.includes('LOP 3') || fn.includes('LQTH3') || fn.includes('K3')) detectedGrade = 3;
      else if (fn.includes('LỚP 4') || fn.includes('LOP 4') || fn.includes('LQTH4') || fn.includes('K4')) detectedGrade = 4;
      else if (fn.includes('LỚP 5') || fn.includes('LOP 5') || fn.includes('LQTH5') || fn.includes('K5')) detectedGrade = 5;

      setLessonTitle(data.suggestedTitle || file.name.replace(/\.pptx$/i, ''));
      setGrade(detectedGrade);
      setDurationMinutes(35);
      setDescription(`Bài giảng PowerPoint gồm ${data.slideCount} slides được import từ tệp "${file.name}".`);
      setStep('preview');
    } catch (err) {
      console.error('Lỗi upload PPTX:', err);
      setErrorMsg(err.message || 'Không thể xử lý file PowerPoint. Vui lòng kiểm tra lại file của bạn.');
      setStep('upload');
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Xác nhận import
  const handleConfirmImport = async () => {
    if (!previewData?.tempId) return;

    if (!lessonTitle.trim()) {
      alert('Vui lòng nhập tên bài học!');
      return;
    }

    setStep('saving');
    setErrorMsg(null);

    try {
      const createdLesson = await confirmImportPptxApi({
        tempId: previewData.tempId,
        title: lessonTitle.trim(),
        grade: Number(grade),
        topic,
        durationMinutes: Number(durationMinutes) || 35,
        description: description.trim(),
        originalFileName: previewData.originalFileName
      });

      onImportSuccess(createdLesson);
      handleClose();
    } catch (err) {
      console.error('Lỗi xác nhận import:', err);
      setErrorMsg(err.message || 'Lỗi lưu bài học vào thư viện.');
      setStep('preview');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-2xl)',
        width: '100%',
        maxWidth: step === 'preview' ? '1100px' : '640px',
        maxHeight: '92vh',
        boxShadow: 'var(--shadow-2xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Import Bài Giảng PowerPoint
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Giữ nguyên 100% bố cục, hình ảnh và font chữ gốc để trình chiếu tức thì
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="btn btn-icon"
            style={{ width: 36, height: 36, borderRadius: '50%' }}
            disabled={step === 'processing' || step === 'saving'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thân Modal */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#ef4444'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
                <strong>Lỗi:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* BƯỚC 1: VÙNG KÉO THẢ / CHỌN FILE */}
          {step === 'upload' && (
            <div>
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
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={36} />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Kéo thả file .pptx vào đây
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                    hoặc bấm vào khung để chọn file từ máy tính
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FolderOpen size={18} />
                  <span>Chọn file PowerPoint</span>
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.5rem'
                }}>
                  <span style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 700
                  }}>
                    Định dạng: .pptx
                  </span>
                  <span>•</span>
                  <span>Tối đa 100MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Hướng dẫn ngắn */}
              <div style={{
                marginTop: '1.5rem',
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  💡 Điểm nổi bật khi import bài giảng vào EduICT:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>Từng slide sẽ được hệ thống trích xuất trung thực 100% về hình ảnh, đồ họa và màu sắc.</li>
                  <li>Không bị nhảy font, không mất định dạng, không xô lệch bố cục bảng biểu hay sơ đồ.</li>
                  <li>Trình chiếu mượt mà chuẩn 16:9 trực tiếp trong tiết học phòng máy.</li>
                </ul>
              </div>
            </div>
          )}

          {/* BƯỚC 2: TRẠNG THÁI ĐANG XỬ LÝ RENDER */}
          {(step === 'processing' || step === 'saving') && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 2rem',
              textAlign: 'center',
              gap: '1.25rem'
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Loader2 size={44} className="animate-spin" color="#a855f7" />
              </div>

              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  {step === 'processing' ? 'Đang trích xuất các slide PowerPoint...' : 'Đang lưu bài giảng vào thư viện...'}
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
                  {step === 'processing' 
                    ? `Hệ thống đang kết xuất các slide từ tệp "${selectedFile?.name}" thành hình ảnh chất lượng cao chuẩn máy chiếu. Quá trình này có thể mất vài giây.`
                    : 'Đang hoàn tất việc thiết lập cơ sở dữ liệu và lưu trữ file bài giảng...'}
                </p>
              </div>

              <div style={{
                background: 'var(--surface-secondary)',
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontSize: '0.85rem',
                color: '#a855f7',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Vui lòng không đóng trình duyệt...</span>
              </div>
            </div>
          )}

          {/* BƯỚC 3: XEM TRƯỚC SLIDE VÀ NHẬP THÔNG TIN */}
          {step === 'preview' && previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Thẻ tóm tắt thông tin file đã trích xuất */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: 'var(--radius-xl)',
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: '#a855f7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                  }}>
                    PPT
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {previewData.originalFileName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>Dung lượng: <strong>{formatFileSize(previewData.fileSizeBytes)}</strong></span>
                      <span>•</span>
                      <span style={{ color: '#a855f7', fontWeight: 700 }}>
                        Đã trích xuất thành công {previewData.slideCount} slides
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Thầy/cô có muốn chọn file PowerPoint khác không?')) {
                      resetState();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Chọn file khác</span>
                </button>
              </div>

              {/* Form Metadata bài giảng */}
              <div style={{
                background: 'var(--surface-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.25rem 1.5rem',
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
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
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
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>Khối 1 (Lớp 1)</option>
                    <option value={2}>Khối 2 (Lớp 2)</option>
                    <option value={3}>Khối 3 (Lớp 3)</option>
                    <option value={4}>Khối 4 (Lớp 4)</option>
                    <option value={5}>Khối 5 (Lớp 5)</option>
                  </select>
                </div>

                {/* Chủ đề */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Chủ đề môn Tin học (GDPT 2018)
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
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
                    min={15}
                    max={90}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Mô tả */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Mục tiêu & Mô tả bài giảng
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mục tiêu trọng tâm cần đạt của bài học..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--surface-border)',
                      background: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* LƯỚI XEM TRƯỚC TẤT CẢ CÁC SLIDE ĐÃ TRÍCH XUẤT */}
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
                      Xem trước danh sách slide ({previewData.slides?.length || 0} slides)
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Bấm vào ảnh slide để phóng to kiểm tra
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  background: 'var(--surface-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--surface-border)'
                }}>
                  {previewData.slides?.map((slide, idx) => (
                    <div
                      key={idx}
                      onClick={() => setZoomedSlideIndex(idx)}
                      style={{
                        background: '#0f172a',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--surface-border)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        aspectRatio: '16/9'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <img
                        src={slide.imageUrl}
                        alt={`Slide ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block'
                        }}
                      />
                      {/* Huy hiệu số thứ tự slide */}
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <span>#{idx + 1}</span>
                      </div>

                      <div style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(0, 0, 0, 0.65)',
                        color: '#38bdf8',
                        padding: '0.2rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Eye size={12} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: 'var(--surface-secondary)'
        }}>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={step === 'processing' || step === 'saving'}
          >
            Hủy bỏ
          </button>

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="btn btn-primary"
              style={{
                padding: '0.7rem 1.75rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle size={18} />
              <span>Import vào thư viện</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal phóng to xem trước 1 slide cụ thể */}
      {zoomedSlideIndex !== null && previewData?.slides?.[zoomedSlideIndex] && (
        <div 
          onClick={() => setZoomedSlideIndex(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '1.5rem',
            left: '2rem',
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>Slide {zoomedSlideIndex + 1} / {previewData.slides.length}</span>
          </div>

          <button
            onClick={() => setZoomedSlideIndex(null)}
            className="btn btn-icon"
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '2rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44
            }}
          >
            <X size={24} />
          </button>

          <img
            src={previewData.slides[zoomedSlideIndex].imageUrl}
            alt={`Slide ${zoomedSlideIndex + 1}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
