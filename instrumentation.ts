/**
 * Next.js Instrumentation Hook
 *
 * This file is called once when the Next.js server boots up.
 * Perfect for initializing background services like our cron job.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

// export async function register() {
//     if (process.env.NEXT_RUNTIME === 'nodejs') {
//         const { startCron } = await import('./lib/cron-service');

//         console.log('[Xavier] Initializing cron service...');
//         startCron();
//         console.log('[Xavier] ✓ Cron service initialized');
//     }
// }
