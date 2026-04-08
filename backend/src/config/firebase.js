'use strict';

const admin  = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Initialise Firebase Admin SDK once.
 * Called from server.js before the HTTP server starts.
 */
const initFirebase = () => {
  if (admin.apps.length > 0) return; // guard against double-init

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    logger.error('Firebase env vars missing. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    throw new Error('Firebase env vars missing');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // .env stores newlines as literal \n — convert back before use
        privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    logger.info('Firebase Admin SDK initialised');
  } catch (err) {
    logger.error(`Firebase init failed: ${err.message}`);
    throw err;
  }
};

module.exports = { admin, initFirebase };
