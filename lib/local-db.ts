// import Database from 'better-sqlite3';
// import path from 'path';
// import fs from 'fs';

// // Ensure data directory exists in the root of the next-app
// const dbDir = path.join(process.cwd(), 'data');
// if (!fs.existsSync(dbDir)) {
//     fs.mkdirSync(dbDir);
// }

// const dbPath = path.join(dbDir, 'xavier-local.db');
// const db = new Database(dbPath);

// // Initialize schema
// db.exec(`
//     CREATE TABLE IF NOT EXISTS tweets (
//         id TEXT PRIMARY KEY,
//         userId TEXT,
//         username TEXT,
//         text TEXT,
//         createdAt TEXT,
//         kind TEXT,
//         metrics TEXT,
//         url TEXT
//     );
//     CREATE TABLE IF NOT EXISTS metadata (
//         key TEXT PRIMARY KEY,
//         value TEXT
//     );
// `);

// export interface StoredTweet {
//     id: string;
//     userId: string;
//     username: string;
//     text: string;
//     createdAt: string;
//     kind: string;
//     metrics: string;
//     url: string;
// }

// export const localDb = {
//     saveTweets: (tweets: StoredTweet[]) => {
//         const stmt = db.prepare(`
//             INSERT OR REPLACE INTO tweets (id, userId, username, text, createdAt, kind, metrics, url)
//             VALUES (@id, @userId, @username, @text, @createdAt, @kind, @metrics, @url)
//         `);

//         const insertMany = db.transaction((items) => {
//             for (const item of items) stmt.run(item);
//         });

//         insertMany(tweets);
//     },

//     getTweetsByUserId: (userId: string): StoredTweet[] => {
//         return db.prepare('SELECT * FROM tweets WHERE userId = ? ORDER BY createdAt DESC').all(userId) as StoredTweet[];
//     },

//     getLatestTweetTime: (userId: string): string | null => {
//         const row = db.prepare('SELECT MAX(createdAt) as latest FROM tweets WHERE userId = ?').get(userId) as { latest: string | null } | undefined;
//         return row?.latest || null;
//     },

//     getOldestTweetTime: (userId: string): string | null => {
//         const row = db.prepare('SELECT MIN(createdAt) as oldest FROM tweets WHERE userId = ?').get(userId) as { oldest: string | null } | undefined;
//         return row?.oldest || null;
//     },

//     getTweetCount: (userId: string): number => {
//         const row = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE userId = ?').get(userId) as { count: number } | undefined;
//         return row?.count || 0;
//     },

//     setLastFetchTime: (userId: string, time: string) => {
//         db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(`last_fetch_${userId}`, time);
//     },

//     getLastFetchTime: (userId: string): string | null => {
//         const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get(`last_fetch_${userId}`) as { value: string } | undefined;
//         return row ? row.value : null;
//     },

//     setMetadata: (key: string, value: string) => {
//         db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(key, value);
//     },

//     getMetadata: (key: string): string | null => {
//         const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as { value: string } | undefined;
//         return row ? row.value : null;
//     },

//     getCronConfig: (): { userId: string; enabled: boolean } | null => {
//         const userId = localDb.getMetadata('cron_user_id');
//         const enabled = localDb.getMetadata('cron_enabled') === 'true';
//         return userId ? { userId, enabled } : null;
//     },

//     setCronConfig: (userId: string, enabled: boolean) => {
//         localDb.setMetadata('cron_user_id', userId);
//         localDb.setMetadata('cron_enabled', enabled ? 'true' : 'false');
//     },

//     isBackfillComplete: (userId: string): boolean => {
//         return localDb.getMetadata(`backfill_complete_${userId}`) === 'true';
//     },

//     setBackfillComplete: (userId: string) => {
//         localDb.setMetadata(`backfill_complete_${userId}`, 'true');
//         localDb.setMetadata(`backfill_end_time_${userId}`, new Date().toISOString());
//     },

//     getBackfillTarget: (userId: string): string => {
//         // Target: 3 months ago from now
//         const threeMonthsAgo = new Date();
//         threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
//         return threeMonthsAgo.toISOString();
//     },

//     setRateLimitReset: (userId: string, resetTime: string) => {
//         localDb.setMetadata(`rate_limit_reset_${userId}`, resetTime);
//     },

//     getRateLimitReset: (userId: string): string | null => {
//         return localDb.getMetadata(`rate_limit_reset_${userId}`);
//     },

//     isRateLimited: (userId: string): boolean => {
//         const resetTime = localDb.getRateLimitReset(userId);
//         if (!resetTime) return false;

//         const resetDate = new Date(resetTime);
//         const now = new Date();
//         return now < resetDate;
//     },

//     getRateLimitWaitTime: (userId: string): number => {
//         const resetTime = localDb.getRateLimitReset(userId);
//         if (!resetTime) return 0;

//         const resetDate = new Date(resetTime);
//         const now = new Date();
//         const waitMs = resetDate.getTime() - now.getTime();
//         return Math.max(0, Math.ceil(waitMs / 1000)); // seconds
//     }
// };
