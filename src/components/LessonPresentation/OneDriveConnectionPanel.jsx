import React from 'react';
import { Cloud, ExternalLink } from 'lucide-react';

export default function OneDriveConnectionPanel({ clientId, onClientId, busy, auth, onConnect, onCancel }) {
  return <section className="onedrive-connect-panel">
    <div className="linked-ppt-source online-ppt-source"><Cloud size={28} /><strong>Kết nối OneDrive cá nhân của bạn</strong><p>EduICT đọc tên file và tạo liên kết trình chiếu. Bạn đăng nhập trên trang Microsoft; không nhập mật khẩu hoặc client secret vào EduICT.</p></div>
    {!auth ? <form onSubmit={event => { event.preventDefault(); onConnect(); }}>
      <details className="onedrive-setup" open={!clientId}>
        <summary>Hướng dẫn đăng ký ứng dụng Microsoft một lần</summary>
        <ol>
          <li>Mở <a href="https://entra.microsoft.com/" target="_blank" rel="noopener noreferrer">Microsoft Entra</a> → Entra ID → App registrations → New registration. Đặt tên <strong>EduICT OneDrive</strong>.</li>
          <li>Chọn <strong>Personal Microsoft accounts only</strong> (hoặc lựa chọn có personal Microsoft accounts), rồi Register.</li>
          <li>Authentication → Advanced settings → <strong>Allow public client flows = Yes</strong> → Save. Không cần tạo client secret hoặc redirect URI cho luồng này.</li>
          <li>API permissions → Add a permission → Microsoft Graph → Delegated permissions → thêm <strong>Files.ReadWrite</strong>.</li>
          <li>Overview → sao chép <strong>Application (client) ID</strong> và dán vào ô bên dưới.</li>
        </ol>
        <p>Đăng ký cần tài khoản Azure có subscription hoạt động, tenant và quyền Application Developer. Nếu không mở được App registrations, cần người có quyền đăng ký hỗ trợ. <a href="https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app" target="_blank" rel="noopener noreferrer">Hướng dẫn Microsoft</a></p>
      </details>
      <label className="linked-ppt-field">Application (client) ID<input required maxLength={36} autoComplete="off" spellCheck={false} disabled={busy} value={clientId} onChange={event => onClientId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
      <p className="linked-ppt-help">Microsoft yêu cầu quyền Files.ReadWrite để tạo Embed; quyền này cho phép đọc/ghi file. EduICT dùng quyền để đọc metadata và tạo link cho file bạn xác nhận, không tải hoặc sửa nội dung PowerPoint.</p>
      <button className="btn btn-primary" disabled={busy || !clientId.trim()}>{busy ? 'Đang kết nối…' : 'Kết nối Microsoft'}</button>
    </form> : <div className="onedrive-device-code" role="status">
      <p>Mở trang Microsoft, nhập mã của phiên EduICT này rồi đăng nhập và đồng ý quyền ứng dụng.</p>
      <strong aria-label={`Mã đăng nhập ${auth.userCode}`}>{auth.userCode}</strong>
      <a className="btn btn-primary" href={auth.verificationUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Mở trang đăng nhập Microsoft</a>
      <p className="linked-ppt-help">Đang chờ bạn đăng nhập… Chỉ sử dụng mã đang hiển thị trong EduICT của bạn. Mã hết hạn lúc {new Date(auth.expiresAt).toLocaleTimeString('vi-VN')}.</p>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={onCancel}>Hủy đăng nhập</button>
    </div>}
  </section>;
}
