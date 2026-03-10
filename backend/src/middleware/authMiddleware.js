'use strict';

const { admin } = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'vnrvjiet.in';

const protect = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Send: Authorization: Bearer <Firebase ID Token>'
      });
    }

    const idToken = authHeader.slice(7).trim();

    let decoded;

    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      logger.warn(`Token verification failed: ${err.message}`);

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please sign in again.'
      });
    }

    const { uid, email, name, picture } = decoded;

    // ── Admin override logic ─────────────────────────

    const ADMIN_EMAILS = [
      "vanneldaskrishnachaitanya@gmail.com"
    ];

    const emailLower = email.toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLower);

    // Block non-college users except admins

    if (!isAdmin && !emailLower.endsWith(`@${ALLOWED_DOMAIN}`)) {
      logger.warn(`Domain rejection → email: ${email}`);

      return res.status(403).json({
        success: false,
        message: `Access denied. Only @${ALLOWED_DOMAIN} accounts are permitted on this platform.`
      });
    }

    // ── Upsert user ─────────────────────────

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: {
          email: emailLower,
          name: name || emailLower.split('@')[0],
          avatarUrl: picture || null,
          lastLoginAt: new Date(),
          role: isAdmin ? "admin" : "student"
        },
        $setOnInsert: { firebaseUid: uid }
      },
      { upsert: true, new: true, runValidators: true }
    );

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    req.user = user;

    next();

  } catch (err) {

    logger.error(`authMiddleware error: ${err.message}`, err);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to a server error.'
    });

  }
};

module.exports = { protect };