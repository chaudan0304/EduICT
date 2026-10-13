import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ClassroomToolsUpdateNotice({ onOpen }) {
  const [version, setVersion] = useState(null);
  useEffect(() => {
    let active = true;
    apiClient.post('/api/classroom-tools/version-check', {}, { timeout: 12000 })
      .then(result => { if (active && result.updateAvailable && result.runtime === 'desktop') setVersion(result.latestVersion); })
      .catch(() => { /* Opening the app must not depend on update-server access. */ });
    return () => { active = false; };
  }, []);
  if (!version) return null;
  return <button type="button" className="btn btn-outline btn-sm" onClick={onOpen} title="Mở công cụ để xem bản cập nhật">
    <Download size={16} /> Có bản {version}
  </button>;
}
