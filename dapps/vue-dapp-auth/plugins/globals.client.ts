// Adjustment for AuthClient
// relying on the `global` field that webpack exposes (but vite doesn't)
window.global ||= window

export default {}
