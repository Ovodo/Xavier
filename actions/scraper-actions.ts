'use server';

import { scrapeTwitter } from '@/lib/twitter-scraper';
import { saveScrapedToMongo, getMostRecentTweetDate, getMostRecentTweetId, clearDatabase } from '@/actions/twitter-client';

const authCookies = [
    {
        name: 'auth_token',
        value: process.env.AUTH_TOKEN || '',
        domain: '.twitter.com',
        path: '/',
        secure: true,
        httpOnly: true
    },
    {
        name: 'ct0',
        value: process.env.CT0 || '',
        domain: '.twitter.com',
        path: '/',
        secure: true
    }
];

export async function runScraper(username: string, daysBack?: number) {
    const startTime = Date.now();

    // Calculate smart daysBack if not provided
    let calculatedDaysBack = daysBack;
    if (!calculatedDaysBack) {
        // Check for most recent tweet with created _at (not reposts)
        const mostRecentDate = await getMostRecentTweetDate(username.trim());

        if (mostRecentDate) {
            // Calculate days since most recent tweet, add 5 days overlap
            const mostRecentTime = new Date(mostRecentDate).getTime();
            const now = Date.now();
            const daysSince = Math.ceil((now - mostRecentTime) / (24 * 60 * 60 * 1000));
            calculatedDaysBack = daysSince + 1; // At least 7 days, add 5 day overlap
            console.log(`[Server Action] Most recent tweet: ${mostRecentDate}, fetching ${calculatedDaysBack} days (${daysSince} + 5 day overlap)`);
        } else {
            // No previous tweets, fetch 1 month (30 days)
            calculatedDaysBack = 30;
            console.log(`[Server Action] No previous tweets found, fetching initial 90 days`);
        }
    }

    console.log(`[Server Action] Starting scraper for @${username}, daysBack=${calculatedDaysBack}`);

    // Clear the database before fetching for comparison
    await clearDatabase(username.trim());

    // Get most recent tweet ID from database for early termination check
    const lastKnownTweetId = await getMostRecentTweetId(username.trim());
    if (lastKnownTweetId) {
        console.log(`[Server Action] Last known tweet ID: ${lastKnownTweetId}`);
    }

    try {
        const result = await scrapeTwitter({
            username: username.trim(),
            daysBack: calculatedDaysBack,
            lastKnownTweetId,
            cookies: authCookies // Add cookies here if needed
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`[Server Action] ✅ Completed: ${result.tweets.length} tweets in ${duration}s (${result.stopReason})`);

        // Save scraped data to MongoDB (skip if no new tweets)
        if (result.tweets.length === 0) {
            console.log('[Server Action] No new tweets to save');
            return {
                success: true,
                count: 0,
                duration,
                stopReason: result.stopReason,
                mongoSaved: 0,
            };
        }


        const mongoResult = await saveScrapedToMongo(username.trim(), result.tweets);
        if (!mongoResult.success) {
            console.error('[Server Action] MongoDB save failed:', mongoResult.error);
        } else {
            console.log(`[Server Action] ✅ Saved ${mongoResult.count} tweets to MongoDB`);
        }

        return {
            success: true,
            count: result.tweets.length,
            duration,
            stopReason: result.stopReason,
            mongoSaved: mongoResult.success ? mongoResult.count : 0,
        };
    } catch (error: any) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.error(`[Server Action] ❌ Failed after ${duration}s:`, error?.message || String(error));

        return {
            success: false,
            count: 0,
            duration,
            error: error?.message || String(error),
        };
    }
}
