// src/auth/adminWhitelist.js
// ─────────────────────────────────────────────────────────────
// Add or remove admin Gmail addresses here.
// Only these exact emails can access the /admin-login route
// and the /admin panel.
//
// Format: lowercase full Gmail address
// ─────────────────────────────────────────────────────────────

export const ADMIN_WHITELIST = [
  'vanneldaskrishnachaitanya@gmail.com',
  // 'nextemail@gmail.com',   ← uncomment and add more here later
];

/**
 * Returns true if the given email is in the admin whitelist.
 * Case-insensitive check.
 */
export const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_WHITELIST.includes(email.toLowerCase().trim());
};
