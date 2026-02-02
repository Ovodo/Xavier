import puppeteer from 'puppeteer-core';
import devPuppeteer from "puppeteer"
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { ScrapedTweet, TweetKind } from './types';
import chromium from '@sparticuz/chromium-min';

export interface ScrapeOptions {
    username: string;
    userAgent?: string;
    daysBack?: number;
    lastKnownTweetId?: string | null;
    cookies?: Array<{
        name: string;
        value: string;
        domain: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "Strict" | "Lax" | "None";
    }>;
}

export interface ScrapeResponse {
    tweets: ScrapedTweet[];
    stopReason?: string;
}

export async function scrapeTwitter(options: ScrapeOptions): Promise<ScrapeResponse> {
    const startTime = Date.now();
    const { username, userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', cookies = [], daysBack = 7, lastKnownTweetId = null } = options;
    const targetUrl = `https://x.com/${encodeURIComponent(username)}`;
    const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"


    let browser: any;

    if (process.env.NODE_ENV === 'production') {
        const executablePath = await chromium.executablePath(remoteExecutablePath);

        browser = await puppeteer.launch({
            executablePath,
            headless: true,
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--disable-setuid-sandbox',
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
        })
    } else {
        browser = await devPuppeteer.launch({
            headless: true,

        });
    }

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(userAgent);

        // Fill cookies if provided, and ensure they work for both domains
        if (cookies.length > 0) {
            const extendedCookies = cookies.flatMap(c => [
                { ...c, domain: '.x.com' },
                { ...c, domain: '.twitter.com' }
            ]);
            await browser.setCookie(...extendedCookies);
        }

        console.log(`[Scraper] Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`[Scraper] Page loaded, waiting for content...`);

        // Wait for tweet text to appear, then give the timeline a moment to hydrate
        await page.waitForSelector('[data-testid="tweetText"]', { timeout: 60000 }).catch(() => null);
        await new Promise(r => setTimeout(r, 8000));

        // Scroll and collect tweets until cutoff date or no new content
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - Number(daysBack || 90));

        const collectedById = new Map<string, any>();
        const targetHandle = username.toLowerCase().replace(/^@/, '');
        const maxIterations = 1000;
        let iterations = 0;
        let noNewCount = 0;
        let stopReason = '';

        console.log('[Scraper] Starting scroll collection...');

        while (iterations < maxIterations) {
            iterations += 1;
            const batch = await page.evaluate(() => {
                const container = document.querySelector('[aria-label*="Timeline"]') || document.querySelector('section[role="region"]');
                if (!container) return [];
                const articles = Array.from(container.querySelectorAll('article'));
                return articles.slice(0, 200).map((article) => {
                    // Get ALL status links and prioritize the one with the target username
                    const statusLinks = Array.from(article.querySelectorAll('a[href*="/status/"]'));
                    let href: string | null = null;

                    // First try to find a status link - any will do for now
                    // We'll validate the author later to filter out wrong tweets
                    if (statusLinks.length > 0) {
                        href = statusLinks[0].getAttribute('href');
                    }

                    // Get ALL tweetText elements - for reposts with comments, we want the FIRST one (the comment)
                    // For embedded/quoted tweets, there might be multiple tweetText elements
                    const tweetTextEls = article.querySelectorAll('[data-testid="tweetText"]');
                    let text = '';
                    if (tweetTextEls.length > 0) {
                        const firstTextEl = tweetTextEls[0];
                        // Extract text content
                        let textContent = (firstTextEl.textContent || '').trim();

                        // Also extract emoji alt text from images (Twitter renders some emojis as <img> tags)
                        const emojiImgs = firstTextEl.querySelectorAll('img[alt]');
                        if (emojiImgs.length > 0 && !textContent) {
                            // If no text content but we have emoji images, extract their alt text
                            textContent = Array.from(emojiImgs).map(img => img.getAttribute('alt') || '').join('');
                        } else if (emojiImgs.length > 0) {
                            // If we have both text and emojis, combine them by replacing image positions
                            // This is a simplified approach - just append emoji alt text
                            const emojiText = Array.from(emojiImgs).map(img => img.getAttribute('alt') || '').join('');
                            if (emojiText && !textContent.includes(emojiText)) {
                                textContent = textContent + emojiText;
                            }
                        }

                        text = textContent.trim();
                    }

                    const timeEl = article.querySelector('time');
                    const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
                    const social = article.querySelector('[data-testid="socialContext"]')?.textContent?.trim() || null;
                    let kind: 'post' | 'quote' | 'repost' = 'post';
                    let authorHref: string | null = null;
                    let authorText: string | null = null;
                    let authorHandle: string | null = null;
                    let promoted = false;

                    const pinned = !!(social && /pinned/i.test(social));

                    const anchors = Array.from(article.querySelectorAll('a[href]'));
                    for (const a of anchors) {
                        const h = a.getAttribute('href') || '';
                        if (!h.startsWith('/')) continue;
                        if (h.includes('/status/') || h.includes('/analytics')) continue;
                        const maybe = h.replace(/^\//, '').split(/[\/\?#]/)[0];
                        if (/^[A-Za-z0-9_]{1,30}$/.test(maybe)) { authorHref = h; authorText = a.textContent?.trim() || null; break; }
                    }

                    if (authorHref) {
                        const m = authorHref.match(/^\/([A-Za-z0-9_]{1,30})/);
                        if (m) authorHandle = '@' + m[1];
                    }
                    if (!authorHandle && authorText) {
                        const hm = authorText.match(/@([A-Za-z0-9_]{1,30})/);
                        if (hm) authorHandle = '@' + hm[1];
                    }

                    //Set Promoted
                    const spans = article.querySelectorAll('span');
                    for (const span of spans) {
                        const spanText = (span.textContent || '').trim();
                        if (spanText === 'Ad') {
                            promoted = true;
                            break;
                        }
                    }

                    // Reply detection heuristics
                    let isReply = false;
                    const inReplyTo: string | null = null;
                    let inReplyToHandle: string | null = null;
                    let embeddedAvatarUsername: string | null = null;


                    // Get the second User-Name element (first is main author, second is embedded/replied-to user)
                    const embeddedUserNameEls = article.querySelectorAll('[data-testid="User-Name"]');
                    const embeddedUserNameEl = embeddedUserNameEls.length > 1 ? embeddedUserNameEls[1] : null;
                    if (social && /reposted/i.test(social.trim())) {
                        const raw = embeddedUserNameEls[0]?.textContent?.trim() || '';
                        const username = raw.replace(/·/g, ' ')
                            .replace(/@[A-Za-z0-9_]+/g, '')
                            .replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/g, '')
                            .replace(/\d+[smhd]$/g, '')
                            .trim()
                            .split(/\s{2,}/)[0]; // Take first part before multiple spaces
                        const handleMatch = raw.match(/@([A-Za-z0-9_]{1,30})/);
                        if (handleMatch) inReplyToHandle = handleMatch[0];
                        isReply = true;
                        kind = 'repost'
                        embeddedAvatarUsername = username;

                    } else {

                        if (embeddedUserNameEl) {
                            const raw = (embeddedUserNameEl.textContent || '').trim();
                            if (raw) {
                                // extract handle like @BasedMikeLee
                                const handleMatch = raw.match(/@([A-Za-z0-9_]{1,30})/);

                                // Clean up: remove verified badges, handles, timestamps, dots
                                const username = raw.replace(/·/g, ' ')
                                    .replace(/@[A-Za-z0-9_]+/g, '')
                                    .replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/g, '')
                                    .replace(/\d+[smhd]$/g, '')
                                    .trim()
                                    .split(/\s{2,}/)[0]; // Take first part before multiple spaces

                                isReply = true;

                                kind = 'quote'
                                if (handleMatch) inReplyToHandle = handleMatch[1];

                                embeddedAvatarUsername = username;
                            }
                        }
                    }






                    // classify kind: repost > quote > post

                    return {
                        href,
                        text,
                        datetime,
                        socialContext: social,
                        authorHref,
                        authorText,
                        pinned,
                        promoted,
                        isReply,
                        inReplyTo: inReplyTo || embeddedAvatarUsername || null,
                        inReplyToHandle: inReplyToHandle || null,
                        authorHandle,
                        kind
                    };
                });
            });

            const beforeCount = collectedById.size;
            let skippedNoHref = 0;
            let skippedPromoted = 0;
            let skippedWrongAuthor = 0;
            let skippedNoId = 0;
            let skippedDupe = 0;
            let foundFirstTweet = false;
            let firstTweetId: string | null = null;

            for (const item of batch) {
                if (!item || !item.href) {
                    skippedNoHref++;
                    continue;
                }
                // Skip promoted posts
                if (item.promoted) {
                    skippedPromoted++;
                    continue;
                }
                const authorHandleNorm = (item.authorHandle || '').toLowerCase().replace(/^@/, '');
                if (authorHandleNorm !== targetHandle) {
                    skippedWrongAuthor++;
                    if (iterations === 1 && skippedWrongAuthor <= 3) {
                        console.log(`[Scraper] Skipping tweet - wrong author: '${authorHandleNorm}' !== '${targetHandle}'`);
                    }
                    continue;
                }
                const idMatch = item.href.match(/status\/(\d+)/);
                const id = idMatch ? idMatch[1] : null;
                if (!id) {
                    skippedNoId++;
                    continue;
                }
                if (collectedById.has(id)) {
                    skippedDupe++;
                    continue;
                }

                // Check for early termination: if this is the first tweet in the first iteration
                // and it matches the last known tweet ID from DB, we can stop
                if (iterations === 1 && !foundFirstTweet) {
                    foundFirstTweet = true;
                    firstTweetId = id;
                    if (lastKnownTweetId && id === lastKnownTweetId) {
                        stopReason = 'First tweet matches latest in database - no new tweets';
                        console.log(`[Scraper] ${stopReason}, stopping early`);
                        return {
                            tweets: [],
                            stopReason
                        };
                    }
                }

                collectedById.set(id, item);

                // Debug: Log first few reposts to see if text is being captured
                if (item.kind === 'repost' && collectedById.size <= 5) {
                    console.log(`[Scraper] Captured repost:`, {
                        id,
                        text: item.text,
                        textLength: item.text?.length || 0,
                        kind: item.kind,
                        socialContext: item.socialContext
                    });
                }
            }

            if (iterations <= 2 || (skippedNoHref + skippedPromoted + skippedWrongAuthor + skippedNoId + skippedDupe) > 0) {
                console.log(`[Scraper] Iteration ${iterations} filters: batch=${batch.length}, noHref=${skippedNoHref}, promoted=${skippedPromoted}, wrongAuthor=${skippedWrongAuthor}, noId=${skippedNoId}, dupe=${skippedDupe}, kept=${collectedById.size - beforeCount}`);
            }

            if (collectedById.size === beforeCount) {
                noNewCount += 1;
            } else {
                noNewCount = 0;
            }

            console.log(`[Scraper] Iteration ${iterations}: collected ${collectedById.size} tweets`);

            if (noNewCount >= 15) {
                stopReason = 'No new tweets after 15 scrolls';
                console.log(`[Scraper] ${stopReason}, stopping`);
                break;
            }

            const now = new Date();
            const maxAgeMs = 180 * 24 * 60 * 60 * 1000; // ignore obviously stale parses > 180d old
            const maxFutureMs = 24 * 60 * 60 * 1000; // ignore >1d in future
            const validDates: Date[] = [];
            for (const it of collectedById.values()) {
                if (!it.datetime) continue;
                // Only check cutoff for posts/quotes, not reposts
                // Reposts show the original post datetime which could be months old
                if (it.kind === 'repost') continue;
                const d = new Date(it.datetime);
                if (Number.isNaN(d.getTime())) continue;
                const age = now.getTime() - d.getTime();
                const future = d.getTime() - now.getTime();
                if (age < -maxFutureMs || age > maxAgeMs) continue; // drop outliers
                validDates.push(d);
            }
            const oldest = validDates.reduce((min, d) => (!min || d < min ? d : min), null as Date | null);

            if (oldest && oldest < cutoffDate) {
                stopReason = `Reached cutoff date ${cutoffDate.toISOString()}`;
                console.log(`[Scraper] ${stopReason}, stopping`);
                break;
            }

            // Scroll incrementally to avoid missing tweets
            // Instead of jumping to the very bottom, scroll by viewport height
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight * 2.5); // Scroll 250% of viewport height
            });

            // Wait for content to load
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!stopReason && iterations >= maxIterations) {
            stopReason = `Hit iteration limit ${maxIterations}`;
        }
        if (!stopReason) {
            stopReason = 'Completed scroll loop';
        }
        console.log(`[Scraper] Stop reason: ${stopReason}`);



        console.log(`[Scraper] Collected ${collectedById.size} unique tweets before final mapping`);

        // Sample first collected item for debugging
        if (collectedById.size > 0) {
            const firstItem = Array.from(collectedById.values())[0];
            console.log('[Scraper] Sample collected item:', {
                href: firstItem.href,
                text: (firstItem.text || '').substring(0, 50),
                datetime: firstItem.datetime,
                authorHandle: firstItem.authorHandle,
                kind: firstItem.kind,
                promoted: firstItem.promoted
            });
        }

        // Map articleSamples into ScrapedTweet-like objects
        // Note: For reposts, the datetime is the ORIGINAL post time, not when the repost occurred!
        // We preserve chronological order from scraping (newest first) instead of sorting by timestamp
        const scraped = Array.from(collectedById.values()).map((a: any) => {
            const href = a.href || '';
            const idMatch = href.match(/status\/(\d+)/) || href.match(/\/(\d+)(?:$|\?|#)/);
            const tweet_id = idMatch ? idMatch[1] : null;
            const datetime = a.datetime || new Date().toISOString();
            const url = href ? (href.startsWith('http') ? href : `https://x.com${href}`) : (tweet_id ? `https://x.com/${username}/status/${tweet_id}` : '');
            const kind = (a.kind || 'post') as TweetKind;

            // For reposts: no repost timestamp available, use null
            // For posts/quotes: datetime is actual post time
            const isRepost = kind === 'repost';

            return {
                tweet_id,
                username,
                created_at: isRepost ? null : datetime, // null for reposts - no repost timestamp available
                posted_at: isRepost ? datetime : undefined, // Store original post time for reposts
                kind,
                text: a.text || '',
                url,
                replyto: a.inReplyTo || '',
                reply_to_handle: a.inReplyToHandle || undefined,
                is_reply: !!a.isReply,
                reply_count: null,
                repost_count: null,
                like_count: null,
                view_count: null,
                raw: a
            } as ScrapedTweet;
        });

        console.log(`[Scraper] Mapped ${scraped.length} tweets, now applying filters...`);

        const beforeFilters = scraped.length;
        let filteredNoId = 0;
        let filteredShortText = 0;
        let filteredOnlyQuotes = 0;
        let filteredBadDate = 0;
        let filteredOutlier = 0;

        const filtered = scraped
            .filter((t: any) => {
                if (!t.tweet_id) {
                    filteredNoId++;
                    return false;
                }
                return true;
            })
            .filter((t: any) => {
                const text = (t.text || '').trim();
                // Allow very short text (including emoji-only reposts like "🔥🔥")
                // Only filter out completely empty text
                if (text.length === 0) {
                    filteredShortText++;
                    if (filteredShortText <= 2) {
                        console.log(`[Scraper] Filtering out tweet ${t.tweet_id} - empty text, kind: ${t.kind}`);
                    }
                    return false;
                }

                if (/^"*$/.test(text)) {
                    filteredOnlyQuotes++;
                    return false;
                }
                // For date validation, check posted_at for reposts, created_at for others
                const dateToCheck = t.posted_at || t.created_at;
                if (!dateToCheck) return true; // Skip validation if no date (e.g., reposts without posted_at)
                const d = new Date(dateToCheck);
                const now = new Date();
                const maxAgeMs = 180 * 24 * 60 * 60 * 1000;
                const maxFutureMs = 24 * 60 * 60 * 1000;
                if (Number.isNaN(d.getTime())) {
                    filteredBadDate++;
                    if (filteredBadDate <= 2) {
                        console.log(`[Scraper] Filtering out tweet - bad date: "${dateToCheck}"`);
                    }
                    return false;
                }
                const age = now.getTime() - d.getTime();
                const future = d.getTime() - now.getTime();
                if (age > maxAgeMs || future > maxFutureMs) {
                    filteredOutlier++;
                    if (filteredOutlier <= 2) {
                        console.log(`[Scraper] Filtering out tweet - outlier date: ${dateToCheck} (age: ${Math.round(age / (24 * 60 * 60 * 1000))}d)`);
                    }
                    return false;
                }
                return true;
            });
        // DO NOT SORT - preserve chronological order from scraping (newest first)
        // This is important because repost timestamps are misleading (they show original post time)

        console.log(`[Scraper] Filter results: before=${beforeFilters}, noId=${filteredNoId}, shortText=${filteredShortText}, onlyQuotes=${filteredOnlyQuotes}, badDate=${filteredBadDate}, outlier=${filteredOutlier}, after=${filtered.length}`);

        const endTime = Date.now();
        const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[Scraper] ✅ Scraping completed in ${durationSeconds}s`);

        return {
            tweets: filtered,
            stopReason,
        };


    } finally {
        await browser.close().catch((e) => console.log('[Scraper] Error closing browser:', e));
    }
}

