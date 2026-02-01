import type { XTweet } from '@/actions/twitter-client';

export function classifyTweetKind(tweet: XTweet): string {
    if (tweet.text?.startsWith('RT @')) return 'repost';
    if (tweet.inReplyToUserId) return 'reply';
    return 'post';
}
