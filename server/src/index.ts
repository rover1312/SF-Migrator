import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import objectsRoutes from './routes/objects.routes';
import fieldsRoutes from './routes/fields.routes';
import extractRoutes from './routes/extract.routes';
import validateRoutes from './routes/validate.routes';
import loadRoutes from './routes/load.routes';
import configRoutes from './routes/config.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app: Application = express();
const PORT = config.port || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/objects', objectsRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/load', loadRoutes);
app.use('/api/config', configRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorMiddleware);

// Start server
if (config.nodeEnv !== 'test') {
  app.listen(PORT, () => {
    logger.info(`SF-Migrator Server running on port ${PORT}`);
  });
}

export default app;
