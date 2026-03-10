'use strict';

/**
 * roleMiddleware.js
 * ─────────────────
 * Factory function that returns middleware to guard routes by role.
 *
 * Usage:
 *   router.patch('/admin/files/:id/approve', protect, restrictTo('admin'), approveFile)
 *   router.post('/files/upload',             protect, restrictTo('student', 'admin'), uploadFile)
 *
 * MUST be placed after authMiddleware.protect (which sets req.user).
 */

const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Guard: protect middleware must have run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Run protect middleware before restrictTo.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorised to perform this action.`,
      });
    }

    next();
  };
};

module.exports = { restrictTo };
