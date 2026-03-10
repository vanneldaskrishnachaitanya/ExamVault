'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB connected → ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () =>
      logger.warn('MongoDB disconnected — will auto-retry')
    );
    mongoose.connection.on('error', (err) =>
      logger.error(`MongoDB runtime error: ${err.message}`)
    );
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
