// Saved attempts + leaderboard in localStorage. All access is wrapped in try/catch: storage can
// be unavailable (private mode, blocked site data) and the game must still work without it.

const KEY = 'missionControl.attempts.v1';
const MAX = 200;

export function loadAttempts() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Save once per attempt key. Returns true if stored. */
export function saveAttempt(record) {
  try {
    const list = loadAttempts();
    if (list.some((a) => a.key === record.key)) return false;
    list.push(record);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    return true;
  } catch {
    return false;
  }
}

/** Top-n attempts for a scenario, best score first. */
export function leaderboard(scenarioId, n = 10) {
  return loadAttempts().filter((a) => a.scenarioId === scenarioId).sort((a, b) => b.total - a.total || a.at - b.at).slice(0, n);
}

/** The most recent earlier attempt at the same scenario (for "Compare attempts"). */
export function previousAttempt(record) {
  const list = loadAttempts().filter((a) => a.scenarioId === record.scenarioId && a.key !== record.key && a.at <= record.at);
  return list.sort((a, b) => b.at - a.at)[0] ?? null;
}

export function clearAttempts() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ── Achievement badges (unlocked forever, per browser)
const BADGE_KEY = 'missionControl.badges.v1';
let lastNew = [];

export function unlockedBadges() {
  try { return new Set(JSON.parse(localStorage.getItem(BADGE_KEY) ?? '[]')); } catch { return new Set(); }
}

/** Unlock badge ids; returns the ones that are new. */
export function unlockBadges(ids) {
  const have = unlockedBadges();
  const fresh = ids.filter((id) => !have.has(id));
  if (fresh.length) {
    fresh.forEach((id) => have.add(id));
    try { localStorage.setItem(BADGE_KEY, JSON.stringify([...have])); } catch { /* ignore */ }
  }
  lastNew = fresh;
  return fresh;
}
/** Badges unlocked by the most recent finished attempt (view-only, for the "NEW!" marks). */
export const newBadges = () => lastNew;
