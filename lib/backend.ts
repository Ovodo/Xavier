export const backendBaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!url) return 'http://localhost:8000';
    return url;
};

export type DailyStat = {
    date: string;
    total: number;
    posts: number;
    replies: number;
    reposts: number;
    quotes: number;
    unknown: number;
};

export type DailyStatsResponse = {
    username: string;
    days: number;
    stats: DailyStat[];
};

export async function fetchDailyStats(username: string, days = 30): Promise<DailyStatsResponse> {
    const u = new URL('/stats/daily', backendBaseUrl());
    u.searchParams.set('username', username);
    u.searchParams.set('days', String(days));

    const res = await fetch(u.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    return res.json();
}

export async function fetchTweets(username: string, limit = 25): Promise<any[]> {
    const u = new URL('/tweets', backendBaseUrl());
    u.searchParams.set('username', username);
    u.searchParams.set('limit', String(limit));

    const res = await fetch(u.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    const data = await res.json();
    return data.tweets ?? [];
}

export async function ingestTweets(tweets: any[], source = 'x_api'): Promise<number> {
    const res = await fetch(new URL('/ingest', backendBaseUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, tweets }),
    });
    if (!res.ok) throw new Error(`Backend error ${res.status}`);
    const data = await res.json();
    return data.inserted || 0;
}

export async function fetchMetadata(key: string): Promise<string | null> {
    const res = await fetch(new URL(`/metadata/${key}`, backendBaseUrl()).toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.val || null;
}
