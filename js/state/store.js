// Minimal Redux-style store. State changes ONLY through dispatch(action).
// State is deep-frozen after every update so accidental mutation throws (in strict mode).

function isSerializable(value) {
  if (value === null) return true;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return true;
  if (t === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isSerializable);
  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return false;
    return Object.values(value).every((v) => v === undefined || isSerializable(v));
  }
  return false;
}

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.values(obj).forEach(deepFreeze);
  }
  return obj;
}

export function createStore(reducer, initialState) {
  let state = deepFreeze(initialState);
  const listeners = new Set();
  const log = []; // every dispatched action, in order — replayable / syncable later

  function getState() {
    return state;
  }

  function dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('dispatch: action must be an object with a string "type"');
    }
    if (!isSerializable(action)) {
      throw new Error(`dispatch: action "${action.type}" is not plain serializable data`);
    }
    const prev = state;
    state = deepFreeze(reducer(state, action));
    log.push(action);
    if (state !== prev) listeners.forEach((fn) => fn(state, action));
    return action;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  const getLog = () => log.slice();

  return { getState, dispatch, subscribe, getLog };
}
