import 'dotenv/config';
import path from 'node:path';

function resolveDir(envVar: string | undefined, fallback: string): string {
  return path.resolve(process.cwd(), envVar ?? fallback);
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dataDir: resolveDir(process.env.DATA_DIR, './data'),
  extractedDir: resolveDir(process.env.EXTRACTED_DIR, './data/extracted'),
  configsDir: resolveDir(process.env.CONFIGS_DIR, './data/configs'),
  logsDir: resolveDir(process.env.LOGS_DIR, './data/logs'),
  tempDir: resolveDir(process.env.TEMP_DIR, './data/temp'),
  salesforce: {
    clientId: process.env.SF_CLIENT_ID ?? '',
    clientSecret: process.env.SF_CLIENT_SECRET ?? '',
    redirectUri: process.env.SF_REDIRECT_URI ?? 'http://localhost:3001/api/auth/callback',
  },
};
