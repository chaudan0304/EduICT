import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  MapPin, 
  Award, 
  Music, 
  Gift, 
  Star, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

const REWARD_CARDS = [
  {
    id: 'card_immunity',
    title: 'Thẻ Miễn Tử',
    icon: '🛡️',
    cost: 15,
    description: 'Được miễn trừ 1 lần kiểm tra bài cũ bất chợt trong tháng.',
    color: '#8b5cf6'
  },
  {
    id: 'card_helper',
    title: 'Thẻ Cứu Trợ Đồng Đội',
    icon: '🤝',
    cost: 10,
    description: 'Được quyền chỉ định 1 bạn trong lớp hỗ trợ khi gặp câu hỏi hóc búa.',
    color: '#06b6d4'
  },
  {
    id: 'card_seat',
    title: 'Thẻ Chọn Chỗ VIP',
    icon: '💺',
    cost: 12,
    description: 'Quyền ưu tiên chọn vị trí ngồi mong muốn trong 1 tuần học.',
    color: '#f59e0b'
  },
  {
    id: 'card_music',
    title: 'Thẻ DJ Lớp Học',
    icon: '🎵',
    cost: 5,
    description: 'Được chọn 1 bài hát yêu thích phát vào giờ giải lao 5 phút cuối giờ.',
    color: '#ec4899'
  },
];

export default function RewardShop({ 
  currentClass, 
  onUpdateStudents, 
  soundEnabled 
}) {
  const students = currentClass?.students || [];

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [redeemLog, setRedeemLog] = useState([]);

  // Sắp xếp top học sinh nhiều sao nhất
  const topStudents = [...students].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 5);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Đổi thẻ
  const handleRedeem = (card) => {
    if (!selectedStudent) {
      alert('Vui lòng chọn học sinh đổi thẻ!');
      return;
    }

    const currentStars = selectedStudent.stars || 0;
    if (currentStars < card.cost) {
      alert(`Học sinh ${selectedStudent.name} hiện chỉ có ${currentStars}⭐, không đủ ${card.cost}⭐ để đổi "${card.title}"!`);
      return;
    }

    if (window.confirm(`Xác nhận đổi "${card.title}" cho ${selectedStudent.name} với giá ${card.cost}⭐?`)) {
      const updated = students.map(s => {
        if (s.id === selectedStudent.id) {
          return { ...s, stars: currentStars - card.cost };
        }
        return s;
      });

      onUpdateStudents(updated);
      setRedeemLog(prev => [
        {
          studentName: selectedStudent.name,
          cardTitle: card.title,
          cost: card.cost,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);

      if (soundEnabled) soundEffects.playVictory();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>⭐</span> Cửa Hàng Đổi Thưởng & Thẻ Bảo Bối
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Đổi sao tích lũy lấy các đặc quyền vui nhộn trong giờ học giúp khích lệ học sinh phát biểu
            </p>
          </div>

          {/* Student Selector to Redeem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Học sinh đổi quà:</span>
            <select
              className="input-field"
              style={{ width: 220, cursor: 'pointer' }}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.stars || 0} ⭐)
                </option>
              ))}
            </select>
            {selectedStudent && (
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#d97706' }}>
                {selectedStudent.stars || 0} ⭐
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) 340px',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Reward Cards Catalog */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {REWARD_CARDS.map(card => {
            const canAfford = (selectedStudent?.stars || 0) >= card.cost;

            return (
              <div
                key={card.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${card.color}`,
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2rem' }}>{card.icon}</span>
                    <span style={{
                      fontSize: '0.9375rem',
                      fontWeight: 800,
                      color: '#d97706',
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {card.cost} ⭐
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {card.title}
                  </h3>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1.25rem' }}>
                    {card.description}
                  </p>
                </div>

                <button
                  className={`btn ${canAfford ? 'btn-amber pulse-card' : 'btn-outline'}`}
                  style={{ width: '100%', fontWeight: 700 }}
                  onClick={() => handleRedeem(card)}
                  disabled={!canAfford}
                >
                  <Gift size={16} />
                  {canAfford ? 'ĐỔI THẺ NGAY' : `Cần thêm ${card.cost - (selectedStudent?.stars || 0)} ⭐`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar: Top Stars Leaderboard & Redemption Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Star Leaderboard */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              👑 Bảng Vinh Danh Ngôi Sao Lớp
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topStudents.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: idx === 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-secondary)',
                    border: idx === 0 ? '1px solid #f59e0b' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: idx === 0 ? '#d97706' : 'var(--text-muted)' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      {s.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#d97706', fontSize: '0.875rem' }}>
                    {s.stars || 0} ⭐
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Redemption History Log */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📜 Lịch Sử Đổi Thẻ Trong Giờ
            </h4>
            {redeemLog.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Chưa có học sinh nào đổi thẻ trong buổi này.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 220, overflowY: 'auto' }}>
                {redeemLog.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.4rem 0.6rem',
                      background: 'var(--surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {log.studentName} đã đổi <span style={{ color: 'var(--primary)' }}>{log.cardTitle}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Trừ {log.cost} ⭐</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
