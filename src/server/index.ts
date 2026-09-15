import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.routes';
import configRoutes from './routes/config.routes';
import extractRoutes from './routes/extract.routes';
import fieldsRoutes from './routes/fields.routes';
import loadRoutes from './routes/load.routes';
import objectsRoutes from './routes/objects.routes';
import validateRoutes from './routes/validate.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { config } from './utils/config';
import { ensureDataDirs } from './utils/files';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/objects', objectsRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/load', loadRoutes);
app.use('/api/config', configRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  ensureDataDirs()
    .then(() => {
      app.listen(config.port, () => {
        logger.info(`SF-Migrator API listening on http://localhost:${config.port}`);
      });
    })
    .catch((err) => {
      logger.error('Failed to initialize data directories', err);
      process.exit(1);
    });
}

export default app;
