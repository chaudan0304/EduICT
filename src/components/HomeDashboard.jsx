import React, { useState } from 'react';
import { ArrowRight, BookOpen, ClipboardList, Clock, Gamepad2, Gift, Monitor, Play, Star, Target, Users, Zap } from 'lucide-react';
import { detectGradeFromName } from '../utils/storage';
import ClassContextBar from './ClassContextBar';
import PageHeader from './ui/PageHeader';

const gradeOf = classroom => Number(classroom?.grade || detectGradeFromName(classroom?.name) || 3);

export default function HomeDashboard({ classes = [], currentClass, onSelectClass, studentStats, isLoadingStats, onSelectTab, ongoingSession = null, currentSchoolYear }) {
  const [gradeFilter, setGradeFilter] = useState('all');
  const students = currentClass?.students || [];
  const grade = gradeOf(currentClass);
  const hasSession = ongoingSession && ongoingSession.status !== 'COMPLETED';
  const totalStudents = studentStats?.totalStudents ?? classes.reduce((total, classroom) => total + (classroom.students?.length || 0), 0);
  const filteredClasses = classes.filter(classroom => gradeFilter === 'all' || gradeOf(classroom) === gradeFilter);
  const enterSession = () => {
    if (hasSession) {
      const classId = ongoingSession.class_id || ongoingSession.classId;
      if (classId) onSelectClass(classId);
    }
    onSelectTab('sessions');
  };
  const tools = [
    ['lessons', 'Bài học & slide', 'Soạn bài, liên kết PowerPoint và trình chiếu.', BookOpen],
    ['quiz', 'Đố vui', 'Câu hỏi tương tác và kiểm tra nhanh.', Zap],
    ['seating', 'Phòng máy', 'Xếp chỗ và quản lý máy thực hành.', Monitor],
    ['gradebook', grade <= 2 ? 'Sổ kỹ năng & sao' : 'Sổ đánh giá', 'Theo dõi tiến bộ của từng học sinh.', ClipboardList],
    ['goodscores', 'Điểm tốt & nội quy', 'Ghi nhận thi đua và thưởng sao.', Star],
    ['rewards', 'Đổi quà', 'Đổi sao tích lũy lấy phần thưởng.', Gift],
    ['duckrace', 'Đua vịt', 'Gọi học sinh bằng một cuộc đua vui.', Gamepad2],
    ['luckywheel', 'Vòng quay', 'Bốc thăm học sinh trong lớp.', Gamepad2],
    ['timer', 'Đếm giờ', 'Đặt thời gian cho hoạt động của lớp.', Clock],
  ];
  return (
    <div className="home-dashboard">
      <PageHeader eyebrow="EDUICT · TIN HỌC TIỂU HỌC" title="Sẵn sàng cho tiết học"
        description="Chọn lớp, chuẩn bị bài và bắt đầu buổi dạy của bạn." />
      <ClassContextBar classes={classes} currentClass={currentClass} schoolYear={currentSchoolYear} onSelectClass={onSelectClass} />
      <section className="home-start" aria-label="Bắt đầu giảng dạy">
        <div className="home-start-copy">
          <span className="home-start-icon"><Target size={26} aria-hidden="true" /></span>
          <div><p className="page-eyebrow">{hasSession ? 'TIẾT HỌC ĐANG DIỄN RA' : 'TRUNG TÂM TIẾT HỌC'}</p>
            <h2>{hasSession ? ongoingSession.lesson_title || 'Tiết học đang dạy' : currentClass ? `Bắt đầu với lớp ${currentClass.name}` : 'Chuẩn bị tiết học mới'}</h2>
            <p>Tiến trình bài học, đồng hồ và thưởng sao trong cùng một màn hình.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={enterSession}><Play size={18} aria-hidden="true" />{hasSession ? 'Tiếp tục tiết học' : 'Vào tiết học'}<ArrowRight size={18} aria-hidden="true" /></button>
      </section>
      <dl className="home-overview" aria-label="Tổng quan lớp học" aria-busy={isLoadingStats}>
        <div><dt><Users size={16} aria-hidden="true" /> Học sinh toàn trường</dt><dd>{isLoadingStats && !studentStats ? '…' : totalStudents.toLocaleString('vi-VN')}</dd></div>
        <div><dt><BookOpen size={16} aria-hidden="true" /> Lớp học</dt><dd>{studentStats?.totalClasses ?? classes.length}</dd></div>
        <div><dt><Users size={16} aria-hidden="true" /> Sĩ số lớp hiện tại</dt><dd>{students.length}</dd></div>
        <div><dt><Star size={16} aria-hidden="true" /> Sao của lớp</dt><dd>{students.reduce((sum, student) => sum + (Number(student.stars) || 0), 0)}</dd></div>
      </dl>
      <section aria-labelledby="home-tools-title">
        <div className="section-heading"><h2 id="home-tools-title">Công cụ dạy học</h2><span>Chuẩn bị · Giảng dạy · Đánh giá</span></div>
        <div className="home-tools">{tools.map(([id, title, description, Icon]) => (
          <button key={id} type="button" className="home-tool" onClick={() => onSelectTab(id)}>
            <span className="home-tool-icon"><Icon size={21} aria-hidden="true" /></span>
            <span className="home-tool-copy"><strong>{title}</strong><span>{description}</span></span>
            <ArrowRight size={17} className="home-tool-arrow" aria-hidden="true" />
          </button>
        ))}</div>
      </section>
      <section className="home-classes" aria-labelledby="home-classes-title">
        <div className="section-heading"><h2 id="home-classes-title">Danh sách lớp</h2><span>{filteredClasses.length} lớp</span></div>
        <div className="home-grade-filter" role="group" aria-label="Lọc lớp theo khối">
          {['all', 1, 2, 3, 4, 5].map(number => {
            const gradeClasses = classes.filter(classroom => gradeOf(classroom) === number);
            const stats = studentStats?.grades?.find(item => Number(item.grade) === number);
            const count = number === 'all' ? totalStudents : stats?.studentCount ?? gradeClasses.reduce((sum, classroom) => sum + (classroom.students?.length || 0), 0);
            return <button key={number} type="button" aria-pressed={gradeFilter === number} onClick={() => setGradeFilter(number)}>
              <strong>{number === 'all' ? 'Tất cả' : `Khối ${number}`}</strong><span>{count} học sinh · {number === 'all' ? classes.length : stats?.classCount ?? gradeClasses.length} lớp</span>
            </button>;
          })}
        </div>
        {filteredClasses.length ? <div className="home-class-list">{filteredClasses.map(classroom => (
          <button key={classroom.id} type="button" className="home-class" aria-pressed={currentClass?.id === classroom.id} onClick={() => onSelectClass(classroom.id)}>
            <strong>{classroom.name}</strong><span>{classroom.students?.length || 0} học sinh</span>
          </button>
        ))}</div> : <p className="home-empty">Chưa có lớp trong khối này. Bạn có thể thêm lớp trong menu quản lý lớp.</p>}
      </section>
    </div>
  );
}
