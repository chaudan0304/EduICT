// Authored slides render directly in React; only converted PowerPoint pages
// depend on the background image renderer.
export const needsRenderedImage = slide => ['IMPORTED_SLIDE', 'PPTX_SLIDE'].includes(slide.type);
export const isSlideReady = slide => !needsRenderedImage(slide) || (
  ['ready', 'completed'].includes(String(slide.render_status || slide.status || '').toLowerCase())
  && Boolean((slide.image_url || slide.imageUrl || '').trim())
);
