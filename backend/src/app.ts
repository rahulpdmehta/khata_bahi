import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import authRoutes from './modules/auth/auth.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import editRequestRoutes from './modules/editRequests/editRequest.routes';
import settlementRoutes from './modules/settlements/settlement.routes';
import userRoutes from './modules/users/user.routes';
import centerRoutes from './modules/centers/center.routes';
import masterDataRoutes from './modules/masterData/masterData.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = env.CORS_ORIGIN;
      if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/edit-requests', editRequestRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/admin/users', userRoutes);
app.use('/api/v1/admin/centers', centerRoutes);
app.use('/api/v1/master-data', masterDataRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };
export default app;
