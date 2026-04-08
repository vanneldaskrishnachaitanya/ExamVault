'use strict';

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../src/config/db');
const { admin, initFirebase } = require('../src/config/firebase');
const User = require('../src/models/User');

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'vnrvjiet.in';
const email = (process.env.DEMO_FACULTY_EMAIL || 'faculty.demo@vnrvjiet.in').toLowerCase().trim();
const password = process.env.DEMO_FACULTY_PASSWORD || 'Faculty@123';
const displayName = process.env.DEMO_FACULTY_NAME || 'Faculty Demo';

const isFacultyEmail = (mail) => {
  const [localPart = '', domain = ''] = String(mail).split('@');
  return domain === ALLOWED_DOMAIN && /^[^0-9]/.test(localPart);
};

const ensureDemoFaculty = async () => {
  if (!isFacultyEmail(email)) {
    throw new Error(
      `DEMO_FACULTY_EMAIL must be a faculty-style @${ALLOWED_DOMAIN} email (local-part cannot start with a digit).`
    );
  }

  if (password.length < 6) {
    throw new Error('DEMO_FACULTY_PASSWORD must be at least 6 characters.');
  }

  initFirebase();

  let firebaseUser;

  try {
    firebaseUser = await admin.auth().getUserByEmail(email);
    firebaseUser = await admin.auth().updateUser(firebaseUser.uid, {
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true,
        disabled: false,
      });
    } else {
      throw err;
    }
  }

  let mongoSynced = false;
  try {
    await connectDB();
    const now = new Date();
    await User.findOneAndUpdate(
      { firebaseUid: firebaseUser.uid },
      {
        $set: {
          email,
          name: displayName,
          avatarUrl: null,
          role: 'faculty',
          isActive: true,
          lastSeenAt: now,
          lastLoginAt: now,
        },
        $setOnInsert: {
          firebaseUid: firebaseUser.uid,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    mongoSynced = true;
  } catch (err) {
    console.warn('Mongo sync skipped:', err.message);
    console.warn('The user will still be upserted on first backend login if MongoDB is online.');
  }

  console.log('Demo faculty account is ready.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Mongo synced: ${mongoSynced ? 'yes' : 'no'}`);
};

ensureDemoFaculty()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Failed to create demo faculty account:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  });
