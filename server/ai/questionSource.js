// The preview and generation must use the same text; links alone are not slide content.
export function getQuestionSource(lesson) {
  const slides = (lesson.slides || []).slice(0, 30).filter(s => typeof s.content === 'string' && s.content.trim());
  let content = slides.map(s => `${s.title || ''}: ${s.content}`).join('\n');
  let kind = content ? 'slides' : 'empty';
  if (!content && typeof lesson.objectives === 'string' && lesson.objectives.trim()) {
    content = lesson.objectives;
    kind = 'objectives';
  }
  if (!content && typeof lesson.content_fingerprint === 'string' && lesson.content_fingerprint.trim()
    && !/^[a-f0-9]{32,128}$/i.test(lesson.content_fingerprint.trim())) {
    content = lesson.content_fingerprint;
    kind = 'summary';
  }
  return { content: content.slice(0, 12000), kind, slideCount: slides.length, truncated: content.length > 12000 };
}
