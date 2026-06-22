/**
 * Default seeded admin credentials.
 *
 * The default password is a publicly-known value, so any account still using it
 * is forced to set a new one on first login — enforced in two places that both
 * import from here (keep them in sync):
 *   - scripts/seed.ts seeds the admin with `mustChangePassword: true`
 *   - authorize() in src/lib/auth.ts flags the account if the password entered
 *     at login still equals this default (catches pre-existing accounts too)
 */
export const DEFAULT_ADMIN_EMAIL = "admin@trailglidersacademy.com.ng";
export const DEFAULT_ADMIN_NAME = "Site Administrator";
export const DEFAULT_ADMIN_PASSWORD = "TrailGliders2026!";
