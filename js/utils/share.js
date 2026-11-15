// Share a design in the URL hash: #d=<base64url(JSON)>. Pure encode/decode (no DOM).

const toB64Url = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (b64) => decodeURIComponent(escape(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))));

/** { scenarioId, difficulty, design } → "d=…" hash fragment (without '#'). */
export function encodeDesign(state) {
  const { components, instrumentIds, orbitId, launcherId, deployerId, groundId, powerPack, kit, prep, variantId, satsPerLaunch } = state.design;
  const payload = { v: 1, s: state.scenarioId, df: state.difficulty, d: { components, instrumentIds, orbitId, launcherId, deployerId, groundId, powerPack, kit, prep, variantId, satsPerLaunch } };
  return `d=${toB64Url(JSON.stringify(payload))}`;
}

/** Hash string ("#d=…" or "d=…") → { scenarioId, difficulty, design } or null if invalid. */
export function decodeDesign(hash) {
  const m = /(?:^#?|&)d=([A-Za-z0-9_-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const p = JSON.parse(fromB64Url(m[1]));
    if (p?.v !== 1 || typeof p.s !== 'string' || typeof p.d !== 'object') return null;
    return { scenarioId: p.s, difficulty: p.df, design: p.d };
  } catch {
    return null;
  }
}
