// "Why?" popovers and glossary terms. One shared popover element lives on <body>.
// Popover visibility is view-only state, so it is not kept in the game store.

import { h } from './dom.js';
import { getTerm } from '../data/glossary.js';

let popover = null;
let anchor = null;

function ensurePopover() {
  if (popover) return popover;
  popover = h('div', { class: 'popover', role: 'dialog', hidden: true });
  document.body.append(popover);
  document.addEventListener('click', (e) => {
    if (!popover.hidden && !popover.contains(e.target) && e.target !== anchor) hidePopover();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePopover(); });
  window.addEventListener('resize', hidePopover);
  return popover;
}

export function showPopover(target, title, body) {
  const pop = ensurePopover();
  if (anchor === target && !pop.hidden) { hidePopover(); return; }
  anchor = target;
  pop.replaceChildren(
    h('div', { class: 'popover-title' }, title),
    ...[body].flat().map((t) => (t instanceof Node ? t : h('p', {}, t))),
  );
  pop.hidden = false;
  const r = target.getBoundingClientRect();
  const w = Math.min(340, window.innerWidth - 24);
  pop.style.width = `${w}px`;
  const left = Math.max(12, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 12));
  pop.style.left = `${left}px`;
  pop.style.top = `${r.bottom + window.scrollY + 8}px`;
}

export function hidePopover() {
  if (popover) popover.hidden = true;
  anchor = null;
}

/** A small "Why?" button that opens an explanation popover. */
export function whyButton(title, body, label = 'Why?') {
  const btn = h('button', {
    class: 'why-btn', type: 'button', 'aria-label': `Why: ${title}`,
    onClick: (e) => { e.stopPropagation(); showPopover(btn, title, typeof body === 'function' ? body() : body); },
  }, label);
  return btn;
}

/** Inline glossary term: dotted underline, click/focus shows the definition. */
export function term(termId, label) {
  const t = getTerm(termId);
  if (!t) return label ?? termId;
  const el = h('button', {
    class: 'term', type: 'button',
    onClick: (e) => { e.stopPropagation(); showPopover(el, t.term, t.text); },
  }, label ?? t.term);
  return el;
}
