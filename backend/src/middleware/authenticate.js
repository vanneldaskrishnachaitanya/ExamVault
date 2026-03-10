/**
 * authenticate.js
 *
 * Accepts two types of tokens:
 *
 *  1. Firebase ID token  — issued after Google sign-in (students + admin Gmail)
 *  2. Admin JWT          — issued by POST /auth/admin-login (credential-based admins)
 *
 * Domain rule:
 *  - Students must use @vnrvjiet.in Google accounts
 *  - Admins may use any Gmail — verified via ADMIN_EMAILS whitelist in .env
 */

const jwt       = require('jsonwebtoken');
const { admin } = require('../config/firebase');
const User      = require('../models/User');
const { sendUnauthorized, sendForbidden, sendError } = require('../utils/apiResponse');
const logger    = require('../utils/logger');

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'vnrvjiet.in';
const JWT_SECRET     = process.env.JWT_SECRET || 'change-this-secret-in-production';

// Comma-separated list of admin Gmail addresses in .env
// e.g. ADMIN_EMAILS=vanneldaskrishnachaitanya@gmail.com,otheradmin@gmail.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email) =>
  email && ADMIN_EMAILS.includes(email.toLowerCase().trim());

const authenticate = async (req, res, next) => {
  try {
    // ── 1. Extract Bearer token ─────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided.');
    }
    const token = authHeader.split('Bearer ')[1].trim();

    // ── 2. Try Admin JWT first (sync, cheap) ────────────────────────────
    let jwtPayload = null;
    try {
      jwtPayload = jwt.verify(token, JWT_SECRET);
    } catch {
      // Not an admin JWT — fall through to Firebase
    }

    if (jwtPayload) {
      const user = await User.findById(jwtPayload.id);
      if (!user)             return sendUnauthorized(res, 'User not found.');
      if (!user.isActive)    return sendForbidden(res,   'Account deactivated.');
      if (user.role !== 'admin') return sendForbidden(res, 'Admin access required.');
      req.user = user;
      return next();
    }

    // ── 3. Firebase ID token path ───────────────────────────────────────
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      logger.warn(`Invalid Firebase token: ${err.message}`);
      return sendUnauthorized(res, 'Invalid or expired token. Please log in again.');
    }

    const { uid, email, name, picture } = decoded;
    const emailLower = email?.toLowerCase().trim();

    // ── 4. Domain / whitelist check ─────────────────────────────────────
    // Allow: @vnrvjiet.in students  OR  whitelisted admin Gmail accounts
    const isAllowedStudent = emailLower?.endsWith(`@${ALLOWED_DOMAIN}`);
    const isAllowedAdmin   = isAdminEmail(emailLower);

    if (!isAllowedStudent && !isAllowedAdmin) {
      logger.warn(`Domain rejected: ${email}`);
      return sendForbidden(res, `Only @${ALLOWED_DOMAIN} accounts are permitted.`);
    }

    // ── 5. Upsert user — set role to 'admin' automatically for admin emails
    const updatePayload = {
      $set: {
        email:       emailLower,
        name:        name || emailLower.split('@')[0],
        avatarUrl:   picture || null,
        lastLoginAt: new Date(),
      },
      $setOnInsert: { firebaseUid: uid },
    };

    // If this is a whitelisted admin email, always ensure role = admin
    if (isAllowedAdmin) {
      updatePayload.$set.role = 'admin';
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      updatePayload,
      { upsert: true, new: true, runValidators: false }
    );

    if (!user.isActive) return sendForbidden(res, 'Account deactivated.');

    req.user = user;
    next();

  } catch (err) {
    logger.error(`Auth error: ${err.message}`, err);
    return sendError(res, 'Authentication failed.', 500);
  }
};

module.exports = authenticate;
