// The real API is the safe default. Demo data is explicitly opt-in (true).
// CRA replaces REACT_APP_* variables at build time. Restart after changing .env.
export const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true";
