import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Star
} from 'lucide-react';
import { PARTICIPATION_BADGES } from './sessionStorage';

export default function StudentParticipationGrid({
  students = [],
  currentActivity,
  participationRecords = [],
  onAwardStudent // (studentId, badgeType, starsDelta, note) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'participated' | 'not_yet'

  // Thống kê số lần nhận huy hiệu của từng học sinh trong session này
  const studentBadgeStats = useMemo(() => {
    const map = {};
    for (const s of students) {
      map[s.id] = {
        totalActions: 0,
        totalStars: 0,
        badges: {
          PARTICIPATION: 0,
          CREATIVE: 0,
          CORRECT: 0,
          HELPING: 0,
          STAR: 0
        }
      };
    }

    participationRecords.forEach(p => {
      const sId = p.student_id || p.studentId;
      if (map[sId]) {
        map[sId].totalActions += 1;
        const bType = p.badge_type || p.badgeType || 'PARTICIPATION';
        if (map[sId].badges[bType] !== undefined) {
          map[sId].badges[bType] += 1;
        }
        map[sId].totalStars += (p.stars_awarded || p.starsAwarded || 0);
      }
    });

    return map;
  }, [students, participationRecords]);

  // Lọc danh sách học sinh
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) ||
                          s.id.toLowerCase().includes(q) ||
                          (s.machineNumber && `máy ${s.machineNumber}`.includes(q)) ||
                          (s.machineNumber && String(s.machineNumber).includes(q));

      const stats = studentBadgeStats[s.id];
      const hasParticipated = stats && stats.totalActions > 0;

      if (filterType === 'participated') return matchSearch && hasParticipated;
      if (filterType === 'not_yet') return matchSearch && !hasParticipated;
      return matchSearch;
    });
  }, [students, searchTerm, filterType, studentBadgeStats]);

  const handleBadgeClick = (student, badgeKey) => {
    const badge = PARTICIPATION_BADGES[badgeKey];
    if (!badge) return;
    const starsDelta = badge.points;
    const note = `${badge.icon} ${badge.label} trong "${currentActivity?.title || 'tiết học'}"`;
    onAwardStudent(student.id, badgeKey, starsDelta, note);
  };

  const participatedCount = Object.values(studentBadgeStats).filter(st => st.totalActions > 0).length;

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Header & Thanh tìm kiếm / lọc */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--primary)" />
            <span>Tương Tác & Thưởng Sao Học Sinh</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)'
            }}>
              {participatedCount} / {students.length} đã tham gia
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Click 1-chạm vào các huy hiệu để ghi nhận phát biểu hoặc cộng sao thi đua tức thì
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Tìm tên hoặc số máy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2rem', paddingRight: '0.5rem', fontSize: '0.8125rem', height: 34 }}
            />
          </div>

          {/* Bộ lọc tham gia */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.8125rem', height: 34, width: 140 }}
          >
            <option value="all">Tất cả ({students.length})</option>
            <option value="participated">Đã tham gia ({participatedCount})</option>
            <option value="not_yet">Chưa phát biểu ({students.length - participatedCount})</option>
          </select>
        </div>
      </div>

      {/* Grid danh sách học sinh */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.75rem',
        maxHeight: '54vh',
        overflowY: 'auto',
        paddingRight: '0.25rem'
      }}>
        {filteredStudents.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '2.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            Không tìm thấy học sinh nào phù hợp.
          </div>
        ) : (
          filteredStudents.map(student => {
            const stats = studentBadgeStats[student.id] || { totalActions: 0, totalStars: 0, badges: {} };
            const hasParticipated = stats.totalActions > 0;

            return (
              <div
                key={student.id}
                style={{
                  background: hasParticipated ? 'rgba(2, 132, 199, 0.05)' : 'var(--surface-card)',
                  border: hasParticipated ? '1.5px solid rgba(2, 132, 199, 0.35)' : '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  transition: 'all 0.2s ease',
                  boxShadow: hasParticipated ? 'var(--shadow-sm)' : 'none'
                }}
              >
                {/* Thông tin học sinh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                    {/* Số máy */}
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.4rem',
                      borderRadius: 4,
                      background: student.machineNumber ? 'rgba(2, 132, 199, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                      color: student.machineNumber ? '#0284c7' : 'var(--text-dim)',
                      flexShrink: 0
                    }}>
                      {student.machineNumber ? `M.${student.machineNumber}` : '--'}
                    </span>

                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {student.name}
                    </span>
                  </div>

                  {/* Tổng sao học sinh đang có */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 800, color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" />
                    <span>{student.stars || 0}</span>
                  </div>
                </div>

                {/* Các nút bấm huy hiệu tương tác nhanh 1-chạm */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
                  {Object.entries(PARTICIPATION_BADGES).map(([bKey, bInfo]) => {
                    const countInSession = stats.badges?.[bKey] || 0;
                    return (
                      <button
                        key={bKey}
                        type="button"
                        onClick={() => handleBadgeClick(student, bKey)}
                        title={`${bInfo.title} (${bInfo.points > 0 ? `+${bInfo.points}⭐` : 'Ghi nhận'})`}
                        style={{
                          background: countInSession > 0 ? bInfo.bg : 'var(--surface-secondary)',
                          border: countInSession > 0 ? `1.5px solid ${bInfo.color}` : '1px solid var(--surface-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.35rem 0.15rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{bInfo.icon}</span>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          color: countInSession > 0 ? bInfo.color : 'var(--text-muted)',
                          marginTop: '0.15rem'
                        }}>
                          {bInfo.label}
                        </span>

                        {/* Số lần nhận trong session */}
                        {countInSession > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            background: bInfo.color,
                            color: '#fff',
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            width: 15,
                            height: 15,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            {countInSession}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
