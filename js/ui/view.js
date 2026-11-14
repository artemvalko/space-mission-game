// Re-render hook for view-only UI state (modals, slides) that does not live in the store.
// main.js registers the real render function at startup.

let handler = () => {};
export const setRerender = (fn) => { handler = fn; };
export const rerender = () => handler();
