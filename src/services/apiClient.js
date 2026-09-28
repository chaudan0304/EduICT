// apiClient — HTTP client dùng chung cho frontend EduICT.
//
// Mục tiêu (Giai đoạn 1): chuẩn hóa fetch + parse JSON + xử lý lỗi + timeout
// mà KHÔNG đổi API contract (URL, method, body, response, status giữ nguyên).
//
// Quy ước:
//   - Thành công (res.ok): trả về JSON đã parse (hoặc null nếu body rỗng).
//   - Thất bại HTTP / mạng / timeout: NÉM ApiError với message theo đúng
//     định dạng cũ ("Lỗi máy chủ (<status>)" hoặc data.error) để các call
//     site đang đọc err.message giữ nguyên trải nghiệm.
//   - Call site muốn "graceful degradation" (trả default khi lỗi) vẫn tự
//     bọc try/catch như hiện tại.

const DEFAULT_TIMEOUT = 30000;

class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(method, url, body, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, headers = {}, signal } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const init = { method, headers: { ...headers }, signal: signal || controller.signal };
  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new ApiError(`Hết thời gian chờ máy chủ (${timeout}ms)`, { status: 0 });
    }
    throw new ApiError(err?.message || 'Không thể kết nối tới máy chủ', { status: 0 });
  }
  clearTimeout(timer);

  const data = await parseBody(res);
  if (!res.ok) {
    const message = (data && data.error) || `Lỗi máy chủ (${res.status})`;
    throw new ApiError(message, { status: res.status, data });
  }
  return data;
}

const apiClient = {
  get: (url, options) => request('GET', url, null, options),
  post: (url, body, options) => request('POST', url, body, options),
  put: (url, body, options) => request('PUT', url, body, options),
  delete: (url, options) => request('DELETE', url, null, options),
  request,
  ApiError,
};

export default apiClient;
export { ApiError };
