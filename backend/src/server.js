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

const {
  notificationRouter,
  announcementRouter,
  bookmarkRouter,
  savedItemRouter,
  adminExtrasRouter,
  ratingRouter,
  historyRouter,
  searchRouter,
  branchRouter,
  eventRouter,
  examRouter,
  codingRouter,
  syllabusRouter,
  timetableRouter,
  statsRouter,
  feedbackRouter,
  quoteRouter, pollRouter, songRouter,
} = require('./routes/newRoutes');
const { seedCodingData } = require('./controllers/codingController');

const { seedBranches } = require('./controllers/branchController');

const app = express();
app.set('trust proxy', 1);

const runtimeStatus = {
  firebase: false,
  mongo: false,
};

app.use(helmet());

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.get('/', (_req, res) => {
  res.status(200).json({ success: true, message: 'VNRVJIET API is running. Visit /health for status.' });
});

app.get('/health', (_req, res) => {
  const degraded = !runtimeStatus.firebase || !runtimeStatus.mongo;
  res.status(200).json({
    success: true,
    message: degraded ? 'VNRVJIET API is running in degraded mode' : 'VNRVJIET API is running',
    dependencies: runtimeStatus,
    timestamp: new Date(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.use('/auth',          authLimiter, authRoutes);
app.use('/files',         fileRoutes);
app.use('/folders',       folderRoutes);
app.use('/reports',       reportRoutes);
app.use('/notifications', notificationRouter);
app.use('/announcements', announcementRouter);
app.use('/bookmarks',     bookmarkRouter);
app.use('/saved-items',   savedItemRouter);
app.use('/ratings',       ratingRouter);
app.use('/downloads',     historyRouter);
app.use('/search',        searchRouter);
app.use('/branches',      branchRouter);
app.use('/events',        eventRouter);
app.use('/exams',         examRouter);
app.use('/coding',        codingRouter);
app.use('/syllabus',      syllabusRouter);
app.use('/timetable',     timetableRouter);
app.use('/stats',         statsRouter);
app.use('/feedback',      feedbackRouter);
app.use('/quotes',        quoteRouter);
app.use('/polls',         pollRouter);
app.use('/songs',         songRouter);
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
    return res.status(400).json({ success: false, message: `File exceeds the size limit. Please use an image under 15MB.` });
  }
  if (err instanceof require('multer').MulterError) {
    return res.status(415).json({ success: false, message: err.message });
  }
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({ success: false, message: status < 500 ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  const bootstrapDependencies = async () => {
    try {
      initFirebase();
      runtimeStatus.firebase = true;
    } catch (err) {
      runtimeStatus.firebase = false;
      logger.error(`Continuing without Firebase at startup: ${err.message}`);
    }

    try {
      await connectDB();
      runtimeStatus.mongo = true;
    } catch (err) {
      runtimeStatus.mongo = false;
      logger.error(`Continuing without MongoDB at startup: ${err.message}`);
    }

    if (runtimeStatus.mongo) {
      try {
        await seedBranches();
      } catch (err) {
        logger.warn(`Branch seeding skipped: ${err.message}`);
      }

      // Seed coding platforms (needs first admin user)
      try {
        const User = require('./models/User');
        const admin = await User.findOne({ role: 'admin' });
        if (admin) await seedCodingData(admin._id);
      } catch (err) {
        logger.warn(`Coding seed skipped: ${err.message}`);
      }
    }
  };

  const retryDependencies = async () => {
    if (!runtimeStatus.firebase) {
      try {
        initFirebase();
        runtimeStatus.firebase = true;
        logger.info('Firebase dependency recovered');
      } catch (err) {
        logger.warn(`Firebase retry failed: ${err.message}`);
      }
    }

    if (!runtimeStatus.mongo) {
      try {
        await connectDB();
        runtimeStatus.mongo = true;
        logger.info('MongoDB dependency recovered');
      } catch (err) {
        logger.warn(`MongoDB retry failed: ${err.message}`);
      }
    }
  };

  await bootstrapDependencies();

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    logger.info(`Health endpoint → /health`);
  });

  const retryTimer = setInterval(() => {
    retryDependencies().catch((err) => logger.error(`Dependency retry loop failed: ${err.message}`));
  }, 30_000);
  retryTimer.unref();

  const shutdown = (signal) => {
    logger.warn(`${signal} received — shutting down`);
    clearInterval(retryTimer);
    server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason, promise) => {
    // Log but do NOT exit — a single rejected promise should not crash the server.
    // Render will restart the process on real crashes (uncaughtException).
    logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.stack : JSON.stringify(reason)}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.stack}`);
    server.close(() => process.exit(1));
  });
};

start();