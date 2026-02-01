// import cron, { ScheduledTask } from 'node-cron';
// import { fetchPostsWithTimeRange } from '@/actions/twitter-client';
// import { localDb } from './local-db';

// let cronTask: ScheduledTask | null = null;

// /**
//  * Cron Service for X API Post Fetching
//  * 
//  * Constraints:
//  * - Max 10 posts per request
//  * - Max 1 request every 15 minutes
//  * 
//  * Modes:
//  * 1. BACKFILL: One-time fetch of last 3 months (backwards from oldest tweet)
//  * 2. INCREMENTAL: Ongoing fetch of new posts (forward from latest tweet)
//  * 
//  * Logic:
//  * - Backfill mode: Fetches backwards until 3 months of data is collected
//  * - Incremental mode: Fetches only new posts since the latest tweet
//  * - Avoids re-fetching data already in the database
//  */

// async function executeFetch() {
//     const config = localDb.getCronConfig();

//     if (!config || !config.enabled) {
//         console.log('[Cron] Skipping: disabled or no user configured');
//         return;
//     }

//     const { userId } = config;

//     // Check if we're rate limited
//     if (localDb.isRateLimited(userId)) {
//         const waitTime = localDb.getRateLimitWaitTime(userId);
//         const waitMins = Math.ceil(waitTime / 60);
//         const resetTime = localDb.getRateLimitReset(userId);
//         const resetDate = new Date(resetTime);
//         const formattedTime = resetDate.toLocaleTimeString('en-US', {
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit',
//             hour12: true
//         });
//         console.log(`[Cron] ⏸️  Rate limited - skipping (cooldown: ${waitMins} min) | Next call available at: ${formattedTime}`);
//         return;
//     }

//     const isBackfillComplete = localDb.isBackfillComplete(userId);

//     if (!isBackfillComplete) {
//         await executeBackfill(userId);
//     } else {
//         await executeIncremental(userId);
//     }
// }

// /**
//  * Backfill Mode: Fetch historical data going backwards
//  */
// async function executeBackfill(userId: string) {
//     const now = new Date();
//     const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

//     const oldestTweetTime = localDb.getOldestTweetTime(userId);
//     const targetTime = localDb.getBackfillTarget(userId);
//     const tweetCount = localDb.getTweetCount(userId);

//     console.log(`[Cron/Backfill @ ${timestamp}] Fetching historical data for user: ${userId}`);
//     console.log(`[Cron/Backfill] Current tweets: ${tweetCount}, Target: 3 months ago (${targetTime})`);

//     // If we have tweets, fetch backwards from the oldest
//     // If no tweets yet, start from now
//     const endTime = oldestTweetTime || new Date().toISOString();
//     const startTime = targetTime; // 3 months ago

//     console.log(`[Cron/Backfill] Fetching posts between ${startTime} and ${endTime}`);

//     const result = await fetchPostsWithTimeRange(userId, startTime, endTime);

//     if (result.success) {
//         console.log(`[Cron/Backfill] ✓ Fetched ${result.count} posts`);

//         // Check if backfill is complete
//         if (result.count < 10) {
//             // Got fewer than 10 posts, likely reached the end
//             localDb.setBackfillComplete(userId);
//             console.log(`[Cron/Backfill] ✓✓ BACKFILL COMPLETE - Collected ${localDb.getTweetCount(userId)} total posts`);
//         } else {
//             // More posts available, continue on next run
//             const newOldest = localDb.getOldestTweetTime(userId);
//             console.log(`[Cron/Backfill] → More data available, oldest now: ${newOldest}`);
//         }
//     } else {
//         console.error(`[Cron/Backfill] ✗ Fetch failed: ${result.error}`);
//     }
// }

// /**
//  * Incremental Mode: Fetch only new posts since latest tweet
//  */
// async function executeIncremental(userId: string) {
//     const now = new Date();
//     const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

//     console.log(`[Cron/Incremental @ ${timestamp}] Fetching new posts for user: ${userId}`);

//     const latestTweetTime = localDb.getLatestTweetTime(userId);
//     const endTime = new Date().toISOString();
//     const startTime = latestTweetTime || new Date(Date.now() - 15 * 60 * 1000).toISOString();

//     console.log(`[Cron/Incremental] Fetching posts between ${startTime} and ${endTime}`);

//     const result = await fetchPostsWithTimeRange(userId, startTime, endTime);

//     if (result.success) {
//         console.log(`[Cron/Incremental] ✓ Successfully fetched ${result.count} new posts`);
//     } else {
//         console.error(`[Cron/Incremental] ✗ Fetch failed: ${result.error}`);
//     }
// }

// export function startCron() {
//     if (cronTask) {
//         console.log('[Cron] Already running');
//         return;
//     }

//     // Run every 15 minutes: */15 * * * *
//     cronTask = cron.schedule('*/15 * * * *', async () => {
//         await executeFetch();
//     });

//     console.log('[Cron] Started - will run every 15 minutes');

//     // Execute immediately on startup to get initial data
//     executeFetch();
// }

// export function stopCron() {
//     if (cronTask) {
//         cronTask.stop();
//         cronTask = null;
//         console.log('[Cron] Stopped');
//     }
// }

// export function getCronStatus(): { running: boolean; config: any } {
//     return {
//         running: cronTask !== null,
//         config: localDb.getCronConfig()
//     };
// }
