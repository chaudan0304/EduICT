/**
 * Hook resolver CHỈ dùng cho test Node: cho phép import tương đối không đuôi
 * (vd `./vietnameseSort`) giống resolver của Vite, để test được mã client trong
 * src/ mà KHÔNG phải sửa quy ước import của ứng dụng. Không thêm dependency.
 */
import path from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier)) {
    try {
      return await nextResolve(specifier + '.js', context);
    } catch {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
