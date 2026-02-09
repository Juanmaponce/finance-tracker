import { createApp } from './app';
import { config } from './config/env';
import { logger } from './lib/logger';
import { startRecurringCron } from './cron/recurring-transactions';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);

  // Start cron jobs
  startRecurringCron();
});

export { app };
