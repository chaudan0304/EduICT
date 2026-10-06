// Shared by the API and browser. Only extract a URL; never render pasted HTML.
export function normalizePowerPointEmbed(input) {
  const fail = () => { throw new Error('Hãy dán mã Embed (Nhúng) từ PowerPoint Online, không dùng link chia sẻ thông thường.'); };
  if (typeof input !== 'string' || input.length > 12000) fail();
  let value = input.trim();
  if (value.startsWith('<')) {
    if (!/^<iframe\b[^>]*>\s*<\/iframe>$/is.test(value)) fail();
    const src = value.match(/\ssrc\s*=\s*(["'])(.*?)\1/is);
    if (!src) fail();
    value = src[2];
  }
  value = value.replace(/&amp;/gi, '&').replace(/&#(?:0*38|x0*26);/gi, '&');
  if (value.length > 8192 || /[<>]/.test(value) || Array.from(value).some(c => c.charCodeAt(0) <= 32)) fail();
  let url;
  try { url = new URL(value); } catch { fail(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) fail();
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const oneDrive = host === 'onedrive.live.com' && pathname === '/embed' &&
    Boolean(url.searchParams.get('resid') || url.searchParams.get('id'));
  // Current OneDrive iframe links can encode embed mode in an I-prefixed token
  // instead of an em=2 query. Accept that document path unchanged, including
  // when the stored URL is validated again by the API or presentation viewer.
  const modernEmbedPath = /^\/p\/c\/[a-fA-F0-9]{16}\/I[A-Za-z0-9_-]{20,}\/?$/.test(url.pathname);
  const shortEmbed = host === '1drv.ms' && pathname.startsWith('/p/') &&
    (url.searchParams.get('em') === '2' || modernEmbedPath);
  const sharePoint = /^[a-z0-9][a-z0-9-]*\.sharepoint\.com$/.test(host) &&
    /^\/_layouts\/15\/(doc|wopiframe)\.aspx$/.test(pathname) &&
    url.searchParams.get('action')?.toLowerCase() === 'embedview';
  if (!oneDrive && !shortEmbed && !sharePoint) fail();
  url.hash = '';
  return url.href;
}

export function hasOnlinePowerPoint(lesson) {
  return Boolean(lesson?.online_embed_url) || lesson?.type === 'powerpoint_online';
}
