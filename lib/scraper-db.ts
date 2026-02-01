// // import Database from 'better-sqlite3';
// import path from 'path';
// import fs from 'fs';

// // Ensure data directory exists in the root of the next-app
// const dbDir = path.join(process.cwd(), 'data');
// if (!fs.existsSync(dbDir)) {
//     fs.mkdirSync(dbDir);
// }

// const dbPath = path.join(dbDir, 'scraper.db');
// // const db = new Database(dbPath);

// // Initialize schema
// // db.exec(`
// //     CREATE TABLE IF NOT EXISTS tweets (
// //         id TEXT PRIMARY KEY,
// //         userId TEXT,
// //         username TEXT,
// //         text TEXT,
// //         createdAt TEXT,
// //         postedAt TEXT,
// //         kind TEXT,
// //         isReply INTEGER,
// //         replyTo TEXT,
// //         replyToHandle TEXT,
// //         metrics TEXT,
// //         url TEXT
// //     );
// //     CREATE TABLE IF NOT EXISTS metadata (
// //         key TEXT PRIMARY KEY,
// //         value TEXT
// //     );
// // `);

// // Backfill columns if the table already existed


// export interface StoredTweet {
//     id: string;
//     userId: string;
//     username: string;
//     text: string;
//     createdAt: string | null;
//     postedAt: string | null;
//     kind: string;
//     isReply: number;
//     replyTo: string;
//     replyToHandle: string;
//     metrics: string;
//     url: string;
// }

// export const scraperDb = {
//     clearAll: () => {
//         db.exec('DELETE FROM tweets');
//     },
//     saveTweets: (tweets: StoredTweet[]) => {
//         const stmt = db.prepare(`
//             INSERT OR REPLACE INTO tweets (id, userId, username, text, createdAt, postedAt, kind, isReply, replyTo, replyToHandle, metrics, url)
//             VALUES (@id, @userId, @username, @text, @createdAt, @postedAt, @kind, @isReply, @replyTo, @replyToHandle, @metrics, @url)
//         `);

//         const insertMany = db.transaction((items) => {
//             for (const item of items) stmt.run(item);
//         });

//         insertMany(tweets);
//     },

//     getTweetsByUserId: (userId: string): StoredTweet[] => {
//         // Order by ROWID ASC to preserve insertion order (newest scraped first)
//         // Scraper inserts tweets in order: newest first, oldest last
//         // Don't sort by createdAt since reposts have NULL createdAt
//         return db.prepare('SELECT * FROM tweets WHERE userId = ? ORDER BY ROWID ASC').all(userId) as StoredTweet[];
//     },

//     getTweetsByUserOrUsername: (identifier: string): StoredTweet[] => {
//         // Order by ROWID ASC to preserve insertion order (newest scraped first)
//         // Scraper inserts tweets in order: newest first, oldest last
//         // Don't sort by createdAt since reposts have NULL createdAt
//         return db.prepare('SELECT * FROM tweets WHERE userId = ? OR username = ? ORDER BY ROWID ASC')
//             .all(identifier, identifier) as StoredTweet[];
//     },

//     getTweetById: (id: string): StoredTweet | null => {
//         const row = db.prepare('SELECT * FROM tweets WHERE id = ?').get(id) as StoredTweet | undefined;
//         return row || null;
//     },

//     setLastFetchTime: (userId: string, time: string) => {
//         db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(`last_fetch_${userId}`, time);
//     },

//     getLastFetchTime: (userId: string): string | null => {
//         const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get(`last_fetch_${userId}`) as { value: string } | undefined;
//         return row ? row.value : null;
//     }
// };

// export default scraperDb;
