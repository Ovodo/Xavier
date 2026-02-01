'use server';

// import { localDb, type StoredTweet } from '@/lib/local-db';
import { classifyTweetKind } from '@/lib/tweet-utils';
import clientPromise from '@/lib/mongo';
import type { ScrapedTweet, TweetKind } from '@/lib/types';

// Define MongoDB document type for tweets (using string _id for tweet IDs)
interface TweetDocument {
    _id: string;
    id: string;
    username: string;
    text: string;
    createdAt: string | null;
    postedAt: string | null;
    kind: TweetKind;
    isReply: boolean;
    replyTo: string;
    replyToHandle: string;
    replyCount: number | null;
    repostCount: number | null;
    likeCount: number | null;
    viewCount: number | null;
    url: string;
}



export type RateLimitInfo = {
    limit: string | null;
    remaining: string | null;
    reset: string | null;
    resetAt?: string;
};

export type ApiError = {
    status: number;
    message: string;
    rateLimit?: RateLimitInfo;
};

export type XTweet = {
    id?: string;
    text?: string;
    createdAt?: string;
    authorId?: string;
    editHistoryTweetIds?: string[];
    publicMetrics?: {
        reply_count?: number;
        retweet_count?: number;
        like_count?: number;
        impression_count?: number;
    };
    inReplyToUserId?: string;
    referencedTweets?: Array<{ id?: string; type?: string }>;
};

export type XUser = {
    id?: string;
    name?: string;
    username: string;
};

// export async function getLocalPosts(userId: string) {
//     const tweets = localDb.getTweetsByUserId(userId);
//     const lastFetch = localDb.getLastFetchTime(userId);
//     return {
//         data: tweets.map(t => ({
//             id: t.id,
//             text: t.text,
//             createdAt: t.createdAt,
//             kind: t.kind,
//             url: t.url,
//             publicMetrics: JSON.parse(t.metrics),
//             username: t.username
//         })),
//         lastFetch
//     };
// }

export async function getScrapedPosts(username: string) {
    try {
        // Connect to MongoDB
        const client = await clientPromise;
        const db = client.db('Xavier');
        const collection = db.collection<TweetDocument>(username);

        // Only show tweets from last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const cutoffDate = threeMonthsAgo.toISOString();

        // Get tweets from last 3 months (check both createdAt for posts and postedAt for reposts)
        // Return in database insertion order (already sorted chronologically)
        const tweets = await collection.find({}).toArray();


        // Get last fetch time from a metadata document
        const metaCollection = db.collection('_metadata');
        const meta = await metaCollection.findOne({ username, type: 'lastFetch' });

        return {
            data: tweets.map(t => ({
                id: t._id || t.id,
                text: t.text,
                createdAt: t.createdAt,
                postedAt: t.postedAt,
                kind: t.kind,
                url: t.url,
                publicMetrics: {
                    reply_count: t.replyCount,
                    retweet_count: t.repostCount,
                    like_count: t.likeCount,
                    impression_count: t.viewCount,
                },
                username: t.username,
                replyToHandle: t.replyToHandle || '',
                replyTo: t.replyTo || '',
                isReply: t.isReply || false,
            })),
            lastFetch: meta?.lastFetch || null,
        };
    } catch (error) {
        console.error('[MongoDB] Error getting tweets:', error);
        return {
            data: [],
            lastFetch: null,
        };
    }
}





export async function saveScrapedToMongo(username: string, tweets: ScrapedTweet[]): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        if (tweets.length === 0) {
            return { success: true, count: 0 };
        }

        // Connect to MongoDB
        const client = await clientPromise;
        const db = client.db('Xavier');
        const collection = db.collection<TweetDocument>(username);

        // Database was already cleared before scraping, just insert new tweets
        // Prepare tweets for MongoDB
        const currentTime = new Date().toISOString();
        const tweetsToSave: TweetDocument[] = tweets.map(t => ({
            _id: t.tweet_id, // Use tweet ID as MongoDB _id to prevent duplicates
            id: t.tweet_id,
            username: t.username,
            text: t.text,
            createdAt: t.created_at,
            postedAt: t.posted_at || null,
            kind: t.kind,
            isReply: t.is_reply || false,
            replyTo: t.replyto || '',
            replyToHandle: t.reply_to_handle || '',
            replyCount: t.reply_count || null,
            repostCount: t.repost_count || null,
            likeCount: t.like_count || null,
            viewCount: t.view_count || null,
            url: t.url,
        }));

        // Upsert tweets using bulkWrite to avoid hanging on duplicates
        const bulkOps = tweetsToSave.map(tweet => {
            const { _id, ...updateFields } = tweet;
            return {
                updateOne: {
                    filter: { _id },
                    update: {
                        $set: updateFields,
                    },
                    upsert: true
                }
            };
        });

        const result = await collection.bulkWrite(bulkOps);

        // Save last fetch time to metadata collection
        const metaCollection = db.collection('_metadata');
        await metaCollection.updateOne(
            { username, type: 'lastFetch' },
            { $set: { username, type: 'lastFetch', lastFetch: new Date().toISOString() } },
            { upsert: true }
        );

        console.log(`[MongoDB] Saved ${result.upsertedCount} new, updated ${result.modifiedCount} existing tweets for @${username}`);

        return {
            success: true,
            count: result.upsertedCount + result.modifiedCount
        };
    } catch (error: unknown) {


        console.error('[MongoDB] Error saving tweets:', error);
        return {
            success: false,
            count: 0,
            error: error instanceof Error ? error.message : 'Failed to save tweets to MongoDB'
        };
    }
}

export async function getMostRecentTweetDate(username: string): Promise<string | null> {
    try {
        const client = await clientPromise;
        const db = client.db('Xavier');
        const collection = db.collection<TweetDocument>(username);

        // Find the most recent tweet with a created_at field (not reposts)
        // Sort by createdAt descending, skip null values
        const mostRecent = await collection.findOne(
            { createdAt: { $ne: null } },
            { sort: { createdAt: -1 } }
        );

        if (mostRecent && mostRecent.createdAt) {
            return mostRecent.createdAt as string;
        }
        return null;
    } catch (error: unknown) {
        console.error('[MongoDB] Error getting most recent tweet date:', error);
        return null;
    }
}

export async function getMostRecentTweetId(username: string): Promise<string | null> {
    try {
        const client = await clientPromise;
        const db = client.db('Xavier');
        const collection = db.collection<TweetDocument>(username);

        // Find the most recently scraped tweet (highest savedAt)
        const mostRecent = await collection.findOne(
            {},
        );

        if (mostRecent && mostRecent._id) {
            return mostRecent._id as string;
        }
        return null;
    } catch (error) {
        console.error('[MongoDB] Error getting most recent tweet ID:', error);
        return null;
    }
}

export async function clearDatabase(username: string): Promise<{ success: boolean; deletedCount: number }> {
    try {
        const client = await clientPromise;
        const db = client.db('Xavier');
        const collection = db.collection<TweetDocument>(username);

        const deleteResult = await collection.deleteMany({});
        console.log(`[MongoDB] Cleared ${deleteResult.deletedCount} tweets for @${username}`);

        return {
            success: true,
            deletedCount: deleteResult.deletedCount
        };
    } catch (error) {
        console.error('[MongoDB] Error clearing database:', error);
        return {
            success: false,
            deletedCount: 0
        };
    }
}
