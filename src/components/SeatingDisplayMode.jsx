import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Monitor, 
  Users, 
  AlertTriangle, 
  Server, 
  DoorOpen, 
  Sparkles
} from 'lucide-react';

/**
 * Component Chế Độ Trình Chiếu Sơ Đồ Chỗ Ngồi (Seating Display Mode)
 * Mục đích duy nhất: Chiếu lên màn hình lớn / máy chiếu lớp học để HỌC SINH
 * xem rõ ràng, đầy đủ 100% họ tên và tìm đúng vị trí máy tính / dãy ngồi của mình.
 */
export default function SeatingDisplayMode({
  currentClass,
  labLayout,
  machineStudentMap,
  brokenMachines = [],
  teacherSide = 'right',
  onClose
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Xử lý Fullscreen API khi mở và lắng nghe phím tắt Esc
  useEffect(() => {
    // Tự động yêu cầu Fullscreen nếu trình duyệt hỗ trợ
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {
            // Trình duyệt chặn fullscreen tự động không do user-gesture, bỏ qua không lỗi
          });
      }
    } catch {
      // Bỏ qua lỗi fullscreen nếu có
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Chuyển đổi trạng thái Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Lỗi khi chuyển đổi chế độ toàn màn hình:', err);
    }
  };

  // Thoát chế độ trình chiếu và thoát Fullscreen nếu đang bật
  const handleExit = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
    onClose();
  };

  // Tính tổng số học sinh đã có chỗ ngồi
  const allAssigned = Object.values(machineStudentMap).flat();
  const sharedCount = Object.values(machineStudentMap).filter(list => list.length === 2).length;

  return (
    <div 
      className="seating-display-mode-root"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'var(--font-primary, system-ui, sans-serif)',
        padding: '0.75rem 1.25rem 1.5rem',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. HEADER TRÌNH CHIẾU CHO HỌC SINH & THANH CÔNG CỤ THOÁT */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.65rem 1.25rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #cbd5e1',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        marginBottom: '0.85rem',
        flexShrink: 0
      }}>
        {/* Tiêu đề lớp học to rõ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            flexShrink: 0
          }}>
            <Monitor size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                SƠ ĐỒ CHỖ NGỒI PHÒNG MÁY • {currentClass?.name || 'Lớp Học'}
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                background: '#e0f2fe',
                color: '#0284c7',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #bae6fd',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Màn Hình Chiếu
              </span>
            </div>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#64748b',
              margin: '0.15rem 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span>👤 Sĩ số: <strong style={{ color: '#0f172a' }}>{allAssigned.length}</strong> học sinh</span>
              <span>•</span>
              <span>🖥️ Phòng máy: <strong style={{ color: '#0f172a' }}>31</strong> máy tính</span>
              {sharedCount > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#4f46e5' }}>👥 <strong>{sharedCount}</strong> máy ngồi ghép 2 bạn</span>
                </>
              )}
              {brokenMachines.length > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#d97706' }}>⚠️ <strong>{brokenMachines.length}</strong> máy tạm ngưng</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Nút hành động góc phải */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Nút Toàn Màn Hình F11 */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình máy chiếu'}
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#334155',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
          </button>

          {/* Nút Thoát Trình Chiếu */}
          <button
            type="button"
            onClick={handleExit}
            title="Thoát chế độ trình chiếu và quay lại quản trị (Phím Esc)"
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
            <span>Thoát Trình Chiếu (Esc)</span>
          </button>
        </div>
      </header>

      {/* 2. ĐỊNH HƯỚNG KHÔNG GIAN PHÍA TRƯỚC: BẢNG LỚP HỌC & BÀN GIÁO VIÊN & CỬA RA VÀO */}
      {/* Học sinh nhìn lên bảng phía trước để định vị hướng máy tính */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
        gap: '0.85rem',
        alignItems: 'stretch',
        marginBottom: '0.85rem',
        flexShrink: 0
      }}>
        {teacherSide === 'right' ? (
          <>
            {/* Cửa Ra Vào (Phía Dãy 5) */}
            <div style={{
              gridColumn: '1 / 2',
              padding: '0.65rem 0.85rem',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)',
              border: '2px solid #0284c7',
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)'
            }}>
              <DoorOpen size={20} color="#0284c7" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                  Lối Vào Phòng Máy
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0284c7' }}>
                  🚪 CỬA RA VÀO CHÍNH
                </div>
              </div>
            </div>

            {/* Bảng Lớp Học & Màn Chiếu Trung Tâm */}
            <div style={{
              gridColumn: '2 / 5',
              textAlign: 'center',
              padding: '0.65rem 1rem',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '10px',
              border: '2px solid #334155',
              color: '#f8fafc',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>📋</span>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.02em', color: '#38bdf8' }}>
                  BẢNG LỚP HỌC & MÀN CHIẾU CHÍNH (HƯỚNG NHÌN LÊN)
                </div>
                <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#94a3b8' }}>
                  Các em nhìn theo vị trí Dãy 1 → Dãy 5 bên dưới để về đúng chỗ ngồi của mình
                </div>
              </div>
            </div>

            {/* Bàn Giáo Viên & Máy Chủ (Phía Dãy 1) */}
            <div style={{
              gridColumn: '5 / 6',
              padding: '0.65rem 0.85rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
            }}>
              <Server size={20} color="#d97706" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                  Phía Trong Cùng
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#b45309' }}>
                  💻 BÀN GIÁO VIÊN
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bàn Giáo Viên & Máy Chủ (Phía Dãy 1 Bên Trái) */}
            <div style={{
              gridColumn: '1 / 2',
              padding: '0.65rem 0.85rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
            }}>
              <Server size={20} color="#d97706" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                  Phía Trong Cùng
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#b45309' }}>
                  💻 BÀN GIÁO VIÊN
                </div>
              </div>
            </div>

            {/* Bảng Lớp Học & Màn Chiếu Trung Tâm */}
            <div style={{
              gridColumn: '2 / 5',
              textAlign: 'center',
              padding: '0.65rem 1rem',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '10px',
              border: '2px solid #334155',
              color: '#f8fafc',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>📋</span>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.02em', color: '#38bdf8' }}>
                  BẢNG LỚP HỌC & MÀN CHIẾU CHÍNH (HƯỚNG NHÌN LÊN)
                </div>
                <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#94a3b8' }}>
                  Các em nhìn theo vị trí Dãy 1 → Dãy 5 bên dưới để về đúng chỗ ngồi của mình
                </div>
              </div>
            </div>

            {/* Cửa Ra Vào (Phía Dãy 5 Bên Phải) */}
            <div style={{
              gridColumn: '5 / 6',
              padding: '0.65rem 0.85rem',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)',
              border: '2px solid #0284c7',
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)'
            }}>
              <DoorOpen size={20} color="#0284c7" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                  Lối Vào Phòng Máy
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0284c7' }}>
                  🚪 CỬA RA VÀO CHÍNH
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. KHÔNG GIAN CHÍNH: 5 DÃY MÁY TÍNH PHÒNG THỰC HÀNH */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
        gap: '0.85rem',
        flex: 1,
        alignItems: 'start'
      }}>
        {labLayout.map(row => {
          // Tạo danh sách số máy thuộc dãy này
          const [start, end] = row.machineRange;
          const machineNumbers = [];
          for (let m = start; m <= end; m++) {
            machineNumbers.push(m);
          }

          let borderColor = '#cbd5e1';
          let headerBg = '#f1f5f9';
          let headerColor = '#1e293b';

          if (row.isTeacherSide) {
            borderColor = '#f59e0b';
            headerBg = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            headerColor = '#b45309';
          } else if (row.isDoorSide) {
            borderColor = '#0284c7';
            headerBg = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
            headerColor = '#0369a1';
          }

          return (
            <div
              key={row.id}
              style={{
                background: '#ffffff',
                border: `2px solid ${borderColor}`,
                borderRadius: '12px',
                padding: '0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Tiêu đề dãy máy to rõ */}
              <div style={{
                background: headerBg,
                color: headerColor,
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                textAlign: 'center',
                borderBottom: `1px solid ${borderColor}`
              }}>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}>
                  {row.rowName}
                  {row.isTeacherSide && <Sparkles size={15} color="#f59e0b" />}
                </div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, opacity: 0.9 }}>
                  {row.subtitle} (Máy {String(start).padStart(2, '0')} – {String(end).padStart(2, '0')})
                </div>
              </div>

              {/* Danh sách các máy trong dãy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {machineNumbers.map(mNum => {
                  const assigned = machineStudentMap[mNum] || [];
                  const isBroken = brokenMachines.includes(mNum);
                  const isShared = assigned.length === 2;

                  let cardBorder = '#e2e8f0';
                  let cardBg = '#ffffff';

                  if (isBroken) {
                    cardBorder = '#f59e0b';
                    cardBg = '#fffbeb';
                  } else if (isShared) {
                    cardBorder = '#818cf8';
                    cardBg = '#f5f3ff';
                  } else if (assigned.length === 1) {
                    cardBorder = '#0284c7';
                    cardBg = '#f0f9ff';
                  }

                  return (
                    <div
                      key={mNum}
                      style={{
                        background: cardBg,
                        border: `2px solid ${cardBorder}`,
                        borderRadius: '10px',
                        padding: '0.55rem 0.65rem',
                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      {/* Tiêu đề thẻ máy: Số máy to rõ */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '0.25rem',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{
                            background: isBroken ? '#fef3c7' : '#0284c7',
                            color: isBroken ? '#b45309' : '#ffffff',
                            fontSize: '0.85rem',
                            fontWeight: 900,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            letterSpacing: '0.02em',
                            display: 'inline-block'
                          }}>
                            MÁY {String(mNum).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Tag trạng thái */}
                        {isBroken ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#b45309',
                            background: '#fef3c7',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <AlertTriangle size={11} /> TẠM NGƯNG
                          </span>
                        ) : isShared ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#4338ca',
                            background: '#e0e7ff',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <Users size={11} /> GHÉP 2 BẠN
                          </span>
                        ) : assigned.length === 0 ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>
                            Trống
                          </span>
                        ) : null}
                      </div>

                      {/* Cảnh báo nếu máy hỏng */}
                      {isBroken && (
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '0.25rem 0.4rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                          <span>Máy đang sửa, không ngồi vào máy này!</span>
                        </div>
                      )}

                      {/* Danh sách học sinh: HIỂN THỊ ĐẦY ĐỦ 100% HỌ TÊN - KHÔNG CẮT NGẮN */}
                      {assigned.length === 0 && !isBroken ? (
                        <div style={{
                          padding: '0.35rem 0.25rem',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          fontStyle: 'italic'
                        }}>
                          (Chưa có học sinh)
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {assigned.map((student, sIdx) => {
                            const isGirl = student.gender === 'Nữ';
                            const nameLength = (student.name || '').length;

                            // Co giãn font chữ thông minh: tên siêu dài (> 20 ký tự) co nhẹ để vừa vặn
                            const fontSize = isShared
                              ? (nameLength > 20 ? '0.875rem' : '0.9375rem')
                              : (nameLength > 20 ? '0.95rem' : '1.05rem');

                            return (
                              <div
                                key={student.id}
                                style={{
                                  background: isShared ? '#ffffff' : 'transparent',
                                  border: isShared ? '1px solid #cbd5e1' : 'none',
                                  borderRadius: '6px',
                                  padding: isShared ? '0.35rem 0.45rem' : '0.15rem 0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem'
                                }}
                              >
                                {/* Huy hiệu số thứ tự bạn ngồi nếu máy ghép */}
                                {isShared && (
                                  <span style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {sIdx + 1}
                                  </span>
                                )}

                                {/* Huy hiệu Nam / Nữ thân thiện */}
                                <span style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: isGirl ? '#fdf2f8' : '#eff6ff',
                                  color: isGirl ? '#db2777' : '#2563eb',
                                  border: `1px solid ${isGirl ? '#fbcfe8' : '#bfdbfe'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  flexShrink: 0
                                }} title={student.gender || 'Nam'}>
                                  {isGirl ? '♀' : '♂'}
                                </span>

                                {/* HỌ VÀ TÊN ĐẦY ĐỦ 100% - TUYỆT ĐỐI KHÔNG CẮT BỚT */}
                                <div style={{
                                  fontSize: fontSize,
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  lineHeight: 1.25,
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  flex: 1
                                }}>
                                  {student.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. PHÍA CUỐI PHÒNG: CỬA SỔ & CUỐI PHÒNG THỰC HÀNH */}
      <footer style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.6rem 1.25rem',
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px dashed #cbd5e1',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#64748b',
        marginTop: '0.85rem',
        flexShrink: 0
      }}>
        {teacherSide === 'right' ? (
          <>
            <span style={{ color: '#0284c7' }}>🚪 PHÍA DÃY 5 (GẦN CỬA RA VÀO)</span>
            <span>🪟 HƯỚNG CUỐI PHÒNG MÁY / CỬA SỔ THÔNG THOÁNG</span>
            <span style={{ color: '#d97706' }}>📍 PHÍA DÃY 1 (TRONG CÙNG • BÀN GV)</span>
          </>
        ) : (
          <>
            <span style={{ color: '#d97706' }}>📍 PHÍA DÃY 1 (TRONG CÙNG • BÀN GV)</span>
            <span>🪟 HƯỚNG CUỐI PHÒNG MÁY / CỬA SỔ THÔNG THOÁNG</span>
            <span style={{ color: '#0284c7' }}>🚪 PHÍA DÃY 5 (GẦN CỬA RA VÀO)</span>
          </>
        )}
      </footer>
    </div>
  );
}
