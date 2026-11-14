// Tiny DOM helpers. h('div', { class: 'card', onClick: fn }, [children...])

const SVG_NS = 'http://www.w3.org/2000/svg';

function setAttrs(el, attrs, isSvg) {
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'class' || k === 'className') {
      el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k === 'key') {
      el.dataset.key = v; // used to restore focus after re-render
    } else if (!isSvg && (k === 'value' || k === 'checked' || k === 'selected')) {
      el[k] = v;
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
}

function append(el, children) {
  for (const c of [children].flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Create an HTML element. */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  setAttrs(el, attrs, false);
  append(el, children);
  return el;
}

/** Create an SVG element. */
export function s(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs, true);
  append(el, children);
  return el;
}

/** Remove all children. */
export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Append children to an existing element, skipping null/false (Element.append would print them). */
export function mount(el, ...children) {
  append(el, children);
  return el;
}
