// Test-only shim. next-auth/react reads process.env.NEXTAUTH_URL at module-eval
// time; in the Vite browser bundle `process` is undefined, which throws on
// import. Importing this module (as the first import in a spec) defines a
// minimal process.env so next-auth/react can evaluate.
/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;
g.process = g.process || {};
g.process.env = {
  ...(g.process.env || {}),
  NEXTAUTH_URL: "http://localhost:8080/api/auth",
  NODE_ENV: "test",
};
export {};
