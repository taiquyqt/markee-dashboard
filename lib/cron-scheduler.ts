import cron, { ScheduledTask } from 'node-cron';
import { runAllCronTasks, runApiBalanceSupplierSync } from './cron-services';

// Pattern Singleton trên globalThis để tránh lặp lại Cron Task khi hot-reload hoặc re-init
const globalForCron = globalThis as unknown as {
  __cronInitialized?: boolean;
  __cronSyncTask?: ScheduledTask;
  __cronAlertTask?: ScheduledTask;
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

  const syncSchedule = process.env.CRON_SYNC_SCHEDULE || '0 7 * * *';
  const alertSchedule = process.env.CRON_ALERT_SCHEDULE || '0 8 * * *';

  console.log(`[Cron Scheduler] Initializing internal node-cron scheduler:`);
  console.log(`  - 1. Sync Balances: "${syncSchedule}" (7:00 AM Asia/Ho_Chi_Minh)`);
  console.log(`  - 2. Telegram Alerts: "${alertSchedule}" (8:00 AM Asia/Ho_Chi_Minh)`);

  try {
    // 1. Cron Job 7:00 AM: Đồng bộ số dư tự động từ nhà cung cấp (ShopAIKey, DataForSEO)
    globalForCron.__cronSyncTask = cron.schedule(
      syncSchedule,
      async () => {
        console.log(`[Cron Scheduler] ⏰ 7:00 AM Cron Job Triggered: Syncing API Balances from Suppliers...`);
        try {
          const res = await runApiBalanceSupplierSync();
          console.log('[Cron Scheduler] ✅ 7:00 AM API Balance Sync Completed:', JSON.stringify(res, null, 2));
        } catch (err) {
          console.error('[Cron Scheduler] ❌ Error in 7:00 AM API Balance Sync:', err);
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    // 2. Cron Job 8:00 AM: Kiểm tra số dư vừa sync & gửi Cảnh báo Telegram (Mốc 90% & 99% + AI & VPS)
    globalForCron.__cronAlertTask = cron.schedule(
      alertSchedule,
      async () => {
        console.log(`[Cron Scheduler] ⏰ 8:00 AM Cron Job Triggered: Checking Alerts & Expirations...`);
        try {
          const results = await runAllCronTasks();
          console.log('[Cron Scheduler] ✅ 8:00 AM Telegram Alert Checks Completed:', JSON.stringify(results, null, 2));
        } catch (err) {
          console.error('[Cron Scheduler] ❌ Error in 8:00 AM Telegram Alert Checks:', err);
        }
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    console.log('[Cron Scheduler] Both 7:00 AM and 8:00 AM node-cron tasks started successfully.');
  } catch (err) {
    console.error('[Cron Scheduler] Failed to schedule node-cron tasks:', err);
  }
}
