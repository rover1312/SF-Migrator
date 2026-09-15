import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import configRoutes from './routes/config.routes.js';
import extractRoutes from './routes/extract.routes.js';
import fieldsRoutes from './routes/fields.routes.js';
import loadRoutes from './routes/load.routes.js';
import objectsRoutes from './routes/objects.routes.js';
import validateRoutes from './routes/validate.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { config } from './utils/config.js';
import { ensureDataDirs } from './utils/files.js';
import { logger } from './utils/logger.js';

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
