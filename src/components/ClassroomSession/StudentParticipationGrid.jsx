import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Star,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { PARTICIPATION_BADGES } from './sessionStorage';

export default function StudentParticipationGrid({
  students = [],
  currentActivity,
  participationRecords = [],
  onAwardStudent // (studentId, badgeType, starsDelta, note) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'starred' | 'participated' | 'not_yet'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'stars' | 'actions'

  // Thống kê số lần nhận huy hiệu của từng học sinh trong session này
  const studentBadgeStats = useMemo(() => {
    const map = {};
    for (const s of students) {
      map[String(s.id).trim()] = {
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
      const sId = String(p.student_id || p.studentId || '').trim();
      if (map[sId]) {
        map[sId].totalActions += 1;
        const bType = p.badge_type || p.badgeType || 'PARTICIPATION';
        if (map[sId].badges[bType] !== undefined) {
          map[sId].badges[bType] += 1;
        }
        map[sId].totalStars += (Number(p.stars_awarded || p.starsAwarded) || 0);
      }
    });

    return map;
  }, [students, participationRecords]);

  const starredCount = useMemo(() => {
    return Object.values(studentBadgeStats).filter(st => st.totalStars > 0).length;
  }, [studentBadgeStats]);

  const participatedCount = useMemo(() => {
    return Object.values(studentBadgeStats).filter(st => st.totalActions > 0).length;
  }, [studentBadgeStats]);

  const totalStarsInSession = useMemo(() => {
    return Object.values(studentBadgeStats).reduce((sum, st) => sum + st.totalStars, 0);
  }, [studentBadgeStats]);

  // Lọc và sắp xếp danh sách học sinh
  const filteredStudents = useMemo(() => {
    const list = students.filter(s => {
      const sId = String(s?.id || '').trim();
      const q = (searchTerm || '').toLowerCase().trim();
      const matchSearch = !q ||
                          String(s?.name || '').toLowerCase().includes(q) ||
                          sId.toLowerCase().includes(q) ||
                          (s.machineNumber && `máy ${s.machineNumber}`.includes(q)) ||
                          (s.machineNumber && String(s.machineNumber).includes(q));

      const stats = studentBadgeStats[sId];
      const hasParticipated = stats && stats.totalActions > 0;
      const hasStars = stats && stats.totalStars > 0;

      if (filterType === 'starred') return matchSearch && hasStars;
      if (filterType === 'participated') return matchSearch && hasParticipated;
      if (filterType === 'not_yet') return matchSearch && !hasParticipated;
      return matchSearch;
    });

    if (sortBy === 'stars') {
      return [...list].sort((a, b) => {
        const aStars = studentBadgeStats[String(a.id).trim()]?.totalStars || 0;
        const bStars = studentBadgeStats[String(b.id).trim()]?.totalStars || 0;
        if (bStars !== aStars) return bStars - aStars;
        return a.name.localeCompare(b.name, 'vi');
      });
    }

    if (sortBy === 'actions') {
      return [...list].sort((a, b) => {
        const aActions = studentBadgeStats[String(a.id).trim()]?.totalActions || 0;
        const bActions = studentBadgeStats[String(b.id).trim()]?.totalActions || 0;
        if (bActions !== aActions) return bActions - aActions;
        return a.name.localeCompare(b.name, 'vi');
      });
    }

    return list;
  }, [students, searchTerm, filterType, sortBy, studentBadgeStats]);

  const handleBadgeClick = (student, badgeKey) => {
    const badge = PARTICIPATION_BADGES[badgeKey];
    if (!badge) return;
    const starsDelta = badge.points;
    const note = `${badge.icon} ${badge.label} trong "${currentActivity?.title || 'tiết học'}"`;
    onAwardStudent(student.id, badgeKey, starsDelta, note);
  };

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
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Users size={20} color="var(--primary)" />
            <span>Tương Tác & Thưởng Sao Học Sinh</span>
            {starredCount > 0 && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                color: '#b45309',
                border: '1px solid #fcd34d',
                padding: '0.15rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Sparkles size={13} color="#f59e0b" />
                {starredCount} bạn nhận sao (+{totalStarsInSession} ⭐)
              </span>
            )}
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Click 1-chạm vào các huy hiệu để ghi nhận phát biểu hoặc cộng sao thi đua tức thì
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', width: 200 }}>
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

          {/* Sắp xếp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8125rem', height: 34, width: 140 }}
              title="Sắp xếp danh sách học sinh"
            >
              <option value="default">Sắp xếp: A - Z</option>
              <option value="stars">⭐ Nhiều sao nhất</option>
              <option value="actions">🙋 Tương tác nhiều</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hàng nút lọc nhanh dạng thẻ Pill trực quan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setFilterType('all')}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.78125rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-full)',
            border: filterType === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--surface-border)',
            background: filterType === 'all' ? 'rgba(2, 132, 199, 0.12)' : 'var(--surface-secondary)',
            color: filterType === 'all' ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Tất cả ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('starred')}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.78125rem',
            fontWeight: 800,
            borderRadius: 'var(--radius-full)',
            border: filterType === 'starred' ? '1.5px solid #f59e0b' : '1px solid #fde68a',
            background: filterType === 'starred' ? '#fef3c7' : 'rgba(254, 243, 199, 0.4)',
            color: '#b45309',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'all 0.15s ease',
            boxShadow: filterType === 'starred' ? '0 2px 6px rgba(245, 158, 11, 0.25)' : 'none'
          }}
        >
          <Star size={13} fill="#f59e0b" color="#f59e0b" />
          <span>Được thưởng sao ({starredCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('participated')}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.78125rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-full)',
            border: filterType === 'participated' ? '1.5px solid #10b981' : '1px solid var(--surface-border)',
            background: filterType === 'participated' ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-secondary)',
            color: filterType === 'participated' ? '#059669' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Đã phát biểu ({participatedCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('not_yet')}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.78125rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-full)',
            border: filterType === 'not_yet' ? '1.5px solid #64748b' : '1px solid var(--surface-border)',
            background: filterType === 'not_yet' ? 'rgba(100, 116, 139, 0.12)' : 'var(--surface-secondary)',
            color: filterType === 'not_yet' ? '#334155' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Chưa phát biểu ({students.length - participatedCount})
        </button>
      </div>

      {/* Grid danh sách học sinh */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
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
            {filterType === 'starred'
              ? 'Chưa có học sinh nào được cộng sao trong tiết này. Bấm vào huy hiệu ⭐ của học sinh để thưởng sao!'
              : 'Không tìm thấy học sinh nào phù hợp.'}
          </div>
        ) : (
          filteredStudents.map(student => {
            const sId = String(student.id).trim();
            const stats = studentBadgeStats[sId] || { totalActions: 0, totalStars: 0, badges: {} };
            const hasParticipated = stats.totalActions > 0;
            const hasStarsInSession = stats.totalStars > 0;

            return (
              <div
                key={student.id}
                style={{
                  background: hasStarsInSession
                    ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.35) 0%, rgba(255, 251, 235, 0.8) 100%)'
                    : (hasParticipated ? 'rgba(2, 132, 199, 0.05)' : 'var(--surface-card)'),
                  border: hasStarsInSession
                    ? '2px solid #f59e0b'
                    : (hasParticipated ? '1.5px solid rgba(2, 132, 199, 0.35)' : '1px solid var(--surface-border)'),
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  transition: 'all 0.2s ease',
                  boxShadow: hasStarsInSession
                    ? '0 3px 10px rgba(245, 158, 11, 0.18)'
                    : (hasParticipated ? 'var(--shadow-sm)' : 'none')
                }}
              >
                {/* Thông tin học sinh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
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

                  {/* Chỉ báo sao trong tiết & Tổng sao tích lũy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    {hasStarsInSession && (
                      <span style={{
                        fontSize: '0.71875rem',
                        fontWeight: 800,
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        ⭐ +{stats.totalStars}
                      </span>
                    )}

                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 800, color: '#f59e0b' }}
                      title="Tổng số sao tích lũy hiện tại của học sinh"
                    >
                      <Star size={14} fill="#f59e0b" />
                      <span>{student.stars || 0}</span>
                    </div>
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
