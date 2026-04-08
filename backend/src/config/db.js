'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

let listenersAttached = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 12_000,
      connectTimeoutMS: 12_000,
      socketTimeoutMS: 20_000,
    });
    logger.info(`MongoDB connected → ${conn.connection.host}`);

    if (!listenersAttached) {
      mongoose.connection.on('disconnected', () =>
        logger.warn('MongoDB disconnected — will auto-retry')
      );
      mongoose.connection.on('error', (err) =>
        logger.error(`MongoDB runtime error: ${err.message}`)
      );
      listenersAttached = true;
    }

    return conn;
  } catch (err) {
    logger.error(`MongoDB connection failed (startup): ${err.message}`);
    throw err;
  }
};

module.exports = connectDB;
