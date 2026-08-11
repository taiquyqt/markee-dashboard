export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCronScheduler } = await import('./lib/cron-scheduler');
    initCronScheduler();
  }
}
