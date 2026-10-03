import { useEffect, useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import DesktopCapabilityService from '../../services/DesktopCapabilityService';
import PresentationService from '../../services/PresentationService';
import DialogService from '../../services/DialogService';

const MESSAGES = {
  NO_FILE: 'Bài giảng này chưa có file PowerPoint gốc để mở.',
  NOT_INSTALLED: 'Chưa cài đặt Microsoft PowerPoint trên máy này.',
  GENERIC: 'Không thể mở PowerPoint. Vui lòng thử lại.',
};

// Nút "Mở PowerPoint" — chỉ hiện ở EduMaster Desktop (Native Layer có mặt). Web mode: không render gì,
// giữ nguyên fallback hiện tại. Luồng: kiểm tra năng lực → PowerPoint đã cài? → file gốc có? → mở qua Desktop Bridge.
export default function OpenPowerPointButton({ sourceFilePath, style = null }) {
  const [caps, setCaps] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    DesktopCapabilityService.getCapabilities().then((c) => {
      if (alive) setCaps(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!caps || !caps.isDesktop) return null;

  const installed = Boolean(caps.canOpenPowerPoint);
  const disabled = busy || !installed || !sourceFilePath;

  const title = !installed
    ? MESSAGES.NOT_INSTALLED
    : !sourceFilePath
      ? MESSAGES.NO_FILE
      : 'Mở file PowerPoint gốc (chỉ đọc) bằng Microsoft PowerPoint';

  async function handleClick() {
    if (disabled) return;
    setBusy(true);
    try {
      const res = await PresentationService.openPresentation(sourceFilePath);
      if (!res || !res.ok) {
        await DialogService.errorAsync(
          (res && res.message) || (res && res.code === 'POWERPOINT_NOT_INSTALLED' ? MESSAGES.NOT_INSTALLED : MESSAGES.GENERIC),
        );
      }
    } catch {
      await DialogService.errorAsync(MESSAGES.GENERIC);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      id="btn-open-powerpoint"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'var(--surface-secondary)',
        border: '1px solid var(--surface-border)',
        borderRadius: '999px',
        padding: '0.35rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: installed ? 'var(--text-main)' : 'var(--text-muted, #94a3b8)',
        fontSize: '0.8125rem',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        ...style,
      }}
    >
      <MonitorPlay size={15} color="var(--primary)" />
      <span>{busy ? 'Đang mở…' : installed ? 'Mở PowerPoint' : 'Chưa cài PowerPoint'}</span>
    </button>
  );
}
