import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import xummRoutes from './routes/xumm';
import credentialRoutes from './routes/createCredential';
import credentialListRoutes from './routes/credentialList';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (_req, res) => {
  res.json({
    message: 'Backend API Server',
    status: 'Running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);
app.use('/api', credentialRoutes);
app.use('/api', credentialListRoutes);
app.use('/api/xumm', xummRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;