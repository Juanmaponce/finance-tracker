import cron from 'node-cron';
import { recurringService } from '../modules/recurring/recurring.service';
import { logger } from '../lib/logger';

export function startRecurringCron() {
  // Run daily at 00:05 UTC
  cron.schedule('5 0 * * *', async () => {
    logger.info('Starting recurring transactions cron job');

    try {
      const result = await recurringService.processRecurring();
      logger.info(
        `Recurring cron completed: ${result.processed}/${result.total} processed, ${result.errors} errors`,
      );
    } catch {
      logger.error('Recurring transactions cron failed unexpectedly');
    }
  });

  logger.info('Recurring transactions cron job scheduled (daily at 00:05 UTC)');
}
