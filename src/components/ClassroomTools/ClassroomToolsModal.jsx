import { useEffect, useId, useRef, useState } from 'react';
import { Settings, ShieldCheck, FileText, Download, Archive, X } from 'lucide-react';
import GeminiSettings from './GeminiSettings';
import PreflightPanel from './PreflightPanel';
import StudentProgressPanel from './StudentProgressPanel';
import VersionPanel from './VersionPanel';
import BackupPanel from './BackupPanel';
import './ClassroomTools.css';

const tabs = [{ id: 'gemini', label: 'Gemini', icon: Settings }, { id: 'preflight', label: 'Trước giờ dạy', icon: ShieldCheck },
  { id: 'progress', label: 'Tiến bộ học sinh', icon: FileText }, { id: 'backup', label: 'Sao lưu', icon: Archive }, { id: 'version', label: 'Phiên bản', icon: Download }];

export default function ClassroomToolsModal({ isOpen, onClose, currentClass, onAiStatusChange, initialTab = 'gemini' }) {
  const dialog = useRef(null); const titleId = useId(); const opener = useRef(null);
  const [tab, setTab] = useState(initialTab); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen) { opener.current = document.activeElement; setTab(initialTab); if (!dialog.current.open) dialog.current.showModal(); }
    else if (dialog.current.open) dialog.current.close();
    const element = dialog.current;
    return () => { if (element.open) element.close(); opener.current?.focus(); };
  }, [isOpen, initialTab]);
  return <dialog ref={dialog} className="classroom-tools-dialog" aria-labelledby={titleId}
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} onClose={() => { opener.current?.focus(); }}>
    <header className="classroom-tools-header"><div><h2 id={titleId}>Công cụ lớp học</h2><p>Cài đặt và chuẩn bị cho giờ dạy</p></div>
      <button type="button" className="btn btn-icon" aria-label="Đóng công cụ lớp học" disabled={busy} onClick={onClose}><X size={22} /></button></header>
    <nav className="classroom-tools-tabs" aria-label="Chọn công cụ">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id}
      className={tab === id ? 'is-active' : ''} aria-pressed={tab === id} disabled={busy} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}</nav>
    {isOpen && <div className="classroom-tools-content">
      {tab === 'gemini' && <GeminiSettings onAiStatusChange={onAiStatusChange} onBusyChange={setBusy} />}
      {tab === 'preflight' && <PreflightPanel />}
      {tab === 'progress' && <StudentProgressPanel key={currentClass?.id || 'none'} currentClass={currentClass} onBusyChange={setBusy} />}
      {tab === 'version' && <VersionPanel />}
      {tab === 'backup' && <BackupPanel onBusyChange={setBusy} />}
    </div>}
  </dialog>;
}
