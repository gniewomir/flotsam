/** Replaced at build time: `false` for production, `true` for e2e builds. */
declare const FLOTSAM_E2E: boolean;

/** ESM entry (see `vitest.setup.ts`); package typings target the package root only. */
declare module "vitest-chrome/lib/index.esm.js" {
  export const chrome: typeof import("vitest-chrome").chrome;
}
