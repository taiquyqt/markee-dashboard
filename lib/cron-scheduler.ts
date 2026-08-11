import cron, { ScheduledTask } from 'node-cron';
import { runAllCronTasks } from './cron-services';

// Pattern Singleton trên globalThis để tránh lặp lại Cron Task khi hot-reload hoặc re-init
const globalForCron = globalThis as unknown as {
  __cronInitialized?: boolean;
  __cronScheduledTask?: ScheduledTask;
};

export function initCronScheduler() {
  // Chỉ chạy duy nhất trên Node.js Server-side
  if (typeof window !== 'undefined') {
    return;
  }

  if (globalForCron.__cronInitialized) {
    console.log('[Cron Scheduler] Cron scheduler already initialized. Skipping duplicate initialization.');
    return;
  }

  globalForCron.__cronInitialized = true;

  // Lịch chạy mặc định: 8:00 AM mỗi ngày ("0 8 * * *")
  const cronSchedule = process.env.CRON_SCHEDULE || '0 8 * * *';

  console.log(`[Cron Scheduler] Initializing node-cron internal scheduler with schedule: "${cronSchedule}"`);

  try {
    globalForCron.__cronScheduledTask = cron.schedule(
      cronSchedule,
      async () => {
        console.log(`[Cron Scheduler] ⏰ Daily Cron Job Triggered at 8:00 AM (${new Date().toISOString()})`);
        try {
          const results = await runAllCronTasks();
          console.log('[Cron Scheduler] ✅ Daily Cron Job Completed successfully:', JSON.stringify(results, null, 2));
        } catch (err) {
          console.error('[Cron Scheduler] ❌ Error executing daily cron tasks:', err);
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    console.log('[Cron Scheduler] Node-cron scheduler started successfully.');
  } catch (err) {
    console.error('[Cron Scheduler] Failed to schedule node-cron task:', err);
  }
}
