import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-2xl, 1.25rem)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-main, #0f172a)',
          margin: '2rem auto',
          maxWidth: '560px'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#ef4444'
          }}>
            <AlertCircle size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#ef4444' }}>
            {this.props.title || 'Đã xảy ra sự cố hiển thị'}
          </h3>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', margin: '0 auto 1.5rem', maxWidth: 440, lineHeight: 1.55 }}>
            {this.state.error?.message || 'Có lỗi không mong muốn xảy ra. Ứng dụng đã bảo vệ an toàn dữ liệu và ngăn treo toàn trang.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.875rem'
              }}
            >
              <RotateCcw size={16} />
              <span>Thử lại</span>
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem' }}
              >
                Đóng hộp thoại
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
