import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();

// Helmet security headers (configured to allow cross-origin resource access for public uploads)
// FIX (2026-09): helmet-in defolt CSP-si `script-src-attr 'none'` teyin edir.
// Bu, admin.html-deki BUTUN inline handler-leri (onclick / onchange / oninput /
// onsubmit) brauzer terefinden bloklayirdi -> duymelere klik edende HEC BIR SEY
// olmurdu (yan menyu isleyirdi, cunki o addEventListener ile baglanib).
// Asagida yalniz hemin bir direktiv yumsaldilir; script-src 'self' oz yerinde
// qalir, yeni kenar domenlerden skript yuklenmesi hele de bloklanir.
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src-attr": ["'unsafe-inline'"]
    }
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount public static uploads folder
// FIX (2026-09): serverless muhitde yuklemeler /tmp/uploads-a yazilir
// (storage.js ile eyni mentiq), lokalda ise layihe kokunde qalir.
const uploadsDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? '/tmp/uploads'
  : path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

// --- SERVE FRONTEND (Added for Unified Architecture) ---
const frontendPath = path.join(__dirname, '../../');
app.use(express.static(frontendPath));

// Route /admin to admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin.html'));
});


// CORS configuration (no wildcard * in production)
const allowedOrigins = [
  (process.env.CORS_ORIGIN || 'http://localhost:5500').replace(/['"]/g, ''),
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  'null'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('CORS xətası: Mənbəyə icazə verilmir. Origin: ' + origin));
    }
  },
  credentials: true
}));

// Cookie Parser is required for secure HTTP-only cookie sessions
app.use(cookieParser());

// Body parsers with payload restrictions
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', apiRouter); // Public routes

// SPA Fallback for frontend routes (must be before the API 404 handler)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Undefined API handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Müvafiq API tapılmadı.' }
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR HANDLER:', err);

  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Do not expose raw database/system issues in production
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'Daxili server xətası baş verdi.' : err.message
    }
  });
});

export default app;
