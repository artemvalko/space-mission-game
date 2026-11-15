// Hand-drawn line icon set (VISUAL_REDESIGN.md §1). 24×24 grid, stroke = currentColor, 1.5 px,
// round caps/joins, no fill. Drawn for this game — not copied from an icon library.
//
//   icon('battery')            → <svg aria-hidden="true">  (decorative, next to text)
//   icon('battery', 20, 'Battery') → <svg role="img" aria-label="Battery">
//
// Data files store icon ids (e.g. `icon: 'battery'`), never emoji.

import { s } from './dom.js';

// Each entry: SVG markup fragments (paths / circles / rects) on the 24×24 grid.
const P = {
  satellite: '<path d="M12 8.5 15.5 12 12 15.5 8.5 12z"/><path d="M3 7 7 3l3.5 3.5-4 4zM13.5 17.5l4-4L21 17l-4 4zM8.8 8.8l1.4 1.4M13.8 13.8l1.4 1.4M14.2 9.8 17 7"/><path d="M16.5 4.8a3 3 0 0 1 2.7 2.7"/>',
  antenna: '<path d="M12 11v10M8.5 21h7M8.6 7.6a4.8 4.8 0 0 1 6.8 0M6.1 5.1a8.3 8.3 0 0 1 11.8 0"/><circle cx="12" cy="10.5" r="1"/>',
  radio: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M7.5 9 16 4M7 13h3.5M7 16h3.5"/><circle cx="15.5" cy="14.5" r="2.5"/>',
  dish: '<path d="M4.5 6.5a9 9 0 0 0 13 13z"/><path d="M11 13l4.5-4.5"/><circle cx="16.5" cy="7.5" r="1.2"/><path d="M8.5 17.5 6.5 21h8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  panel: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M9 6v12M15 6v12M3 12h18"/>',
  battery: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3M6.5 10.5v3M10 10.5v3"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  orbit: '<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-20 12 12)"/>',
  rocket: '<path d="M12 2.5c3 2 4.5 5.5 4.5 9.5v5h-9v-5c0-4 1.5-7.5 4.5-9.5z"/><circle cx="12" cy="10" r="1.6"/><path d="m7.5 13-2.5 3v2.5h2.5M16.5 13l2.5 3v2.5h-2.5M10.5 20.5v1M13.5 20.5v1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  thermometer: '<path d="M10 14.3V5a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0z"/><path d="M12 9v8"/>',
  signal: '<path d="M5 19.5v-3M10 19.5v-6.5M15 19.5v-10M20 19.5V5"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.2A2.8 2.8 0 0 0 12 7.6c-1.4 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2.1-1.2 2.1-2.6 2.1a2.8 2.8 0 0 1-2.6-1.6M12 6v1.6M12 16.4V18"/>',
  weight: '<path d="M5.5 20.5h13l-2-11h-9z"/><circle cx="12" cy="6" r="2.2"/>',
  power: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  warning: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  flask: '<path d="M9 3h6M10 3v6.2L5 18.4A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3M7.4 15h9.2"/>',
  recycle: '<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3.5v3.6h-3.6M5.5 20.5v-3.6h3.6"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.5 3 3 3 5 1-1 1.5-2 1.5-3.5 2.5 2 5 4.5 5 7.5 0 3.4-2.6 6-6.5 6z"/>',
  wave: '<path d="M2.5 10c2-3 4-3 6 0s4 3 6 0 4-3 6 0M2.5 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
  layers: '<path d="m12 3.5 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  team: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.2a5 5 0 0 1 6 4.8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 18.5z"/>',
  rain: '<path d="M7 14.5h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.3 8.8 2.9 2.9 0 0 0 7 14.5zM8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
  storm: '<path d="M12 12a1.5 1.5 0 0 1 3 0 3 3 0 0 1-6 0 4.5 4.5 0 0 1 9 0 6 6 0 0 1-12 0 7.5 7.5 0 0 1 15 0"/>',
  chart: '<path d="M4 4v16h16M8.5 16v-4M12.5 16V8M16.5 16v-6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5a3 3 0 0 0 3 3M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  skip: '<path d="M5 5.5v13l8.5-6.5zM13.5 5.5v13L22 12"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  box: '<path d="m3 8 9-4 9 4v9l-9 4-9-4z"/><path d="m3 8 9 4 9-4M12 12v9M7.5 6l9 4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  home: '<path d="m4 11 8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
  map: '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  camera: '<path d="M3.5 8h3.5l2-3h6l2 3h3.5v11h-17z"/><circle cx="12" cy="13" r="3.5"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  wrench: '<path d="M15 3.5a5 5 0 0 0-4.6 7L3.8 17.1a2.1 2.1 0 0 0 3 3l6.6-6.6A5 5 0 0 0 20.5 9l-3 .9-2.4-2.4.9-3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  shield: '<path d="m12 3 8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  tank: '<path d="M6 7a6 3 0 0 1 12 0v10a6 3 0 0 1-12 0z"/><path d="M6 7a6 3 0 0 0 12 0"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  sail: '<path d="M12 3v15M12 4.5l7 12.5h-7M12 7l-6 10h6M4.5 20.5h15"/>',
  magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4"/>',
  decay: '<path d="M4 10.5a8 4 0 0 1 16 0"/><path d="M12 12v8.5M9 17.5l3 3 3-3"/>',
  tag: '<path d="M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
  mail: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21a2 2 0 0 1 2-2h13"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',
  print: '<path d="M7 9V3.5h10V9M7 17H4V9h16v8h-3"/><path d="M7 14h10v7H7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  eclipse: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
  mountain: '<path d="m2.5 19.5 7-11.5 4 6.5 2.5-4 5.5 9z"/>',
  feather: '<path d="M19.5 4.5c-8 0-13.5 5-13.5 12v3.5M6 16.5c7.5 0 13.5-4.5 13.5-12M9 13h6"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h6"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  flag: '<path d="M5.5 21V3.5M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
  swarm: '<circle cx="6" cy="7" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="12" cy="13" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="17" r="2"/>',
  tug: '<rect x="3" y="9" width="7" height="6" rx="1"/><path d="M10 12h5"/><path d="M15 8v8M15 8h3M15 16h3"/><circle cx="20.5" cy="12" r="1.5"/>',
  vote: '<path d="M4 12h16v8.5H4zM8 12l2-8h4l2 8M9 16h6"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17v.1"/>',
  bulb: '<path d="M9 18h6M10 21h4M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.8-1.5 1.9-1.5 3.5h-4c0-1.6-.6-2.7-1.5-3.5z"/>',
  truck: '<path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  vibrate: '<rect x="8" y="4" width="8" height="16" rx="1.5"/><path d="M4.5 8v8M2 10v4M19.5 8v8M22 10v4"/>',
  medal: '<path d="M8 3h8l-2 6h-4z"/><circle cx="12" cy="15" r="5.5"/><path d="m12 12.5.8 1.7 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.7.9.4-1.8-1.3-1.2 1.8-.2z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="10" r="1.8"/><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4"/>',
  inbox: '<path d="M3.5 13.5 6 5h12l2.5 8.5v6h-17zM3.5 13.5H9l1 2.5h4l1-2.5h5.5"/>',
  flagFinish: '<path d="M5.5 21V3.5M5.5 4.5h13v8h-13M9.5 4.5v8M13.5 4.5v8M5.5 8.5h13"/>',
  ruler: '<path d="m3.5 16.5 13-13 4 4-13 13z"/><path d="m7 13 2 2M10 10l1.5 1.5M13 7l2 2"/>',
  mirror: '<ellipse cx="12" cy="10" rx="6" ry="7"/><path d="M12 17v4M8.5 21h7M9.5 7.5l2-2"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};

export const ICON_NAMES = Object.keys(P);

/**
 * Inline SVG icon. `label` → role="img" + aria-label; otherwise aria-hidden (decorative next to text).
 * Unknown names fall back to a small dot (never an emoji).
 */
export function icon(name, size = 16, label = null) {
  const body = P[name] ?? P.dot;
  const el = s('svg', {
    class: `icon icon-${P[name] ? name : 'dot'}`, viewBox: '0 0 24 24', width: size, height: size,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    focusable: 'false',
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),
  });
  el.innerHTML = body;
  return el;
}

/** Same icon as an SVG <g> placed inside another SVG drawing (x, y = top-left, size in user units). */
export function svgIcon(name, x, y, size = 16, attrs = {}) {
  const g = s('g', { transform: `translate(${x} ${y}) scale(${size / 24})`, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs });
  g.innerHTML = P[name] ?? P.dot;
  return g;
}

/** "icon + text" inline group. */
export const withIcon = (name, text, size = 16) => [icon(name, size), ' ', text];

/** "Ada Lovelace" → "AL" (monogram circles instead of faces). */
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
