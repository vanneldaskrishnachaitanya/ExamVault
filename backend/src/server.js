'use strict';

require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB        = require('./config/db');
const { initFirebase } = require('./config/firebase');
const logger           = require('./utils/logger');

const authRoutes            = require('./routes/authRoutes');
const fileRoutes            = require('./routes/fileRoutes');
const { adminRouter }       = require('./routes/fileRoutes');
const reportRoutes          = require('./routes/reportRoutes');
const { adminReportRouter } = require('./routes/reportRoutes');
const folderRoutes          = require('./routes/folderRoutes');
const { notificationRouter, announcementRouter, bookmarkRouter, adminExtrasRouter } = require('./routes/newRoutes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());

// CORS — allow all Vercel deployments + localhost
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://exam-vault-ten.vercel.app',
  'https://vnr-academic-repository.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-admin-login'],
  credentials: true,
}));

app.options('*', cors());

app.use(morgan('dev', {
  stream: { write: (msg) => logger.debug(msg.trim()) }
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again in 15 minutes.' }
});

app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'VNRVJIET API is running', timestamp: new Date() });
});

app.use('/auth',          authLimiter, authRoutes);
app.use('/files',         fileRoutes);
app.use('/folders',       folderRoutes);
app.use('/reports',       reportRoutes);
app.use('/notifications', notificationRouter);
app.use('/announcements', announcementRouter);
app.use('/bookmarks',     bookmarkRouter);
app.use('/admin',         adminRouter);
app.use('/admin',         adminReportRouter);
app.use('/admin',         adminExtrasRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.path} → ${err.message}`, err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map(e => e.message) });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for: ${field}` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid value for: ${err.path}` });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: `File exceeds ${process.env.MAX_FILE_SIZE_MB || 25} MB limit` });
  }
  if (err instanceof require('multer').MulterError) {
    return res.status(415).json({ success: false, message: err.message });
  }

  const status = err.statusCode || err.status || 500;
  return res.status(status).json({ success: false, message: status < 500 ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    initFirebase();
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      logger.info(`Health endpoint → /health`);
    });

    const shutdown = (signal) => {
      logger.warn(`${signal} received — shutting down`);
      server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled rejection: ${reason}`);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
};

start();
