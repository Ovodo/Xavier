"use client";

import { runScraper } from "@/actions/scraper-actions";
import { getScrapedPosts } from "@/actions/twitter-client";
import { classifyTweetKind } from "@/lib/tweet-utils";
import { ScrapedTweet, UiStatRow } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { TwitterDashboardUI } from "./ui";

export default function Page() {
  const [username, setUsername] = useState("elonmusk");
  const [userId, setUserId] = useState(process.env.NEXT_PUBLIC_MUSK_ID || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [stats, setStats] = useState<UiStatRow[]>([]);
  const [tweets, setTweets] = useState<ScrapedTweet[]>([]);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [autofetchEnabled, setAutofetchEnabled] = useState(false);
  const [autofetchUser, setAutofetchUser] = useState("");
  const [backfillComplete, setBackfillComplete] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({
    count: 0,
    oldest: null as string | null,
  });
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitWait, setRateLimitWait] = useState(0);
  // NEW Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKind, setActiveKind] = useState<string>("all");
  // Date range filter
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("all");
  // Sort order
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (userId.trim()) {
      handleLoadScraped();
    }
  }, [userId]);

  // useEffect(() => {
  //   loadAutofetchStatus();
  // }, []);

  // Auto-refresh status and tweets during backfill
  useEffect(() => {
    if (autofetchEnabled && !backfillComplete) {
      const interval = setInterval(async () => {
        // await loadAutofetchStatus();
        await handleLoadScraped(); // Reload tweets from scraper database
      }, 300000); // Refresh every 5 minutes during backfill

      return () => clearInterval(interval);
    }
  }, [autofetchEnabled, backfillComplete]);

  // async function loadAutofetchStatus() {
  //   const status = await getAutofetchStatus();
  //   setAutofetchEnabled(status.enabled);
  //   setAutofetchUser(status.userId);
  //   setBackfillComplete(status.backfillComplete);
  //   setRateLimited(status.rateLimited || false);
  //   setRateLimitWait(status.rateLimitWait || 0);
  //   if ("oldestTweet" in status) {
  //     setBackfillProgress({
  //       count: status.tweetCount,
  //       oldest: status.oldestTweet,
  //     });
  //   }
  // }

  // async function toggleAutofetch() {
  //   if (autofetchEnabled) {
  //     await disableAutofetch();
  //     setAutofetchEnabled(false);
  //     return;
  //   }
  //   await enableAutofetch(userId.trim());
  //   setAutofetchEnabled(true);
  //   setAutofetchUser(userId.trim());
  // }

  async function handleLoadScraped() {
    try {
      const identifier = username.trim() || userId.trim();
      if (!identifier) return;
      const local = await getScrapedPosts(identifier);
      if (local.data.length > 0) {
        processTweets(local.data);
        setLastFetch(local.lastFetch);
        // setTimeout(() => {
        setStatus("Updated");
        // }, 3000);
      } else {
        setTweets([]);
        setStats([]);
        setStatus("No scraped data found for this user");
      }
      // Refresh autofetch status to get latest counts
      // loadAutofetchStatus();
    } catch (e) {
      console.error("Local load failed", e);
    }
  }

  // Filter stats by date range and fill missing dates
  const filteredStats = useMemo(() => {
    // First filter by date range
    const filtered = stats.filter((s) => {
      const d = new Date(s.date);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate + "T23:59:59")) return false;
      return true;
    });

    // If we have a date range, fill in missing dates
    if (startDate && endDate && filtered.length > 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateMap = new Map(filtered.map((s) => [s.date, s]));
      const result: UiStatRow[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        result.push(
          dateMap.get(dateStr) || {
            date: dateStr,
            posts: 0,
            replies: 0,
            reposts: 0,
            quotes: 0,
            unknown: 0,
          },
        );
      }
      return result;
    }

    return filtered;
  }, [stats, startDate, endDate]);

  const totals = useMemo(() => {
    let total = 0,
      posts = 0,
      replies = 0,
      reposts = 0,
      quotes = 0,
      unknown = 0;
    for (const s of filteredStats) {
      posts += s.posts;
      replies += s.replies;
      reposts += s.reposts;
      quotes += s.quotes;
      unknown += s.unknown;
    }
    total = posts + replies + reposts + quotes + unknown;
    return { total, posts, replies, reposts, quotes, unknown };
  }, [filteredStats]);

  // Step 1: Filter tweets (cached, doesn't depend on sortOrder)
  const filtered = useMemo(() => {
    const startTime = startDate ? new Date(startDate).getTime() : null;
    const endTime = endDate ? new Date(endDate + "T23:59:59").getTime() : null;

    const withTimestamps = tweets.map((t) => {
      // Use posted_at for reposts (when created_at is null), otherwise use created_at
      const dateForFiltering = t.created_at || t.posted_at;
      const ts = dateForFiltering ? new Date(dateForFiltering).getTime() : 0;
      return {
        ...t,
        _ts: Number.isNaN(ts) ? 0 : ts,
        _sortDate: dateForFiltering,
      };
    });

    return withTimestamps.filter((t) => {
      const matchSearch = (t.text || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchKind = activeKind === "all" || t.kind === activeKind;
      const matchStart = !startTime || !t._ts || t._ts >= startTime;
      const matchEnd = !endTime || !t._ts || t._ts <= endTime;
      return matchSearch && matchKind && matchStart && matchEnd;
    });
  }, [tweets, searchQuery, activeKind, startDate, endDate]);

  // Step 2: Sort filtered tweets (instant, only depends on sortOrder)
  const filteredTweets = useMemo(() => {
    // MongoDB returns tweets in insertion order (newest first)
    // sortOrder "desc" = newest first (keep as-is)
    // sortOrder "asc" = oldest first (reverse)
    return sortOrder === "desc" ? filtered : [...filtered].reverse();
  }, [filtered, sortOrder]);

  // Date preset helpers
  function setDatePreset(preset: string) {
    setActivePreset(preset);
    const now = new Date();
    let start = "";
    let end = "";
    if (preset === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (preset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (preset === "thisMonth") {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      end = now.toISOString().slice(0, 10);
    } else if (preset === "lastMonth") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = lastMonth.toISOString().slice(0, 10);
      end = lastDay.toISOString().slice(0, 10);
    } else if (preset === "all") {
      start = "";
      end = "";
    }
    setStartDate(start);
    setEndDate(end);
  }

  function processTweets(rawData: any[]) {
    // Transform tweets - MongoDB returns in natural insertion order (newest first)
    const transformed = rawData.map((t) => ({
      tweet_id: t.id,
      username: t.username || username.trim() || "unknown",
      created_at: t.createdAt, // Keep null for reposts
      posted_at: t.postedAt, // Original post time for reposts
      kind: t.kind || classifyTweetKind(t),
      text: t.text,
      url: t.url || `https://x.com/i/web/status/${t.id}`,
      reply_to_handle: t.replyToHandle,
      replyto: t.replyTo,
      is_reply: t.isReply || t.is_reply,
      metrics:
        typeof t.publicMetrics === "string"
          ? t.publicMetrics
          : JSON.stringify(t.publicMetrics || {}),
    }));

    // Tweets are in natural insertion order from MongoDB (newest first)

    const dateGroups: { [key: string]: UiStatRow } = {};
    for (const t of transformed) {
      // For stats, use posted_at for reposts, created_at for others
      const dateForStats = t.posted_at || t.created_at;
      if (!dateForStats) continue; // Skip if no date available
      const dateStr = dateForStats.slice(0, 10);
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {
          date: dateStr,
          posts: 0,
          replies: 0,
          reposts: 0,
          quotes: 0,
          unknown: 0,
        };
      }
      const row = dateGroups[dateStr];
      if (t.kind === "post") row.posts++;
      // else if (t.kind === "reply") row.replies++;
      else if (t.kind === "repost") row.reposts++;
      else if (t.kind === "quote") row.quotes++;
      else row.unknown++;
    }

    setTweets(transformed);
    setStats(
      Object.values(dateGroups).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    );
  }

  async function fetchFromXApi() {
    if (!username.trim()) return;
    setBusy(true);
    setStatus("Fetching tweets…");
    try {
      const result = await runScraper(username.trim(), 30);

      if (!result.success) {
        throw new Error(result.error || "Scrape failed");
      }

      setStatus(`Scraped ${result.count} tweets in ${result.duration}s`);
      await handleLoadScraped(); // Reload from DB
    } catch (e: any) {
      setStatus(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TwitterDashboardUI
      username={username}
      setUsername={setUsername}
      userId={userId}
      setUserId={setUserId}
      busy={busy}
      status={status}
      stats={stats}
      tweets={tweets}
      lastFetch={lastFetch}
      autofetchEnabled={autofetchEnabled}
      autofetchUser={autofetchUser}
      backfillComplete={backfillComplete}
      backfillProgress={backfillProgress}
      rateLimited={rateLimited}
      rateLimitWait={rateLimitWait}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      activeKind={activeKind}
      setActiveKind={setActiveKind}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      activePreset={activePreset}
      setActivePreset={setActivePreset}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      filteredStats={filteredStats}
      totals={totals}
      filteredTweets={filteredTweets}
      onFetchFromXApi={fetchFromXApi}
      onSetDatePreset={setDatePreset}
      onHandleLoadScraped={handleLoadScraped}
    />
  );
}
