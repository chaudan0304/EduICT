import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowLeft, 
  HelpCircle, 
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  parseExcelWorkbook, 
  downloadSampleExcelTemplate 
} from '../utils/excelImport';
import { batchImportClassesToSqlite, fetchClassesFromSqlite } from '../utils/storage';
import { soundEffects } from '../utils/audio';

export default function ImportExcelModal({
  isOpen,
  onClose,
  existingClasses = [],
  onImportSuccess,
  soundEnabled = true
}) {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [workbookData, setWorkbookData] = useState(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(null);
  const [autoCreateClasses, setAutoCreateClasses] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Xử lý khi chọn file
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setParsing(true);
    setParseError(null);
    setWorkbookData(null);
    setSelectedSheetIndex(null);
    setImportResult(null);

    try {
      const data = await parseExcelWorkbook(selectedFile, existingClasses);
      setWorkbookData(data);
      if (soundEnabled) soundEffects.playStarDing?.();
    } catch (err) {
      setParseError(err.message || 'Lỗi khi phân tích file Excel');
    } finally {
      setParsing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Kéo thả file
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const ext = droppedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('Vui lòng chỉ tải lên file Excel định dạng .xlsx hoặc .xls');
      return;
    }

    setParsing(true);
    setParseError(null);
    setWorkbookData(null);
    setSelectedSheetIndex(null);
    setImportResult(null);

    try {
      const data = await parseExcelWorkbook(droppedFile, existingClasses);
      setWorkbookData(data);
      if (soundEnabled) soundEffects.playStarDing?.();
    } catch (err) {
      setParseError(err.message || 'Lỗi khi phân tích file Excel');
    } finally {
      setParsing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Tiến hành import batch
  const handleConfirmBatchImport = async () => {
    if (!workbookData || workbookData.sheets.length === 0) return;

    setImporting(true);
    try {
      // Chuẩn bị payload gửi lên backend
      const payload = {
        autoCreateClasses: autoCreateClasses,
        defaultSchoolYear: '2025 - 2026',
        sheets: workbookData.sheets.map(sheet => ({
          sheetName: sheet.sheetName,
          className: sheet.className,
          grade: sheet.grade,
          students: sheet.students
            .filter(s => s.status !== 'error')
            .map(s => ({
              id: s.id,
              name: s.name,
              dob: s.dob,
              gender: s.gender,
              machineNumber: s.machineNumber,
              note: s.note,
              rowNumber: s.rowNumber
            }))
        }))
      };

      const result = await batchImportClassesToSqlite(payload);

      setImportResult(result);
      if (soundEnabled) soundEffects.playVictory?.();

      // Đồng bộ lại toàn bộ danh sách lớp từ SQLite
      const updatedClasses = await fetchClassesFromSqlite();
      if (updatedClasses && onImportSuccess) {
        // Chọn lớp đầu tiên vừa được xử lý
        const firstTargetId = result.sheetResults?.find(r => r.classId)?.classId;
        onImportSuccess(updatedClasses, firstTargetId);
      }
    } catch (err) {
      alert(`Đã xảy ra lỗi trong quá trình Import: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setWorkbookData(null);
    setParseError(null);
    setSelectedSheetIndex(null);
    setImportResult(null);
  };

  const selectedSheet = selectedSheetIndex !== null && workbookData?.sheets
    ? workbookData.sheets[selectedSheetIndex]
    : null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-xl)',
          width: '94%',
          maxWidth: 920,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--surface-border)',
          overflow: 'hidden'
        }}
      >
        {/* HEADER MODAL */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(99, 102, 241, 0.05))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                📥 Import Danh Sách Lớp & Học Sinh Từ Excel
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Mô hình: <strong>1 File Excel = Nhiều Sheet = Nhiều Lớp Học</strong>
              </p>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-sm btn-outline" 
            onClick={onClose}
            style={{ padding: '0.35rem 0.65rem' }}
          >
            ✕
          </button>
        </div>

        {/* BODY MODAL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* TRƯỜNG HỢP 1: KẾT QUẢ IMPORT HOÀN TẤT */}
          {importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-lg)'
              }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065f46', margin: '0 0 0.4rem 0' }}>
                  🎉 IMPORT HOÀN TẤT THÀNH CÔNG!
                </h4>
                <p style={{ color: '#047857', fontSize: '0.875rem', margin: 0 }}>
                  Toàn bộ dữ liệu học sinh đã được nạp an toàn vào cơ sở dữ liệu SQLite trong 1 giao dịch.
                </p>
              </div>

              {/* Thống kê tổng hợp */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: 'var(--surface-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>LỚP ĐÃ XỬ LÝ</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
                    {importResult.summary?.classesProcessed || 0}
                  </div>
                </div>

                <div style={{
                  background: 'var(--surface-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>LỚP TẠO MỚI</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                    {importResult.summary?.classesCreated || 0}
                  </div>
                </div>

                <div style={{
                  background: 'var(--surface-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>HỌC SINH THÊM MỚI</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>
                    {importResult.summary?.studentsAdded || 0}
                  </div>
                </div>

                <div style={{
                  background: 'var(--surface-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ĐÃ CÓ (BỎ QUA)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>
                    {importResult.summary?.studentsExisting || 0}
                  </div>
                </div>

                <div style={{
                  background: 'var(--surface-secondary)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--surface-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>DÒNG LỖI</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: importResult.summary?.rowsError > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {importResult.summary?.rowsError || 0}
                  </div>
                </div>
              </div>

              {/* Chi tiết từng sheet */}
              <div>
                <h5 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.6rem 0', color: 'var(--text-main)' }}>
                  📋 Kết quả chi tiết theo từng Lớp:
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {importResult.sheetResults?.map((sr, sIdx) => {
                    const hasErr = sr.errors && sr.errors.length > 0;
                    return (
                      <div 
                        key={sIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.9rem',
                          background: 'var(--surface-secondary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--surface-border)',
                          fontSize: '0.875rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                            Lớp {sr.className || sr.sheetName}
                          </span>
                          {sr.createdClass && (
                            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                              Tạo mới
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ color: '#047857', fontWeight: 700 }}>
                            ✓ {sr.added}/{sr.total} học sinh
                          </span>
                          {sr.existing > 0 && (
                            <span style={{ color: '#b45309', fontSize: '0.8125rem' }}>
                              ⚠ Trùng: {sr.existing}
                            </span>
                          )}
                          {hasErr && (
                            <span style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>
                              ❌ Lỗi: {sr.errors.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  <CheckCircle2 size={16} /> Đóng & Bắt Đầu Sử Dụng
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 2: CHƯA CHỌN FILE (DROPZONE & TẢI MẪU) */}
          {!importResult && !workbookData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Vùng Dropzone */}
              <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(2, 132, 199, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(2, 132, 199, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload size={32} />
                </div>

                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Kéo thả file Excel vào đây hoặc click để chọn
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Hỗ trợ định dạng <strong>.xlsx, .xls</strong> (Workbook gồm nhiều Sheet, mỗi Sheet là một lớp)
                  </p>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FileSpreadsheet size={16} /> Chọn File Excel
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls" 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {parsing && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '1rem' }}>
                  <RefreshCw size={20} className="spin" color="var(--primary)" />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Đang quét các sheet và phân tích học sinh...
                  </span>
                </div>
              )}

              {parseError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <XCircle size={18} />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Hộp giải thích quy ước & Tải File Mẫu */}
              <div style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.15rem 1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HelpCircle size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                      Quy ước cấu trúc File Excel chuẩn EduICT
                    </span>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={downloadSampleExcelTemplate}
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <Download size={15} /> Tải Excel Mẫu Chuẩn (.xlsx)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                    <span><strong>1 File = Nhiều Lớp:</strong> Mỗi Sheet là 1 lớp học (Tên Sheet = Tên Lớp, VD: 1A, 1B, 2A...).</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                    <span><strong>Tự tìm dòng Header:</strong> Hệ thống tự tìm dòng chứa các cột: STT, Họ tên, Ngày sinh, Giới tính.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                    <span><strong>Ngày sinh chuẩn:</strong> Dùng dd/mm/yyyy (hoặc ngày tháng Excel), không lo lệch timezone.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                    <span><strong>Chống trùng học sinh:</strong> Kiểm tra Họ tên + Ngày sinh. 2 bạn cùng tên khác ngày sinh được tạo riêng.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 3: PREVIEW DỮ LIỆU WORKBOOK */}
          {!importResult && workbookData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Chế độ xem chi tiết từng sheet học sinh */}
              {selectedSheet ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedSheetIndex(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <ArrowLeft size={16} /> Quay lại danh sách Sheet
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: 'var(--primary)'
                      }}>
                        LỚP {selectedSheet.sheetName}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        background: 'rgba(2, 132, 199, 0.15)',
                        color: '#0284c7'
                      }}>
                        Khối {selectedSheet.grade}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        ({selectedSheet.validRows} hợp lệ / {selectedSheet.totalRows} dòng)
                      </span>
                    </div>
                  </div>

                  {/* Bảng chi tiết học sinh của sheet */}
                  <div style={{
                    maxHeight: 380,
                    overflowY: 'auto',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <table className="grade-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '0.55rem 0.6rem', width: 45, textAlign: 'center' }}>Dòng</th>
                          <th style={{ padding: '0.55rem 0.8rem', textAlign: 'left' }}>Họ và Tên</th>
                          <th style={{ padding: '0.55rem 0.8rem', textAlign: 'center', width: 110 }}>Ngày sinh</th>
                          <th style={{ padding: '0.55rem 0.8rem', textAlign: 'center', width: 80 }}>Giới tính</th>
                          <th style={{ padding: '0.55rem 0.8rem', textAlign: 'center', width: 75 }}>Máy số</th>
                          <th style={{ padding: '0.55rem 0.8rem', textAlign: 'left' }}>Trạng thái / Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSheet.students.map((st, sIdx) => {
                          const isErr = st.status === 'error';
                          const isExist = st.status === 'existing';
                          const isWarn = st.status === 'warning' || !!st.warning;
                          return (
                            <tr 
                              key={sIdx}
                              style={{
                                background: isErr ? 'rgba(239, 68, 68, 0.06)' : (isExist ? 'rgba(245, 158, 11, 0.05)' : 'transparent'),
                                borderBottom: '1px solid var(--surface-border)'
                              }}
                            >
                              <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {st.rowNumber}
                              </td>
                              <td style={{ padding: '0.5rem 0.8rem', fontWeight: 700, color: isErr ? '#ef4444' : 'var(--text-main)' }}>
                                {st.name || '(Trống)'}
                              </td>
                              <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center' }}>
                                {st.dob || <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>Chưa có</span>}
                              </td>
                              <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center' }}>
                                <span style={{
                                  color: st.gender === 'Nữ' ? '#db2777' : '#2563eb',
                                  fontWeight: 600
                                }}>
                                  {st.gender}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {st.machineNumber ? `M${st.machineNumber}` : '-'}
                              </td>
                              <td style={{ padding: '0.5rem 0.8rem' }}>
                                {isErr && (
                                  <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <XCircle size={14} /> {st.errors.join(', ')}
                                  </span>
                                )}
                                {isExist && (
                                  <span style={{ color: '#b45309', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <AlertTriangle size={14} /> Đã tồn tại (Bỏ qua)
                                  </span>
                                )}
                                {isWarn && !isErr && !isExist && (
                                  <span style={{ color: '#d97706', fontSize: '0.75rem' }}>
                                    ⚠ {st.warning}
                                  </span>
                                )}
                                {!isErr && !isExist && !isWarn && (
                                  <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <CheckCircle2 size={14} /> Hợp lệ
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Chế độ xem tổng quan toàn bộ Workbook */
                <div>
                  {/* Banner Tóm Tắt File */}
                  <div style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileSpreadsheet size={18} color="var(--primary)" />
                        {workbookData.fileName}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Tổng số: <strong>{workbookData.totalSheets} lớp</strong> • <strong>{workbookData.totalStudents} học sinh hợp lệ</strong>
                      </div>
                    </div>

                    {/* Tùy chọn tự động tạo lớp */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(2, 132, 199, 0.08)',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(2, 132, 199, 0.25)'
                    }}>
                      <input 
                        type="checkbox"
                        checked={autoCreateClasses}
                        onChange={(e) => setAutoCreateClasses(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span>✓ Tự động tạo lớp nếu chưa tồn tại trong hệ thống</span>
                    </label>
                  </div>

                  {/* Bảng Danh Sách Sheet */}
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 700, 
                      color: 'var(--text-muted)', 
                      marginBottom: '0.6rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>DANH SÁCH SHEET ({workbookData.sheets.length} lớp học)</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Nhấn vào dòng để xem danh sách chi tiết</span>
                    </div>

                    <div style={{
                      border: '1px solid var(--surface-border)',
                      borderRadius: 'var(--radius-md)',
                      maxHeight: 320,
                      overflowY: 'auto'
                    }}>
                      <table className="grade-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <th style={{ padding: '0.6rem 0.8rem', width: 45, textAlign: 'center' }}>STT</th>
                            <th style={{ padding: '0.6rem 0.9rem', textAlign: 'left' }}>Sheet (Tên Lớp)</th>
                            <th style={{ padding: '0.6rem 0.9rem', textAlign: 'center', width: 90 }}>Khối lớp</th>
                            <th style={{ padding: '0.6rem 0.9rem', textAlign: 'center', width: 110 }}>Số học sinh</th>
                            <th style={{ padding: '0.6rem 0.9rem', textAlign: 'left' }}>Trạng thái lớp</th>
                            <th style={{ padding: '0.6rem 0.9rem', textAlign: 'left' }}>Dữ liệu Sheet</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', width: 70 }}>Xem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workbookData.sheets.map((sheet, idx) => {
                            const isErr = sheet.status === 'error';
                            const hasWarn = sheet.errorRows > 0;
                            return (
                              <tr 
                                key={idx}
                                onClick={() => setSelectedSheetIndex(idx)}
                                style={{
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--surface-border)',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(2, 132, 199, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  Lớp {sheet.sheetName}
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: 4,
                                    background: 'rgba(2, 132, 199, 0.1)',
                                    color: '#0284c7'
                                  }}>
                                    Khối {sheet.grade}
                                  </span>
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem', textAlign: 'center', fontWeight: 700 }}>
                                  {sheet.validRows}
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem' }}>
                                  {sheet.classExists ? (
                                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8125rem' }}>
                                      ✓ Lớp đã tồn tại
                                    </span>
                                  ) : (
                                    <span style={{ color: autoCreateClasses ? '#0284c7' : '#ef4444', fontWeight: 600, fontSize: '0.8125rem' }}>
                                      {autoCreateClasses ? '➕ Sẽ tạo lớp tự động' : '⚠ Chưa tồn tại'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem' }}>
                                  {isErr ? (
                                    <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8125rem' }}>
                                      ❌ {sheet.errorMessage}
                                    </span>
                                  ) : hasWarn ? (
                                    <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.8125rem' }}>
                                      ⚠ {sheet.validRows} hợp lệ • {sheet.errorRows} dòng lỗi
                                    </span>
                                  ) : (
                                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8125rem' }}>
                                      ✓ {sheet.validRows} học sinh hợp lệ
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '0.2rem 0.45rem' }}
                                    title="Xem chi tiết danh sách học sinh"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER ACTIONS KHI PREVIEW */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--surface-border)',
                marginTop: '0.5rem'
              }}>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={resetImport}
                  disabled={importing}
                >
                  Chọn File Khác
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={importing}
                  >
                    Hủy
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleConfirmBatchImport}
                    disabled={importing || workbookData.totalStudents === 0}
                    style={{ minWidth: 200 }}
                  >
                    {importing ? (
                      <>
                        <RefreshCw size={16} className="spin" /> Đang Nhập Dữ Liệu...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Xác Nhận Import ({workbookData.totalStudents} HS)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
