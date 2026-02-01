export type TweetKind = 'post' | 'reply' | 'repost' | 'quote' | 'unknown';

export type ScrapedTweet = {
    tweet_id: string;
    username: string;
    created_at: string | null; // For posts/quotes: when posted. For reposts: null (no repost timestamp available)
    posted_at?: string; // For reposts: original post timestamp
    kind: TweetKind;
    text: string;
    is_reply: boolean;
    replyto: string;
    reply_to_handle?: string;
    url: string;
    reply_count?: number | null;
    repost_count?: number | null;
    like_count?: number | null;
    view_count?: number | null;
    raw?: any;
};

export type UiStatRow = {
    date: string;
    posts: number;
    replies: number;
    reposts: number;
    quotes: number;
    unknown: number;
};

export interface TwitterDashboardProps {
    username: string;
    setUsername: (value: string) => void;
    userId: string;
    setUserId: (value: string) => void;
    busy: boolean;
    status: string;
    stats: UiStatRow[];
    tweets: any[];
    lastFetch: string | null;
    autofetchEnabled: boolean;
    autofetchUser: string;
    backfillComplete: boolean;
    backfillProgress: { count: number; oldest: string | null };
    rateLimited: boolean;
    rateLimitWait: number;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    activeKind: string;
    setActiveKind: (value: string) => void;
    startDate: string;
    setStartDate: (value: string) => void;
    endDate: string;
    setEndDate: (value: string) => void;
    activePreset: string;
    setActivePreset: (value: string) => void;
    sortOrder: "desc" | "asc";
    setSortOrder: (value: "desc" | "asc") => void;
    filteredStats: UiStatRow[];
    totals: {
        total: number;
        posts: number;
        replies: number;
        reposts: number;
        quotes: number;
        unknown: number;
    };
    filteredTweets: ScrapedTweet[];
    onFetchFromXApi: () => void;
    onToggleAutofetch?: () => void;
    onSetDatePreset: (preset: string) => void;
    onLoadAutofetchStatus?: () => void;
    onHandleLoadScraped: () => void;
}
