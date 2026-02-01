// 'use server';

// import { localDb } from '@/lib/local-db';

// export async function enableAutofetch(userId: string) {
//     const currentConfig = localDb.getCronConfig();

//     // If switching to a different user, reset backfill status
//     if (currentConfig && currentConfig.userId !== userId) {
//         // Clear old user's backfill status (they'll start fresh if re-enabled)
//         console.log(`[Autofetch] Switching from ${currentConfig.userId} to ${userId}`);
//     }

//     localDb.setCronConfig(userId, true);
//     return { success: true, message: `Auto-fetch enabled for user ${userId}` };
// }

// export async function disableAutofetch() {
//     const config = localDb.getCronConfig();
//     if (config) {
//         localDb.setCronConfig(config.userId, false);
//     }
//     return { success: true, message: 'Auto-fetch disabled' };
// }

// export async function getAutofetchStatus() {
//     const config = localDb.getCronConfig();
//     if (!config) return {
//         userId: '',
//         enabled: false,
//         backfillComplete: false,
//         tweetCount: 0,
//         rateLimited: false,
//         rateLimitWait: 0
//     };

//     const backfillComplete = localDb.isBackfillComplete(config.userId);
//     const tweetCount = localDb.getTweetCount(config.userId);
//     const oldestTweet = localDb.getOldestTweetTime(config.userId);
//     const latestTweet = localDb.getLatestTweetTime(config.userId);
//     const rateLimited = localDb.isRateLimited(config.userId);
//     const rateLimitWait = localDb.getRateLimitWaitTime(config.userId);

//     return {
//         ...config,
//         backfillComplete,
//         tweetCount,
//         oldestTweet,
//         latestTweet,
//         rateLimited,
//         rateLimitWait
//     };
// }
