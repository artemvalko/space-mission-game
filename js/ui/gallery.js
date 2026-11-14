// Results "Image gallery" — pictures downlinked during the mission (Phase 4 adds the
// scanline reveal during operations; this renders the saved images).

import { h } from './dom.js';

let images = []; // view-only: [{ key, label, node }] collected during operations

export const addGalleryImage = (img) => { images = [...images.filter((x) => x.key !== img.key), img].slice(-12); };
export const clearGallery = () => { images = []; };

export function renderGallery() {
  return h('section', { class: 'panel' }, [
    h('h2', {}, '🖼️ Pictures from your mission'),
    images.length
      ? h('div', { class: 'gallery' }, images.map((img) => h('figure', {}, [img.node.cloneNode(true), h('figcaption', { class: 'small muted' }, img.label)])))
      : h('p', { class: 'muted' }, 'No pictures came home this time.'),
  ]);
}
